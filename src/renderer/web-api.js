// Polyfill de window.api para rodar o renderer no browser via fetch()
// Em Electron, window.api é injetado pelo preload.ts via contextBridge.
// Aqui substituímos por chamadas REST à API Express.

(function () {
  async function post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  }

  async function get(path) {
    const r = await fetch(path);
    return r.json();
  }

  window.api = {

    async getDashboard() {
      const json = await get('/api/dashboard');
      if (!json.success) return json;
      // Achata stats para o formato que o renderer espera: res.data.veiculosNoPatio etc.
      return { success: true, data: json.data.stats };
    },

    async buscarHistorico(filtros = {}) {
      const p = new URLSearchParams();
      if (filtros.placa)      p.set('placa', filtros.placa);
      if (filtros.dataInicio) p.set('dataInicio', filtros.dataInicio);
      if (filtros.dataFim)    p.set('dataFim', filtros.dataFim);
      if (filtros.limit)      p.set('limit', String(filtros.limit));
      return get('/api/historico?' + p);
    },

    async consultarPlaca(placa) {
      const json = await get('/api/detran/' + encodeURIComponent(placa.toUpperCase()));
      if (!json.success) return json;
      const d = json.data;
      // Se não veio marca nem modelo, a placa não está na base → renderer mostra aviso manual
      if (!d.marca && !d.modelo) return { success: false, data: null };
      return json;
    },

    async registrarEntrada(dados) {
      const json = await post('/api/entrada', dados);
      if (!json.success) return json;
      // Renomeia id → movimentacaoId para o renderer
      return { success: true, data: { movimentacaoId: json.data.id } };
    },

    async registrarSaida(placa) {
      return post('/api/saida', { placa });
    },

    async listarVeiculosNoPatio() {
      return get('/api/patio');
    },

    async getFotosVeiculo(placa) {
      return get('/api/fotos/' + encodeURIComponent(placa.toUpperCase()));
    },

  };
})();
