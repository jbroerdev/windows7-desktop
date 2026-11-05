"""Structured Linux networking. No shell, public listener, Windows telemetry or import-time writes.

Mount HostNetwork.execute(action, data) ONLY on the existing private host-agent socket.
The web backend supplies owner/admin from its authenticated session, never client JSON.
Configuration is opt-in, Ethernet/NetworkManager only, and protected by NM checkpoints.
"""
import datetime
import hashlib
import ipaddress
import json
import math
import os
import pathlib
import re
import selectors
import signal
import subprocess
import threading
import time
import uuid

UUID = re.compile(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')
OWNER = re.compile(r'^[a-zA-Z0-9_.:-]{1,128}$')
IFACE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,14}$')
CHECKPOINT = re.compile(r'^/org/freedesktop/NetworkManager/Checkpoint/[0-9]+$')
SERVICE = 'org.freedesktop.NetworkManager'
NM_PATH = '/org/freedesktop/NetworkManager'


class NetworkConflict(ValueError):
    """Map to HTTP409 in the private dispatcher."""


class CommandOutput(str):
    def __new__(cls, value, exit_code=0):
        instance = super().__new__(cls, value)
        instance.exit_code = exit_code
        return instance


def bounded_run(argv):
    # Linux host only. Bound memory while reading, kill the entire process group on failure.
    proc = subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, start_new_session=True,
                            env={'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LANG': 'C.UTF-8'})
    output = bytearray()
    timeout = 25 if argv[0] in ('ping', 'nslookup') or '--wait' in argv else 4
    deadline = time.monotonic() + timeout
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(proc.stdout, selectors.EVENT_READ)
            while selector.get_map():
                if time.monotonic() >= deadline:
                    raise TimeoutError('Host-Netzwerkaktion hat das Zeitlimit überschritten.')
                for key, _ in selector.select(min(.25, max(0, deadline - time.monotonic()))):
                    chunk = os.read(key.fileobj.fileno(), 8192)
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    output.extend(chunk)
                    if len(output) > 1024 * 1024:
                        raise ValueError('Netzwerkausgabe zu groß.')
        proc.wait(timeout=max(.01, deadline - time.monotonic()))
        if proc.returncode and argv[0] not in ('ping', 'nslookup'):
            raise RuntimeError('Linux-Netzwerkbefehl fehlgeschlagen: ' + argv[0])
        return CommandOutput(output.decode('utf-8', 'replace').strip(), proc.returncode)
    finally:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait()
        proc.stdout.close()


def fields(value, allowed):
    if not isinstance(value, dict) or set(value) - set(allowed):
        raise ValueError('Ungültige Netzwerkanfrage.')


def ipv4_settings(value):
    fields(value, ['ipv4Method', 'address', 'prefixLength', 'gateway', 'dnsMode', 'dnsServers', 'mtu'])
    method = value.get('ipv4Method')
    if method not in ('auto', 'manual'):
        raise ValueError('IPv4-Methode muss auto oder manual sein.')
    address, prefix, gateway = value.get('address'), value.get('prefixLength'), value.get('gateway')
    if method == 'manual':
        if type(prefix) is not int or not 1 <= prefix <= 32:
            raise ValueError('Ungültige IPv4-Präfixlänge.')
        if not isinstance(address, str):
            raise ValueError('Ungültige IPv4-Adresse.')
        ip = ipaddress.IPv4Address(address)
        network = ipaddress.IPv4Network((ip, prefix), strict=False)
        if ip.is_unspecified or ip.is_multicast or (prefix <= 30 and ip in (network.network_address, network.broadcast_address)):
            raise ValueError('Ungültige IPv4-Hostadresse.')
        address = str(ip)
        if gateway is not None and not isinstance(gateway, str):
            raise ValueError('Ungültiges Gateway.')
        if gateway:
            gw = ipaddress.IPv4Address(gateway)
            if gw not in network or gw.is_unspecified or gw.is_multicast or gw == ip or (prefix <= 30 and gw in (network.network_address, network.broadcast_address)):
                raise ValueError('Gateway muss eine andere Hostadresse im Subnetz sein.')
            gateway = str(gw)
    elif address is not None or prefix is not None or gateway is not None:
        raise ValueError('DHCP-Anfragen dürfen keine statische Adresse enthalten.')
    dns_mode, dns = value.get('dnsMode', 'auto'), value.get('dnsServers', [])
    if dns_mode not in ('auto', 'manual') or not isinstance(dns, list) or len(dns) > 3:
        raise ValueError('Ungültige DNS-Einstellungen.')
    if dns_mode == 'auto' and dns or dns_mode == 'manual' and not dns:
        raise ValueError('DNS-Modus und Serverliste passen nicht zusammen.')
    normalized_dns = []
    for item in dns:
        if not isinstance(item, str):
            raise ValueError('Ungültige DNS-Adresse.')
        ip = ipaddress.ip_address(item)
        if ip.is_unspecified or ip.is_multicast:
            raise ValueError('Ungültige DNS-Adresse.')
        if str(ip) not in normalized_dns:
            normalized_dns.append(str(ip))
    mtu = value.get('mtu')
    if mtu is not None and (type(mtu) is not int or not 1280 <= mtu <= 9000):
        raise ValueError('MTU muss zwischen1280 und9000 liegen.')
    return dict(ipv4Method=method, address=address, prefixLength=prefix,
                gateway=gateway or None, dnsMode=dns_mode, dnsServers=normalized_dns, mtu=mtu)


