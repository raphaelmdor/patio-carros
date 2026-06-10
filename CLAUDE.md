# Pátio de Carros — Contexto para Claude Code

## Visão Geral
Sistema desktop de controle de entrada e saída de veículos em pátio/estacionamento.
Integração com API do DETRAN para preenchimento automático de dados via placa.

## Stack
- **Desktop:** Electron 30
- **Back-end:** Node.js + TypeScript (processo principal do Electron)
- **Banco de dados:** MySQL 8 via `mysql2`
- **UI:** HTML + CSS + JavaScript puro (sem framework no renderer)
- **Comunicação main ↔ renderer:** IPC com `contextBridge` (Electron seguro)

## Estrutura do Projeto
```
src/
  main/
    index.ts          # Entry point Electron — janela + inicialização
    preload.ts        # Expõe window.api ao renderer via contextBridge
    database.ts       # Pool MySQL + todas as queries (upsert, entrada, saída, etc.)
    ipcHandlers.ts    # Handlers ipcMain.handle() para cada operação
    detranService.ts  # Consulta de placa: API real ou mock automático
  renderer/
    index.html        # SPA com 5 abas (Dashboard, Entrada, Saída, Pátio, Histórico)
    styles.css        # Tema escuro profissional
    renderer.js       # Lógica de UI, chamadas via window.api
database/
  schema.sql          # Schema completo + dados de demonstração
```

## Variáveis de Ambiente (`.env`)
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=patio_carros
DETRAN_API_URL=       # opcional — sem isso usa mock
DETRAN_API_KEY=       # opcional — sem isso usa mock
NODE_ENV=development
```

## Comandos de Desenvolvimento
```bash
npm install           # instalar dependências
npm start             # compilar TypeScript + abrir app
npm run dev           # modo watch (TypeScript) + Electron
npm run build         # só compilar TypeScript
npm run clean         # limpar pasta dist/
```

## Padrões de Código
- TypeScript estrito (`"strict": true`) em todo o processo main
- Renderer usa JavaScript puro (não compilado) para simplicidade
- Queries SQL ficam todas em `database.ts`
- Cada handler IPC retorna `{ success: true, data }` ou `{ success: false, error }`
- Validação básica nos handlers antes de chamar o banco

## Integração DETRAN
- Arquivo: `src/main/detranService.ts`
- Sem `DETRAN_API_KEY` configurada → usa dados mock automaticamente
- Placas mock disponíveis: `ABC1234`, `XYZ5678`, `DEF9J12`, `GHI3456`, `JKL7890`
- Suporta formato antigo (`ABC1234`) e Mercosul (`ABC1D23`)
- Normaliza campos da resposta pois cada provedor usa nomes diferentes

## Banco de Dados
Tabelas:
- `veiculos` — cadastro com `placa` como unique key, upsert automático na entrada
- `movimentacoes` — log de entradas/saídas com `tipo ENUM('entrada','saida')`

Lógica de "veículo no pátio": última movimentação do veículo é `entrada` E não existe `saida` posterior.

## Funcionalidades Implementadas
- [x] Dashboard com cards e últimas movimentações
- [x] Entrada com consulta DETRAN + preenchimento automático
- [x] Saída com cálculo de tempo de estadia
- [x] Lista de veículos presentes no pátio com tempo em tempo real
- [x] Histórico com filtros por placa e período
- [x] Saída rápida direto da tela do pátio

## Próximas Funcionalidades (backlog)
- [ ] Gestão de vagas (cadastro, tipos: comum / idoso / deficiente / moto)
- [ ] Cálculo de tarifas por hora com tabela configurável
- [ ] Relatórios em PDF (diário / mensal)
- [ ] Impressão de ticket de entrada
- [ ] Autenticação (operador / administrador)
- [ ] Notificação de veículos com tempo longo no pátio
- [ ] Backup automático do banco
- [ ] Testes automatizados (Vitest para serviços, Playwright para E2E)
