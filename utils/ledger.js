/**
 * utils/ledger.js
 * ----------------
 * Safe helpers to read and write ledger.json.
 *
 * ledger.json is our fake "blockchain": a list of blocks, where each block
 * stores the hash of the block before it.
 *
 * Safety measures:
 *  - Creates the file if it does not exist.
 *  - Writes to a temporary file first, then renames it. If the program
 *    crashes mid-write, the real ledger is never left half-written.
 *  - A simple queue makes sure only one write happens at a time.
 */
const fs = require('fs');
const path = require('path');
const { generateBlockHash, generateCertificateHash } = require('./hash');

const LEDGER_PATH = path.join(__dirname, '..', 'ledger.json');
const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

// ---- Simple lock: runs tasks one after another ----
let queue = Promise.resolve();
function runExclusive(task) {
  const result = queue.then(task);
  queue = result.catch(() => {}); // keep the queue alive even if a task fails
  return result;
}

/** Read the whole ledger (an array of blocks). Creates an empty one if missing. */
function readLedger() {
  if (!fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(LEDGER_PATH, '[]', 'utf8');
    return [];
  }
  const raw = fs.readFileSync(LEDGER_PATH, 'utf8').trim();
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('Ledger must be an array');
    return data;
  } catch (err) {
    throw new Error('ledger.json is corrupted: ' + err.message);
  }
}

/** Write the ledger safely (temp file + rename). */
function writeLedger(blocks) {
  const tmp = LEDGER_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(blocks, null, 2), 'utf8');
  fs.renameSync(tmp, LEDGER_PATH);
}

/**
 * Add one new certificate to the ledger as a new block.
 * Returns the new block, or throws an error with code 'DUPLICATE'
 * if this exact certificate was already issued.
 */
function addBlock(certificate, certHash) {
  return runExclusive(() => {
    const ledger = readLedger();

    if (ledger.some((b) => b.certHash === certHash)) {
      const err = new Error('This certificate has already been issued.');
      err.code = 'DUPLICATE';
      throw err;
    }

    const previous = ledger[ledger.length - 1];
    const block = {
      index: ledger.length,
      timestamp: new Date().toISOString(),
      certificate, // the readable details
      certHash, // fingerprint of the details
      previousHash: previous ? previous.blockHash : GENESIS_PREVIOUS_HASH,
    };
    block.blockHash = generateBlockHash(block);

    ledger.push(block);
    writeLedger(ledger);
    return block;
  });
}

/** Find a block by its certificate hash (and optionally student ID). */
function findByHash(certHash, studentId) {
  const target = String(certHash).toLowerCase();
  return (
    readLedger().find(
      (b) =>
        b.certHash.toLowerCase() === target &&
        (studentId === undefined || b.certificate.studentId === String(studentId).trim())
    ) || null
  );
}

/**
 * Check that the whole chain is untouched.
 * It re-computes every block hash and checks every previousHash link.
 * Returns { valid: true } or { valid: false, brokenAt: <block index> }.
 */
function validateChain() {
  const ledger = readLedger();
  for (let i = 0; i < ledger.length; i++) {
    const block = ledger[i];
    const expectedPrev = i === 0 ? GENESIS_PREVIOUS_HASH : ledger[i - 1].blockHash;
    if (block.previousHash !== expectedPrev) return { valid: false, brokenAt: i, length: ledger.length };
    if (generateBlockHash(block) !== block.blockHash) return { valid: false, brokenAt: i, length: ledger.length };
    // Also re-hash the readable details: catches someone editing the name, course, etc.
    if (generateCertificateHash(block.certificate) !== block.certHash) return { valid: false, brokenAt: i, length: ledger.length };
  }
  return { valid: true, length: ledger.length };
}

module.exports = { readLedger, writeLedger, addBlock, findByHash, validateChain, LEDGER_PATH };