class HostNetwork:
    def __init__(self, state_file, runner=None, clock=None, allow_changes=False,
                 rollback_seconds=60, watchdog=False):
        self.state_file = pathlib.Path(state_file)
        self.run = runner or bounded_run
        self.clock = clock or time.time
        self.allow_changes = allow_changes is True
        if type(rollback_seconds) is not int or not 30 <= rollback_seconds <= 120:
            raise ValueError('Ungültige Rückrollfrist.')
        self.rollback_seconds = rollback_seconds
        self.lock = threading.RLock()
        self.plans = self._load()
        self.stop_event = threading.Event()
        if watchdog:
            threading.Thread(target=self._watch, daemon=True).start()

    def close(self):
        self.stop_event.set()

    def _watch(self):
        while not self.stop_event.wait(2):
            try:
                self.prune()
            except Exception:
                # The NM-owned rollback timer remains independent of this process.
                pass

    def _load(self):
        try:
            if self.state_file.stat().st_size > 256 * 1024:
                raise ValueError('Netzwerkauftragsspeicher zu groß.')
            raw = json.loads(self.state_file.read_text())
        except FileNotFoundError:
            return {}
        if not isinstance(raw, dict) or raw.get('version') != 1 or not isinstance(raw.get('plans'), dict) or len(raw['plans']) > 32:
            raise ValueError('Ungültiger Netzwerkauftragsspeicher.')
        for token, plan in raw['plans'].items():
            if not UUID.fullmatch(token) or not isinstance(plan, dict) or not OWNER.fullmatch(plan.get('owner', '')) or not IFACE.fullmatch(plan.get('name', '')):
                raise ValueError('Ungültiger gespeicherter Netzwerkauftrag.')
            for key in ('originalUuid', 'newUuid'):
                if plan.get(key) and not UUID.fullmatch(plan[key]):
                    raise ValueError('Ungültiges Verbindungsprofil.')
            if plan.get('checkpoint') and not CHECKPOINT.fullmatch(plan['checkpoint']):
                raise ValueError('Ungültiger Checkpoint.')
            if plan.get('phase') not in ('prepared', 'expired', 'cancelled', 'applying', 'pending', 'committing', 'confirmed', 'rolled-back', 'rollback-failed'):
                raise ValueError('Ungültiger Auftragsstatus.')
            for key in ('createdAt', 'expiresAt'):
                if type(plan.get(key)) not in (int, float) or not math.isfinite(plan[key]):
                    raise ValueError('Ungültige Auftragsfrist.')
            if plan.get('confirmBy') is not None and (type(plan['confirmBy']) not in (int, float) or not math.isfinite(plan['confirmBy'])):
                raise ValueError('Ungültige Bestätigungsfrist.')
            if not UUID.fullmatch(plan.get('originalUuid', '')) or plan.get('originalAutoconnect') not in ('yes', 'no'):
                raise ValueError('Ungültiges Originalprofil.')
            ipv4_settings(plan['settings'])
        return raw['plans']

    def _save(self):
        self.state_file.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        temporary = self.state_file.with_name(self.state_file.name + '.' + str(uuid.uuid4()) + '.tmp')
        try:
            fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'w', encoding='utf-8') as stream:
                json.dump(dict(version=1, plans=self.plans), stream)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, self.state_file)
        finally:
            temporary.unlink(missing_ok=True)

    def _bus(self, method, signature, *values):
        return self.run(['busctl', '--system', 'call', SERVICE, NM_PATH, SERVICE, method, signature, *map(str, values)])

    def _active(self):
        output = self.run(['nmcli', '-t', '-f', 'UUID,DEVICE', 'connection', 'show', '--active'])
        result = {}
        for line in output.splitlines():
            ident, _, device = line.partition(':')
            if UUID.fullmatch(ident) and IFACE.fullmatch(device):
                result[device] = ident
        return result

    def _autoconnect(self, ident):
        value = self.run(['nmcli', '-g', 'connection.autoconnect', 'connection', 'show', 'uuid', ident])
        if value not in ('yes', 'no'):
            raise ValueError('Unbekannter Autoconnect-Wert.')
        return value

    def snapshot(self):
        raw = json.loads(self.run(['ip', '-j', '-details', 'address', 'show']))
        if not isinstance(raw, list) or len(raw) > 1024:
            raise ValueError('Ungültige Linux-Adapterantwort.')
        routes, route_available = [], True
        try:
            for args, family in [(['ip', '-j', 'route', 'show', 'table', 'main'], 'inet'), (['ip', '-j', '-6', 'route', 'show', 'table', 'main'], 'inet6')]:
                values = json.loads(self.run(args))
                if not isinstance(values, list) or len(values) > 4096:
                    raise ValueError('Ungültige Routenliste.')
                routes.extend({**item, 'family': family} for item in values)
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError):
            routes, route_available = [], False
        dns, global_dns, dns_available = {}, [], True
        try:
            for line in self.run(['resolvectl', '--no-pager', 'dns']).splitlines():
                match = re.fullmatch(r'Link\s+(\d+)\s+\([^)]*\):\s*(.*)', line.strip())
                if match:
                    dns[int(match[1])] = [str(ipaddress.ip_address(item.split('%')[0])) for item in match[2].split()]
                elif line.strip().startswith('Global:'):
                    global_dns = [str(ipaddress.ip_address(item.split('%')[0])) for item in line.split(':', 1)[1].split()]
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError):
            dns_available = False
        active, checkpoint_supported = {}, False
        try:
            active = self._active()
            methods = self.run(['busctl', '--system', 'introspect', SERVICE, NM_PATH, SERVICE])
            checkpoint_supported = all(name in methods for name in ('CheckpointCreate', 'CheckpointDestroy', 'CheckpointRollback'))
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError):
            active = {}
        adapters = []
        for entry in raw:
            name, index = entry.get('ifname'), entry.get('ifindex')
            if not isinstance(name, str) or type(index) is not int or index <= 0:
                continue
            mac = entry.get('address') if isinstance(entry.get('address'), str) else None
            ident = str(index) + ':' + (mac.replace(':', '').lower() if mac else 'unknown')
            addresses = []
            for address in entry.get('addr_info', []):
                try:
                    ip = ipaddress.ip_address(address.get('local'))
                    prefix = address.get('prefixlen')
                    if type(prefix) is int and 0 <= prefix <= ip.max_prefixlen:
                        addresses.append(dict(family='inet' if ip.version == 4 else 'inet6', local=str(ip), prefixLength=prefix, scope=address.get('scope')))
                except (ValueError, TypeError):
                    continue
            supported = bool(self.allow_changes and checkpoint_supported and name in active and IFACE.fullmatch(name) and entry.get('link_type') == 'ether' and not entry.get('linkinfo', {}).get('info_kind'))
            adapters.append(dict(id=ident, name=name, ifindex=index, mac=mac,
                kind=entry.get('linkinfo', {}).get('info_kind') or entry.get('link_type'),
                adminUp=('UP' in entry['flags']) if isinstance(entry.get('flags'), list) else None, operState=entry.get('operstate', 'UNKNOWN'),
                mtu=entry.get('mtu'), addresses=addresses,
                routes=[dict(family=item['family'], destination=item.get('dst'), gateway=item.get('gateway'), metric=item.get('metric')) for item in routes if item.get('dev') == name] if route_available else None,
                dnsServers=sorted(set(dns.get(index, []) + global_dns)) if dns_available else None,
                dnsSource='resolvectl' if dns_available else None,
                capabilities=dict(configureIpv4=supported, enable=False, disable=False),
                configurationReason=None if supported else 'NetworkManager-Ethernet/Checkpoint und explizite Hostfreigabe erforderlich.'))
        for adapter in adapters:
            adapter['addresses'].sort(key=lambda item: json.dumps(item, sort_keys=True))
            if adapter['routes'] is not None:
                adapter['routes'].sort(key=lambda item: json.dumps(item, sort_keys=True))
        adapters.sort(key=lambda item: item['id'])
        revision = hashlib.sha256(json.dumps(adapters, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        return dict(schemaVersion=1, scope='host', generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), revision=revision,
                    internetConnectivity='not-tested', adapters=adapters,
                    capabilities=dict(readAdapters=True, diagnose=True, configureIpv4=any(a['capabilities']['configureIpv4'] for a in adapters), enable=False, disable=False, networkManagerCheckpoint=checkpoint_supported))

    def _plan(self, token, owner):
        if not isinstance(token, str) or not UUID.fullmatch(token):
            raise ValueError('Ungültiger Netzwerkauftrag.')
        plan = self.plans.get(token)
        if not plan or plan['owner'] != owner:
            raise PermissionError('Netzwerkauftrag nicht freigegeben.')
        return plan

    def _view(self, token, plan):
        return dict(token=token, phase=plan['phase'], adapterId=plan['adapterId'], name=plan['name'],
                    settings=plan['settings'], expiresAt=plan['expiresAt'], confirmBy=plan.get('confirmBy'),
                    requiresConfirmation=plan['phase'] in ('prepared', 'pending'), error=plan.get('error'))

    def _checkpoint_exists(self, checkpoint):
        return checkpoint in self.run(['busctl', '--system', 'get-property', SERVICE, NM_PATH, SERVICE, 'Checkpoints'])

    def _rollback(self, plan):
        try:
            if plan.get('checkpoint') and self._checkpoint_exists(plan['checkpoint']):
                self._bus('CheckpointRollback', 'o', plan['checkpoint'])
            current = self._active().get(plan['name'])
            if current == plan.get('newUuid'):
                raise RuntimeError('Rückrollung ist nicht bestätigt; neue Verbindung bleibt zur Diagnose bestehen.')
            if current and current != plan['originalUuid']:
                raise RuntimeError('Adapter wurde außerhalb dieses Auftrags geändert; manuelle Prüfung erforderlich.')
            self.run(['nmcli', 'connection', 'modify', 'uuid', plan['originalUuid'], 'connection.autoconnect', plan['originalAutoconnect']])
            if plan.get('newUuid'):
                known = self.run(['nmcli', '-g', 'UUID', 'connection', 'show']).splitlines()
                if plan['newUuid'] in known:
                    self.run(['nmcli', 'connection', 'delete', 'uuid', plan['newUuid']])
            if plan.get('checkpoint') and self._checkpoint_exists(plan['checkpoint']):
                self._bus('CheckpointDestroy', 'o', plan['checkpoint'])
            plan['phase'] = 'rolled-back'
        except Exception:
            plan['phase'] = 'rollback-failed'
            plan['error'] = 'Automatische Rückrollung nicht vollständig bestätigt; Hostadministrator muss prüfen.'
        self._save()

    def prune(self):
        with self.lock:
            for plan in list(self.plans.values()):
                if plan['phase'] == 'committing' and plan.get('checkpoint') and not self._checkpoint_exists(plan['checkpoint']):
                    if self._active().get(plan['name']) == plan.get('newUuid') and self._autoconnect(plan['newUuid']) == 'yes' and self._autoconnect(plan['originalUuid']) == 'no':
                        plan['phase'] = 'confirmed'
                        self._save()
                        continue
                if plan['phase'] in ('applying', 'pending', 'committing') and self.clock() >= plan.get('confirmBy', 0):
                    self._rollback(plan)
                elif plan['phase'] == 'prepared' and self.clock() >= plan['expiresAt']:
                    plan['phase'] = 'expired'
                    self._save()

    def execute(self, action, data):
        if not isinstance(data, dict) or data.get('admin') is not True or not isinstance(data.get('owner'), str) or not OWNER.fullmatch(data['owner']):
            raise PermissionError('Persönliches Administratorkonto erforderlich.')
        owner = data['owner']
        allowed = {'snapshot': [], 'diagnose': ['kind', 'target'], 'prepare': ['adapterId', 'expectedRevision', 'settings'],
                   'apply': ['token', 'confirmed'], 'confirm': ['token', 'confirmed'], 'rollback': ['token'], 'status': ['token']}
        if action not in allowed:
            raise ValueError('Unbekannte Netzwerkaktion.')
        fields(data, allowed[action] + ['owner', 'admin'])
        with self.lock:
            self.prune()
            if action == 'snapshot':
                return self.snapshot()
            if action == 'diagnose':
                target, kind = data.get('target'), data.get('kind')
                if kind not in ('ping', 'dns') or not isinstance(target, str) or not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9.:-]{0,252}', target):
                    raise ValueError('Ungültiges Diagnoseziel.')
                argv = ['ping', '-c', '4', '-W', '2', '--', target] if kind == 'ping' else ['nslookup', target]
                output = self.run(argv)
                return dict(scope='host', kind=kind, target=target, output=str(output), exitCode=getattr(output, 'exit_code', 0), internetConnectivity='not-tested')
            if action == 'prepare':
                if not self.allow_changes:
                    raise PermissionError('Host-Netzwerkänderungen sind nicht freigegeben.')
                snapshot = self.snapshot()
                if data.get('expectedRevision') != snapshot['revision']:
                    raise NetworkConflict('Adapterzustand wurde zwischenzeitlich geändert.')
                adapter = next((item for item in snapshot['adapters'] if item['id'] == data.get('adapterId')), None)
                if not adapter or not adapter['capabilities']['configureIpv4']:
                    raise ValueError('Dieser Adapter kann hier nicht konfiguriert werden.')
                settings = ipv4_settings(data.get('settings'))
                original = self._active()[adapter['name']]
                if self.run(['nmcli', '-g', 'connection.type', 'connection', 'show', 'uuid', original]) != '802-3-ethernet':
                    raise ValueError('Nur verwaltete Ethernetprofile werden unterstützt.')
                completed = sorted((key for key, item in self.plans.items() if item['phase'] in ('confirmed', 'rolled-back', 'expired', 'cancelled')), key=lambda key: self.plans[key]['createdAt'])
                while len(self.plans) >= 32 and completed:
                    del self.plans[completed.pop(0)]
                if len(self.plans) >= 32:
                    raise ValueError('Zu viele gespeicherte Netzwerkaufträge.')
                ident = str(uuid.uuid4())
                plan = dict(owner=owner, phase='prepared', adapterId=adapter['id'], name=adapter['name'], revision=snapshot['revision'],
                            settings=settings, originalUuid=original, originalAutoconnect=self._autoconnect(original),
                            expiresAt=self.clock() + 300, createdAt=self.clock())
                self.plans[ident] = plan
                self._save()
                return self._view(ident, plan)
            plan = self._plan(data.get('token'), owner)
            if action == 'status':
                return self._view(data['token'], plan)
            if action == 'rollback':
                if plan['phase'] in ('applying', 'pending', 'committing', 'rollback-failed'):
                    self._rollback(plan)
                elif plan['phase'] == 'prepared':
                    plan['phase'] = 'cancelled'
                    self._save()
                return self._view(data['token'], plan)
            if data.get('confirmed') is not True:
                raise PermissionError('Netzwerkänderung muss ausdrücklich bestätigt werden.')
            if action == 'apply':
                if not self.allow_changes:
                    raise PermissionError('Host-Netzwerkänderungen sind nicht freigegeben.')
                if plan['phase'] != 'prepared' or self.clock() >= plan['expiresAt']:
                    raise NetworkConflict('Netzwerkauftrag ist nicht mehr anwendbar.')
                if any(other is not plan and other['phase'] in ('applying', 'pending', 'committing', 'rollback-failed') for other in self.plans.values()):
                    raise NetworkConflict('Ein anderer Netzwerkauftrag muss zuerst abgeschlossen werden.')
                current = self.snapshot()
                if current['revision'] != plan['revision'] or self._active().get(plan['name']) != plan['originalUuid']:
                    raise NetworkConflict('Adapterzustand wurde zwischenzeitlich geändert.')
                try:
                    device = self.run(['nmcli', '-g', 'GENERAL.DBUS-PATH', 'device', 'show', plan['name']])
                    if not re.fullmatch(r'/org/freedesktop/NetworkManager/Devices/[0-9]+', device):
                        raise ValueError('Ungültiger NetworkManager-Gerätepfad.')
                    checkpoint = self._bus('CheckpointCreate', 'aouu', '1', device, self.rollback_seconds, '0')
                    match = re.fullmatch(r'o "([^"]+)"', checkpoint)
                    if not match or not CHECKPOINT.fullmatch(match[1]):
                        raise ValueError('NetworkManager hat keinen gültigen Checkpoint geliefert.')
                    plan.update(checkpoint=match[1], confirmBy=self.clock() + self.rollback_seconds, phase='applying')
                    self._save()
                    label = 'windows7-web-' + data['token']
                    self.run(['nmcli', 'connection', 'clone', 'uuid', plan['originalUuid'], label])
                    new_uuid = self.run(['nmcli', '-g', 'connection.uuid', 'connection', 'show', 'id', label])
                    if not UUID.fullmatch(new_uuid):
                        raise ValueError('Ungültiges neues Verbindungsprofil.')
                    plan['newUuid'] = new_uuid
                    self._save()
                    settings = plan['settings']
                    props = ['connection.autoconnect', 'no', 'ipv4.method', settings['ipv4Method'],
                             'ipv4.addresses', str(settings['address']) + '/' + str(settings['prefixLength']) if settings['ipv4Method'] == 'manual' else '',
                             'ipv4.gateway', settings['gateway'] or '', 'ipv4.dns', ','.join(settings['dnsServers']),
                             'ipv4.ignore-auto-dns', 'yes' if settings['dnsMode'] == 'manual' else 'no']
                    if settings['mtu'] is not None:
                        props += ['802-3-ethernet.mtu', str(settings['mtu'])]
                    self.run(['nmcli', 'connection', 'modify', 'uuid', new_uuid, *props])
                    self.run(['nmcli', '--wait', '20', 'connection', 'up', 'uuid', new_uuid, 'ifname', plan['name']])
                    if self.clock() >= plan['confirmBy'] or not self._checkpoint_exists(plan['checkpoint']):
                        raise NetworkConflict('Bestätigungsfrist bereits abgelaufen.')
                    plan['phase'] = 'pending'
                    self._save()
                except Exception:
                    if plan.get('checkpoint'):
                        self._rollback(plan)
                    raise
                return self._view(data['token'], plan)
            if plan['phase'] == 'confirmed':
                return self._view(data['token'], plan)
            if plan['phase'] != 'pending' or self.clock() >= plan['confirmBy'] or not self._checkpoint_exists(plan['checkpoint']):
                raise NetworkConflict('Netzwerkänderung kann nicht mehr bestätigt werden.')
            if self._active().get(plan['name']) != plan['newUuid']:
                raise NetworkConflict('Aktive Verbindung wurde inzwischen geändert.')
            try:
                plan['phase'] = 'committing'
                self._save()
                self.run(['nmcli', 'connection', 'modify', 'uuid', plan['originalUuid'], 'connection.autoconnect', 'no'])
                self.run(['nmcli', 'connection', 'modify', 'uuid', plan['newUuid'], 'connection.autoconnect', 'yes'])
                self._bus('CheckpointDestroy', 'o', plan['checkpoint'])
                plan['phase'] = 'confirmed'
                self._save()
            except Exception:
                # A destroyed checkpoint with the new active profile may mean commit succeeded;
                # preserve the durable 'committing' journal for reconcile instead of blind rollback.
                if not self._checkpoint_exists(plan['checkpoint']) and self._active().get(plan['name']) == plan['newUuid']:
                    plan['phase'] = 'committing'
                    self._save()
                else:
                    self._rollback(plan)
                raise
            return self._view(data['token'], plan)
