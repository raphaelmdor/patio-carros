import express from 'express';
import path from 'path';
import {
  initDatabase,
  getDashboard,
  listarVeiculosNoPatio,
  registrarEntrada,
  registrarSaida,
  buscarHistorico,
  getFotosVeiculo,
} from '../main/database';
import { consultarPlaca, isPlacaValida } from '../main/detranService';

const app  = express();
const PORT = parseInt(process.env.WEB_PORT || '3000');

app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
// __dirname = dist/web/ → ../../src/renderer
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'src', 'renderer');
app.use(express.static(PUBLIC_DIR));

// ─── Dashboard ────────────────────────────────────────────────────────────────

app.get('/api/dashboard', async (_req, res) => {
  try {
    const [stats, movimentos] = await Promise.all([
      getDashboard(),
      buscarHistorico({ limit: 10 }),
    ]);
    res.json({ success: true, data: { stats, movimentos } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Pátio atual ──────────────────────────────────────────────────────────────

app.get('/api/patio', async (_req, res) => {
  try {
    const veiculos = await listarVeiculosNoPatio();
    res.json({ success: true, data: veiculos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/patio/check/:placa', async (req, res) => {
  try {
    const placa    = req.params.placa.toUpperCase();
    const veiculos = await listarVeiculosNoPatio();
    const found    = veiculos.find(v => v.placa === placa) ?? null;
    res.json({ success: true, data: { noPatio: !!found, veiculo: found } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DETRAN ───────────────────────────────────────────────────────────────────

app.get('/api/detran/:placa', async (req, res) => {
  try {
    const placa = req.params.placa.toUpperCase();
    if (!isPlacaValida(placa))
      return res.status(400).json({ success: false, error: 'Placa inválida' });
    const dados = await consultarPlaca(placa);
    if (!dados)
      return res.status(404).json({ success: false, error: 'Placa não encontrada' });
    res.json({ success: true, data: dados });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Entrada ──────────────────────────────────────────────────────────────────

app.post('/api/entrada', async (req, res) => {
  try {
    const { placa, marca, modelo, cor, ano, proprietario, municipio, uf, vaga, observacao } = req.body;
    if (!placa) return res.status(400).json({ success: false, error: 'Placa obrigatória' });
    const id = await registrarEntrada({
      placa: placa.toUpperCase(), marca, modelo, cor, ano, proprietario, municipio, uf, vaga, observacao,
    });
    res.json({ success: true, data: { id } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Saída ────────────────────────────────────────────────────────────────────

app.post('/api/saida', async (req, res) => {
  try {
    const { placa } = req.body;
    if (!placa) return res.status(400).json({ success: false, error: 'Placa obrigatória' });
    const result = await registrarSaida(placa.toUpperCase());
    if (!result) return res.status(404).json({ success: false, error: 'Veículo não está no pátio' });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Fotos ────────────────────────────────────────────────────────────────────

app.get('/api/fotos/:placa', async (req, res) => {
  try {
    const fotos = await getFotosVeiculo(req.params.placa.toUpperCase());
    res.json({ success: true, data: fotos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Histórico ────────────────────────────────────────────────────────────────

app.get('/api/historico', async (req, res) => {
  try {
    const { placa, dataInicio, dataFim } = req.query;
    const rows = await buscarHistorico({
      placa:      placa      as string | undefined,
      dataInicio: dataInicio as string | undefined,
      dataFim:    dataFim    as string | undefined,
      limit: 200,
    });
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

initDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      const nets = Object.values(require('os').networkInterfaces()).flat() as any[];
      const local = nets.find(n => n.family === 'IPv4' && !n.internal)?.address ?? 'SEU-IP';
      console.log(`🌐 Servidor web: http://localhost:${PORT}`);
      console.log(`📱 No celular (mesma rede): http://${local}:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Falha ao iniciar:', err.message);
    process.exit(1);
  });
