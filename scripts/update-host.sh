#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID == 0 ]] || { echo 'Run with sudo.' >&2;exit 1; }
source_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
install_root=$(python3 -c 'import json;print(json.load(open("/etc/windows7-desktop/migration.json"))["installRoot"])')
[[ $install_root =~ ^/opt/[a-zA-Z0-9_-]+$ ]] || exit 1
mkdir -p /var/backups/windows7-host
chmod 700 /var/backups/windows7-host
backup="/var/backups/windows7-host/update-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$backup" -C "$install_root/app" --exclude=node_modules --exclude='*.tar.gz' .
cp "$install_root/host-agent.py" "$backup.agent"
if [[ -f "$install_root/host_files.py" ]];then cp "$install_root/host_files.py" "$backup.host_files";fi
if [[ -f "$install_root/host_network.py" ]];then cp "$install_root/host_network.py" "$backup.host_network";fi
if [[ -f "$install_root/host_uploads.py" ]];then cp "$install_root/host_uploads.py" "$backup.host_uploads";fi
systemctl stop windows7-desktop
rollback(){ local result=$?;if ((result));then tar -xzf "$backup" -C "$install_root/app";cp "$backup.agent" "$install_root/host-agent.py";if [[ -f "$backup.host_files" ]];then cp "$backup.host_files" "$install_root/host_files.py";fi;if [[ -f "$backup.host_network" ]];then cp "$backup.host_network" "$install_root/host_network.py";fi;if [[ -f "$backup.host_uploads" ]];then cp "$backup.host_uploads" "$install_root/host_uploads.py";fi;systemctl restart windows7-host-agent;systemctl start windows7-desktop;fi;exit "$result"; }
trap rollback EXIT
cp "$source_root"/*.mjs "$install_root/app/"
cp -a "$source_root/public/." "$install_root/app/public/"
chmod -R a+rX "$install_root/app"
"$install_root/runtime/node" --check "$install_root/app/backend.mjs"
install -m 755 "$source_root/scripts/host-agent.py" "$install_root/host-agent.py"
install -m 644 "$source_root/scripts/host_files.py" "$install_root/host_files.py"
install -m 644 "$source_root/scripts/host_network.py" "$install_root/host_network.py"
install -m 644 "$source_root/scripts/host_uploads.py" "$install_root/host_uploads.py"
systemctl restart windows7-host-agent
systemctl start windows7-desktop
systemctl restart windows7-host-monitor
port=$(python3 -c 'import json;print(json.load(open("/etc/windows7-desktop/migration.json"))["port"])')
for i in $(seq 1 15);do
  if "$install_root/runtime/node" -e "fetch('http://127.0.0.1:$port/api/session').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))";then echo 'Host desktop updated; app containers unchanged.';exit 0;fi
  sleep 2
done
exit 1
