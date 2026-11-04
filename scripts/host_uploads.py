"""Bounded, owner-bound host uploads with atomic publication and recovery."""
import os, pathlib, json, uuid, time, hashlib, base64, stat, ctypes


def exchange(source, target):
    libc = ctypes.CDLL(None, use_errno=True)
    rename = getattr(libc, 'renameat2', None)
    if rename is None:raise ValueError('Atomisches Ersetzen wird auf diesem System nicht unterstÃ¼tzt.')
    rename.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    rename.restype = ctypes.c_int
    if rename(-100, os.fsencode(source), -100, os.fsencode(target), 2):
        code = ctypes.get_errno()
        raise OSError(code, os.strerror(code))


class HostUploads:
    def __init__(self, files, rename_new):
        self.files = files
        self.rename_new = rename_new
        self.items = {}
        self.journal = files.state / 'uploads'
        if self.journal.is_symlink():raise ValueError('UngÃ¼ltiges Upload-Journal.')
        self.journal.mkdir(mode=0o700, exist_ok=True)
        os.chmod(self.journal, 0o700)
        self.recover()

    @staticmethod
    def identity(info):return [info.st_dev, info.st_ino]

    def recover(self):
        for record in self.journal.glob('*.json'):
            if record.is_symlink():continue
            try:
                data = json.loads(record.read_text(encoding='utf-8'))
                target = self.files._path(data['target'])
                expected = target.with_name('.windows7-upload-' + record.stem)
                temporary = pathlib.Path(data['temporary'])
                if temporary != expected:continue
                if temporary.exists():
                    actual = self.identity(temporary.lstat())
                    if actual == data['identity']:temporary.unlink()
                    elif actual == data.get('previousIdentity'):
                        self.files._archive(temporary, data['target'], 'replaced', True)
                    else:continue
                record.unlink()
            except (OSError, ValueError, KeyError):
                # An unrecognized file is retained rather than guessed at or deleted.
                continue

    def prune(self):
        for ident, item in list(self.items.items()):
            if time.monotonic() - item['updated'] > 1800:self.abort(item['owner'], ident)

    def _owned(self, owner, ident):
        item = self.items.get(ident)
        if not item or item['owner'] != owner:raise PermissionError('Upload nicht gefunden oder nicht freigegeben.')
        return item

    def _close(self, item, remove=True):
        identity = self.identity(os.fstat(item['file'].fileno()))
        item['file'].close()
        keep_journal = False
        if remove:
            try:
                if self.identity(item['temporary'].lstat()) == identity:item['temporary'].unlink()
                else:keep_journal = True
            except FileNotFoundError:pass
        self.items.pop(item['id'], None)
        if not keep_journal:(self.journal / (item['id'] + '.json')).unlink(missing_ok=True)

    def abort(self, owner, ident):
        item = self._owned(owner, ident)
        self._close(item)
        return {'ok': True, 'aborted': True}

    def execute(self, action, data):
        self.prune()
        owner = data.get('owner')
        if not isinstance(owner, str) or not owner:raise PermissionError('UngÃ¼ltiges Upload-Profil.')
        if action == 'upload-start':return self.start(owner, data)
        item = self._owned(owner, data.get('uploadId'))
        item['updated'] = time.monotonic()
        if action == 'upload-status':return {'uploadId':item['id'],'offset':item['offset'],'size':item['size']}
        if action == 'upload-abort':return self.abort(owner, item['id'])
        if action == 'upload-chunk':
            offset = data.get('offset')
            if not isinstance(offset, int) or isinstance(offset, bool) or offset != item['offset']:
                raise ValueError('Die Upload-Position stimmt nicht Ã¼berein.')
            try:raw = base64.b64decode(data.get('data', ''), validate=True)
            except (ValueError, TypeError):raise ValueError('UngÃ¼ltiger Datenblock.')
            if len(raw) > 256 * 1024 or item['offset'] + len(raw) > item['size']:
                raise ValueError('Der Datenblock Ã¼berschreitet die angekÃ¼ndigte GrÃ¶ÃŸe.')
            view = memoryview(raw)
            while view:
                written = item['file'].write(view)
                if not written:raise OSError('Der Datenblock konnte nicht vollstÃ¤ndig geschrieben werden.')
                view = view[written:]
            item['hash'].update(raw)
            item['offset'] += len(raw)
            return {'ok': True, 'offset': item['offset']}
        if action == 'upload-commit':return self.commit(item, data)
        raise ValueError('Unbekannte Upload-Aktion.')

    def start(self, owner, data):
        parent = self.files._path(data.get('path'))
        if not parent.is_dir():raise ValueError('Kein Zielordner.')
        name = self.files._name(data.get('name'))
        target = parent / name
        self.files._mutable(target)
        size = data.get('size')
        if not isinstance(size, int) or isinstance(size, bool) or size < 0 or size > 2**53 - 1:
            raise ValueError('UngÃ¼ltige DateigrÃ¶ÃŸe.')
        if target.is_symlink():raise ValueError('Symbolische Links werden beim Hochladen nicht ersetzt.')
        existing = self.files._meta(target) if target.exists() else None
        if data.get('confirmed') is not True:
            return {'requiresConfirmation': True, 'preview': 'Hochladen: ' + self.files._logical(target), 'existing': existing}
        if existing:
            if existing['kind'] != 'file' or not data.get('overwrite'):
                raise FileExistsError('Der Zielname existiert bereits.')
            self.files._check(target, data.get('version'))
        elif data.get('version'):
            raise FileExistsError('Die Zieldatei wurde zwischenzeitlich entfernt.')
        if len(self.items) >= 4 or sum(i['owner'] == owner for i in self.items.values()) >= 2:
            raise ValueError('Zu viele laufende Host-Uploads.')
        free = os.statvfs(parent)
        if size > max(0, free.f_bavail * free.f_frsize - 1024 * 1024):
            raise ValueError('Auf dem ZieldatentrÃ¤ger ist nicht genÃ¼gend freier Speicher vorhanden.')
        ident = uuid.uuid4().hex
        temporary = target.with_name('.windows7-upload-' + ident)
        handle = temporary.open('xb', buffering=0)
        os.chmod(temporary, 0o600)
        item = dict(id=ident, owner=owner, target=target, temporary=temporary, file=handle, size=size, offset=0,
                    hash=hashlib.sha256(), updated=time.monotonic(), parentIdentity=self.identity(parent.stat()),
                    version=existing['version'] if existing else None)
        if not existing and ('uid' in data or 'gid' in data):
            uid, gid = data.get('uid'), data.get('gid')
            if any(not isinstance(value, int) or isinstance(value, bool) or value < 0 or value > 2**32-2 for value in (uid, gid)):
                handle.close();temporary.unlink(missing_ok=True)
                raise ValueError('Ungültiger Dateibesitzer.')
            item['destinationOwner'] = (uid, gid)
        if existing:item['previous'] = target.stat()
        record = dict(target=self.files._logical(target), temporary=str(temporary), identity=self.identity(os.fstat(handle.fileno())),
                      previousIdentity=self.identity(item['previous']) if existing else None)
        try:
            with (self.journal / (ident + '.json')).open('x', encoding='utf-8') as journal:
                json.dump(record, journal);journal.flush();os.fsync(journal.fileno())
        except Exception:
            handle.close();temporary.unlink(missing_ok=True);raise
        self.items[ident] = item
        return {'uploadId': ident, 'offset': 0}

    def commit(self, item, data):
        if item['offset'] != item['size'] or data.get('digest') != item['hash'].hexdigest():
            raise ValueError('Upload unvollstÃ¤ndig oder PrÃ¼fsumme stimmt nicht Ã¼berein.')
        target, temporary, handle = item['target'], item['temporary'], item['file']
        handle.flush();os.fsync(handle.fileno())
        if os.fstat(handle.fileno()).st_size != item['size']:raise ValueError('Die gespeicherte DateigrÃ¶ÃŸe stimmt nicht Ã¼berein.')
        if self.identity(target.parent.stat()) != item['parentIdentity'] or self.identity(temporary.lstat()) != self.identity(os.fstat(handle.fileno())):
            raise FileExistsError('Der Zielordner oder die temporÃ¤re Datei wurde ausgetauscht.')
        backup = None
        if item['version']:
            self.files._check(target, item['version'])
            previous = item['previous']
            os.chown(temporary, previous.st_uid, previous.st_gid)
            os.chmod(temporary, stat.S_IMODE(previous.st_mode))
            exchange(temporary, target)
            published = self.files._version(target.stat())
            try:backup = self.files._archive(temporary, self.files._logical(target), 'replaced', True)
            except Exception:
                if self.files._version(target.stat()) == published:exchange(temporary, target)
                raise
        else:
            if item.get('destinationOwner'):os.fchown(handle.fileno(), *item['destinationOwner'])
            self.rename_new(temporary, target)
        digest = item['hash'].hexdigest()
        self._close(item, False)
        return {'ok': True, 'node': self.files._meta(target), 'digest': digest, 'backupId': backup['id'] if backup else None}
