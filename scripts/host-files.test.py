import os, tempfile, pathlib, unittest
from host_files import HostFiles

@unittest.skipIf(os.name!='posix','host filesystem operations require Linux ownership semantics')
class HostFilesTests(unittest.TestCase):
    def setUp(self):
        self.fixture=tempfile.TemporaryDirectory();base=pathlib.Path(self.fixture.name);self.root=base/'root';self.root.mkdir();self.files=HostFiles(base/'state',self.root);(self.root/'example.txt').write_text('before',encoding='utf-8')
    def tearDown(self):self.fixture.cleanup()
    def call(self,action,**data):return self.files.execute(action,dict(admin=True,**data))
    def test_role_and_symlink_boundaries(self):
        with self.assertRaises(PermissionError):self.files.execute('list',dict(admin=False,path='/'))
        outside=pathlib.Path(self.fixture.name)/'outside';outside.write_text('private');(self.root/'escape').symlink_to(outside)
        with self.assertRaises(ValueError):self.call('read',path='/escape')
        with self.assertRaises(ValueError):self.call('read',path='/../../outside')
    def test_edit_is_confirmed_versioned_and_backed_up(self):
        first=self.call('read',path='/example.txt');preview=self.call('write',path='/example.txt',version=first['version'],content='after');self.assertTrue(preview['requiresConfirmation']);self.assertEqual((self.root/'example.txt').read_text(),'before')
        saved=self.call('write',path='/example.txt',version=first['version'],content='after',confirmed=True);self.assertNotEqual(saved['version'],first['version']);self.assertEqual((self.root/'example.txt').read_text(),'after')
        with self.assertRaises(FileExistsError):self.call('write',path='/example.txt',version=first['version'],content='stale',confirmed=True)
        entries=self.call('trash-list')['entries'];self.assertEqual(len(entries),1);self.assertEqual(entries[0]['reason'],'saved')
    def test_trash_restore_rename_and_name_collisions(self):
        first=self.call('stat',path='/example.txt')['node'];renamed=self.call('rename',path='/example.txt',name='renamed.txt',version=first['version'],confirmed=True)['node'];self.assertFalse((self.root/'example.txt').exists())
        preview=self.call('trash',path='/renamed.txt',version=renamed['version']);self.assertTrue(preview['requiresConfirmation'])
        result=self.call('trash',path='/renamed.txt',version=renamed['version'],confirmed=True);self.assertFalse((self.root/'renamed.txt').exists());self.assertTrue(self.call('restore',trashId=result['trashId'])['requiresConfirmation']);self.call('restore',trashId=result['trashId'],confirmed=True);self.assertEqual((self.root/'renamed.txt').read_text(),'before')
        with self.assertRaises(FileExistsError):self.call('rename',path='/renamed.txt',name='renamed.txt',version=self.call('stat',path='/renamed.txt')['node']['version'],confirmed=True)
    def test_chunks_are_bounded_and_detect_concurrent_changes(self):
        (self.root/'large.bin').write_bytes(b'x'*300000);first=self.call('chunk',path='/large.bin',offset=0);self.assertEqual(first['offset'],256*1024);second=self.call('chunk',path='/large.bin',offset=first['offset'],version=first['version']);self.assertEqual(second['offset'],300000)
        (self.root/'large.bin').write_bytes(b'changed')
        with self.assertRaises(FileExistsError):self.call('chunk',path='/large.bin',offset=first['offset'],version=first['version'])
    def test_papierkorb_works_with_a_journal_on_another_filesystem(self):
        with tempfile.TemporaryDirectory(dir='/var/tmp') as journal:
            files=HostFiles(journal,self.root);data=dict(admin=True,path='/example.txt')
            version=files.execute('stat',data)['node']['version']
            result=files.execute('trash',dict(data,version=version,confirmed=True))
            self.assertFalse((self.root/'example.txt').exists())
            entries=files.execute('trash-list',dict(admin=True))['entries'];self.assertEqual(len(entries),1)
            files.execute('restore',dict(admin=True,trashId=result['trashId'],confirmed=True));self.assertEqual((self.root/'example.txt').read_text(),'before')
    def test_editor_preserves_utf8_and_utf16_byte_order_marks(self):
        for name,prefix,encoding in [('utf8.txt',b'\xef\xbb\xbf','utf-8'),('utf16.txt',b'\xff\xfe','utf-16-le')]:
            target=self.root/name;target.write_bytes(prefix+'Grüße'.encode(encoding));first=self.call('read',path='/'+name);self.assertEqual(first['content'],'Grüße');self.call('write',path='/'+name,version=first['version'],content='Geändert',confirmed=True);self.assertEqual(target.read_bytes(),prefix+'Geändert'.encode(encoding))
    def test_special_files_and_protected_paths_cannot_be_mutated(self):
        (self.root/'etc').mkdir();(self.root/'pipe').touch();os.unlink(self.root/'pipe');os.mkfifo(self.root/'pipe')
        with self.assertRaises(ValueError):self.call('read',path='/pipe')
        with self.assertRaises(PermissionError):self.call('trash',path='/etc',version=self.call('stat',path='/etc')['node']['version'],confirmed=True)
        made=self.call('mkdir',path='/etc',name='new',confirmed=True);self.assertTrue((self.root/'etc/new').is_dir());self.assertEqual(made['node']['kind'],'folder')
    def test_folder_ownership_and_resolved_alias_metadata(self):
        uid=1234 if os.geteuid()==0 else os.getuid();gid=1234 if os.geteuid()==0 else os.getgid()
        result=self.call('mkdir',path='/',name='profile',uid=uid,gid=gid,confirmed=True)
        self.assertEqual((result['node']['uid'],result['node']['gid']),(uid,gid))
        (self.root/'alias').symlink_to(self.root/'profile',target_is_directory=True)
        self.assertEqual(self.call('stat',path='/alias')['node']['resolved'],'/profile')
        with self.assertRaises(ValueError):self.call('mkdir',path='/',name='bad',uid=-1,gid=gid,confirmed=True)
        self.assertFalse((self.root/'bad').exists())

if __name__=='__main__':unittest.main()
