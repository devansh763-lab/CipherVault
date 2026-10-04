// Run with: node test.js  (tests the cipher engine only, no browser needed)
const assert = require('assert');
const { CIPHERS: C } = require('./js/ciphers.js');

const key = (id, vals) => C[id].parse(vals);
const enc = (id, text, vals = {}) => C[id].encrypt(text, key(id, vals));
const dec = (id, text, vals = {}) => C[id].decrypt(text, key(id, vals));
const QWERTY = 'QWERTYUIOPASDFGHJKLZXCVBNM';

const cases = [
  ['Caesar HELLO',            enc('caesar', 'HELLO', { shift: '3' }), 'KHOOR'],
  ['Caesar keeps formatting', enc('caesar', 'Hello, World! 123', { shift: '3' }), 'Khoor, Zruog! 123'],
  ['Caesar negative shift',   dec('caesar', 'Khoor', { shift: '-23' }), 'Hello'.replace('Hello', 'Hello')],
  ['Substitution',            enc('substitution', 'Hello, World! 123', { key: QWERTY }), 'Itssg, Vgksr! 123'],
  ['ROT13',                   enc('rot13', 'HELLO'), 'URYYB'],
  ['ROT13 twice',             enc('rot13', enc('rot13', 'Hello!')), 'Hello!'],
  ['Vigenere',                enc('vigenere', 'ATTACKATDAWN', { key: 'LEMON' }), 'LXFOPVEFRNHR'],
  ['Vigenere skips spaces',   enc('vigenere', 'ATTACK AT DAWN', { key: 'LEMON' }), 'LXFOPV EF RNHR'],
  ['Vigenere decrypt',        dec('vigenere', 'lxfopv ef rnhr', { key: 'lemon' }), 'attack at dawn'],
  ['Playfair',                enc('playfair', 'INSTRUMENTS', { key: 'MONARCHY' }), 'GATLMZCLRQXA'],
  ['Playfair decrypt',        dec('playfair', 'GATLMZCLRQXA', { key: 'MONARCHY' }), 'INSTRUMENTSX'],
  ['Rail Fence',              enc('railfence', 'WEAREDISCOVEREDFLEEATONCE', { rails: '3' }), 'WECRLTEERDSOEEFEAOCAIVDEN'],
  ['Rail Fence decrypt',      dec('railfence', 'WECRLTEERDSOEEFEAOCAIVDEN', { rails: '3' }), 'WEAREDISCOVEREDFLEEATONCE'],
  ['Affine',                  enc('affine', 'AFFINE', { a: '5', b: '8' }), 'IHHWVC'],
  ['Affine decrypt',          dec('affine', 'IHHWVC', { a: '5', b: '8' }), 'AFFINE'],
];
const roundTrips = [
  ['caesar', { shift: '7' }], ['substitution', { key: QWERTY }], ['vigenere', { key: 'Secret' }],
  ['railfence', { rails: '4' }], ['affine', { a: '17', b: '3' }], ['rot13', {}],
];
const invalid = [
  ['caesar', { shift: 'abc' }], ['caesar', { shift: '' }], ['substitution', { key: 'ABC' }],
  ['substitution', { key: 'A'.repeat(26) }], ['vigenere', { key: '123' }], ['playfair', { key: '' }],
  ['railfence', { rails: '1' }], ['railfence', { rails: 'x' }], ['affine', { a: '2', b: '1' }], ['affine', { a: '13', b: '0' }],
];

let failed = 0;
const check = (name, fn) => { try { fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '-', e.message); } };

cases.forEach(([name, got, want]) => check(name, () => assert.strictEqual(got, want)));
const sample = 'The Quick Brown Fox, 42 times!';
roundTrips.forEach(([id, vals]) => check(`round trip ${id}`, () => assert.strictEqual(dec(id, enc(id, sample, vals), vals), sample)));
check('Playfair round trip (letters only)', () => assert.strictEqual(dec('playfair', enc('playfair', 'BALLOON', { key: 'MONARCHY' }), { key: 'MONARCHY' }), 'BALXLOON'));
invalid.forEach(([id, vals]) => check(`invalid ${id} ${JSON.stringify(vals)}`, () => assert.throws(() => key(id, vals))));
check('Playfair odd ciphertext rejected', () => assert.throws(() => dec('playfair', 'ABC', { key: 'KEY' })));

console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
process.exit(failed ? 1 : 0);
