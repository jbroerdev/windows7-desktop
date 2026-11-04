import importlib.util, pathlib, unittest, time, threading, os, sys
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('agent',pathlib.Path(__file__).with_name('host-agent.py'))
agent=importlib.util.module_from_spec(spec);spec.loader.exec_module(agent)
class HostCommandTests(unittest.TestCase):
    def test_nonadmin_cannot_mutate_or_run_native_commands(self):
        for command in ['rm -rf /','copy a b','systemctl stop ssh','taskkill /PID 123','shutdown /r','sh -c id']:
            with self.assertRaises(PermissionError):agent.execute(dict(command=command,admin=False,cwd='/'))
    def test_admin_mutation_is_previewed_before_execution(self):
        with patch.object(agent.shutil,'which',return_value='/usr/bin/touch'),patch.object(agent,'run_bounded',return_value={'output':'ok','exitCode':0}) as run:
            value=agent.execute(dict(command='touch sample.txt',admin=True,cwd='/'))
            self.assertTrue(value['requiresConfirmation']);run.assert_not_called()
            agent.execute(dict(command='touch sample.txt',admin=True,cwd='/',confirmed=True));run.assert_called_once()
    def test_windows_aliases_use_argv_without_shell(self):
        with patch.object(agent.shutil,'which',return_value='/usr/bin/ls'),patch.object(agent,'run_bounded',return_value={}) as run:
            agent.execute(dict(command='dir "C:\\etc"',admin=True,cwd='/'))
            self.assertEqual(run.call_args[0][0][:2],['ls','-la'])
            self.assertTrue(run.call_args[0][0][-1].replace('\\','/').endswith('/etc'))
    def test_help_never_triggers_shutdown(self):
        with patch.object(agent,'run_bounded') as run:
            self.assertIn('SHUTDOWN',agent.execute(dict(command='shutdown /?',admin=True))['output']);run.assert_not_called()
    def test_nonadmin_diagnostics_cannot_inject_flags(self):
        with self.assertRaises(ValueError):agent.execute(dict(command='ping -f',admin=False,cwd='/'))

class HostSessionTests(unittest.TestCase):
    def test_sessions_are_owner_isolated_and_admin_read_access_is_revoked(self):
        sessions=agent.HostSessions();sessions.jobs['test']={'id':'test','owner':'alice','admin':True,'cwd':'/','status':'completed','output':'secret','exitCode':0,'updated':time.monotonic(),'cancel':threading.Event()}
        with self.assertRaises(PermissionError):sessions.poll('bob','test',0,True)
        with self.assertRaises(PermissionError):sessions.cancel('bob','test')
        with self.assertRaises(PermissionError):sessions.poll('alice','test',0,False)
        self.assertEqual(sessions.poll('alice','test',2,True)['output'],'cret')
        with self.assertRaises(ValueError):sessions.poll('alice','test',99,True)
        self.assertTrue(sessions.cancel('alice','test')['requested'])
    @unittest.skipIf(os.name!='posix','requires Linux process groups and pipe selectors')
    def test_live_output_arrives_before_completion_and_cancel_terminates_process(self):
        sessions=agent.HostSessions();result=sessions.start('alice',[sys.executable,'-u','-c',"import time;print('ready');time.sleep(30)"],os.getcwd(),True);ident=result['sessionId'];deadline=time.monotonic()+5
        while time.monotonic()<deadline:
            value=sessions.poll('alice',ident,0,True)
            if 'ready' in value['output']:break
            time.sleep(.02)
        self.assertIn('ready',value['output']);self.assertIn(value['status'],('starting','running'));sessions.cancel('alice',ident)
        while time.monotonic()<deadline:
            value=sessions.poll('alice',ident,0,True)
            if value['status']=='cancelled':break
            time.sleep(.02)
        self.assertEqual(value['status'],'cancelled');self.assertEqual(value['exitCode'],130);self.assertIsNotNone(sessions.jobs[ident]['proc'].poll())

if __name__=='__main__':unittest.main()
