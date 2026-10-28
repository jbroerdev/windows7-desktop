import test from 'node:test';
import assert from 'node:assert/strict';
import{mailPreset}from'./public/mail-providers.js';
test('Gmail presets recognize exact Google domains, preserve manual accounts and support explicit Workspace selection',()=>{
 const gmail=mailPreset(' Example@GMAIL.COM ');assert.equal(gmail.imap.host,'imap.gmail.com');assert.equal(gmail.imap.port,993);assert.equal(gmail.imap.security,'tls');assert.equal(gmail.smtp.host,'smtp.gmail.com');assert.equal(gmail.smtp.port,587);assert.equal(gmail.smtp.security,'starttls');assert.deepEqual(mailPreset('user@googlemail.com'),gmail);assert.equal(mailPreset('user@gmail.com.attacker.org'),null);assert.equal(mailPreset('user@example.org'),null);assert.equal(mailPreset('user@gmail.com','manual'),null);assert.deepEqual(mailPreset('user@company.example','gmail'),gmail);
});
