#!/usr/bin/env python3
import json,sys,pathlib,subprocess,os,pwd,ipaddress,shutil
CONFIG=pathlib.Path('/etc/windows7-desktop')
def unit(name,text):pathlib.Path('/etc/systemd/system/'+name+'.service').write_text(text)
if sys.argv[1:] == ['--relay']:
    saved=json.loads((CONFIG/'migration.json').read_text());networks=saved['networks'];root=saved['installRoot'];image=saved['image']
    args=['docker','run','-d','--restart','unless-stopped','--name','windows7-host-relay','--network',networks[0],'--network-alias','explorer','--add-host','host.docker.internal:host-gateway','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','96m','--pids-limit','64','-e','DESKTOP_PORT='+str(saved['port']),'-v',root+'/host-relay.mjs:/host-relay.mjs:ro',image,'node','/host-relay.mjs']
    subprocess.run(args,check=True)
    for network in networks[1:]:subprocess.run(['docker','network','connect','--alias','explorer',network,'windows7-host-relay'],check=True)
    sys.exit(0)
container,root,port,bind=sys.argv[1:];inspect=json.loads(subprocess.check_output(['docker','inspect',container]))[0];account=pwd.getpwnam('windows7-desktop')
env=dict(item.split('=',1) for item in inspect['Config']['Env'] if '=' in item);env={k:v for k,v in env.items() if k not in ('PATH','NODE_VERSION','YARN_VERSION','HOSTNAME')}
data=next(m['Source'] for m in inspect['Mounts'] if m['Destination']=='/Explorer')
data=str(pathlib.Path(data).resolve())
if data in ('/','/etc','/usr','/var','/home','/opt') or '\n' in data:raise ValueError('Unsafe data directory')
database=pathlib.Path(data)/'.explorer/database.json'
if database.exists() and not (CONFIG/'database-before-migration.json').exists():
    shutil.copy2(database,CONFIG/'database-before-migration.json');os.chmod(CONFIG/'database-before-migration.json',0o600)
ownership=[]
for current,dirs,files in os.walk(data,followlinks=False):
    for item in [current]+[os.path.join(current,name) for name in files]+[os.path.join(current,name) for name in dirs if os.path.islink(os.path.join(current,name))]:
        st=os.lstat(item);ownership.append([os.path.relpath(item,data),st.st_uid,st.st_gid])
(CONFIG/'data-ownership.json').write_text(json.dumps(ownership));os.chmod(CONFIG/'data-ownership.json',0o600)
uid_command=['node','-e','console.log(JSON.stringify([process.getuid(),process.getgid()]))']
uid_command=(['docker','exec',container]+uid_command) if inspect['State']['Running'] else ['docker','run','--rm','--network','none','--entrypoint','node',inspect['Config']['Image']]+uid_command[1:]
original_uid,original_gid=json.loads(subprocess.check_output(uid_command))
env.update(EXPLORER_ROOT=data,DATA_DIR=data+'/.explorer',HOST=bind,PORT=port,NODE_ENV='production',HOST_AGENT_SOCKET='/run/windows7-host/agent.sock')
project=inspect['Config']['Labels'].get('com.docker.compose.project','windows7-desktop');config={'containers':{}}
services={'live-mail':('MAIL_SERVICE_URL',3001),'live-messenger':('MESSENGER_SERVICE_URL',3002),'remote-desktop':('RDP_SERVICE_URL',3003),'sm64':('SM64_SERVICE_URL',3004),'youtube':('YOUTUBE_SERVICE_URL',3005),'spotify':('SPOTIFY_SERVICE_URL',3007),'browser':('BROWSER_SERVICE_URL',3008),'collabora':('OFFICE_DISCOVERY_URL',9980)}
ids=subprocess.check_output(['docker','ps','-aq','--filter','label=com.docker.compose.project='+project]).decode().split()
for cid in ids:
    item=json.loads(subprocess.check_output(['docker','inspect',cid]))[0];service=item['Config']['Labels'].get('com.docker.compose.service')
    if service not in services:continue
    key,service_port=services[service];alias='windows7-'+service+'.internal';config['containers'][item['Name'].lstrip('/')]=alias;env[key]='http://'+alias+':'+str(service_port)
def quote(value):return '"'+str(value).replace('\\','\\\\').replace('"','\\"').replace('\n','\\n')+'"'
(CONFIG/'desktop.env').write_text(''.join(k+'='+quote(v)+'\n' for k,v in env.items()))
(CONFIG/'host.json').write_text(json.dumps(config))
networks=sorted(inspect['NetworkSettings']['Networks'],key=lambda n:('default' not in n,n))
saved={'container':container,'image':inspect['Config']['Image'],'networks':networks,'installRoot':root,'dataRoot':data,'port':int(port),'restartPolicy':inspect['HostConfig']['RestartPolicy']['Name'],'originalUid':original_uid,'originalGid':original_gid}
(CONFIG/'migration.json').write_text(json.dumps(saved));
for file in CONFIG.iterdir():os.chmod(file,0o600)
# The runtime owns desktop data, not its executable files or privileged socket configuration.
if os.stat(data).st_uid!=account.pw_uid:subprocess.run(['chown','-R',str(account.pw_uid)+':'+str(account.pw_gid),data],check=True)
subprocess.run(['chown',str(account.pw_uid)+':'+str(account.pw_gid),'/var/lib/windows7-host'],check=True)
unit('windows7-desktop',f'''[Unit]
Description=Windows 7 desktop host frontend
After=network-online.target docker.service windows7-host-agent.service
Requires=windows7-host-agent.service
[Service]
Type=simple
User=windows7-desktop
Group=windows7-desktop
WorkingDirectory={root}/app
EnvironmentFile=/etc/windows7-desktop/desktop.env
Environment=HOME=/var/lib/windows7-host
ExecStart={root}/runtime/node {root}/app/server.mjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths={data} /var/lib/windows7-host
UMask=0027
TimeoutStopSec=30
[Install]
WantedBy=multi-user.target
''')
unit('windows7-host-agent',f'''[Unit]
Description=Private Windows desktop host administration
After=docker.service
Requires=docker.service
[Service]
Type=simple
ExecStart=/usr/bin/python3 {root}/host-agent.py --group {account.pw_gid}
Restart=on-failure
RestartSec=3
NoNewPrivileges=yes
UMask=0077
[Install]
WantedBy=multi-user.target
''')
unit('windows7-host-monitor',f'''[Unit]
Description=Windows desktop host metrics
After=docker.service
[Service]
ExecStart=/usr/bin/python3 {root}/host-monitor.py --output {data}/.explorer/host-monitor.json
Restart=on-failure
RestartSec=3
NoNewPrivileges=yes
[Install]
WantedBy=multi-user.target
''')
pathlib.Path(root+'/host-monitor.py').write_text(pathlib.Path(root+'/host-monitor.py').read_text().replace('os.chown(temporary, 0, 1000)','os.chown(temporary, 0, '+str(account.pw_gid)+')'))
