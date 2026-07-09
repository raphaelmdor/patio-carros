import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface DadosVeiculo {
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  ano: number;
  municipio?: string;
  uf?: string;
  proprietario?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validação de placa
// ─────────────────────────────────────────────────────────────────────────────

export function isPlacaValida(placa: string): boolean {
  const antigo   = /^[A-Z]{3}[0-9]{4}$/;          // Ex: ABC1234
  const mercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/; // Ex: ABC1D23
  return antigo.test(placa) || mercosul.test(placa);
}

// ─────────────────────────────────────────────────────────────────────────────
// Consulta principal
// ─────────────────────────────────────────────────────────────────────────────

export async function consultarPlaca(placa: string): Promise<DadosVeiculo | null> {
  const placaFormatada = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!isPlacaValida(placaFormatada)) {
    throw new Error(`Placa inválida: ${placaFormatada}`);
  }

  const apiKey = process.env.DETRAN_API_KEY;
  const apiUrl = process.env.DETRAN_API_URL;

  // Sem configuração de API → usa mock para desenvolvimento
  if (!apiKey || !apiUrl) {
    console.warn('⚠️  DETRAN_API_KEY/URL não configurados. Usando dados de demonstração.');
    return mockConsultarPlaca(placaFormatada);
  }

  try {
    const response = await axios.post(apiUrl, { tipo: 'fipe-chassi', placa: placaFormatada, homolog: false }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const body = response.data;
    console.log('DETRAN response status:', response.status);
    console.log('DETRAN response body:', JSON.stringify(body, null, 2).slice(0, 3000));
    console.log('DETRAN dados keys:', Object.keys(body?.data?.dados ?? body?.response?.dados ?? body?.dados ?? {}));

    if (body?.error || body?.status === false) return null;

    // Suporta tanto { data: { resultados: [...] } } quanto { response: {...} }
    const resultados: any[] = body?.data?.resultados ?? body?.resultados ?? [];

    if (!resultados.length) {
      // Tenta ler dado direto no body (alguns provedores retornam objeto único)
      const d = body?.data ?? body?.response ?? body;
      if (d?.marca || d?.modelo) {
        return {
          placa:        placaFormatada,
          marca:        d.marca   ?? d.MARCA   ?? '',
          modelo:       d.modelo  ?? d.MODELO  ?? '',
          cor:          d.cor     ?? d.COR      ?? '',
          ano:          d.anoFabricacao ?? d.ano ?? d.ANO ?? 0,
          municipio:    d.municipio ?? '',
          uf:           d.uf ?? '',
          proprietario: d.proprietario ?? d.nome ?? '',
        };
      }
      return null;
    }

    const d = resultados.find((r: any) => r.principal) ?? resultados[0];
    // dados = registro do DETRAN (cor, proprietário, município corretos)
    // resultados = tabela FIPE (marca, modelo, ano mais precisos)
    const dados = body?.data?.dados ?? body?.response?.dados ?? body?.dados ?? {};

    return {
      placa:        placaFormatada,
      marca:        d.marca        ?? d.MARCA        ?? dados.MARCA        ?? dados.marca        ?? '',
      modelo:       d.modelo       ?? d.MODELO       ?? dados.MODELO       ?? dados.modelo       ?? '',
      cor:          dados.COR      ?? dados.cor       ?? dados.Cor          ?? d.cor              ?? d.COR ?? '',
      ano:          d.anoFabricacao ?? d.ano ?? d.ANO ?? dados.ANO          ?? dados.ano          ?? 0,
      municipio:    dados.municipio ?? dados.MUNICIPIO ?? d.municipio       ?? '',
      uf:           dados.uf        ?? dados.UF        ?? d.uf              ?? '',
      proprietario: dados.proprietario ?? dados.PROPRIETARIO ?? dados.nome  ?? d.proprietario    ?? d.nome ?? '',
    };
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    console.error('Erro na API DETRAN:', error.message);
    console.error('Response:', JSON.stringify(error.response?.data).slice(0, 300));
    throw new Error(`Falha ao consultar API do DETRAN: ${error.response?.status ?? error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock para desenvolvimento (sem API key configurada)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_DATA: Record<string, DadosVeiculo> = {
  ABC1234: { placa: 'ABC1234', marca: 'Volkswagen', modelo: 'Gol',      cor: 'Branco',   ano: 2019, municipio: 'Rio de Janeiro', uf: 'RJ', proprietario: 'João Silva' },
  XYZ5678: { placa: 'XYZ5678', marca: 'Fiat',       modelo: 'Palio',    cor: 'Vermelho', ano: 2018, municipio: 'Niterói',        uf: 'RJ', proprietario: 'Maria Santos' },
  DEF9J12: { placa: 'DEF9J12', marca: 'Chevrolet',  modelo: 'Onix',     cor: 'Prata',    ano: 2023, municipio: 'Rio de Janeiro', uf: 'RJ', proprietario: 'Carlos Souza' },
  GHI3456: { placa: 'GHI3456', marca: 'Toyota',     modelo: 'Corolla',  cor: 'Preto',    ano: 2022, municipio: 'Rio de Janeiro', uf: 'RJ', proprietario: 'Ana Lima' },
  JKL7890: { placa: 'JKL7890', marca: 'Honda',      modelo: 'Civic',    cor: 'Cinza',    ano: 2021, municipio: 'São Paulo',      uf: 'SP', proprietario: 'Roberto Costa' },
};

function mockConsultarPlaca(placa: string): DadosVeiculo {
  return (
    MOCK_DATA[placa] ?? {
      placa,
      marca: '—',
      modelo: '(Placa não encontrada no mock)',
      cor: '—',
      ano: 0,
      municipio: '—',
      uf: '—',
    }
  );
}
