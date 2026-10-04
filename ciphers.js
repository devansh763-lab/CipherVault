/* CipherVault - cipher engine. Pure functions only (no DOM), so every cipher is easy to test and explain. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const mod = (n, m) => ((n % m) + m) % m;             // true mathematical modulo (handles negatives)
const lettersOnly = s => s.replace(/[^a-z]/gi, '').toUpperCase();

// Core helper for alphabet ciphers: transform each letter, keep its case,
// leave spaces/digits/punctuation untouched.
// shiftFn(x, i): x = letter index 0-25, i = number of letters processed so far.
function mapLetters(text, shiftFn) {
  let i = 0;
  return text.replace(/[a-z]/gi, ch => {
    const out = ALPHABET[mod(shiftFn(ALPHABET.indexOf(ch.toUpperCase()), i++), 26)];
    return ch === ch.toLowerCase() ? out.toLowerCase() : out;
  });
}

/* ---------- Playfair helpers (I and J share one cell) ---------- */
function playfairSquare(keyword) {
  const cells = new Set((lettersOnly(keyword) + ALPHABET).replace(/J/g, 'I'));
  return [...cells].join('');                         // 25 letters: keyword first, then the rest
}
function playfairPairs(text) {                        // digraphs; double letters get an X between them
  const p = lettersOnly(text).replace(/J/g, 'I'), pairs = [];
  for (let i = 0; i < p.length;) {
    if (i + 1 === p.length) { pairs.push(p[i] + 'X'); break; }       // odd length: pad with X
    if (p[i] === p[i + 1]) { pairs.push(p[i] + 'X'); i += 1; }       // repeated letter: insert X
    else { pairs.push(p[i] + p[i + 1]); i += 2; }
  }
  return pairs;
}
function playfairTransform(pairs, square, step) {     // step = +1 encrypt, -1 decrypt
  const at = (r, c) => square[mod(r, 5) * 5 + mod(c, 5)];
  return pairs.map(([a, b]) => {
    const [r1, c1] = [Math.floor(square.indexOf(a) / 5), square.indexOf(a) % 5];
    const [r2, c2] = [Math.floor(square.indexOf(b) / 5), square.indexOf(b) % 5];
    if (r1 === r2) return at(r1, c1 + step) + at(r2, c2 + step);     // rule 1: same row
    if (c1 === c2) return at(r1 + step, c1) + at(r2 + step, c2);     // rule 2: same column
    return at(r1, c2) + at(r2, c1);                                   // rule 3: rectangle
  }).join('');
}

/* ---------- Rail Fence helper ---------- */
// rail[i] = rail number of position i (zig-zag); order = positions read rail by rail.
function railOrder(length, rails) {
  const rail = []; let r = 0, dir = 1;
  for (let i = 0; i < length; i++) {
    rail.push(r);
    if (r === 0) dir = 1; else if (r === rails - 1) dir = -1;
    r += dir;
  }
  const order = rail.map((_, i) => i).sort((a, b) => rail[a] - rail[b] || a - b);
  return { rail, order };
}

const cleanWord = (v, msg) => { const w = lettersOnly(v); if (!w) throw new Error(msg); return w; };
const toInt = (v, msg) => { const n = Number(v); if (String(v).trim() === '' || !Number.isInteger(n)) throw new Error(msg); return n; };

