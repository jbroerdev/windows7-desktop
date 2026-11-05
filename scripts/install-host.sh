#!/usr/bin/env bash
# Migrate an existing desktop to a native Linux systemd service. Apps stay in Docker.
set -Eeuo pipefail
umask 077
source_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
container=windows7-desktop-explorer-1
install_root=/opt/windows7-host
port=3000
bind=0.0.0.0
while (($#)); do
  case "$1" in
    --from-container) container=$2;shift 2;;
    --install-root) install_root=$2;shift 2;;
    --port) port=$2;shift 2;;
    --bind) bind=$2;shift 2;;
    --help) printf 'sudo bash scripts/install-host.sh [--from-container NAME] [--install-root /opt/windows7-host] [--port 3000] [--bind 0.0.0.0]\nRequires: Linux with systemd, Docker and an existing configured desktop/app stack. Reuses its data, secrets and official Node runtime.\n';exit 0;;
    *) echo "Unknown option: $1" >&2;exit 2;;
  esac
done
[[ $EUID == 0 ]] || { echo 'Run with sudo/root.' >&2;exit 1; }
[[ $install_root =~ ^/opt/[a-zA-Z0-9_-]+$ && $port =~ ^[0-9]+$ && $port -ge 1024 && $port -le 65535 && $bind =~ ^[a-zA-Z0-9.:_-]+$ && $container =~ ^[a-zA-Z0-9_.-]+$ ]] || { echo 'Invalid installation options.' >&2;exit 1; }
[[ $bind == 0.0.0.0 ]] || { echo 'This Docker callback bridge currently requires --bind 0.0.0.0. Restrict external access using your host firewall/reverse proxy.' >&2;exit 1; }
for tool in docker systemctl python3 tar; do command -v "$tool" >/dev/null || { echo "Missing prerequisite: $tool" >&2;exit 1; };done
[[ $(uname -s) == Linux ]] || { echo 'Only Linux/systemd hosts are supported.' >&2;exit 1; }
docker inspect "$container" >/dev/null
[[ ! -e /etc/windows7-desktop/migration.json ]] || { echo 'Host installation already exists. Use update-host.sh or rollback-host.sh.' >&2;exit 1; }
mkdir -p "$install_root/app" "$install_root/runtime" /etc/windows7-desktop /var/lib/windows7-host
chmod 755 "$install_root" "$install_root/app" "$install_root/runtime"
chmod 700 /etc/windows7-desktop /var/lib/windows7-host
docker inspect "$container" > /etc/windows7-desktop/container-backup.json
docker cp "$container:/app/." "$install_root/app/"
docker cp "$container:/usr/local/bin/node" "$install_root/runtime/node"
chmod 755 "$install_root/runtime/node"
"$install_root/runtime/node" -e 'const [a,b]=process.versions.node.split(".").map(Number);if(a<24||(a===24&&b<18))process.exit(1)' || { echo 'A compatible Node 24 runtime and host C++ libraries are required.' >&2;exit 1; }
if ! command -v ffmpeg >/dev/null;then
  if command -v apt-get >/dev/null;then apt-get update -qq && apt-get install -y --no-install-recommends ffmpeg
  elif command -v dnf >/dev/null;then echo 'Install ffmpeg from your distribution before migration.' >&2;exit 1
  else echo 'Missing prerequisite: ffmpeg' >&2;exit 1;fi
fi
if command -v apt-get >/dev/null;then
  missing=()
  command -v ping >/dev/null || missing+=(iputils-ping)
  command -v nslookup >/dev/null || missing+=(dnsutils)
  command -v traceroute >/dev/null || missing+=(traceroute)
  command -v mtr >/dev/null || missing+=(mtr-tiny)
  command -v ip >/dev/null || missing+=(iproute2)
  if ((${#missing[@]}));then apt-get update -qq && apt-get install -y --no-install-recommends "${missing[@]}";fi
fi
# Merge source changes without removing generated editor assets or runtime dependencies.
cp "$source_root"/*.mjs "$install_root/app/"
cp -a "$source_root/public/." "$install_root/app/public/"
chmod -R a+rX "$install_root/app"
install -m 755 "$source_root/scripts/host-agent.py" "$install_root/host-agent.py"
install -m 644 "$source_root/scripts/host_files.py" "$install_root/host_files.py"
install -m 644 "$source_root/scripts/host_network.py" "$install_root/host_network.py"
install -m 644 "$source_root/scripts/host_uploads.py" "$install_root/host_uploads.py"
install -m 644 "$source_root/scripts/host-relay.mjs" "$install_root/host-relay.mjs"
install -m 644 "$source_root/scripts/host-monitor.py" "$install_root/host-monitor.py"
cp "$source_root/WINDOWS7-TODO.md" "$install_root/"
if ! id windows7-desktop >/dev/null 2>&1; then
  if ! getent passwd 1000 >/dev/null;then useradd --system --uid 1000 --no-create-home --home-dir /var/lib/windows7-host --shell /usr/sbin/nologin windows7-desktop
  else useradd --system --no-create-home --home-dir /var/lib/windows7-host --shell /usr/sbin/nologin windows7-desktop;fi
fi
python3 "$source_root/scripts/configure-host.py" "$container" "$install_root" "$port" "$bind"
systemctl daemon-reload
stopped=0
rollback(){ local result=$?;if ((result!=0 && stopped));then echo 'Migration failed: restoring the Docker desktop and data ownership.' >&2;bash "$source_root/scripts/rollback-host.sh" || true;fi;exit "$result"; }
trap rollback EXIT
systemctl enable --now windows7-host-agent
docker stop "$container" >/dev/null
stopped=1
python3 "$source_root/scripts/configure-host.py" --relay
systemctl enable --now windows7-desktop windows7-host-monitor
systemctl restart windows7-host-monitor
for attempt in $(seq 1 45);do
  if "$install_root/runtime/node" -e "fetch('http://127.0.0.1:$port/api/session').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))";then
    docker update --restart=no "$container" >/dev/null
    echo 'Native desktop installed. Apps remain in Docker. Rollback: sudo bash scripts/rollback-host.sh'
    exit 0
  fi
  sleep 2
done
echo 'Host desktop did not become healthy.' >&2
exit 1
