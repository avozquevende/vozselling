#!/usr/bin/env bash
# Deploy para a VPS de produção (handoff, seção 04).
# rsync do código -> build -> restart do systemd -> healthcheck.
# A pasta data/ é sagrada: nunca usar --delete sobre ela.
set -euo pipefail

VPS_HOST="${VPS_HOST:?defina VPS_HOST, ex: usuario@app.dreamrobot.com.br}"
VPS_PATH="${VPS_PATH:-/var/www/dreamrobot}"
SERVICO="${SERVICO:-dreamrobot}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://app.dreamrobot.com.br/api/health}"

echo "==> Enviando código para ${VPS_HOST}:${VPS_PATH}"
rsync -az --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'data' \
  --exclude '.env.local' \
  ./ "${VPS_HOST}:${VPS_PATH}/"

echo "==> Instalando dependências e buildando no servidor"
ssh "${VPS_HOST}" "cd ${VPS_PATH} && npm ci && npm run build"

echo "==> Reiniciando serviço ${SERVICO}"
ssh "${VPS_HOST}" "sudo systemctl restart ${SERVICO}"

echo "==> Healthcheck"
sleep 2
curl -fsS "${HEALTHCHECK_URL}" && echo "OK"
