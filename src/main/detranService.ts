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
    const response = await axios.post(apiUrl,
      { tipo: 'veiculos-dados-v1', placa: placaFormatada, homolog: false },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const body = response.data;

    if (body?.error === true) return null;

    const data = body?.data ?? {};
    if (!data.placa && !data.modelo_marca) return null;

    // modelo_marca vem como "marca/modelo" (ex: "vw/gol 1.0")
    const modeloMarca: string = data.modelo_marca ?? '';
    const slashIdx = modeloMarca.indexOf('/');
    const marca  = slashIdx >= 0 ? modeloMarca.slice(0, slashIdx).trim() : modeloMarca;
    const modelo = slashIdx >= 0 ? modeloMarca.slice(slashIdx + 1).trim() : '';

    return {
      placa:        placaFormatada,
      marca,
      modelo,
      cor:          data.cor          ?? '',
      ano:          data.ano          ?? data.ano_fabricacao ?? 0,
      municipio:    data.cidade_placa ?? '',
      uf:           data.estado_placa ?? '',
      proprietario: data.cliente?.nome ?? '',
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
