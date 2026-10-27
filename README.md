# Blockchain-Based Academic Certificate Verification (Without Smart Contracts)

A small project that **simulates a blockchain** using SHA-256 hashing and a local `ledger.json` file. No Web3 network or smart contracts are needed.

## Tech Stack
- Backend: Node.js + Express
- Hashing: `crypto-js` (SHA-256)
- Storage: `ledger.json` (the fake blockchain)
- Frontend: plain HTML + JavaScript (served by Express, so there is only one thing to start)

## Project Structure
```
cert-verify/
├── server.js                 # Starts Express, serves frontend + API
├── package.json
├── ledger.json               # Created automatically on first run
├── utils/
│   ├── hash.js               # SHA-256 logic
│   └── ledger.js             # Safe read/write + chain check
├── routes/
│   └── certificates.js       # /api/issue, /api/verify, /api/ledger
└── public/
    ├── index.html            # Admin Dashboard + Verification Portal
    ├── styles.css
    ├── admin.js
    └── verify.js
```

## How to Run
1. Install Node.js (version 18 or newer).
2. In the project folder, run:
   ```bash
   npm install
   npm start
   ```
3. Open **http://localhost:3000** in your browser.

The frontend is served by the same server, so there is no second command.

## How to Use
1. **Admin Dashboard**: fill in the form and click *Generate Hash & Store in Ledger*. Copy the hash that appears.
2. **Verification Portal**: enter the Student ID and the hash (or the full details) and click *Verify*.
   - Exact match -> **Verified**
   - Anything different -> **Fake/Altered Certificate**

## API
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/issue` | Body: `studentName, studentId, course, issueDate`. Creates hash, saves to ledger. |
| POST | `/api/verify` | Body: `studentId` + `hash`, **or** all four details. Returns verified or fake. |
| GET | `/api/ledger` | Lists all blocks. |
| GET | `/api/ledger/validate` | Checks the whole ledger was not edited by hand. |

## How the Hashing Simulates Blockchain Immutability
1. **Fingerprint**: the certificate details are joined (`name|id|course|date`) and hashed with SHA-256. The same input always gives the same 64-character hash.
2. **Avalanche effect**: change even one letter (`Alice` -> `Alica`) and the hash becomes completely different. So a forged certificate can never match a stored hash.
3. **Chaining**: each ledger block stores the hash of the block before it (`previousHash`) and its own `blockHash`. If someone edits an old record, its `blockHash` changes, and every block after it no longer links correctly. The *Check Ledger Integrity* button (or `GET /api/ledger/validate`) detects this.
4. **Verification**: the server re-hashes whatever the verifier provides and looks for that hash in the ledger. No match = fake or altered.

## Limitations
- This is a **simulation**. A real blockchain is spread across many computers, so no single person can rewrite it. Here, one person with access to the server could edit `ledger.json` and recompute every hash.
- There is no admin login. For a real system, protect `/api/issue` with authentication.
