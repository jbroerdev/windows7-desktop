#!/usr/bin/env python3
"""Private Unix-socket host administration. No network listener or shell interpolation."""
import argparse, http.server, socketserver, socket, os, json, subprocess, shlex, pathlib, time, threading, ipaddress, re, selectors, signal, shutil, uuid, codecs

from host_files import HostFiles

READ_ONLY={'hostname','ver','date','time','ipconfig','getmac','tasklist','systeminfo','nslookup','ping','tracert','pathping','netstat','route','driverquery','vol','ftype','gpresult','w32tm','help'}
ADMIN_READ={'dir','type','tree','attrib','comp','fc','diskcomp','chkdsk','mountvol','diskpart'}
ALIASES={'hostname':['hostname'],'dir':['ls','-la'],'type':['cat'],'copy':['cp','--'],'xcopy':['cp','-a','--'],'move':['mv','--'],'rename':['mv','--'],'ren':['mv','--'],'mkdir':['mkdir','-p','--'],'md':['mkdir','-p','--'],'rmdir':['rmdir','--'],'rd':['rmdir','--'],'del':['rm','--'],'erase':['rm','--'],'tree':['find'],'comp':['cmp','--'],'fc':['diff','-u','--'],'diskcomp':['cmp','--'],'tasklist':['ps','-eo','pid,user,comm,%cpu,rss,etime'],'ipconfig':['ip','-brief','address'],'getmac':['ip','-brief','link'],'nslookup':['nslookup'],'ping':['ping','-c','4'],'tracert':['traceroute','-m','20'],'pathping':['mtr','--report','--report-cycles','3'],'netstat':['ss','-tun'],'route':['ip','route','show'],'systeminfo':['hostnamectl'],'driverquery':['lsmod'],'vol':['df','-hT'],'chkdsk':['df','-hT'],'mountvol':['findmnt'],'diskpart':['lsblk','-o','NAME,SIZE,FSTYPE,MOUNTPOINTS'],'attrib':['stat','--'],'w32tm':['timedatectl','status'],'date':['date','+%d.%m.%Y'],'time':['date','+%H:%M:%S'],'ver':['uname','-a']}

