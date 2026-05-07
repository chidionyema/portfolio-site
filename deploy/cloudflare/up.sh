#!/usr/bin/env bash
# One-command Cloudflare Pages activation for the portfolio-site UI.
# Idempotent — re-run safely.
#
#   deploy/cloudflare/up.sh
#
# What it does:
#   1.  Install missing tools (gh) via brew. wrangler runs via npx.
#   2.  Walk you through `gh auth login` and `wrangler login` if needed.
#   3.  Detect or prompt for the Cloudflare Pages project name +
#       the BFF URL the UI should call. Persists to deploy/cloudflare/.env.local.
#   4.  Create the Pages project on Cloudflare if missing.
#   5.  Build the Astro site with PUBLIC_API_URL inlined and run the
#       first deploy via wrangler pages deploy.
#   6.  Detect Cloudflare Account ID via wrangler whoami and set it as
#       a GitHub repo secret. Walk you through generating a Cloudflare
#       API token via the dashboard and pipe it into gh secret set
#       (token never lands on disk or in shell history). Set
#       PUBLIC_API_URL as a repo secret too so CI builds inline it.
#   7.  Print the live URL + a confirmation that auto-deploy is wired.

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_DIR="$ROOT_DIR/deploy/cloudflare"
ENV_FILE="$ENV_DIR/.env.local"
EXAMPLE="$ENV_DIR/.env.example"
REPO="${GITHUB_REPO:-chidionyema/portfolio-site}"

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
ok()    { printf '\033[32m%s\033[0m\n' "$*"; }
warn()  { printf '\033[33m%s\033[0m\n' "$*" >&2; }
fatal() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }
prompt(){ printf '\033[36m%s\033[0m ' "$*"; }

