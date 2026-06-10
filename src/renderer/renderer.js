// renderer.js — Lógica do processo renderer (Electron)
// Todas as chamadas ao backend passam por window.api (exposto pelo preload.ts)

'use strict';

// ─── Relógio ─────────────────────────────────────────────────────────────────

function tickClock() {
  document.getElementById('clock').textContent =
    new Date().toLocaleString('pt-BR');
}
setInterval(tickClock, 1000);
tickClock();

// ─── Navegação por abas ───────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');

    if (tab === 'dashboard') loadDashboard();
    if (tab === 'patio')     loadPatio();
    if (tab === 'historico') loadHistorico();
  });
});

// ─── Formatação de placa (maiúsculas ao digitar) ───────────────────────────────

document.querySelectorAll('.input-placa').forEach(el => {
  el.addEventListener('input', function () {
    const pos = this.selectionStart;
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.setSelectionRange(pos, pos);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

async function loadDashboard() {
  const res = await window.api.getDashboard();
  if (res.success) {
    const d = res.data;
    setText('dash-no-patio',  d.veiculosNoPatio);
    setText('dash-mov-hoje',  d.movimentacoesHoje);
    setText('dash-total',     d.totalVeiculos);
  }

  const hist = await window.api.buscarHistorico({ limit: 8 });
  if (hist.success) renderRecentTable(hist.data);
}

function renderRecentTable(items) {
  const tbody = document.getElementById('recent-tbody');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Sem movimentações</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(m => `
    <tr>
      <td><strong>${m.placa}</strong></td>
      <td>${m.marca || ''} ${m.modelo || ''}</td>
      <td><span class="badge badge-${m.tipo}">${m.tipo}</span></td>
      <td>${fmtDate(m.data_hora)}</td>
      <td>${m.vaga || '—'}</td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRADA
// ═══════════════════════════════════════════════════════════════════════════════

const btnConsultar  = document.getElementById('btn-consultar');
const statusHint    = document.getElementById('placa-status');

btnConsultar.addEventListener('click', async () => {
  const placa = val('entrada-placa');
  if (!placa) return;

  setHint('🔄 Consultando DETRAN...', 'spin');
  btnConsultar.disabled = true;

  const res = await window.api.consultarPlaca(placa);
  btnConsultar.disabled = false;

  if (res.success && res.data) {
    const d = res.data;
    setVal('entrada-marca',        d.marca        || '');
    setVal('entrada-modelo',       d.modelo       || '');
    setVal('entrada-cor',          d.cor          || '');
    setVal('entrada-ano',          d.ano          || '');
    setVal('entrada-proprietario', d.proprietario || '');
    setHint('✅ Dados preenchidos automaticamente via DETRAN', 'ok');
  } else {
    setHint('⚠️ Placa não encontrada. Preencha os dados manualmente.', 'err');
  }
});

// Enter na placa dispara consulta
document.getElementById('entrada-placa').addEventListener('keydown', e => {
  if (e.key === 'Enter') btnConsultar.click();
});

document.getElementById('btn-registrar-entrada').addEventListener('click', async () => {
  const placa = val('entrada-placa');
  if (!placa) { showResult('entrada-result', 'Informe a placa do veículo.', 'error'); return; }

  const dados = {
    placa,
    marca:        val('entrada-marca'),
    modelo:       val('entrada-modelo'),
    cor:          val('entrada-cor'),
    ano:          parseInt(val('entrada-ano')) || null,
    proprietario: val('entrada-proprietario'),
    vaga:         val('entrada-vaga'),
    observacao:   val('entrada-obs'),
    fotosBase64:  fotosBase64Atual.length ? fotosBase64Atual : undefined,
  };

  const res = await window.api.registrarEntrada(dados);
  if (res.success) {
    showResult('entrada-result', `✅ Entrada registrada com sucesso! (Registro #${res.data.movimentacaoId})`, 'success');
    clearEntrada();
    loadDashboard();
  } else {
    showResult('entrada-result', `❌ ${res.error}`, 'error');
  }
});

function clearEntrada() {
  ['entrada-placa','entrada-marca','entrada-modelo','entrada-cor',
   'entrada-ano','entrada-proprietario','entrada-vaga','entrada-obs'].forEach(id => setVal(id, ''));
  setHint('', '');
  fotosBase64Atual = [];
  renderFotosGrid();
}

function setHint(msg, cls) {
  statusHint.textContent = msg;
  statusHint.className = `status-hint ${cls}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAÍDA
// ═══════════════════════════════════════════════════════════════════════════════

document.getElementById('btn-registrar-saida').addEventListener('click', saida);
document.getElementById('saida-placa').addEventListener('keydown', e => {
  if (e.key === 'Enter') saida();
});

async function saida() {
  const placa   = val('saida-placa');
  const infoBox = document.getElementById('saida-info');

  if (!placa) { showResult('saida-result', 'Informe a placa do veículo.', 'error'); return; }

  const res = await window.api.registrarSaida(placa);

  if (res.success) {
    infoBox.innerHTML = `
      <strong>Placa:</strong> ${placa.toUpperCase()}<br>
      <strong>Tempo de estadia:</strong> ${res.data.tempoEstadia}
    `;
    infoBox.classList.remove('hidden');
    showResult('saida-result', `✅ Saída registrada! Tempo de estadia: ${res.data.tempoEstadia}`, 'success');
    setVal('saida-placa', '');
    loadDashboard();
  } else {
    infoBox.classList.add('hidden');
    showResult('saida-result', `❌ ${res.error}`, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁTIO ATUAL
// ═══════════════════════════════════════════════════════════════════════════════

document.getElementById('btn-refresh-patio').addEventListener('click', loadPatio);

document.getElementById('patio-tbody').addEventListener('click', e => {
  const btn = e.target.closest('button[data-placa]');
  if (btn) { saidaRapida(btn.dataset.placa); return; }
  const img = e.target.closest('img[data-foto]');
  if (img) { abrirFoto(img.dataset.foto); }
});

async function loadPatio() {
  const res      = await window.api.listarVeiculosNoPatio();
  const tbody    = document.getElementById('patio-tbody');
  const emptyEl  = document.getElementById('patio-empty');

  tbody.innerHTML = '';

  if (!res.success || !res.data.length) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  const agora = Date.now();

  const rows = await Promise.all(res.data.map(async v => {
    const diffMs  = agora - new Date(v.entrada).getTime();
    const horas   = Math.floor(diffMs / 3_600_000);
    const minutos = Math.floor((diffMs % 3_600_000) / 60_000);
    const fotoRes = await window.api.getFotosVeiculo(v.placa);
    const fotos = (fotoRes.success && fotoRes.data?.length) ? fotoRes.data : [];
    const fotoCell = fotos.length
      ? fotos.map(f => `<img src="data:image/jpeg;base64,${f}" class="foto-thumb" data-foto="${f}" title="Ver foto">`).join('')
      : '—';

    return `
      <tr>
        <td>${fotoCell}</td>
        <td><strong>${v.placa}</strong></td>
        <td>${v.marca || ''} ${v.modelo || ''}</td>
        <td>${v.cor || '—'}</td>
        <td>${v.proprietario || '—'}</td>
        <td>${fmtDate(v.entrada)}</td>
        <td>${horas}h ${minutos}min</td>
        <td>${v.vaga || '—'}</td>
        <td>
          <button class="btn btn-danger btn-sm" data-placa="${v.placa}">Saída</button>
        </td>
      </tr>
    `;
  }));
  tbody.innerHTML = rows.join('');
}

async function saidaRapida(placa) {
  if (!confirm(`Registrar saída do veículo ${placa}?`)) return;
  const res = await window.api.registrarSaida(placa);
  if (res.success) {
    alert(`✅ Saída de ${placa} registrada!\nTempo de estadia: ${res.data.tempoEstadia}`);
    loadPatio();
    loadDashboard();
  } else {
    alert(`❌ Erro: ${res.error}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTÓRICO
// ═══════════════════════════════════════════════════════════════════════════════

document.getElementById('btn-filtrar').addEventListener('click', () => {
  loadHistorico({
    placa:      val('f-placa'),
    dataInicio: val('f-inicio'),
    dataFim:    val('f-fim'),
  });
});

document.getElementById('btn-limpar').addEventListener('click', () => {
  ['f-placa','f-inicio','f-fim'].forEach(id => setVal(id, ''));
  loadHistorico();
});

async function loadHistorico(filtros = {}) {
  const res   = await window.api.buscarHistorico({ ...filtros, limit: 200 });
  const tbody = document.getElementById('historico-tbody');

  if (!res.success || !res.data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum registro encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = res.data.map(m => `
    <tr>
      <td>${fmtDate(m.data_hora)}</td>
      <td><strong>${m.placa}</strong></td>
      <td>${m.marca || ''} ${m.modelo || ''}</td>
      <td><span class="badge badge-${m.tipo}">${m.tipo}</span></td>
      <td>${m.vaga || '—'}</td>
      <td>${m.valor_cobrado ? `R$ ${parseFloat(m.valor_cobrado).toFixed(2)}` : '—'}</td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utilitários
// ═══════════════════════════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);
const val = id => $( id)?.value?.trim() ?? '';
const setVal  = (id, v) => { if ($(id)) $(id).value = v; };
const setText = (id, v) => { if ($(id)) $(id).textContent = v; };

function fmtDate(str) {
  return str ? new Date(str).toLocaleString('pt-BR') : '—';
}

function showResult(id, msg, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `result-msg ${type} show`;
  setTimeout(() => el.classList.remove('show'), 6000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOTO
// ═══════════════════════════════════════════════════════════════════════════════

let fotosBase64Atual = [];

document.getElementById('modal-foto').addEventListener('click', function () {
  this.classList.add('hidden');
});

document.getElementById('entrada-foto').addEventListener('change', function () {
  const files = Array.from(this.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const dataUrl = e.target.result;
      const b64 = dataUrl.split(',')[1];
      fotosBase64Atual.push(b64);
      renderFotosGrid();
    };
    reader.readAsDataURL(file);
  });

  this.value = '';
});

function renderFotosGrid() {
  const grid = document.getElementById('fotos-grid');
  const fotos = fotosBase64Atual.map((b64, i) => `
    <div class="foto-item">
      <img src="data:image/jpeg;base64,${b64}" data-index="${i}" title="Ver foto">
      <button class="btn-del-foto" data-index="${i}" title="Remover">✕</button>
    </div>
  `).join('');

  const addBtn = `
    <label for="entrada-foto" class="foto-placeholder foto-placeholder-sm">
      <span class="foto-icon">📷</span>
      <span>${fotosBase64Atual.length ? '+' : 'Adicionar fotos'}</span>
    </label>
  `;

  grid.innerHTML = fotos + addBtn;
}

document.getElementById('fotos-grid').addEventListener('click', e => {
  const del = e.target.closest('.btn-del-foto');
  if (del) {
    fotosBase64Atual.splice(parseInt(del.dataset.index), 1);
    renderFotosGrid();
    return;
  }
  const img = e.target.closest('img[data-index]');
  if (img) abrirFoto(fotosBase64Atual[parseInt(img.dataset.index)]);
});

function abrirFoto(base64) {
  document.getElementById('modal-foto-img').src = `data:image/jpeg;base64,${base64}`;
  document.getElementById('modal-foto').classList.remove('hidden');
}

// ─── Inicialização ────────────────────────────────────────────────────────────
renderFotosGrid();
loadDashboard();