def run_bounded(argv,cwd,timeout=30):
    proc=subprocess.Popen(argv,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True,env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LANG':'C.UTF-8','HOME':'/root'})
    selector=selectors.DefaultSelector();selector.register(proc.stdout,selectors.EVENT_READ);chunks=[];size=0;deadline=time.monotonic()+timeout
    try:
        while selector.get_map():
            if time.monotonic()>deadline:raise ValueError('Befehl nach 30 Sekunden abgebrochen.')
            for key,_ in selector.select(.2):
                chunk=os.read(key.fileobj.fileno(),8192)
                if not chunk:selector.unregister(key.fileobj);continue
                size+=len(chunk)
                if size>1024*1024:raise ValueError('Ausgabelimit von 1 MB erreicht.')
                chunks.append(chunk)
        return {'output':b''.join(chunks).decode('utf-8','replace'),'exitCode':proc.wait(timeout=1),'cwd':cwd}
    finally:
        selector.close()
        if proc.poll() is None:
            os.killpg(proc.pid,signal.SIGKILL);proc.wait()
        proc.stdout.close()

def host_path(value,cwd):
    value=re.sub(r'^C:', '',value,flags=re.I).replace('\\','/')
    return str(pathlib.Path(value if value.startswith('/') else os.path.join(cwd,value)).resolve())

def execute(data,runner=None):
    command=data.get('command','');admin=data.get('admin') is True
    if not isinstance(command,str) or len(command)>8192:raise ValueError('Ungültiger Befehl.')
    args=shlex.split(command,posix=False);args=[a[1:-1] if len(a)>1 and a[0]==a[-1]=='"' else a for a in args]
    if not args:return {'output':'','exitCode':0}
    verb=args.pop(0).lower().removesuffix('.exe')
    if '/?' in args:return {'output':verb.upper()+': Host-Befehl. Windows-Dateipfade werden auf Linux-Pfade abgebildet; Änderungen erfordern Administratorrechte und Bestätigung.','exitCode':0}
    if not admin and verb not in READ_ONLY:raise PermissionError('Dieser Host-Befehl erfordert ein Administratorkonto.')
    cwd=data.get('cwd') or '/Explorer'
    if not isinstance(cwd,str):raise ValueError('Ungültiger Pfad.')
    if cwd.startswith('/C/'):cwd=cwd[2:]
    cwd=host_path(cwd,'/')
    if not os.path.isdir(cwd):cwd='/Explorer' if os.path.isdir('/Explorer') else '/'
    if verb in ('cd','chdir'):
        if args and args[0].lower()=='/d':args.pop(0)
        target=host_path(' '.join(args) or cwd,cwd)
        if not os.path.isdir(target):raise ValueError('Das System kann den angegebenen Pfad nicht finden.')
        return {'output':'','cwd':target,'exitCode':0}
    if verb=='help':return {'output':'Host-CMD: Windows-Dateibefehle werden auf Linux abgebildet. Native Linux-Befehle sind für Administratoren zusätzlich verfügbar. Änderungen erfordern Bestätigung.','cwd':cwd,'exitCode':0}
    if verb in ('format','diskcopy','defrag','compact','expand','reg','ftype','gpresult','gpupdate','verify','chkntfs','mode','runas','replace'):
        raise ValueError(verb.upper()+': Die passende Linux-/Desktop-Abbildung ist noch nicht implementiert; siehe WINDOWS7-TODO.md.')
    if not admin:
        # Read-only diagnostics accept only a hostname, never arbitrary switches or paths.
        if verb in ('ping','nslookup','tracert','pathping'):
            if len(args)!=1 or not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9.:-]{0,252}',args[0]):raise ValueError('Bitte genau einen Hostnamen oder eine IP-Adresse angeben.')
        elif args and args not in (['/all'],['/t'],['/query']):raise PermissionError('Diese Parameter erfordern Administratorrechte.')
        else:args=[]
    if verb=='shutdown':
        if '/a' in [a.lower() for a in args]:argv=['shutdown','-c']
        else:argv=['shutdown','-r' if '/r' in [a.lower() for a in args] else '-h','+1']
    elif verb=='taskkill':
        if not admin:raise PermissionError('Host-Prozesse beenden erfordert Administratorrechte.')
        lower=[a.lower() for a in args]
        if '/pid' not in lower:raise ValueError('Host-TASKKILL unterstützt /PID Prozessnummer.')
        pid=args[lower.index('/pid')+1]
        if not pid.isdigit() or int(pid)<=1:raise ValueError('Ungültige PID.')
        argv=['kill','-TERM',pid]
    else:
        base=ALIASES.get(verb)
        if base:
            argv=list(base)
            if verb in ('date','time') and (not args or args==['/t']):args=[]
            if verb in ('ipconfig','getmac','tasklist','systeminfo','driverquery','vol','chkdsk','mountvol','diskpart','w32tm'):args=[]
            if verb in ('dir','type','copy','xcopy','move','rename','ren','mkdir','md','rmdir','rd','del','erase','comp','fc','diskcomp','attrib'):
                args=[host_path(a,cwd) for a in args]
            if verb=='tree':args=[host_path(args[0],cwd) if args else cwd,'-maxdepth','4']
            argv+=args
        elif admin:argv=[verb]+args
        else:raise PermissionError('Host-Befehl nicht freigegeben.')
    if not shutil.which(argv[0]):raise ValueError('Das benötigte Linux-Programm ist nicht installiert: '+argv[0])
    read_only=verb in READ_ONLY|ADMIN_READ and not (verb in ('date','time') and args)
    if verb=='systemctl' and args and args[0] in ('status','show','list-units','list-unit-files','is-active','is-enabled'):read_only=True
    if verb=='docker' and args and args[0] in ('ps','images','inspect','logs','info','version'):read_only=True
    if admin and not read_only and data.get('confirmed') is not True:
        return {'requiresConfirmation':True,'preview':shlex.join(argv),'cwd':cwd}
    if not admin and verb in ADMIN_READ:raise PermissionError('Administratorrechte erforderlich.')
    return (runner or run_bounded)(argv,cwd)

