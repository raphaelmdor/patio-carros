#!/usr/bin/env bash
# =============================================================================
# setup-github.sh — Cria o repositório no GitHub e faz o primeiro push
#
# Pré-requisitos:
#   - git instalado
#   - GitHub CLI (gh) instalado e autenticado  →  gh auth login
#     Instalação: https://cli.github.com
# =============================================================================

set -euo pipefail

# ── Configurações ─────────────────────────────────────────────────────────────
REPO_NAME="patio-carros"
REPO_DESC="🚗 Sistema desktop de controle de pátio de carros com integração DETRAN"
VISIBILITY="private"   # "public" ou "private"
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         Pátio de Carros — Setup GitHub               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Verifica pré-requisitos
if ! command -v git &>/dev/null; then
  echo "❌ git não encontrado. Instale em https://git-scm.com"
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo "❌ GitHub CLI (gh) não encontrado."
  echo "   Instale em: https://cli.github.com"
  echo "   Depois rode: gh auth login"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "❌ GitHub CLI não está autenticado."
  echo "   Execute: gh auth login"
  exit 1
fi

echo "✅ Pré-requisitos OK"
echo ""

# Inicializa git (se ainda não estiver inicializado)
if [ ! -d ".git" ]; then
  echo "📁 Inicializando repositório git..."
  git init
  git branch -M main
fi

# Configura .env se ainda não existir
if [ ! -f ".env" ]; then
  echo "📋 Copiando .env.example → .env"
  cp .env.example .env
  echo "   ⚠️  Edite o arquivo .env com suas credenciais MySQL antes de rodar o app."
fi

# Primeiro commit
echo ""
echo "📝 Criando commit inicial..."
git add .
git commit -m "feat: initial project setup

- Electron + TypeScript + MySQL
- Entrada/saída de veículos
- Integração com API DETRAN (com fallback mock)
- Dashboard, pátio atual e histórico
- CLAUDE.md para contexto do Claude Code" 2>/dev/null || echo "   (nada novo para commitar)"

# Cria repositório no GitHub e faz push
echo ""
echo "🚀 Criando repositório '$REPO_NAME' no GitHub ($VISIBILITY)..."

gh repo create "$REPO_NAME" \
  --description "$REPO_DESC" \
  --"$VISIBILITY" \
  --source=. \
  --remote=origin \
  --push

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Pronto! Repositório criado e código enviado.     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Exibe a URL do repositório
REPO_URL=$(gh repo view --json url -q .url 2>/dev/null || echo "Verifique em github.com")
echo "🔗 $REPO_URL"
echo ""
echo "Próximo passo: edite o .env com suas credenciais MySQL"
echo "e rode:  npm install && npm start"
echo ""
