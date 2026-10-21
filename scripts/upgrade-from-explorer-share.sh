#!/usr/bin/env bash
# Build first, then stop and COPY the old storage. The old data stays untouched.
set -Eeuo pipefail
if [[ ${1:-} == --help || $# -lt 2 ]]; then
  printf 'Usage: bash scripts/upgrade-from-explorer-share.sh OLD_CONTAINER /absolute/new/data/path [PORT]\n'
  printf 'Run in a fresh windows7-desktop checkout. Requires Docker and a writable destination parent.\n'
  exit 0
fi
cd "$(dirname "$0")/.."
old_container=$1
destination=$(realpath -m -- "$2")
port=${3:-3000}
[[ $destination == /* && $destination != / && $destination != *'"'* && $destination != *$'\n'* ]] || { echo 'Invalid destination path.' >&2; exit 1; }
[[ $port =~ ^[0-9]+$ && $port -ge 1 && $port -le 65535 ]] || { echo 'Invalid port.' >&2; exit 1; }
[[ ! -e .env ]] || { echo 'A .env already exists. Use a fresh checkout so no configuration is overwritten.' >&2; exit 1; }
if [[ -d $destination ]] && [[ -n $(find "$destination" -mindepth 1 -maxdepth 1 -print -quit) ]]; then echo 'Destination must be new or empty.' >&2; exit 1; fi
docker inspect "$old_container" >/dev/null
mount_type=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/Explorer"}}{{.Type}}{{end}}{{end}}' "$old_container")
[[ $mount_type == bind || $mount_type == volume ]] || { echo 'No /Explorer mount found. Use the manual upgrade guide for older storage layouts.' >&2; exit 1; }
old_source=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/Explorer"}}{{.Source}}{{end}}{{end}}' "$old_container")
old_source=$(realpath -m -- "$old_source")
[[ $destination != "$old_source" && $destination != "$old_source/"* ]] || { echo 'Destination must be outside the original storage.' >&2; exit 1; }
[[ -z $(docker compose -f compose.yaml ps -q) ]] || { echo 'A windows7-desktop Compose instance already exists. Use the manual guide.' >&2; exit 1; }
old_running=$(docker inspect -f '{{.State.Running}}' "$old_container")
cookie_secure=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$old_container" | sed -n 's/^COOKIE_SECURE=//p')
[[ $cookie_secure == 1 ]] || cookie_secure=0
printf 'Building the new image; the old instance keeps running during this step.\n'
docker compose -f compose.yaml build explorer
mkdir -p -- "$destination"
stopped=0
rollback(){ result=$?; if [[ $result -ne 0 && $stopped == 1 ]]; then
  echo 'Upgrade failed. Stopping the new instance and restarting the old one.' >&2
  docker compose -f compose.yaml -f compose.bind.yaml down || true
  if [[ $old_running == true ]]; then docker start "$old_container" || true; fi
fi; exit "$result"; }
trap rollback EXIT
docker stop "$old_container" >/dev/null
stopped=1
printf 'Copying the complete /Explorer tree, including hidden account data and recycle bins.\n'
docker run --rm --user 0 --volumes-from "$old_container:ro" --mount "type=bind,source=$destination,target=/Upgrade" windows7-desktop:local sh -c 'test -f /Explorer/.explorer/database.json && cp -a /Explorer/. /Upgrade/ && chown -R 1000:1000 /Upgrade'
printf 'EXPLORER_PATH="%s"\nEXPLORER_PORT=%s\nEXPLORER_BIND_ADDRESS=0.0.0.0\nCOOKIE_SECURE=%s\n' "$destination" "$port" "$cookie_secure" > .env
docker compose -f compose.yaml -f compose.bind.yaml up -d --wait --wait-timeout 90
stopped=0
printf '\nUpgrade complete. The old container is stopped; its original storage is unchanged.\n'
printf 'New data: %s\nPort: %s\n' "$destination" "$port"
printf 'Rollback: stop the new Compose project, then: docker start %q\n' "$old_container"