/* ---------- Registry: logic + metadata for each cipher. The UI is generated from this. ---------- */
const CIPHERS = {
  caesar: {
    name: 'Caesar Cipher', type: 'Substitution', difficulty: 'Beginner', status: 'Insecure',
    fields: [{ id: 'shift', label: 'Shift', type: 'number', value: '3' }],
    parse: v => toInt(v.shift, 'Please enter a valid shift value.'),
    encrypt: (t, k) => mapLetters(t, x => x + k),
    decrypt: (t, k) => mapLetters(t, x => x - k),
    example: { text: 'HELLO WORLD' },
    info: {
      history: 'Used by Julius Caesar to protect military messages, usually with a shift of 3.',
      how: 'Every letter is moved a fixed number of places along the alphabet, wrapping from Z back to A.',
      formula: 'Encrypt: C = (P + K) mod 26 | Decrypt: P = (C - K) mod 26',
      sample: 'HELLO + shift 3 = KHOOR',
      security: 'Not secure today: only 25 meaningful shifts exist, so brute force breaks it instantly.'
    }
  },
  substitution: {
    name: 'Monoalphabetic Substitution', type: 'Substitution', difficulty: 'Beginner', status: 'Insecure',
    fields: [{ id: 'key', label: '26-letter key', value: 'QWERTYUIOPASDFGHJKLZXCVBNM', wide: true }],
    parse: v => {
      const k = v.key.replace(/\s/g, '').toUpperCase();
      if (!/^[A-Z]{26}$/.test(k) || new Set(k).size !== 26) throw new Error('The substitution key must contain exactly 26 unique letters.');
      return k;
    },
    encrypt: (t, k) => mapLetters(t, x => ALPHABET.indexOf(k[x])),   // plain letter -> key letter
    decrypt: (t, k) => mapLetters(t, x => k.indexOf(ALPHABET[x])),   // key letter -> plain letter
    example: { text: 'Hello, World! 123' },
    info: {
      history: 'Substitution alphabets were used for centuries until Arab scholar Al-Kindi described frequency analysis.',
      how: 'The key is a shuffled alphabet. Each plain letter is replaced by the key letter in the same position.',
      formula: 'C = Key[ index(P) ]  (26! = about 4 x 10^26 possible keys)',
      sample: 'HELLO + QWERTY... key = ITSSG',
      security: 'Large key space, but letter frequencies survive, so frequency analysis breaks it.'
    }
  },
  vigenere: {
    name: 'Vigenère Cipher', type: 'Polyalphabetic', difficulty: 'Intermediate', status: 'Weak',
    fields: [{ id: 'key', label: 'Keyword', value: 'SECRET' }],
    parse: v => [...cleanWord(v.key, 'Please enter a keyword (letters only).')].map(ch => ALPHABET.indexOf(ch)),
    // i counts letters only, so spaces and punctuation do not use up key letters
    encrypt: (t, k) => mapLetters(t, (x, i) => x + k[i % k.length]),
    decrypt: (t, k) => mapLetters(t, (x, i) => x - k[i % k.length]),
    example: { text: 'ATTACKATDAWN', values: { key: 'LEMON' } },
    info: {
      history: 'Described in 1553 and called "le chiffre indéchiffrable" until Kasiski broke it in 1863.',
      how: 'A keyword repeats along the message. Each key letter gives the Caesar shift for the letter above it.',
      formula: 'Encrypt: C = (P + K) mod 26 | Decrypt: P = (C - K) mod 26, K = repeating key',
      sample: 'ATTACKATDAWN + LEMON = LXFOPVEFRNHR',
      security: 'Better than Caesar, but Kasiski examination and index of coincidence reveal the key length.'
    }
  },
  playfair: {
    name: 'Playfair Cipher', type: 'Digraph substitution', difficulty: 'Intermediate', status: 'Weak',
    fields: [{ id: 'key', label: 'Keyword', value: 'MONARCHY' }],
    parse: v => cleanWord(v.key, 'Please enter a keyword.'),
    encrypt: (t, k) => playfairTransform(playfairPairs(t), playfairSquare(k), 1),
    decrypt: (t, k) => {
      const c = lettersOnly(t).replace(/J/g, 'I');
      if (!c || c.length % 2) throw new Error('Playfair ciphertext needs an even number of letters.');
      return playfairTransform(c.match(/../g), playfairSquare(k), -1);
    },
    example: { text: 'HIDETHEGOLD' },
    info: {
      history: 'Invented by Charles Wheatstone in 1854 and promoted by Lord Playfair; used in WWI and WWII.',
      how: 'Text is split into letter pairs and encrypted with a 5x5 key square. I and J share one cell; X is inserted between double letters and at the end if needed, so decrypted text may contain extra X letters.',
      formula: 'Same row: take the letter to the right | Same column: take the letter below | Otherwise: swap columns (rectangle)',
      sample: 'INSTRUMENTS + MONARCHY = GATLMZCLRQXA',
      security: 'Hides single-letter frequencies, but digraph frequency analysis still breaks it.'
    }
  },
  railfence: {
    name: 'Rail Fence Cipher', type: 'Transposition', difficulty: 'Beginner', status: 'Insecure',
    fields: [{ id: 'rails', label: 'Number of rails', type: 'number', value: '3' }],
    parse: v => {
      const n = toInt(v.rails, 'Please enter a valid number of rails.');
      if (n < 2) throw new Error('Number of rails must be at least 2.');
      if (n > 20) throw new Error('Number of rails must not be more than 20.');
      return n;
    },
    encrypt: (t, n) => { const ch = [...t], { order } = railOrder(ch.length, n); return order.map(i => ch[i]).join(''); },
    decrypt: (t, n) => { const ch = [...t], out = []; railOrder(ch.length, n).order.forEach((pos, j) => out[pos] = ch[j]); return out.join(''); },
    example: { text: 'WEAREDISCOVERED' },
    info: {
      history: 'A simple transposition cipher, reportedly used in the American Civil War.',
      how: 'The message is written in a zig-zag across the rails, then read off rail by rail. Letters are only rearranged, never replaced.',
      formula: 'No arithmetic formula: the zig-zag pattern defines the new order of positions',
      sample: 'WEAREDISCOVEREDFLEEATONCE + 3 rails = WECRLTEERDSOEEFEAOCAIVDEN',
      security: 'Very small key space and unchanged letter frequencies; trivial to break.'
    }
  },
  rot13: {
    name: 'ROT13', type: 'Substitution', difficulty: 'Beginner', status: 'No security',
    fields: [],
    parse: () => 13,
    encrypt: (t) => mapLetters(t, x => x + 13),
    decrypt: (t) => mapLetters(t, x => x + 13),        // self-inverse: 13 + 13 = 26 = 0 (mod 26)
    example: { text: 'HELLO' },
    info: {
      history: 'Popular on Usenet forums to hide spoilers and jokes, not to keep secrets.',
      how: 'A Caesar cipher with a fixed shift of 13. Since the alphabet has 26 letters, applying ROT13 twice returns the original text.',
      formula: 'C = (P + 13) mod 26, and ROT13(ROT13(P)) = P',
      sample: 'HELLO = URYYB',
      security: 'Provides no security at all; it only obscures text from casual reading.'
    }
  },
  affine: {
    name: 'Affine Cipher', type: 'Substitution', difficulty: 'Intermediate', status: 'Insecure',
    fields: [{ id: 'a', label: 'a', type: 'number', value: '5' }, { id: 'b', label: 'b', type: 'number', value: '8' }],
    parse: v => {
      const a = mod(toInt(v.a, 'Please enter a valid integer for a.'), 26);
      const b = mod(toInt(v.b, 'Please enter a valid integer for b.'), 26);
      const inverse = [...Array(26).keys()].find(i => (a * i) % 26 === 1);   // modular inverse of a
      if (inverse === undefined) throw new Error('a must be relatively prime to 26 (valid: 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25).');
      return { a, b, inverse };
    },
    encrypt: (t, k) => mapLetters(t, x => k.a * x + k.b),
    decrypt: (t, k) => mapLetters(t, x => k.inverse * (x - k.b)),
    example: { text: 'AFFINE CIPHER' },
    info: {
      history: 'A generalisation of the Caesar cipher that adds multiplication, using modular arithmetic.',
      how: 'Each letter number x is multiplied by a and shifted by b. Decryption needs the modular inverse of a, which exists only if gcd(a, 26) = 1; otherwise two letters would map to the same cipher letter.',
      formula: 'E(x) = (ax + b) mod 26 | D(x) = a^-1 (x - b) mod 26',
      sample: 'AFFINE + a=5, b=8 = IHHWVC',
      security: 'Only 312 possible keys (12 x 26) and frequency analysis works, so it is easily broken.'
    }
  }
};

if (typeof module !== 'undefined') module.exports = { CIPHERS, ALPHABET, lettersOnly, playfairSquare, railOrder }; // for Node tests only
