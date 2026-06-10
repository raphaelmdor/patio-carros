/* ── Navegação ── */

let paginaAtual = 'dashboard';
let patioCache  = [];

function navTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  paginaAtual = page;
  if (page === 'dashboard')  carregarDashboard();
  if (page === 'patio')      carregarPatio();
  if (page === 'historico')  carregarHistorico();
}

/* ── API helper ── */

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  return r.json();
}

/* ── Status dot ── */

async function checarStatus() {
  const dot = document.getElementById('status-dot');
  try {
    const r = await fetch('/api/dashboard');
    dot.className = 'topbar-status ' + (r.ok ? 'ok' : 'err');
  } catch {
    dot.className = 'topbar-status err';
  }
}

/* ── Dashboard ── */

async function carregarDashboard() {
  const { success, data, error } = await api('GET', '/api/dashboard');
  if (!success) { toast('Erro: ' + error); return; }

  document.getElementById('stat-patio').textContent  = data.stats.veiculosNoPatio;
  document.getElementById('stat-hoje').textContent   = data.stats.movimentacoesHoje;
  document.getElementById('stat-total').textContent  = data.stats.totalVeiculos;

  const list = document.getElementById('dashboard-list');
  list.innerHTML = data.movimentos.length
    ? data.movimentos.map(movHTML).join('')
    : '<div class="loading-msg">Sem movimentações</div>';
}

function movHTML(m) {
  const entrada = m.tipo === 'entrada';
  return `
    <div class="mov-item">
      <div class="mov-icon">${entrada ? '⬇️' : '⬆️'}</div>
      <div class="mov-body">
        <div class="mov-placa">${m.placa}</div>
        <div class="mov-modelo">${m.marca || '—'} ${m.modelo || ''}</div>
        <div class="mov-time">${formatDataHora(m.data_hora)}</div>
      </div>
      <span class="mov-badge ${entrada ? 'badge-entrada' : 'badge-saida'}">${entrada ? 'Entrada' : 'Saída'}</span>
    </div>`;
}

/* ── Entrada ── */

let dadosDetranAtual = null;

async function consultarDetran() {
  const placa = document.getElementById('entrada-placa').value.trim().toUpperCase();
  const alerta = document.getElementById('entrada-alerta');
  const dadosDiv = document.getElementById('entrada-dados');

  alerta.className = 'alerta hidden';
  dadosDiv.classList.add('hidden');
  dadosDetranAtual = null;

  if (placa.length < 7) { mostrarAlerta(alerta, 'erro', 'Placa inválida.'); return; }

  setBtnLoading('btn-consultar', true);

  // Consulta DETRAN e checa pátio em paralelo
  const [detran, check] = await Promise.all([
    api('GET', '/api/detran/' + placa),
    api('GET', '/api/patio/check/' + placa),
  ]);

  setBtnLoading('btn-consultar', false);

  if (!detran.success) { mostrarAlerta(alerta, 'erro', detran.error); return; }
  if (check.data?.noPatio) { mostrarAlerta(alerta, 'aviso', '⚠️ Este veículo já está no pátio.'); }

  dadosDetranAtual = detran.data;
  document.getElementById('entrada-campos').innerHTML = camposVeiculoHTML(detran.data);
  document.getElementById('btn-entrada').disabled = check.data?.noPatio ?? false;
  dadosDiv.classList.remove('hidden');
}

async function registrarEntrada() {
  if (!dadosDetranAtual) return;
  setBtnLoading('btn-entrada', true);

  const body = {
    ...dadosDetranAtual,
    vaga:       document.getElementById('entrada-vaga').value.trim() || undefined,
    observacao: document.getElementById('entrada-obs').value.trim()  || undefined,
  };

  const { success, error } = await api('POST', '/api/entrada', body);
  setBtnLoading('btn-entrada', false);

  if (!success) { mostrarAlerta(document.getElementById('entrada-alerta'), 'erro', error); return; }

  // Reset form
  document.getElementById('entrada-placa').value = '';
  document.getElementById('entrada-vaga').value  = '';
  document.getElementById('entrada-obs').value   = '';
  document.getElementById('entrada-dados').classList.add('hidden');
  document.getElementById('entrada-alerta').className = 'alerta hidden';
  dadosDetranAtual = null;

  mostrarOverlay('✅', 'Entrada registrada!', `Placa: ${body.placa}\n${body.marca} ${body.modelo}`);
}

/* ── Saída ── */

let veiculoSaidaAtual = null;

async function verificarSaida() {
  const placa  = document.getElementById('saida-placa').value.trim().toUpperCase();
  const alerta = document.getElementById('saida-alerta');
  const dadosDiv = document.getElementById('saida-dados');

  alerta.className = 'alerta hidden';
  dadosDiv.classList.add('hidden');
  veiculoSaidaAtual = null;

  if (placa.length < 7) { mostrarAlerta(alerta, 'erro', 'Placa inválida.'); return; }

  setBtnLoading('btn-verificar', true);
  const { success, data, error } = await api('GET', '/api/patio/check/' + placa);
  setBtnLoading('btn-verificar', false);

  if (!success) { mostrarAlerta(alerta, 'erro', error); return; }
  if (!data.noPatio) { mostrarAlerta(alerta, 'aviso', 'Veículo não encontrado no pátio.'); return; }

  veiculoSaidaAtual = data.veiculo;
  const v = data.veiculo;
  const campos = {
    placa: v.placa, marca: v.marca, modelo: v.modelo,
    cor: v.cor || '—',
    entrada: formatDataHora(v.entrada),
    tempo: tempoDecorrido(v.entrada),
  };
  document.getElementById('saida-campos').innerHTML = camposVeiculoHTML(campos);
  dadosDiv.classList.remove('hidden');
}

