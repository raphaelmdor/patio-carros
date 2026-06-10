-- =============================================================================
-- Pátio de Carros — Schema do Banco de Dados
-- =============================================================================

CREATE DATABASE IF NOT EXISTS patio_carros
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE patio_carros;

-- -----------------------------------------------------------------------------
-- Veículos cadastrados
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS veiculos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  placa         VARCHAR(8)   NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- Movimentações de entrada e saída
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimentacoes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  veiculo_id    INT          NOT NULL,
  tipo          ENUM('entrada', 'saida') NOT NULL,
  vaga          VARCHAR(10),           -- Ex: 'A-01', 'B-05'
  data_hora     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  observacao    TEXT,
  valor_cobrado DECIMAL(10, 2),
  FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE,
  INDEX idx_veiculo (veiculo_id),
  INDEX idx_data_hora (data_hora),
  INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- Dados de demonstração (opcional)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO veiculos (placa, marca, modelo, cor, ano, proprietario, municipio, uf)
VALUES
  ('ABC1234', 'Volkswagen', 'Gol',   'Branco', 2019, 'João Silva',    'Rio de Janeiro', 'RJ'),
  ('XYZ5678', 'Fiat',       'Palio', 'Vermelho', 2018, 'Maria Santos', 'Niterói',        'RJ'),
  ('DEF9J12', 'Chevrolet',  'Onix',  'Prata',  2023, 'Carlos Souza', 'Rio de Janeiro', 'RJ');
