import mysql, { Pool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Pool de conexões
// ─────────────────────────────────────────────────────────────────────────────

let pool: Pool;

export async function initDatabase(): Promise<void> {
  pool = mysql.createPool({
    host:             process.env.DB_HOST     || 'localhost',
    port:             parseInt(process.env.DB_PORT || '3306'),
    user:             process.env.DB_USER     || 'root',
    password:         process.env.DB_PASSWORD || '',
    database:         process.env.DB_NAME     || 'patio_carros',
    waitForConnections: true,
    connectionLimit:  10,
    queueLimit:       0,
    timezone:         '-03:00',
  });

  const conn = await pool.getConnection();
  console.log('✅ Conectado ao MySQL');
  conn.release();

  await createTablesIfNotExist();
}

export function getPool(): Pool {
  return pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Criação automática das tabelas
// ─────────────────────────────────────────────────────────────────────────────

async function createTablesIfNotExist(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        placa         VARCHAR(8)  NOT NULL,
        marca         VARCHAR(60),
        modelo        VARCHAR(100),
        cor           VARCHAR(40),
        ano           INT,
        proprietario  VARCHAR(120),
        municipio     VARCHAR(100),
        uf            VARCHAR(2),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_placa (placa)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS movimentacoes (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        veiculo_id    INT NOT NULL,
        tipo          ENUM('entrada', 'saida') NOT NULL,
        vaga          VARCHAR(10),
        data_hora     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        observacao    TEXT,
        valor_cobrado DECIMAL(10,2),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE,
        INDEX idx_veiculo (veiculo_id),
        INDEX idx_data_hora (data_hora)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ Tabelas prontas');
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Veículos
// ─────────────────────────────────────────────────────────────────────────────

export interface DadosVeiculoInput {
  placa: string;
  marca?: string;
  modelo?: string;
  cor?: string;
  ano?: number | null;
  proprietario?: string;
  municipio?: string;
  uf?: string;
}

/** Insere o veículo ou atualiza os dados se já existir. Retorna o ID. */
export async function upsertVeiculo(dados: DadosVeiculoInput): Promise<number> {
  const [result] = await pool.execute(
    `INSERT INTO veiculos (placa, marca, modelo, cor, ano, proprietario, municipio, uf)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       marca        = COALESCE(VALUES(marca), marca),
       modelo       = COALESCE(VALUES(modelo), modelo),
       cor          = COALESCE(VALUES(cor), cor),
       ano          = COALESCE(VALUES(ano), ano),
       proprietario = COALESCE(VALUES(proprietario), proprietario),
       municipio    = COALESCE(VALUES(municipio), municipio),
       uf           = COALESCE(VALUES(uf), uf),
       updated_at   = CURRENT_TIMESTAMP`,
    [dados.placa, dados.marca || null, dados.modelo || null, dados.cor || null,
     dados.ano || null, dados.proprietario || null, dados.municipio || null, dados.uf || null]
  );

  const { insertId } = result as any;
  if (insertId > 0) return insertId;

  // ON DUPLICATE KEY — busca o ID existente
  const [rows] = await pool.execute<any[]>('SELECT id FROM veiculos WHERE placa = ?', [dados.placa]);
  return rows[0].id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Movimentações
// ─────────────────────────────────────────────────────────────────────────────

export interface EntradaInput extends DadosVeiculoInput {
  vaga?: string;
  observacao?: string;
}

export async function registrarEntrada(dados: EntradaInput): Promise<number> {
  const veiculoId = await upsertVeiculo(dados);

  const [result] = await pool.execute(
    `INSERT INTO movimentacoes (veiculo_id, tipo, vaga, observacao)
     VALUES (?, 'entrada', ?, ?)`,
    [veiculoId, dados.vaga || null, dados.observacao || null]
  );

  return (result as any).insertId;
}

export interface SaidaResult {
  movimentacaoId: number;
  tempoEstadia: string;
  tempoMs: number;
}

export async function registrarSaida(placa: string): Promise<SaidaResult | null> {
  const [veiculoRows] = await pool.execute<any[]>(
    'SELECT id FROM veiculos WHERE placa = ?',
    [placa.toUpperCase()]
  );
  if (!veiculoRows.length) return null;

  const veiculoId = veiculoRows[0].id;

  // Última entrada sem saída correspondente
  const [entradaRows] = await pool.execute<any[]>(
    `SELECT id, data_hora, vaga
     FROM movimentacoes
     WHERE veiculo_id = ? AND tipo = 'entrada'
       AND id > COALESCE((
         SELECT MAX(id) FROM movimentacoes
         WHERE veiculo_id = ? AND tipo = 'saida'
       ), 0)
     ORDER BY id DESC LIMIT 1`,
    [veiculoId, veiculoId]
  );

  if (!entradaRows.length) return null;

  const entrada = entradaRows[0];

  const [result] = await pool.execute(
    `INSERT INTO movimentacoes (veiculo_id, tipo, vaga)
     VALUES (?, 'saida', ?)`,
    [veiculoId, entrada.vaga]
  );

  const dataEntrada = new Date(entrada.data_hora);
  const dataSaida   = new Date();
  const diffMs      = dataSaida.getTime() - dataEntrada.getTime();
  const horas       = Math.floor(diffMs / 3_600_000);
  const minutos     = Math.floor((diffMs % 3_600_000) / 60_000);

  return {
    movimentacaoId: (result as any).insertId,
    tempoEstadia:   `${horas}h ${minutos}min`,
    tempoMs:        diffMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────────────────────

export async function listarVeiculosNoPatio(): Promise<any[]> {
  const [rows] = await pool.execute<any[]>(`
    SELECT
      v.placa, v.marca, v.modelo, v.cor, v.ano, v.proprietario,
      m.data_hora AS entrada, m.vaga, m.id AS mov_id
    FROM movimentacoes m
    JOIN veiculos v ON m.veiculo_id = v.id
    WHERE m.tipo = 'entrada'
      AND NOT EXISTS (
        SELECT 1 FROM movimentacoes m2
        WHERE m2.veiculo_id = m.veiculo_id
          AND m2.tipo = 'saida'
          AND m2.id > m.id
      )
    ORDER BY m.data_hora DESC
  `);
  return rows;
}

export interface FiltroBusca {
  placa?:      string;
  dataInicio?: string;
  dataFim?:    string;
  limit?:      number;
}

export async function buscarHistorico(filtros: FiltroBusca): Promise<any[]> {
  let query = `
    SELECT
      m.id, m.tipo, m.data_hora, m.valor_cobrado, m.observacao, m.vaga,
      v.placa, v.marca, v.modelo, v.cor
    FROM movimentacoes m
    JOIN veiculos v ON m.veiculo_id = v.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filtros.placa) {
    query += ' AND v.placa LIKE ?';
    params.push(`%${filtros.placa.toUpperCase()}%`);
  }
  if (filtros.dataInicio) {
    query += ' AND m.data_hora >= ?';
    params.push(filtros.dataInicio);
  }
  if (filtros.dataFim) {
    query += ' AND m.data_hora <= ?';
    params.push(`${filtros.dataFim} 23:59:59`);
  }

  query += ' ORDER BY m.data_hora DESC LIMIT ?';
  params.push(filtros.limit ?? 100);

  const [rows] = await pool.execute<any[]>(query, params);
  return rows;
}

export async function getDashboard(): Promise<Record<string, number>> {
  const [[totalVeiculos]]    = await pool.execute<any[]>('SELECT COUNT(*) AS v FROM veiculos');
  const [[movHoje]]          = await pool.execute<any[]>("SELECT COUNT(*) AS v FROM movimentacoes WHERE DATE(data_hora) = CURDATE()");
  const [[veiculosNoPatio]]  = await pool.execute<any[]>(`
    SELECT COUNT(*) AS v
    FROM movimentacoes m
    WHERE m.tipo = 'entrada'
      AND NOT EXISTS (
        SELECT 1 FROM movimentacoes m2
        WHERE m2.veiculo_id = m.veiculo_id AND m2.tipo = 'saida' AND m2.id > m.id
      )
  `);

  return {
    totalVeiculos:    totalVeiculos.v,
    veiculosNoPatio:  veiculosNoPatio.v,
    movimentacoesHoje: movHoje.v,
  };
}