async function registrarSaida() {
  const placa = document.getElementById('saida-placa').value.trim().toUpperCase();
  if (!placa) return;
  setBtnLoading('btn-saida', true);

  const obs = document.getElementById('saida-obs').value.trim();
  const { success, data, error } = await api('POST', '/api/saida', { placa, observacao: obs || undefined });
  setBtnLoading('btn-saida', false);

  if (!success) { mostrarAlerta(document.getElementById('saida-alerta'), 'erro', error); return; }

  document.getElementById('saida-placa').value = '';
  document.getElementById('saida-obs').value   = '';
  document.getElementById('saida-dados').classList.add('hidden');
  document.getElementById('saida-alerta').className = 'alerta hidden';
  veiculoSaidaAtual = null;

  mostrarOverlay('🚪', 'Saída registrada!', `Placa: ${placa}\nTempo no pátio: ${data.tempoEstadia}`);
}

/* ── Pátio ── */

async function carregarPatio() {
  const list = document.getElementById('patio-list');
  list.innerHTML = '<div class="loading-msg">Carregando…</div>';

  const { success, data, error } = await api('GET', '/api/patio');
  if (!success) { list.innerHTML = `<div class="loading-msg" style="color:var(--red)">${error}</div>`; return; }

  patioCache = data;
  renderPatio(data);
}

function filtrarPatio() {
  const q = document.getElementById('patio-search').value.toLowerCase();
  renderPatio(q
    ? patioCache.filter(v => v.placa.toLowerCase().includes(q) || (v.modelo||'').toLowerCase().includes(q) || (v.marca||'').toLowerCase().includes(q))
    : patioCache
  );
}

function renderPatio(veiculos) {
  const list = document.getElementById('patio-list');
  if (!veiculos.length) {
    list.innerHTML = '<div class="loading-msg">Pátio vazio</div>';
    return;
  }
  list.innerHTML = veiculos.map(v => `
    <div class="patio-item">
      <div class="patio-info">
        <div class="patio-placa">${v.placa}</div>
        <div class="patio-modelo">${v.marca || ''} ${v.modelo || ''} ${v.cor ? '· ' + v.cor : ''}</div>
        ${v.proprietario ? `<div class="patio-prop">${v.proprietario}</div>` : ''}
      </div>
      <span class="patio-time">${tempoDecorrido(v.entrada)}</span>
      <button class="patio-exit" onclick="saidaRapida('${v.placa}')">Saída</button>
    </div>`).join('');
}

async function saidaRapida(placa) {
  if (!confirm(`Registrar saída de ${placa}?`)) return;
  const { success, data, error } = await api('POST', '/api/saida', { placa });
  if (!success) { toast('Erro: ' + error); return; }
  toast(`✅ Saída de ${placa} — ${data.tempoEstadia}`);
  carregarPatio();
}

/* ── Histórico ── */

async function carregarHistorico() {
  const list = document.getElementById('historico-list');
  list.innerHTML = '<div class="loading-msg">Carregando…</div>';

  const placa  = document.getElementById('hist-placa').value.trim();
  const inicio = document.getElementById('hist-inicio').value;
  const fim    = document.getElementById('hist-fim').value;

  const params = new URLSearchParams();
  if (placa)  params.set('placa', placa);
  if (inicio) params.set('dataInicio', inicio);
  if (fim)    params.set('dataFim', fim);

  const { success, data, error } = await api('GET', '/api/historico?' + params);
  if (!success) { list.innerHTML = `<div class="loading-msg" style="color:var(--red)">${error}</div>`; return; }

  list.innerHTML = data.length
    ? data.map(movHTML).join('')
    : '<div class="loading-msg">Nenhum registro encontrado</div>';
}

/* ── Helpers ── */

function camposVeiculoHTML(d) {
  const campos = [
    ['Placa', d.placa], ['Marca', d.marca], ['Modelo', d.modelo],
    ['Cor', d.cor], ['Ano', d.ano], ['Proprietário', d.proprietario],
    ['Município', d.municipio], ['UF', d.uf],
    ['Entrada', d.entrada], ['Tempo', d.tempo],
  ];
  return campos
    .filter(([, v]) => v)
    .map(([l, v]) => `<div class="field-item"><span class="lbl">${l}</span><span class="val">${v}</span></div>`)
    .join('');
}

function formatDataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function tempoDecorrido(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function mostrarAlerta(el, tipo, msg) {
  el.className = `alerta ${tipo}`;
  el.textContent = msg;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

function mostrarOverlay(icon, titulo, corpo) {
  document.getElementById('overlay-icon').textContent  = icon;
  document.getElementById('overlay-title').textContent = titulo;
  document.getElementById('overlay-body').textContent  = corpo;
  document.getElementById('overlay').classList.remove('hidden');
}

function fecharOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  btn.disabled = loading;
  btn.style.opacity = loading ? '.6' : '1';
}

// Formata placa enquanto digita (permite maiúsculas/números apenas)
['entrada-placa', 'saida-placa', 'hist-placa'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => { el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
});

/* ── Init ── */
carregarDashboard();
checarStatus();
setInterval(checarStatus, 30_000);