class HostSessions:
    """Bounded, owner-isolated command sessions that survive browser disconnects."""
    def __init__(self):
        self.jobs={};self.lock=threading.RLock()
    def _prune(self):
        now=time.monotonic()
        for key,job in list(self.jobs.items()):
            if job['status'] not in ('starting','running') and now-job['updated']>900:del self.jobs[key]
        finished=sorted((j for j in self.jobs.values() if j['status'] not in ('starting','running')),key=lambda j:j['updated'])
        while len(self.jobs)>=32 and finished:del self.jobs[finished.pop(0)['id']]
    def start(self,owner,argv,cwd,admin=False):
        with self.lock:
            self._prune();active=[j for j in self.jobs.values() if j['status'] in ('starting','running')]
            if len(active)>=4 or sum(j['owner']==owner for j in active)>=2:raise ValueError('Zu viele laufende Host-Sitzungen.')
            ident=str(uuid.uuid4());job={'id':ident,'owner':owner,'admin':admin,'cwd':cwd,'status':'starting','output':'','exitCode':None,'updated':time.monotonic(),'cancel':threading.Event(),'proc':None}
            self.jobs[ident]=job
            threading.Thread(target=self._run,args=(job,argv,3600 if admin else 30),daemon=True).start()
            return {'sessionId':ident,'cwd':cwd}
    def _run(self,job,argv,timeout):
        proc=None;selector=None;decoder=codecs.getincrementaldecoder('utf-8')('replace');size=0;failure=None
        try:
            if job['cancel'].is_set():return
            proc=subprocess.Popen(argv,cwd=job['cwd'],stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True,env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LANG':'C.UTF-8','HOME':'/root'})
            with self.lock:job['proc']=proc;job['status']='running'
            selector=selectors.DefaultSelector();selector.register(proc.stdout,selectors.EVENT_READ);deadline=time.monotonic()+timeout
            while selector.get_map():
                if job['cancel'].is_set():break
                if time.monotonic()>deadline:raise ValueError('Host-Sitzung hat das Zeitlimit überschritten.')
                for key,_ in selector.select(.1):
                    chunk=os.read(key.fileobj.fileno(),8192)
                    if not chunk:selector.unregister(key.fileobj);continue
                    size+=len(chunk)
                    if size>1024*1024:raise ValueError('Ausgabelimit von 1 MB erreicht.')
                    with self.lock:job['output']+=decoder.decode(chunk);job['updated']=time.monotonic()
            if not job['cancel'].is_set():proc.wait(timeout=1)
        except Exception as error:failure=str(error)
        finally:
            if selector:selector.close()
            if proc:
                # Kill descendants as well, including a child retaining an output pipe.
                try:os.killpg(proc.pid,signal.SIGTERM)
                except ProcessLookupError:pass
                try:proc.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    try:os.killpg(proc.pid,signal.SIGKILL)
                    except ProcessLookupError:pass
                    proc.wait()
                try:os.killpg(proc.pid,signal.SIGKILL)
                except ProcessLookupError:pass
                proc.stdout.close()
            with self.lock:
                job['output']+=decoder.decode(b'',final=True)
                if failure:job['output']+='\n'+failure+'\n'
                cancelled=job['cancel'].is_set();job['status']='cancelled' if cancelled else 'failed' if failure else 'completed'
                job['exitCode']=130 if cancelled else 1 if failure else proc.returncode if proc else 0;job['updated']=time.monotonic()
    def _owned(self,owner,ident):
        job=self.jobs.get(ident)
        if not job or job['owner']!=owner:raise PermissionError('Host-Sitzung nicht gefunden oder nicht freigegeben.')
        return job
    def poll(self,owner,ident,offset=0,admin=False):
        if not isinstance(offset,int) or isinstance(offset,bool) or offset<0:raise ValueError('Ungültige Ausgabeposition.')
        with self.lock:
            self._prune();job=self._owned(owner,ident)
            if job.get('admin') and not admin:raise PermissionError('Administratorrechte für diese Host-Sitzung erforderlich.')
            if offset>len(job['output']):raise ValueError('Ungültige Ausgabeposition.')
            data=job['output'][offset:offset+65536];next_offset=offset+len(data);job['updated']=time.monotonic()
            return {'sessionId':ident,'output':data,'offset':next_offset,'status':job['status'],'exitCode':job['exitCode'],'cwd':job['cwd'],'more':next_offset<len(job['output'])}
    def cancel(self,owner,ident):
        with self.lock:
            job=self._owned(owner,ident);job['cancel'].set()
            return {'sessionId':ident,'requested':True}


def refresh_hosts(config):
    entries=[]
    for name,alias in config.get('containers',{}).items():
        try:
            info=json.loads(subprocess.check_output(['docker','inspect',name],timeout=5))[0]
            networks=info['NetworkSettings']['Networks'];ordered=sorted(networks,key=lambda n:('default' not in n,n))
            address=next(networks[n]['IPAddress'] for n in ordered if networks[n].get('IPAddress'))
            ipaddress.ip_address(address)
            if re.fullmatch(r'windows7-[a-z0-9-]+\.internal',alias):entries.append(address+' '+alias)
        except (subprocess.SubprocessError,ValueError,KeyError,StopIteration):continue
    marker='# windows7-desktop managed endpoints'
    current=pathlib.Path('/etc/hosts').read_text();clean=re.sub(r'\n?'+re.escape(marker)+r'\n.*?# end windows7-desktop\n?', '\n',current,flags=re.S)
    updated=clean.rstrip()+'\n'+marker+'\n'+'\n'.join(entries)+'\n# end windows7-desktop\n'
    if current!=updated:pathlib.Path('/etc/hosts').write_text(updated)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--socket',default='/run/windows7-host/agent.sock');parser.add_argument('--config',default='/etc/windows7-desktop/host.json');parser.add_argument('--group',type=int,required=True);options=parser.parse_args()
    config=json.loads(pathlib.Path(options.config).read_text());refresh_hosts(config);host_files=HostFiles()
    def refresh():
        while True:
            time.sleep(5)
            try:refresh_hosts(config);host_files.prune_uploads()
            except Exception as error:print('Host discovery:',type(error).__name__,flush=True)
    threading.Thread(target=refresh,daemon=True).start()
    slots=threading.BoundedSemaphore(4);terminal_sessions=HostSessions()
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            try:
                length=int(self.headers.get('Content-Length','0'))
                if (self.path not in ('/execute','/sessions/start','/sessions/poll','/sessions/cancel') and not self.path.startswith('/files/')) or not 0<length<=(16*1024*1024 if self.path=='/files/write' else 512*1024 if self.path=='/files/upload-chunk' else 16384):raise ValueError('Ungültige Anfrage.')
                data=json.loads(self.rfile.read(length))
                if not slots.acquire(blocking=False):raise ValueError('Zu viele gleichzeitige Host-Befehle.')
                try:
                    if self.path=='/execute':result=execute(data)
                    elif self.path.startswith('/files/'):result=host_files.execute(self.path[7:],data)
                    else:
                        actor=data.get('owner')
                        if not isinstance(actor,str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,128}',actor):raise PermissionError('Ungültiges Sitzungsprofil.')
                        if self.path=='/sessions/start':result=execute(data,lambda argv,cwd:terminal_sessions.start(actor,argv,cwd,data.get('admin') is True))
                        elif self.path=='/sessions/poll':result=terminal_sessions.poll(actor,data.get('sessionId'),data.get('offset',0),data.get('admin') is True)
                        else:result=terminal_sessions.cancel(actor,data.get('sessionId'))
                    status=200
                finally:slots.release()
            except FileExistsError as error:result={'error':str(error)};status=409
            except FileNotFoundError as error:result={'error':'Datei oder Ordner nicht gefunden.'};status=404
            except PermissionError as error:result={'error':str(error)};status=403
            except Exception as error:result={'error':str(error)};status=400
            raw=json.dumps(result).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
        def log_message(self,*args):pass
        def address_string(self):return 'local'
    class Server(socketserver.ThreadingMixIn,socketserver.UnixStreamServer):daemon_threads=True
    os.makedirs(os.path.dirname(options.socket),exist_ok=True);os.chmod(os.path.dirname(options.socket),0o750);os.chown(os.path.dirname(options.socket),0,options.group)
    if os.path.exists(options.socket):os.unlink(options.socket)
    with Server(options.socket,Handler) as server:
        os.chmod(options.socket,0o660);os.chown(options.socket,0,options.group);server.serve_forever()

if __name__=='__main__':main()
