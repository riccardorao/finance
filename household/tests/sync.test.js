// The bank-link mapping: Enable Banking transactions and balances to the household format, and the signed token.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { jwt, mapTransaction, pickBalance } = require('../sync/enablebanking.js');
const C = require('../src/core.js');

test('debits become negative, payee and remittance make the description', () => {
  const t = mapTransaction({ entry_reference: 'r1', transaction_amount: { amount: '64.12', currency: 'EUR' }, credit_debit_indicator: 'DBIT', creditor: { name: 'ESSELUNGA SPA' }, remittance_information: ['POS 06/08', 'CARTA *1234'], booking_date: '2026-08-06', value_date: '2026-08-06', status: 'BOOK' });
  assert.deepStrictEqual(t, { date: '2026-08-06', vdate: '2026-08-06', desc: 'ESSELUNGA SPA · POS 06/08 CARTA *1234', amount: '-64.12', ref: 'r1' });
  const c = mapTransaction({ transaction_amount: { amount: '1685.40' }, credit_debit_indicator: 'CRDT', debtor: { name: 'INPS' }, remittance_information: ['PENSIONE'], booking_date: '2026-09-01' });
  assert.strictEqual(c.amount, '1685.40');
  assert.strictEqual(C.categorise({ desc: c.desc, amt: 168540 }, []).cat, 'pensione');
});

test('closing booked balance is preferred', () => {
  assert.deepStrictEqual(pickBalance([
    { balance_type: 'ITAV', balance_amount: { amount: '10.00' }, reference_date: '2026-10-01' },
    { balance_type: 'CLBD', balance_amount: { amount: '312.5' }, reference_date: '2026-09-30' },
  ]), { date: '2026-09-30', amount: '312.50' });
  assert.strictEqual(pickBalance([]), null);
});

test('the token is a valid RS256 JWT for Enable Banking', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const tok = jwt('app-123', privateKey, 1700000000);
  const [h, b, s] = tok.split('.');
  const dec = (x) => JSON.parse(Buffer.from(x, 'base64url').toString());
  assert.deepStrictEqual(dec(h), { typ: 'JWT', alg: 'RS256', kid: 'app-123' });
  assert.deepStrictEqual(dec(b), { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: 1700000000, exp: 1700003600 });
  assert.ok(crypto.createVerify('RSA-SHA256').update(h + '.' + b).verify(publicKey, Buffer.from(s, 'base64url')));
});
