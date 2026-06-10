import { ipcMain } from 'electron';
import {
  registrarEntrada,
  registrarSaida,
  listarVeiculosNoPatio,
  buscarHistorico,
  getDashboard,
  getFotosVeiculo,
  EntradaInput,
  FiltroBusca,
} from './database';
import { consultarPlaca } from './detranService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type IpcResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: string };

function ok<T>(data: T): IpcResult<T>          { return { success: true,  data }; }
function fail(error: string): IpcResult<never> { return { success: false, error }; }

// ─────────────────────────────────────────────────────────────────────────────
// Registro dos handlers
// ─────────────────────────────────────────────────────────────────────────────

export function registerIpcHandlers(): void {

  // ── Consulta de placa no DETRAN ────────────────────────────────────────────
  ipcMain.handle('consultar-placa', async (_event, placa: string) => {
    try {
      const dados = await consultarPlaca(placa);
      return ok(dados);
    } catch (err: any) {
      return fail(err.message ?? 'Erro ao consultar placa');
    }
  });

  // ── Registrar entrada ──────────────────────────────────────────────────────
  ipcMain.handle('registrar-entrada', async (_event, dados: EntradaInput) => {
    try {
      if (!dados.placa?.trim()) return fail('Placa é obrigatória');
      dados.placa = dados.placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const movimentacaoId = await registrarEntrada(dados);
      return ok({ movimentacaoId });
    } catch (err: any) {
      console.error('registrar-entrada:', err);
      return fail(err.message ?? 'Erro ao registrar entrada');
    }
  });

  // ── Registrar saída ────────────────────────────────────────────────────────
  ipcMain.handle('registrar-saida', async (_event, placa: string) => {
    try {
      const resultado = await registrarSaida(placa.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      if (!resultado) return fail('Veículo não encontrado no pátio');
      return ok(resultado);
    } catch (err: any) {
      console.error('registrar-saida:', err);
      return fail(err.message ?? 'Erro ao registrar saída');
    }
  });

  // ── Veículos no pátio ──────────────────────────────────────────────────────
  ipcMain.handle('listar-veiculos-patio', async () => {
    try {
      const data = await listarVeiculosNoPatio();
      return ok(data);
    } catch (err: any) {
      return fail(err.message ?? 'Erro ao listar veículos');
    }
  });

  // ── Histórico ──────────────────────────────────────────────────────────────
  ipcMain.handle('buscar-historico', async (_event, filtros: FiltroBusca) => {
    try {
      const data = await buscarHistorico(filtros);
      return ok(data);
    } catch (err: any) {
      return fail(err.message ?? 'Erro ao buscar histórico');
    }
  });

  // ── Dashboard ──────────────────────────────────────────────────────────────
  ipcMain.handle('get-dashboard', async () => {
    try {
      const data = await getDashboard();
      return ok(data);
    } catch (err: any) {
      return fail(err.message ?? 'Erro ao carregar dashboard');
    }
  });

  // ── Fotos do veículo ───────────────────────────────────────────────────────
  ipcMain.handle('get-fotos-veiculo', async (_event, placa: string) => {
    try {
      const fotos = await getFotosVeiculo(placa);
      return ok(fotos);
    } catch (err: any) {
      return fail(err.message ?? 'Erro ao buscar fotos');
    }
  });
}
