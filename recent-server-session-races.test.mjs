import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// START-PRIVACY-001: the actor must remain personal after awaiting a request body.
test('recent writes reject Share entry and logout during the body without persisting personal history', {timeout: 15000}, async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'recent-server-session-'));
  process.env.NODE_ENV = 'test';
  process.env.DATA_DIR = path.join(temp, 'metadata');
  process.env.EXPLORER_ROOT = path.join(temp, 'Explorer');
  let server;
  try {
    ({server} = await import('./backend.mjs'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const request = async (route, data, cookie = '') => {
      const response = await fetch(base + route, {
        method: data === undefined ? 'GET' : 'POST',
        headers: {cookie, 'content-type': 'application/json'},
        body: data === undefined ? undefined : JSON.stringify(data)
      });
      return {status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0]};
    };
    const credentials = {username: 'sessionaudit', password: 'synthetic-session-test-only'};
    let {cookie} = await request('/api/setup', credentials);
    const profileId = (await request('/api/session', undefined, cookie)).data.userId;
    const persisted = async () => {
      const db = JSON.parse(await readFile(path.join(process.env.DATA_DIR, 'database.json'), 'utf8'));
      const history = db.users.find(user => user.username === credentials.username).recentItems;
      return {programs: history?.programs || [], documents: history?.documents || []};
    };
    const interruptedPost = async changeSession => {
      const body = JSON.stringify({kind: 'program', appId: 'editor', profileId});
      let pending;
      // Observe the actual server request, rather than relying on a timing sleep.
      let observe;
      const started = new Promise(resolve => {
        observe = req => {
          if (req.url === '/api/recent-items' && req.method === 'POST') {
            server.off('request', observe);
            resolve();
          }
        };
        server.on('request', observe);
      });
      const response = new Promise((resolve, reject) => {
        pending = http.request(base + '/api/recent-items', {
          method: 'POST', headers: {cookie, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body)}
        }, res => {
          let text = '';
          res.on('data', chunk => { text += chunk; });
          res.on('end', () => {
            try { resolve({status: res.statusCode, data: JSON.parse(text)}); }
            catch (error) { reject(error); }
          });
        });
        pending.on('error', reject);
      });
      try {
        pending.write(body.slice(0, 8));
        await started;
        assert.equal((await changeSession()).status, 200);
        pending.end(body.slice(8));
        const result = await response;
        assert.ok([401, 409].includes(result.status), 'old personal request must be rejected');
        assert.deepEqual(Object.keys(result.data), ['error'], 'no personal history in rejected response');
        assert.deepEqual(await persisted(), {programs: [], documents: []}, 'rejected request must not change disk history');
      } finally {
        server.off('request', observe);
        pending.destroy();
      }
    };

    await t.test('Share entry while the personal body is incomplete', async () => {
      await interruptedPost(() => request('/api/share-desktop-mode', {enabled: true}, cookie));
      assert.equal((await request('/api/recent-items', undefined, cookie)).status, 401);
      assert.equal((await request('/api/share-desktop-mode', {enabled: false}, cookie)).status, 200);
      assert.deepEqual((await request('/api/recent-items', undefined, cookie)).data.programs, []);
    });
    await t.test('logout while the personal body is incomplete', async () => {
      await interruptedPost(() => request('/api/logout', {}, cookie));
      assert.equal((await request('/api/recent-items', undefined, cookie)).status, 401);
    });
    await t.test('normal personal recording still succeeds after a new login', async () => {
      const login = await request('/api/login', credentials);
      assert.equal(login.status, 200);
      cookie = login.cookie;
      const result = await request('/api/recent-items', {kind: 'program', appId: 'paint', profileId}, cookie);
      assert.equal(result.status, 200);
      assert.deepEqual(result.data.programs.map(item => item.appId), ['paint']);
      assert.deepEqual((await persisted()).programs.map(item => item.appId), ['paint']);
    });
  } finally {
    if (server?.listening) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    if (path.dirname(temp) !== path.resolve(os.tmpdir()) || !path.basename(temp).startsWith('recent-server-session-')) throw Error('Unexpected test cleanup target');
    await rm(temp, {recursive: true, force: true});
  }
});
