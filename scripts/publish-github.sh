#!/usr/bin/env bash
# Create the public GitHub repo, set the dsh-plugin topic, and push main.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OWNER="${GITHUB_OWNER:-hugohe3}"
REPO="${GITHUB_REPO:-dsh-plugin-session-archive}"
REMOTE="https://github.com/${OWNER}/${REPO}.git"

if ! command -v git >/dev/null; then
  echo "git is required" >&2
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Set GITHUB_TOKEN to a token with repo scope, then rerun." >&2
  echo "  GITHUB_TOKEN=... GITHUB_OWNER=${OWNER} ./scripts/publish-github.sh" >&2
  exit 1
fi

auth_header="Authorization: Bearer ${GITHUB_TOKEN}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "this directory is not a git repository" >&2
  exit 1
fi

create_payload="$(cat <<EOF
{"name":"${REPO}","description":"Browse and permanently delete archived DeepSeek Harness sessions from the sidebar footer.","homepage":"https://github.com/${OWNER}/${REPO}","private":false,"has_issues":true,"has_wiki":false,"auto_init":false}
EOF
)"

status="$(curl -sS -o /tmp/dsh-gh-create.json -w '%{http_code}' \
  -X POST \
  -H "$auth_header" \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  https://api.github.com/user/repos \
  -d "$create_payload")"

if [[ "$status" != "201" && "$status" != "422" ]]; then
  echo "failed to create repo (HTTP ${status}):" >&2
  cat /tmp/dsh-gh-create.json >&2
  exit 1
fi

topic_payload='{"names":["dsh-plugin","deepseek-harness","dsh","session"]}'
topic_status="$(curl -sS -o /tmp/dsh-gh-topics.json -w '%{http_code}' \
  -X PUT \
  -H "$auth_header" \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "https://api.github.com/repos/${OWNER}/${REPO}/topics" \
  -d "$topic_payload")"

if [[ "$topic_status" != "200" ]]; then
  echo "warning: failed to set topics (HTTP ${topic_status})" >&2
  cat /tmp/dsh-gh-topics.json >&2
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

git push -u "https://${GITHUB_TOKEN}@github.com/${OWNER}/${REPO}.git" HEAD:main
echo "published: ${REMOTE}"
echo "confirm the topic at: ${REMOTE#"git+"}/settings"
