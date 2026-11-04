#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID == 0 ]] || { echo 'Run as root.' >&2;exit 1; }
container=$(python3 -c 'import json;print(json.load(open("/etc/windows7-desktop/migration.json"))["container"])')
restart_policy=$(python3 -c 'import json;print(json.load(open("/etc/windows7-desktop/migration.json")).get("restartPolicy") or "no")')
[[ $container =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 1
[[ $restart_policy =~ ^(no|always|unless-stopped|on-failure(:[0-9]+)?)$ ]] || exit 1
systemctl disable --now windows7-desktop windows7-host-agent
docker stop windows7-host-relay >/dev/null || true
python3 - <<'RESTORE'
import json,pathlib,os,re
config=pathlib.Path('/etc/windows7-desktop');saved=json.loads((config/'migration.json').read_text());root=pathlib.Path(saved['dataRoot']).resolve();uid=saved.get('originalUid',1000);gid=saved.get('originalGid',1000)
if root==pathlib.Path('/'):raise ValueError('Unsafe data root')
for current,dirs,files in os.walk(root,followlinks=False):
    for item in [current]+[os.path.join(current,name) for name in files+dirs]:
        try:os.chown(item,uid,gid,follow_symlinks=False)
        except FileNotFoundError:pass
ownership=config/'data-ownership.json'
if ownership.exists():
    for relative,old_uid,old_gid in json.loads(ownership.read_text()):
        item=os.path.abspath(root/relative)
        if os.path.commonpath([str(root),item])!=str(root):raise ValueError('Unsafe ownership path')
        try:os.chown(item,old_uid,old_gid,follow_symlinks=False)
        except FileNotFoundError:pass
monitor=pathlib.Path(saved['installRoot'])/'host-monitor.py';text=monitor.read_text();monitor.write_text(re.sub(r'os.chown\(temporary, 0, \d+\)',f'os.chown(temporary, 0, {gid})',text))
RESTORE
systemctl restart windows7-host-monitor
docker update --restart="$restart_policy" "$container" >/dev/null
docker start "$container" >/dev/null
echo 'Docker desktop restored. Application containers and desktop files were retained.'
