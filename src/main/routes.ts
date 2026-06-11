import { Express, Request, Response } from 'express';
import {
  registrarEntrada,
  registrarSaida,
  listarVeiculosNoPatio,
  listarTodosVeiculos,
  buscarHistorico,
  getDashboard,
  getFotosVeiculo,
  EntradaInput,
  FiltroBusca,
} from './database';
import { consultarPlaca } from './detranService';

type ApiResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: string };

function ok<T>(data: T): ApiResult<T>          { return { success: true,  data }; }
function fail(error: string): ApiResult<never> { return { success: false, error }; }

export function registerRoutes(app: Express): void {

  app.get('/api/dashboard', async (_req: Request, res: Response) => {
    try { res.json(ok(await getDashboard())); }
    catch (e: any) { res.json(fail(e.message ?? 'Erro ao carregar dashboard')); }
  });

  app.get('/api/historico', async (req: Request, res: Response) => {
    try {
      const filtros: FiltroBusca = {
        placa:      req.query.placa      as string | undefined,
        dataInicio: req.query.dataInicio as string | undefined,
        dataFim:    req.query.dataFim    as string | undefined,
        limit:      req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };
      res.json(ok(await buscarHistorico(filtros)));
    } catch (e: any) { res.json(fail(e.message ?? 'Erro ao buscar histórico')); }
  });

  app.get('/api/placa/:placa', async (req: Request, res: Response) => {
    try { res.json(ok(await consultarPlaca(req.params.placa))); }
    catch (e: any) { res.json(fail(e.message ?? 'Erro ao consultar placa')); }
  });

  app.post('/api/entrada', async (req: Request, res: Response) => {
    try {
      const dados: EntradaInput = req.body;
      if (!dados.placa?.trim()) { res.json(fail('Placa é obrigatória')); return; }
      dados.placa = dados.placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const movimentacaoId = await registrarEntrada(dados);
      res.json(ok({ movimentacaoId }));
    } catch (e: any) {
      console.error('POST /api/entrada:', e);
      res.json(fail(e.message ?? 'Erro ao registrar entrada'));
    }
  });

  app.post('/api/saida', async (req: Request, res: Response) => {
    try {
      const placa = (req.body.placa as string)?.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const resultado = await registrarSaida(placa);
      if (!resultado) { res.json(fail('Veículo não encontrado no pátio')); return; }
      res.json(ok(resultado));
    } catch (e: any) {
      console.error('POST /api/saida:', e);
      res.json(fail(e.message ?? 'Erro ao registrar saída'));
    }
  });

  app.get('/api/patio', async (_req: Request, res: Response) => {
    try { res.json(ok(await listarVeiculosNoPatio())); }
    catch (e: any) { res.json(fail(e.message ?? 'Erro ao listar veículos')); }
  });

  app.get('/api/fotos/:placa', async (req: Request, res: Response) => {
    try { res.json(ok(await getFotosVeiculo(req.params.placa))); }
    catch (e: any) { res.json(fail(e.message ?? 'Erro ao buscar fotos')); }
  });

  app.get('/api/veiculos', async (_req: Request, res: Response) => {
    try { res.json(ok(await listarTodosVeiculos())); }
    catch (e: any) { res.json(fail(e.message ?? 'Erro ao listar veículos')); }
  });
}
