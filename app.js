/* CipherVault - UI layer. Handles the page; all cryptography lives in ciphers.js. */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const current = () => CIPHERS[$('algorithm').value];

function setStatus(message, kind = '') {
  $('status').textContent = message;
  $('status').className = kind;
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

// Read the key fields and let the cipher validate them (throws a friendly Error if invalid).
function readKey() {
  const values = {};
  current().fields.forEach(f => values[f.id] = $('key-' + f.id).value);
  return current().parse(values);
}

/* ---------- Rendering ---------- */
function renderFields(values = {}) {
  const fields = current().fields;
  $('keys').innerHTML = fields.length
    ? fields.map(f => `<div><label for="key-${f.id}">${f.label}</label>
        <input id="key-${f.id}" type="${f.type || 'text'}" class="${f.wide ? 'wide' : ''}"
        value="${esc(values[f.id] ?? f.value)}" autocomplete="off" spellcheck="false"></div>`).join('')
    : '<p class="muted">ROT13 has no key.</p>';
  $('keys').querySelectorAll('input').forEach(el => el.addEventListener('input', renderViz));
}

function renderInfo() {
  const c = current(), i = c.info;
  $('info').innerHTML = `<h3>${c.name}</h3>
    <p><span class="badge">${c.type}</span> <span class="badge soft">${c.difficulty}</span> <span class="badge soft">${c.status}</span></p>
    <dl><dt>Historical background</dt><dd>${i.history}</dd>
    <dt>How it works</dt><dd>${i.how}</dd>
    <dt>Formula</dt><dd><code>${i.formula}</code></dd>
    <dt>Example</dt><dd><code>${i.sample}</code></dd>
    <dt>Security note</dt><dd>${i.security}</dd></dl>`;
}

const vrow = (label, items, cls = '') =>
  `<div class="vrow ${cls}"><b>${label}</b>${[...items].map(x => `<span>${esc(x)}</span>`).join('')}</div>`;

// Visualization changes with the cipher: alphabet map, repeating key, Playfair square or rail zig-zag.
function renderViz() {
  const id = $('algorithm').value, c = current();
  let key;
  try { key = readKey(); } catch (e) { $('viz').innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  const typed = $('input').value;
  let html;

  if (['caesar', 'substitution', 'rot13', 'affine'].includes(id)) {
    html = `<div class="scroll">${vrow('Plain', ALPHABET)}${vrow('Cipher', c.encrypt(ALPHABET, key), 'hl')}</div>
      <p class="muted">Each plain letter is replaced by the cipher letter below it.</p>`;
  } else if (id === 'vigenere') {
    const text = (lettersOnly(typed) || lettersOnly(c.example.text)).slice(0, 24);
    const repeated = Array.from(text, (_, i) => ALPHABET[key[i % key.length]]).join('');
    html = `<div class="scroll">${vrow('Text', text)}${vrow('Key', repeated, 'key')}${vrow('Result', c.encrypt(text, key), 'hl')}</div>
      <p class="muted">The keyword repeats under the text. Each key letter sets the shift (A=0, B=1, ...).</p>`;
  } else if (id === 'playfair') {
    const square = playfairSquare(key);
    html = `<div class="matrix">${[...square].map(ch => `<span>${ch}</span>`).join('')}</div>
      <p class="muted">5x5 key square (I and J share a cell). Same row: right. Same column: down. Rectangle: swap columns.</p>`;
  } else if (id === 'railfence') {
    const chars = [...(typed || c.example.text)].slice(0, 30).map(ch => ch === ' ' ? '␣' : ch);
    const { rail } = railOrder(chars.length, key);
    html = `<div class="scroll">${Array.from({ length: key }, (_, r) =>
      vrow('Rail ' + (r + 1), chars.map((ch, i) => rail[i] === r ? ch : '·'), 'hl')).join('')}</div>
      <p class="muted">Write in a zig-zag, then read each rail from left to right.</p>`;
  }
  $('viz').innerHTML = html;
}

function updateCounter() { $('count').textContent = $('input').value.length; }
function refresh() { updateCounter(); renderViz(); }

function selectAlgorithm(id) {
  $('algorithm').value = id;
  $('output').value = '';
  setStatus('');
  renderFields(); renderInfo(); renderViz();
}

/* ---------- Actions ---------- */
function run(mode) {
  try {
    if (!$('input').value.trim()) throw new Error('Please enter some text first.');
    $('output').value = current()[mode](String($('input').value), readKey());
    setStatus(`${mode === 'encrypt' ? 'Encrypted' : 'Decrypted'} with ${current().name}.`, 'ok');
  } catch (e) {
    $('output').value = '';
    setStatus(e.message, 'err');
  }
}

async function copyOutput() {
  const text = $('output').value;
  if (!text) return toast('Nothing to copy yet.');
  try {
    await navigator.clipboard.writeText(text);
    toast('Ciphertext copied!');
  } catch {                                           // fallback for browsers without the Clipboard API
    $('output').select();
    toast(document.execCommand('copy') ? 'Ciphertext copied!' : 'Copy failed. Select the text and press Ctrl+C.');
  }
}

function clearAll() {
  $('input').value = ''; $('output').value = '';
  setStatus('');
  renderFields(); refresh();
}

function loadExample() {
  const example = current().example;
  renderFields(example.values);
  $('input').value = example.text; $('output').value = '';
  setStatus('Example loaded. Press Encrypt.');
  refresh();
}

function swap() {
  $('input').value = $('output').value; $('output').value = '';
  setStatus('Output moved to input. Press Decrypt.');
  refresh();
}

/* ---------- Start-up ---------- */
function init() {
  const entries = Object.entries(CIPHERS);
  $('algorithm').innerHTML = entries.map(([id, c]) => `<option value="${id}">${c.name}</option>`).join('');
  $('cards').innerHTML = entries.map(([id, c]) => `<button class="card" data-id="${id}">
    <span class="badge">${c.type}</span><h3>${c.name}</h3><p>${c.info.how}</p>
    <code>${c.info.sample}</code><small>${c.difficulty}. Security: ${c.status}</small></button>`).join('');

  $('cards').addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) { selectAlgorithm(card.dataset.id); $('encrypt').scrollIntoView({ behavior: 'smooth' }); }
  });
  $('algorithm').addEventListener('change', () => selectAlgorithm($('algorithm').value));
  $('input').addEventListener('input', refresh);
  $('btn-encrypt').addEventListener('click', () => run('encrypt'));
  $('btn-decrypt').addEventListener('click', () => run('decrypt'));
  $('btn-copy').addEventListener('click', copyOutput);
  $('btn-swap').addEventListener('click', swap);
  $('btn-clear').addEventListener('click', clearAll);
  $('btn-example').addEventListener('click', loadExample);

  // Hero demo is produced by the real Caesar engine
  $('hero-demo').innerHTML = vrow('Plain', ALPHABET) + vrow('Shift 3', CIPHERS.caesar.encrypt(ALPHABET, 3), 'hl') +
    `<p class="demo-line">HELLO WORLD becomes <code>${CIPHERS.caesar.encrypt('HELLO WORLD', 3)}</code></p>`;

  selectAlgorithm('caesar');
  updateCounter();
}
document.addEventListener('DOMContentLoaded', init);
