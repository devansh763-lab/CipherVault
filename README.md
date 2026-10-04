# CipherVault

**Classical Cryptography Laboratory** - an interactive web app for encrypting and decrypting text with classical ciphers.

## Description
CipherVault is an educational Cryptography project. Type a message, pick a cipher, enter its key, and see the ciphertext, a visualization of how it was made, and an explanation of the algorithm. No backend, no database, no frameworks.

## Features
- Encrypt, Decrypt, Copy (toast feedback), Swap, Clear and Load Example
- Key fields that change with the selected cipher
- Input validation with friendly messages (the page never crashes on bad input)
- Visualizations: alphabet map, repeating Vigenère key, 5x5 Playfair square, Rail Fence zig-zag
- Case, spaces, digits and punctuation are preserved by the alphabet ciphers
- Character counter, status line, responsive dark UI, keyboard accessible

## Algorithms
| Cipher | Type | Key |
|---|---|---|
| Caesar | Substitution | shift (integer) |
| Monoalphabetic Substitution | Substitution | 26 unique letters |
| Vigenère | Polyalphabetic | keyword |
| Playfair | Digraph substitution | keyword (I/J merged) |
| Rail Fence | Transposition | rails (2-20) |
| ROT13 | Substitution | none (self-inverse) |
| Affine | Substitution | a (coprime to 26), b |

## Technologies
HTML5, CSS3, vanilla JavaScript (ES6+), browser Clipboard API.

## Project Structure
```
CipherVault/
├── index.html        page structure
├── README.md
├── css/style.css     theme and responsive layout
├── js/ciphers.js     cipher algorithms, validation, explanations (no DOM code)
├── js/app.js         UI logic: buttons, rendering, visualizations
└── assets/images/    (empty, reserved)
```

## Installation
```bash
git clone <repository-url>
cd CipherVault
code .
```
Install the **Live Server** extension in VS Code, right-click `index.html`, and choose **Open with Live Server**. (Double-clicking `index.html` also works, but Copy is more reliable on a server.)

## Usage
1. Choose an algorithm and enter its key.
2. Type text in the left box and press **Encrypt** (or **Decrypt** for ciphertext).
3. **Copy** the result, or press **Swap** to move it into the input and decrypt it.
4. **Load Example** fills a demo for the selected cipher; **Clear** resets everything.

## Examples
| Cipher | Input | Key | Output |
|---|---|---|---|
| Caesar | HELLO | 3 | KHOOR |
| Substitution | HELLO | QWERTYUIOPASDFGHJKLZXCVBNM | ITSSG |
| Vigenère | ATTACKATDAWN | LEMON | LXFOPVEFRNHR |
| Playfair | INSTRUMENTS | MONARCHY | GATLMZCLRQXA |
| Rail Fence | WEAREDISCOVEREDFLEEATONCE | 3 | WECRLTEERDSOEEFEAOCAIVDEN |
| ROT13 | HELLO | - | URYYB |
| Affine | AFFINE | a=5, b=8 | IHHWVC |

Playfair decryption returns uppercase text with I/J merged and the inserted filler X letters still present.

## Testing
Run `node test.js` in the project folder to check every cipher (known answers, round trips, lowercase, punctuation, invalid keys).

## Security Disclaimer
These are classical techniques for learning and demonstration. They must **not** protect sensitive or real data. Modern systems use AES, RSA, ECC and authenticated encryption.

## Future Improvements
AES and RSA demos, SHA-256 hashing, frequency analysis and brute-force tools, file encryption, key generation.

## Author
**Devansh**
B.Tech Cyber Security
