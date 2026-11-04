"""Private host filesystem operations. Called only by the root Unix-socket agent."""
import os, pathlib, stat, json, hashlib, base64, uuid, shutil, threading, time, errno, re


def rename_new(source, target):
    # Linux renameat2 keeps a concurrent creator from being overwritten.
    import ctypes
    libc = ctypes.CDLL(None, use_errno=True)
    rename = getattr(libc, 'renameat2', None)
    if rename is None:
        raise ValueError('Das System unterstützt noch kein atomisches Umbenennen ohne Überschreiben.')
    rename.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    rename.restype = ctypes.c_int
    if rename(-100, os.fsencode(source), -100, os.fsencode(target), 1) != 0:
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error), str(target))


class HostFiles:
    LIMIT = 2 * 1024 * 1024
    MUTATIONS = {'write', 'mkdir', 'rename', 'trash', 'restore'}
    PROTECTED = {'/', '/bin', '/boot', '/dev', '/etc', '/home', '/lib', '/lib64', '/opt', '/proc', '/root', '/run', '/sbin', '/srv', '/sys', '/tmp', '/usr', '/var', '/Explorer'}

    def __init__(self, state='/var/lib/windows7-host-files', root='/'):
        self.root = pathlib.Path(root).resolve()
        self.state = pathlib.Path(state)
        if self.state.is_symlink():
            raise ValueError('Ungültiger Host-Papierkorb.')
        self.state.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(self.state, 0o700)
        self.state = self.state.resolve()
        self.lock = threading.RLock()
        from host_uploads import HostUploads
        self.uploads = HostUploads(self, rename_new)

    def _path(self, value, follow=True):
        if not isinstance(value, str) or not value.startswith('/') or '\x00' in value or len(value) > 4096 or any(part in ('.', '..') for part in value.split('/')):
            raise ValueError('Ungültiger Host-Pfad.')
        raw = self.root / value.lstrip('/')
        target = raw.resolve() if follow else raw.parent.resolve() / raw.name
        target.relative_to(self.root)
        if re.search(r'\.windows7-upload-[a-f0-9]{32}$', target.name):raise PermissionError('Temporäre Upload-Dateien werden über den Übertragungsvorgang verwaltet.')
        if target == self.state or self.state in target.parents or '.windows7-host-trash-0' in target.parts:
            raise PermissionError('Der interne Host-Papierkorb wird über seine eigene Ansicht verwaltet.')
        return target

    @staticmethod
    def _name(value):
        if not isinstance(value, str) or not value or value in ('.', '..') or value != value.strip() or len(value.encode('utf-8')) > 255 or any(c in value for c in '/\\\x00<>:"|?*') or any(ord(c) < 32 for c in value):
            raise ValueError('Ungültiger Dateiname.')
        if re.search(r'\.windows7-upload-[a-f0-9]{32}$', value):
            raise ValueError('Dieser Dateiname ist für laufende Übertragungen reserviert.')
        return value

    def _logical(self, path):
        relative = pathlib.Path(path).relative_to(self.root).as_posix()
        return '/' if relative == '.' else '/' + relative

    @staticmethod
    def _version(info):
        return hashlib.sha256(f'{info.st_dev}:{info.st_ino}:{info.st_size}:{info.st_mtime_ns}:{info.st_ctime_ns}'.encode()).hexdigest()

    def _meta(self, path, logical=None):
        info = path.lstat()
        kind = 'folder' if stat.S_ISDIR(info.st_mode) else 'file' if stat.S_ISREG(info.st_mode) else 'special'
        linked = stat.S_ISLNK(info.st_mode)
        if linked:
            try:
                target = self._path(logical or self._logical(path))
                kind = 'folder' if target.is_dir() else 'file' if target.is_file() else 'special'
            except (ValueError, OSError, PermissionError):
                pass
        try:resolved=self._logical(path.resolve())
        except (ValueError, OSError):resolved=None
        return dict(path=logical or self._logical(path), resolved=resolved, name=path.name, kind=kind, symlink=linked, size=info.st_size,
                    modified=info.st_mtime, created=info.st_ctime, mode=stat.filemode(info.st_mode), uid=info.st_uid, gid=info.st_gid,
                    version=self._version(info), writable=kind != 'special')

    def _regular(self, path):
        info = path.stat()
        if not stat.S_ISREG(info.st_mode):
            raise ValueError('Nur reguläre Dateien können geöffnet werden.')
        return info

    def _check(self, path, version):
        if not isinstance(version, str) or self._version(path.lstat()) != version:
            raise FileExistsError('Die Datei wurde zwischenzeitlich geändert. Bitte aktualisieren.')

    def _mutable(self, path, directory=False):
        logical = self._logical(path)
        if logical == '/' or logical.split('/')[1] in ('proc', 'sys', 'dev', 'run') or directory and logical in self.PROTECTED:
            raise PermissionError('Dieser Systempfad kann hier nicht verändert werden.')

    def prune_uploads(self):
        with self.lock:self.uploads.prune()

    def _mount_root(self, path):
        path = pathlib.Path(path).resolve()
        try:
            mounts = []
            for line in pathlib.Path('/proc/self/mountinfo').read_text().splitlines():
                value = re.sub(r'\\([0-7]{3})', lambda m: chr(int(m[1], 8)), line.split()[4])
                mount = pathlib.Path(value)
                if path == mount or mount in path.parents:mounts.append(mount)
            if mounts:return max(mounts, key=lambda item: len(item.parts))
        except (OSError, IndexError):pass
        current = path
        while current.parent != current and current.parent.stat().st_dev == path.stat().st_dev:current = current.parent
        return current

    def _payload_folder(self, path, ident, force=False):
        mount = self._mount_root(path.parent)
        if not force and mount == self._mount_root(self.state):return self.state / ident
        try:mount.relative_to(self.root)
        except ValueError:mount = self.root
        base = mount / '.windows7-host-trash-0'
        if base.is_symlink():raise PermissionError('Ungültiger Papierkorbbereich auf dem Datenträger.')
        base.mkdir(mode=0o700, exist_ok=True)
        if base.stat().st_uid != os.geteuid():raise PermissionError('Der Papierkorbbereich gehört einem anderen Systembenutzer.')
        os.chmod(base, 0o700)
        destination = base / ident
        destination.mkdir(mode=0o700)
        return destination

    def _archive(self, path, logical, reason, move):
        ident = uuid.uuid4().hex
        folder = self.state / ident
        folder.mkdir(mode=0o700)
        payload_folder = self._payload_folder(path, ident)
        payload = payload_folder / 'item'
        info = path.lstat()
        record = dict(id=ident, original=logical, name=path.name, reason=reason, time=time.time(), uid=info.st_uid, gid=info.st_gid,
                      kind='folder' if path.is_dir() and not path.is_symlink() else 'file', size=info.st_size, payload=str(payload))
        try:
            (folder / 'record.json').write_text(json.dumps(record), encoding='utf-8')
            if move:
                try:os.rename(path, payload)
                except OSError as error:
                    if error.errno != errno.EXDEV:raise
                    payload_folder = self._payload_folder(path, ident, True)
                    payload = payload_folder / 'item';record['payload'] = str(payload)
                    (folder / 'record.json').write_text(json.dumps(record), encoding='utf-8')
                    rename_new(path, payload)
            else:
                shutil.copy2(path, payload, follow_symlinks=False)
                os.chown(payload, info.st_uid, info.st_gid, follow_symlinks=False)
                if not payload.is_symlink():os.chmod(payload, stat.S_IMODE(info.st_mode))
        except Exception:
            # A failed backup leaves its original untouched; discard incomplete copies.
            if not move:payload.unlink(missing_ok=True)
            if not payload.exists() and not payload.is_symlink():
                (folder / 'record.json').unlink(missing_ok=True)
                if payload_folder != folder:payload_folder.rmdir()
                folder.rmdir()
            raise
        return record

    def execute(self, action, data):
        if data.get('admin') is not True:
            raise PermissionError('Das Host-Dateisystem erfordert ein Administratorkonto.')
        with self.lock:
            if action.startswith('upload-'):return self.uploads.execute(action, data)
            if action == 'create':
                started = self.uploads.execute('upload-start', dict(data, size=0))
                if started.get('requiresConfirmation'):
                    started['preview'] = 'Datei erstellen: ' + self._logical(self._path(data.get('path')) / self._name(data.get('name')))
                    return started
                try:return self.uploads.execute('upload-commit', dict(data, uploadId=started['uploadId'], digest=hashlib.sha256(b'').hexdigest()))
                except Exception:
                    self.uploads.execute('upload-abort', dict(data, uploadId=started['uploadId']))
                    raise
            if action == 'trash-list':
                records = []
                for folder in self.state.iterdir():
                    if folder.is_dir() and not folder.is_symlink():
                        try:
                            record = json.loads((folder / 'record.json').read_text(encoding='utf-8'))
                            payload = pathlib.Path(record.get('payload', folder / 'item'))
                            if payload.exists() or payload.is_symlink():
                                records.append(record)
                        except (OSError, ValueError):
                            continue
                return {'entries': sorted(records, key=lambda entry: entry['time'], reverse=True)}
            if action == 'restore':
                ident = data.get('trashId', '')
                if not isinstance(ident, str) or len(ident) != 32 or any(c not in '0123456789abcdef' for c in ident):
                    raise ValueError('Ungültiger Papierkorbeintrag.')
                folder = self.state / ident
                record = json.loads((folder / 'record.json').read_text(encoding='utf-8'))
                target = self._path(record['original'], False)
                self._mutable(target, record['kind'] == 'folder')
                if target.exists() or target.is_symlink():
                    raise FileExistsError('Am ursprünglichen Ort existiert bereits ein Eintrag. Diesen zuerst umbenennen oder in den Papierkorb verschieben.')
                if data.get('confirmed') is not True:
                    return {'requiresConfirmation': True, 'preview': 'Wiederherstellen: ' + record['original']}
                payload = pathlib.Path(record.get('payload', folder / 'item'))
                try:rename_new(payload, target)
                except OSError as error:
                    if error.errno != errno.EXDEV or record['kind'] != 'file':raise
                    temporary = target.with_name('.' + target.name + '.restore-' + uuid.uuid4().hex)
                    try:
                        shutil.copy2(payload, temporary, follow_symlinks=False)
                        os.chown(temporary, record['uid'], record['gid'], follow_symlinks=False)
                        if not temporary.is_symlink():os.chmod(temporary, stat.S_IMODE(payload.lstat().st_mode))
                        rename_new(temporary, target)
                        payload.unlink()
                    finally:temporary.unlink(missing_ok=True)
                (folder / 'record.json').unlink()
                if payload.parent != folder:payload.parent.rmdir()
                folder.rmdir()
                return {'node': self._meta(target), 'ok': True}
            path = self._path(data.get('path', '/'), action not in ('rename', 'trash', 'stat'))
            if action == 'list':
                if not path.is_dir():
                    raise ValueError('Kein Verzeichnis.')
                entries = []
                for child in sorted(path.iterdir(), key=lambda entry: entry.name.lower()):
                    if re.search(r'\.windows7-upload-[a-f0-9]{32}$', child.name):continue
                    if len(entries) >= 5000:
                        raise ValueError('Mehr als 5.000 Einträge. Bitte die Ansicht auf einen Unterordner eingrenzen.')
                    try:
                        logical = data.get('path', '/').rstrip('/') + '/' + child.name
                        entries.append(self._meta(child, logical))
                    except FileNotFoundError:
                        continue
                return {'node': self._meta(path, data.get('path', '/')), 'entries': entries}
            if action == 'stat':
                return {'node': self._meta(path, data['path'])}
            if action in ('read', 'chunk'):
                info = self._regular(path)
                if action == 'chunk':
                    offset = data.get('offset', 0)
                    if not isinstance(offset, int) or isinstance(offset, bool) or offset < 0:
                        raise ValueError('Ungültige Dateiposition.')
                    if data.get('version') and data['version'] != self._version(info):
                        raise FileExistsError('Die Datei wurde während des Downloads geändert.')
                    with path.open('rb') as source:
                        source.seek(offset)
                        raw = source.read(256 * 1024)
                    if raw and info.st_size == 0:
                        raise ValueError('Dieser Systemeintrag unterstützt keinen stabilen Download. Bitte als Text öffnen.')
                    return {'data': base64.b64encode(raw).decode(), 'offset': offset + len(raw), 'size': info.st_size, 'name': path.name, 'version': self._version(info)}
                if info.st_size > self.LIMIT:
                    raise ValueError('Maximal 2 MB Text können im Editor geöffnet werden.')
                with path.open('rb') as source:
                    raw = source.read(self.LIMIT + 1)
                if len(raw) > self.LIMIT:
                    raise ValueError('Die Datei ist zu groß.')
                encoding = 'utf16le' if raw.startswith(b'\xff\xfe') else 'utf8bom' if raw.startswith(b'\xef\xbb\xbf') else 'utf8'
                if encoding != 'utf16le' and b'\0' in raw:
                    raise ValueError('Diese Datei enthält Binärdaten.')
                content = raw[2:].decode('utf-16-le') if encoding == 'utf16le' else raw.decode('utf-8-sig')
                return {'content': content, 'encoding': encoding, 'version': self._version(info), 'writable': True}
            if action not in self.MUTATIONS:
                raise ValueError('Unbekannte Host-Dateiaktion.')
            if action == 'mkdir':
                self._mutable(path / self._name(data.get('name')))
            else:
                self._mutable(path, action in ('rename', 'trash') and path.is_dir())
            if action == 'mkdir':
                target = path / self._name(data.get('name'))
                if target.exists() or target.is_symlink():
                    raise FileExistsError('Der Zielname existiert bereits.')
                preview = 'Ordner erstellen: ' + self._logical(target)
            else:
                self._check(path, data.get('version'))
                preview = {'write': 'Datei speichern (Sicherung wird angelegt): ', 'rename': 'Umbenennen: ', 'trash': 'In den Host-Papierkorb verschieben: '}[action] + data['path']
                if action == 'rename':
                    target = path.with_name(self._name(data.get('name')))
                    if target.exists() or target.is_symlink():
                        raise FileExistsError('Der Zielname existiert bereits.')
                    preview += ' → ' + target.name
                if action == 'write':
                    self._regular(path)
                    if not isinstance(data.get('content'), str):
                        raise ValueError('Ungültiger Text.')
                    current = self.execute('read', data)
                    raw = (b'\xff\xfe' + data['content'].encode('utf-16-le')) if current['encoding'] == 'utf16le' else (b'\xef\xbb\xbf' if current['encoding'] == 'utf8bom' else b'') + data['content'].encode('utf-8')
                    if len(raw) > self.LIMIT:
                        raise ValueError('Maximal 2 MB Text.')
            if data.get('confirmed') is not True:
                return {'requiresConfirmation': True, 'preview': preview}
            if action == 'mkdir':
                ownership=None
                if 'uid' in data or 'gid' in data:
                    ownership=(data.get('uid'),data.get('gid'))
                    if any(not isinstance(value,int) or isinstance(value,bool) or value<0 or value>2**32-2 for value in ownership):
                        raise ValueError('Ungültiger Ordnerbesitzer.')
                target.mkdir(mode=0o755)
                if ownership:
                    try:os.chown(target,*ownership)
                    except Exception:
                        target.rmdir()
                        raise
                return {'ok': True, 'node': self._meta(target)}
            if action == 'rename':
                rename_new(path, target)
                return {'ok': True, 'node': self._meta(target)}
            if action == 'trash':
                record = self._archive(path, data['path'], 'deleted', True)
                return {'ok': True, 'trashId': record['id']}
            backup = self._archive(path, self._logical(path), 'saved', False)
            temporary = path.with_name('.' + path.name + '.windows7-' + uuid.uuid4().hex)
            try:
                info = path.stat()
                with temporary.open('xb') as destination:
                    destination.write(raw)
                    destination.flush()
                    os.fsync(destination.fileno())
                shutil.copystat(path, temporary)
                os.chown(temporary, info.st_uid, info.st_gid)
                os.chmod(temporary, stat.S_IMODE(info.st_mode))
                os.utime(temporary, None)
                self._check(path, data.get('version'))
                os.replace(temporary, path)
            finally:
                temporary.unlink(missing_ok=True)
            return {'ok': True, 'version': self._version(path.stat()), 'backupId': backup['id']}
