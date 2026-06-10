# 🚗 Pátio de Carros

Sistema desktop de controle de entrada e saída de veículos, com integração ao DETRAN para preenchimento automático de dados via placa.

---

## Stack

| Camada     | Tecnologia               |
|------------|--------------------------|
| Desktop    | Electron 30              |
| Back-end   | Node.js + TypeScript     |
| Banco      | MySQL 8 via `mysql2`     |
| API DETRAN | Configurável via `.env`  |

---

## Pré-requisitos

- Node.js ≥ 18
- MySQL 8 rodando localmente (ou acessível em rede)
- npm ≥ 9

---

## Instalação

```bash
# 1. Clone / extraia o projeto
cd patio-carros

# 2. Instale as dependências
npm install

# 3. Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais MySQL e, opcionalmente, a chave da API DETRAN
```

---

## Banco de dados

Crie o banco antes de rodar o app:

```sql
CREATE DATABASE patio_carros CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

O app cria as tabelas automaticamente na primeira execução.
Opcionalmente, você pode rodar `database/schema.sql` para criar tudo com dados de demonstração.

---

## Rodando o app

```bash
# Compilar TypeScript + abrir o app Electron
npm start

# Modo desenvolvimento (hot-reload do TypeScript)
npm run dev
```

---

## Integração com o DETRAN

O sistema é compatível com qualquer API que siga o padrão:

```
GET {DETRAN_API_URL}/{PLACA}
Authorization: Bearer {DETRAN_API_KEY}
```

Configure no `.env`:
```
DETRAN_API_URL=https://api.seuprovedor.com.br/placa
DETRAN_API_KEY=sua_chave_aqui
```

### Sem API configurada → Modo demonstração

Se `DETRAN_API_KEY` não estiver configurada, o sistema usa dados de mock.
Placas de teste: `ABC1234`, `XYZ5678`, `DEF9J12`, `GHI3456`, `JKL7890`.

### Provedores compatíveis (exemplos)

| Provedor        | Site                      |
|-----------------|---------------------------|
| ApiCarros       | apicarros.com             |
| ConsultaPlacas  | consultaplacas.com.br     |
| PlacaFipe       | placafipe.com.br          |
| Múltiplos       | rapidapi.com (buscar placa Brasil) |

---

## Funcionalidades

- ✅ **Entrada** — consulta placa no DETRAN e preenche os dados automaticamente
- ✅ **Saída** — registra a saída e calcula o tempo de estadia
- ✅ **Pátio Atual** — lista todos os veículos presentes com cronômetro
- ✅ **Dashboard** — cards com visão geral e últimas movimentações
- ✅ **Histórico** — filtro por placa e período

---

## Estrutura do Projeto

```
patio-carros/
├── src/
│   ├── main/                 # Processo principal do Electron (TypeScript)
│   │   ├── index.ts          # Entry point — cria janela, inicia DB
│   │   ├── preload.ts        # Expõe window.api ao renderer (seguro)
│   │   ├── database.ts       # Conexão MySQL + todas as queries
│   │   ├── ipcHandlers.ts    # Handlers IPC (bridge main ↔ renderer)
│   │   └── detranService.ts  # Consulta de placa (real ou mock)
│   └── renderer/             # Interface gráfica (HTML/CSS/JS puro)
│       ├── index.html
│       ├── styles.css
│       └── renderer.js
├── database/
│   └── schema.sql            # Schema completo com dados de exemplo
├── dist/                     # TypeScript compilado (gerado pelo `npm run build`)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Próximos Passos Sugeridos

- [ ] Gestão de vagas (cadastro, tipos: comum/idoso/deficiente/moto)
- [ ] Cálculo de tarifas por hora
- [ ] Relatórios em PDF (diário/mensal)
- [ ] Impressão de ticket de entrada
- [ ] Backup automático do banco de dados
- [ ] Autenticação de usuário (operador/administrador)
- [ ] Notificações de veículos com tempo longo no pátio
