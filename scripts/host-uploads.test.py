import os, pathlib, tempfile, unittest, base64, hashlib, time
from host_files import HostFiles
from host_uploads import exchange

@unittest.skipIf(os.name != 'posix', 'Linux atomic rename and ownership required')
class UploadTests(unittest.TestCase):
    def setUp(self):
        self.fixture = tempfile.TemporaryDirectory()
        self.base = pathlib.Path(self.fixture.name)
        self.root = self.base / 'root';self.root.mkdir()
        self.files = HostFiles(self.base / 'state', self.root)
    def tearDown(self):
        for item in list(self.files.uploads.items.values()):
            self.files.uploads.abort(item['owner'], item['id'])
        self.fixture.cleanup()
    def call(self, action, **data):
        return self.files.execute(action, dict(admin=True, owner='alice', **data))
    def start(self, name='example.bin', size=3, **data):
        return self.call('upload-start', path='/', name=name, size=size, confirmed=True, **data)['uploadId']
    def chunk(self, ident, raw, offset=0):
        return self.call('upload-chunk', uploadId=ident, offset=offset, data=base64.b64encode(raw).decode())
    def commit(self, ident, raw):
        return self.call('upload-commit', uploadId=ident, digest=hashlib.sha256(raw).hexdigest())
    def test_preview_creates_nothing_and_binary_chunks_publish_only_at_commit(self):
        preview=self.call('upload-start',path='/',name='example.bin',size=300000)
        self.assertTrue(preview['requiresConfirmation']);self.assertEqual(list(self.root.iterdir()),[])
        raw=bytes(range(256))*1100;ident=self.start(size=len(raw))
        self.chunk(ident,raw[:262144]);self.chunk(ident,raw[262144:],262144)
        self.assertFalse((self.root/'example.bin').exists())
        self.assertEqual(self.call('list',path='/')['entries'],[])
        result=self.commit(ident,raw);self.assertEqual((self.root/'example.bin').read_bytes(),raw)
        self.assertEqual(result['digest'],hashlib.sha256(raw).hexdigest());self.assertEqual(list(self.files.uploads.journal.iterdir()),[])
    def test_owner_offset_digest_and_abort(self):
        ident=self.start()
        with self.assertRaises(PermissionError):self.files.execute('upload-status',dict(admin=True,owner='bob',uploadId=ident))
        with self.assertRaises(ValueError):self.chunk(ident,b'x',1)
        with self.assertRaises(ValueError):self.chunk(ident,b'abcd')
        self.chunk(ident,b'abc')
        with self.assertRaises(ValueError):self.commit(ident,b'xyz')
        self.call('upload-abort',uploadId=ident);self.assertEqual(list(self.root.iterdir()),[])
    def test_concurrent_new_target_is_preserved(self):
        ident=self.start();self.chunk(ident,b'new');target=self.root/'example.bin';target.write_bytes(b'concurrent')
        with self.assertRaises(FileExistsError):self.commit(ident,b'new')
        self.call('upload-abort',uploadId=ident);self.assertEqual(target.read_bytes(),b'concurrent')
    def test_replace_preserves_mode_and_backups(self):
        target=self.root/'example.bin';target.write_bytes(b'old');target.chmod(0o640)
        version=self.call('stat',path='/example.bin')['node']['version']
        ident=self.start(overwrite=True,version=version);self.chunk(ident,b'new');result=self.commit(ident,b'new')
        self.assertEqual(target.read_bytes(),b'new');self.assertEqual(target.stat().st_mode&0o777,0o640)
        entries=self.call('trash-list')['entries'];self.assertEqual(entries[0]['reason'],'replaced');self.assertEqual(entries[0]['id'],result['backupId'])
        payload=pathlib.Path(entries[0].get('payload',self.files.state/entries[0]['id']/'item'))
        self.assertEqual(payload.read_bytes(),b'old')
    def test_changed_destination_is_not_overwritten(self):
        target=self.root/'example.bin';target.write_bytes(b'old');version=self.call('stat',path='/example.bin')['node']['version']
        ident=self.start(overwrite=True,version=version);self.chunk(ident,b'new');target.write_bytes(b'changed')
        with self.assertRaises(FileExistsError):self.commit(ident,b'new')
        self.call('upload-abort',uploadId=ident);self.assertEqual(target.read_bytes(),b'changed')
    def test_restart_cleans_unpublished_stage(self):
        ident=self.start();self.chunk(ident,b'new');item=self.files.uploads.items.pop(ident);item['file'].close()
        self.files=HostFiles(self.base/'state',self.root)
        self.assertEqual(list(self.root.iterdir()),[]);self.assertEqual(list(self.files.uploads.journal.iterdir()),[])
    def test_restart_recovers_previous_file_after_atomic_exchange(self):
        target=self.root/'example.bin';target.write_bytes(b'old');version=self.call('stat',path='/example.bin')['node']['version']
        ident=self.start(overwrite=True,version=version);self.chunk(ident,b'new');item=self.files.uploads.items.pop(ident);item['file'].close();exchange(item['temporary'],target)
        self.files=HostFiles(self.base/'state',self.root)
        self.assertEqual(target.read_bytes(),b'new');entries=self.call('trash-list')['entries'];self.assertEqual(len(entries),1);self.assertEqual(entries[0]['reason'],'replaced')
    def test_empty_text_file_limits_and_idle_cleanup(self):
        result=self.call('create',path='/',name='empty.txt',confirmed=True);self.assertEqual(result['node']['size'],0)
        first=self.start('one.bin');self.start('two.bin')
        with self.assertRaises(ValueError):self.start('three.bin')
        self.files.uploads.items[first]['updated']=time.monotonic()-1801;self.files.prune_uploads()
        self.assertNotIn(first,self.files.uploads.items)
    def test_long_valid_filename_and_reserved_stage_names(self):
        name='a'*250+'.txt';ident=self.start(name);self.chunk(ident,b'abc');self.commit(ident,b'abc');self.assertEqual((self.root/name).read_bytes(),b'abc')
        with self.assertRaises(PermissionError):self.call('stat',path='/.windows7-upload-'+'a'*32)
        with self.assertRaises(ValueError):self.start('.windows7-upload-'+'a'*32)
    def test_profile_destination_has_requested_owner_before_publication(self):
        uid=1234 if os.geteuid()==0 else os.getuid();gid=1234 if os.geteuid()==0 else os.getgid()
        ident=self.start(uid=uid,gid=gid);self.chunk(ident,b'abc');self.commit(ident,b'abc')
        info=(self.root/'example.bin').stat();self.assertEqual((info.st_uid,info.st_gid),(uid,gid));self.assertEqual(info.st_mode&0o777,0o600)
        with self.assertRaises(ValueError):self.start('invalid.bin',uid=-1,gid=gid)

if __name__=='__main__':unittest.main()
