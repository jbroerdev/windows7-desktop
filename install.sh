#!/usr/bin/env bash
# Entry point: migrate a running stack, or bootstrap a fresh native desktop.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
if [[ ${1:-} == --fresh ]];then
  shift
  [[ $EUID == 0 ]] || { echo 'Run with sudo.' >&2;exit 1; }
  [[ ! -e /etc/windows7-desktop/migration.json ]] || { echo 'Host installation exists. Use scripts/update-host.sh.' >&2;exit 1; }
  command -v docker >/dev/null || { echo 'Install Docker Engine first: https://docs.docker.com/engine/install/' >&2;exit 1; }
  image=${WINDOWS7_IMAGE:-windows7-desktop:local}
  data=${WINDOWS7_DATA:-/Explorer}
  [[ $data =~ ^/[a-zA-Z0-9_/-]+$ && $data != / && $data != /etc && $data != /usr && $data != /var && $data != /home ]] || { echo 'Invalid data path.' >&2;exit 1; }
  if [[ -d $data && -n $(find "$data" -mindepth 1 -maxdepth 1 -print -quit) ]];then echo '--fresh requires a new/empty data directory. For an existing desktop use --from-container.' >&2;exit 1;fi
  if ! docker image inspect "$image" >/dev/null 2>&1;then
    docker build --memory=512m --memory-swap=1g --cpu-quota=50000 -t "$image" "$root"
  fi
  mkdir -p "$data"
  if ! docker network inspect windows7-desktop_default >/dev/null 2>&1;then docker network create windows7-desktop_default >/dev/null;fi
  args=(docker create --name windows7-desktop-seed --network windows7-desktop_default --label com.docker.compose.project=windows7-desktop --label com.docker.compose.service=explorer --mount "type=bind,source=$data,target=/Explorer")
  if [[ -n ${WINDOWS7_ENV_FILE:-} ]];then args+=(--env-file "$WINDOWS7_ENV_FILE");fi
  args+=("$image")
  "${args[@]}" >/dev/null
  for network in windows7-desktop_browser-api;do
    if docker network inspect "$network" >/dev/null 2>&1;then docker network connect "$network" windows7-desktop-seed;fi
  done
  exec bash "$root/scripts/install-host.sh" --from-container windows7-desktop-seed "$@"
fi
exec bash "$root/scripts/install-host.sh" "$@"