confirm() {
  local q="$1" reply
  prompt "$q [y/N]"
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# ─── 1.  Tools ────────────────────────────────────────────────────────────
bold "==> 1/7  Tools"
command -v node >/dev/null || fatal "node not installed. Install Node 20+: https://nodejs.org"
command -v npm  >/dev/null || fatal "npm not installed."

NEED_BREW=()
command -v gh >/dev/null || NEED_BREW+=(gh)
if [[ ${#NEED_BREW[@]} -gt 0 ]]; then
  command -v brew >/dev/null || fatal "brew not installed. https://brew.sh"
  if confirm "  Run 'brew install ${NEED_BREW[*]}'?"; then
    brew install "${NEED_BREW[@]}"
  else
    fatal "  Install required tools and re-run."
  fi
else
  ok "  node, npm, gh all present"
fi

# Make sure project deps are installed (needed for wrangler via npx + the build).
if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  bold "  Installing project dependencies (npm ci)..."
  ( cd "$ROOT_DIR" && npm ci --legacy-peer-deps )
fi

# ─── 2.  Auth ─────────────────────────────────────────────────────────────
bold "==> 2/7  Auth"
if gh auth status >/dev/null 2>&1; then
  ok "  gh:       authenticated"
else
  warn "  gh: not logged in. Starting interactive login..."
  gh auth login
fi

if npx --no-install wrangler whoami >/dev/null 2>&1; then
  ok "  wrangler: $(npx --no-install wrangler whoami 2>&1 | grep -m1 -E 'email|account' | sed 's/^[^a-zA-Z0-9]*//')"
else
  warn "  wrangler: not logged in. Opening browser for Cloudflare OAuth..."
  npx wrangler login
fi

# ─── 3.  Config ───────────────────────────────────────────────────────────
bold "==> 3/7  Config"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE" "$ENV_FILE"
  ok "  Created $ENV_FILE from template (gitignored)"
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

CLOUDFLARE_PAGES_PROJECT="${CLOUDFLARE_PAGES_PROJECT:-ritualworks}"
PUBLIC_API_URL="${PUBLIC_API_URL:-https://ritualworks-bffweb.fly.dev}"

ok "  Project name:     $CLOUDFLARE_PAGES_PROJECT"
ok "  BFF (API) URL:    $PUBLIC_API_URL"

# ─── 4.  Pages project ────────────────────────────────────────────────────
bold "==> 4/7  Cloudflare Pages project"
if npx wrangler pages project list 2>/dev/null | grep -qE "^\s*${CLOUDFLARE_PAGES_PROJECT}\s"; then
  ok "  Project '$CLOUDFLARE_PAGES_PROJECT' exists"
else
  ok "  Creating project '$CLOUDFLARE_PAGES_PROJECT'..."
  npx wrangler pages project create "$CLOUDFLARE_PAGES_PROJECT" --production-branch=main
fi

# ─── 5.  Build + first deploy ─────────────────────────────────────────────
bold "==> 5/7  Build + first deploy"
( cd "$ROOT_DIR" && PUBLIC_API_URL="$PUBLIC_API_URL" GIT_SHA="$(git rev-parse HEAD 2>/dev/null || echo 'manual')" npm run build )
( cd "$ROOT_DIR" && npx wrangler pages deploy dist --project-name="$CLOUDFLARE_PAGES_PROJECT" --branch=main )

# ─── 6.  GitHub Actions secrets ───────────────────────────────────────────
bold "==> 6/7  GitHub Actions deploy secrets"

# Account ID — derive from `wrangler whoami`.
ACCOUNT_ID="$(npx wrangler whoami 2>&1 | grep -oE '[a-f0-9]{32}' | head -1 || true)"
if [[ -z "$ACCOUNT_ID" ]]; then
  prompt "  Couldn't auto-detect Cloudflare Account ID. Paste it (32 hex chars):"
  read -r ACCOUNT_ID
fi

if gh secret list --repo "$REPO" 2>/dev/null | grep -q '^CLOUDFLARE_ACCOUNT_ID'; then
  ok "  CLOUDFLARE_ACCOUNT_ID already set on $REPO"
else
  echo "$ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID --repo "$REPO"
  ok "  CLOUDFLARE_ACCOUNT_ID set"
fi

if gh secret list --repo "$REPO" 2>/dev/null | grep -q '^PUBLIC_API_URL'; then
  ok "  PUBLIC_API_URL already set on $REPO"
else
  echo "$PUBLIC_API_URL" | gh secret set PUBLIC_API_URL --repo "$REPO"
  ok "  PUBLIC_API_URL set"
fi

if gh secret list --repo "$REPO" 2>/dev/null | grep -q '^CLOUDFLARE_API_TOKEN'; then
  ok "  CLOUDFLARE_API_TOKEN already set on $REPO — leaving alone"
  warn "  (re-run with FORCE_ROTATE_TOKEN=1 to rotate)"
  if [[ "${FORCE_ROTATE_TOKEN:-0}" == "1" ]]; then
    bold "  Rotating CLOUDFLARE_API_TOKEN..."
    cat <<'TOKEN_GUIDE'

  Open this URL in your browser to create a NEW deploy token:

    https://dash.cloudflare.com/profile/api-tokens

  Click "Create Token" → "Custom token". Permissions:
    Account → Cloudflare Pages → Edit
    Account → Account Settings → Read

  Account Resources: include only your account.
  No IP/zone restrictions needed.

  Copy the token (won't be shown again). Paste it here (no echo):
TOKEN_GUIDE
    prompt "  Token:"
    read -rs CF_TOKEN; echo
    [[ -n "$CF_TOKEN" ]] || fatal "  empty token"
    echo "$CF_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --repo "$REPO"
    ok "  rotated"
  fi
else
  cat <<'TOKEN_GUIDE'

  Open this URL in your browser to create a deploy token:

    https://dash.cloudflare.com/profile/api-tokens

  Click "Create Token" → "Custom token". Permissions:
    Account → Cloudflare Pages → Edit
    Account → Account Settings → Read

  Account Resources: include only your account.
  No IP/zone restrictions needed.

  Copy the token (won't be shown again). Paste it here (no echo):
TOKEN_GUIDE
  prompt "  Token:"
  read -rs CF_TOKEN; echo
  [[ -n "$CF_TOKEN" ]] || fatal "  empty token"
  echo "$CF_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --repo "$REPO"
  ok "  CLOUDFLARE_API_TOKEN set"
fi

# ─── 7.  Status ───────────────────────────────────────────────────────────
bold "==> 7/7  Status"
echo
echo "  Project:    $CLOUDFLARE_PAGES_PROJECT"
echo "  Live URL:   https://${CLOUDFLARE_PAGES_PROJECT}.pages.dev"
[[ -n "${CUSTOM_DOMAIN:-}" ]] && echo "  Custom:     $CUSTOM_DOMAIN"
echo "  API URL:    $PUBLIC_API_URL"
echo "  Auto-deploy: every push to main now triggers Cloudflare Pages deploy"
echo "               via .github/workflows/deploy.yml"
echo
ok "Done."
