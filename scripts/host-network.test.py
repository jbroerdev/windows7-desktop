"""Isolated command-runner tests. Never invokes Linux tools or changes a live adapter."""
import copy
import importlib.util
import json
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('host_network', pathlib.Path(__file__).with_name('host_network.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ORIGINAL = '11111111-1111-4111-8111-111111111111'
NEW = '22222222-2222-4222-8222-222222222222'
CHECKPOINT = '/org/freedesktop/NetworkManager/Checkpoint/1'
ADMIN = dict(owner='admin-1', admin=True)
STATIC = dict(ipv4Method='manual', address='192.0.2.10', prefixLength=24,
              gateway='192.0.2.1', dnsMode='manual', dnsServers=['192.0.2.53'], mtu=1500)


class FakeLinux:
    def __init__(self):
        self.commands = []
        self.active = ORIGINAL
        self.profiles = {ORIGINAL: {'connection.autoconnect': 'yes', 'ipv4.method': 'auto'}}
        self.checkpoint = False
        self.fail_up = False
        self.remove_clone_on_rollback = False
        self.no_dns = False
        self.no_routes = False
        self.raw = [dict(ifname='eth0', ifindex=2, address='02:00:00:00:00:01',
                         link_type='ether', mtu=1500, flags=['UP'], operstate='UP',
                         addr_info=[dict(local='192.0.2.5', prefixlen=24, scope='global', valid_life_time=100)])]

    def __call__(self, argv):
        self.commands.append(list(argv))
        if argv == ['ip', '-j', '-details', 'address', 'show']:
            return json.dumps(self.raw)
        if argv[0] == 'ip':
            if self.no_routes:
                raise FileNotFoundError('ip route unavailable')
            return json.dumps([] if '-6' in argv else [dict(dev='eth0', dst='default', gateway='192.0.2.1', metric=100)])
        if argv[0] == 'resolvectl':
            if self.no_dns:
                raise FileNotFoundError('resolvectl unavailable')
            return 'Global: 2001:db8::53\nLink 2 (eth0): 192.0.2.53'
        if argv == ['nmcli', '-t', '-f', 'UUID,DEVICE', 'connection', 'show', '--active']:
            return self.active + ':eth0' if self.active else ''
        if argv[:3] == ['busctl', '--system', 'introspect']:
            return 'CheckpointCreate CheckpointDestroy CheckpointRollback'
        if argv[:3] == ['busctl', '--system', 'get-property']:
            return 'ao 1 "' + CHECKPOINT + '"' if self.checkpoint else 'ao 0'
        if argv[:3] == ['busctl', '--system', 'call']:
            method = argv[6]
            if method == 'CheckpointCreate':
                self.checkpoint = True
                return 'o "' + CHECKPOINT + '"'
            if method == 'CheckpointRollback':
                self.active = ORIGINAL
                if self.remove_clone_on_rollback:
                    self.profiles.pop(NEW, None)
                return 'a{su} 1 "/org/freedesktop/NetworkManager/Devices/2" 0'
            if method == 'CheckpointDestroy':
                self.checkpoint = False
                return ''
        if argv == ['nmcli', '-g', 'GENERAL.DBUS-PATH', 'device', 'show', 'eth0']:
            return '/org/freedesktop/NetworkManager/Devices/2'
        if argv[:3] == ['nmcli', '-g', 'connection.type']:
            return '802-3-ethernet'
        if argv[:3] == ['nmcli', '-g', 'connection.autoconnect']:
            return self.profiles[argv[-1]]['connection.autoconnect']
        if argv[:3] == ['nmcli', '-g', 'connection.uuid']:
            return NEW
        if argv == ['nmcli', '-g', 'UUID', 'connection', 'show']:
            return '\n'.join(self.profiles)
        if argv[:3] == ['nmcli', 'connection', 'clone']:
            self.profiles[NEW] = copy.deepcopy(self.profiles[ORIGINAL])
            return ''
        if argv[:3] == ['nmcli', 'connection', 'modify']:
            ident = argv[4]
            for key, value in zip(argv[5::2], argv[6::2]):
                self.profiles[ident][key] = value
            return ''
        if argv[:5] == ['nmcli', '--wait', '20', 'connection', 'up']:
            if self.fail_up:
                raise RuntimeError('activation failed')
            self.active = argv[6]
            return ''
        if argv[:3] == ['nmcli', 'connection', 'delete']:
            del self.profiles[argv[-1]]
            return ''
        if argv[0] in ('ping', 'nslookup'):
            return module.CommandOutput('Synthetic unreachable', 1)
        raise AssertionError('Unexpected command: ' + repr(argv))


class HostNetworkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.state = pathlib.Path(self.temp.name) / 'state.json'
        self.fake = FakeLinux()
        self.clock = [1000]
        self.service = module.HostNetwork(self.state, runner=self.fake, clock=lambda: self.clock[0], allow_changes=True)

    def call(self, action, **data):
        return self.service.execute(action, {**ADMIN, **data})

    def prepare(self, settings=None):
        snapshot = self.call('snapshot')
        return self.call('prepare', adapterId=snapshot['adapters'][0]['id'], expectedRevision=snapshot['revision'], settings=settings or STATIC)

    def test_snapshot_contract_and_revision_excludes_dynamic_lifetimes(self):
        before = self.call('snapshot')
        self.fake.raw[0]['addr_info'][0]['valid_life_time'] = 99
        self.fake.raw[0]['stats64'] = dict(rx=9999)
        after = self.call('snapshot')
        self.assertEqual(before['revision'], after['revision'])
        self.assertEqual(before['schemaVersion'], 1)
        self.assertEqual(before['scope'], 'host')
        adapter = before['adapters'][0]
        self.assertEqual(adapter['dnsServers'], ['192.0.2.53', '2001:db8::53'])
        self.assertEqual(adapter['dnsSource'], 'resolvectl')
        self.assertTrue(adapter['capabilities']['configureIpv4'])
        self.assertNotIn('stats64', adapter)
        self.assertEqual(before['internetConnectivity'], 'not-tested')

    def test_missing_dns_and_routes_are_null(self):
        self.fake.no_dns = self.fake.no_routes = True
        result = self.call('snapshot')['adapters'][0]
        self.assertIsNone(result['dnsServers'])
        self.assertIsNone(result['routes'])
        self.assertIsNone(result['dnsSource'])

    def test_no_authorization_or_forged_fields_never_calls_runner(self):
        for data in [{}, {**ADMIN, 'admin': False}, {**ADMIN, 'owner': '../root'}]:
            with self.assertRaises(PermissionError):
                self.service.execute('snapshot', data)
        with self.assertRaises(ValueError):
            self.service.execute('snapshot', {**ADMIN, 'command': 'id'})
        self.assertEqual(self.fake.commands, [])

    def test_diagnostics_fixed_argv_and_nonzero_result(self):
        result = self.call('diagnose', kind='ping', target='192.0.2.1')
        self.assertEqual(self.fake.commands[-1], ['ping', '-c', '4', '-W', '2', '--', '192.0.2.1'])
        self.assertEqual(result['exitCode'], 1)
        for target in ['-c', 'host;id', 'host\nreboot', '$(id)', '/etc/passwd']:
            with self.assertRaises(ValueError):
                self.call('diagnose', kind='ping', target=target)

    def test_validation(self):
        invalid = [dict(STATIC, address=True), dict(STATIC, gateway=123), dict(STATIC, address='192.0.2.0'),
                   dict(STATIC, prefixLength=True), dict(STATIC, gateway='198.51.100.1'),
                   dict(STATIC, dnsServers=['0.0.0.0']), dict(STATIC, mtu=1200), dict(STATIC, extra='ignored')]
        for settings in invalid:
            with self.subTest(settings=settings), self.assertRaises(ValueError):
                module.ipv4_settings(settings)
        self.assertEqual(module.ipv4_settings({'ipv4Method': 'auto'})['address'], None)
        with self.assertRaises(ValueError):
            module.ipv4_settings(dict(STATIC, ipv4Method='auto'))

    def test_stale_prepare_and_host_optout_do_not_mutate(self):
        snapshot = self.call('snapshot')
        with self.assertRaises(module.NetworkConflict):
            self.call('prepare', adapterId=snapshot['adapters'][0]['id'], expectedRevision='0'*64, settings=STATIC)
        self.service.allow_changes = False
        self.assertFalse(self.call('snapshot')['capabilities']['configureIpv4'])
        with self.assertRaises(PermissionError):
            self.prepare()
        self.assertFalse(self.state.exists())

    def test_apply_changes_clone_only_and_confirm_persists(self):
        original = copy.deepcopy(self.fake.profiles[ORIGINAL])
        prepared = self.prepare()
        pending = self.call('apply', token=prepared['token'], confirmed=True)
        self.assertEqual(pending['phase'], 'pending')
        self.assertTrue(self.fake.checkpoint)
        self.assertEqual(self.fake.profiles[ORIGINAL], original)
        self.assertEqual(self.fake.profiles[NEW]['ipv4.addresses'], '192.0.2.10/24')
        self.assertEqual(self.fake.profiles[NEW]['connection.autoconnect'], 'no')
        confirmed = self.call('confirm', token=prepared['token'], confirmed=True)
        self.assertEqual(confirmed['phase'], 'confirmed')
        self.assertFalse(self.fake.checkpoint)
        self.assertEqual(self.fake.profiles[NEW]['connection.autoconnect'], 'yes')
        self.assertEqual(self.fake.profiles[ORIGINAL]['connection.autoconnect'], 'no')
        restored = module.HostNetwork(self.state, runner=self.fake, allow_changes=False)
        self.assertEqual(restored.execute('status', {**ADMIN, 'token': prepared['token']})['phase'], 'confirmed')

    def test_timeout_rolls_back_even_when_manager_already_deleted_clone(self):
        prepared = self.prepare()
        self.call('apply', token=prepared['token'], confirmed=True)
        self.fake.remove_clone_on_rollback = True
        self.clock[0] += 61
        result = self.call('status', token=prepared['token'])
        self.assertEqual(result['phase'], 'rolled-back')
        self.assertEqual(self.fake.active, ORIGINAL)
        self.assertEqual(self.fake.profiles[ORIGINAL]['connection.autoconnect'], 'yes')
        self.assertNotIn(NEW, self.fake.profiles)
        with self.assertRaises(module.NetworkConflict):
            self.call('confirm', token=prepared['token'], confirmed=True)

    def test_rollback_deletes_only_our_clone_and_uses_no_global_delete_flag(self):
        prepared = self.prepare()
        self.call('apply', token=prepared['token'], confirmed=True)
        unrelated = '33333333-3333-4333-8333-333333333333'
        self.fake.profiles[unrelated] = {'connection.autoconnect': 'yes'}
        result = self.call('rollback', token=prepared['token'])
        self.assertEqual(result['phase'], 'rolled-back')
        self.assertIn(unrelated, self.fake.profiles)
        self.assertNotIn(NEW, self.fake.profiles)
        checkpoint = next(argv for argv in self.fake.commands if 'CheckpointCreate' in argv)
        self.assertEqual(checkpoint[-1], '0')

    def test_activation_failure_rolls_back_and_is_not_success(self):
        prepared = self.prepare()
        self.fake.fail_up = True
        with self.assertRaises(RuntimeError):
            self.call('apply', token=prepared['token'], confirmed=True)
        self.assertEqual(self.call('status', token=prepared['token'])['phase'], 'rolled-back')
        self.assertEqual(self.fake.active, ORIGINAL)

    def test_ownership_confirmation_and_revoked_optin(self):
        prepared = self.prepare()
        for action in ['status', 'apply', 'confirm', 'rollback']:
            with self.assertRaises(PermissionError):
                self.service.execute(action, {**ADMIN, 'owner': 'other', 'token': prepared['token'], **({'confirmed': True} if action in ('apply', 'confirm') else {})})
        with self.assertRaises(PermissionError):
            self.call('apply', token=prepared['token'], confirmed=False)
        self.service.allow_changes = False
        with self.assertRaises(PermissionError):
            self.call('apply', token=prepared['token'], confirmed=True)
        self.assertEqual(set(self.fake.profiles), {ORIGINAL})

    def test_recover_completed_commit_from_durable_journal(self):
        prepared = self.prepare()
        self.call('apply', token=prepared['token'], confirmed=True)
        self.service.plans[prepared['token']]['phase'] = 'committing'
        self.service._save()
        self.fake.checkpoint = False
        self.fake.profiles[ORIGINAL]['connection.autoconnect'] = 'no'
        self.fake.profiles[NEW]['connection.autoconnect'] = 'yes'
        restarted = module.HostNetwork(self.state, runner=self.fake, clock=lambda:self.clock[0])
        result = restarted.execute('status', {**ADMIN, 'token': prepared['token']})
        self.assertEqual(result['phase'], 'confirmed')
        self.assertEqual(self.fake.active, NEW)


if __name__ == '__main__':
    unittest.main(verbosity=2)
