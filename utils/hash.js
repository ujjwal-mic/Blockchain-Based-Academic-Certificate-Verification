/**
 * utils/hash.js
 * --------------
 * All cryptography lives in this one file.
 * We use SHA-256 from the crypto-js library.
 *
 * SHA-256 has two properties we rely on:
 *  1. Same input  -> always the same hash.
 *  2. Change even ONE character -> a completely different hash.
 */
const SHA256 = require('crypto-js/sha256');

// Separator used when joining fields. It stops two different records
// from accidentally producing the same joined text
// (e.g. "AB" + "C" vs "A" + "BC").
const SEPARATOR = '|';

/**
 * Clean the raw input: make sure every field is a string and
 * remove spaces at the start and end. Nothing else is changed,
 * so "Alice" and "alice" are still treated as different.
 */
function normalize({ studentName, studentId, course, issueDate }) {
  return {
    studentName: String(studentName ?? '').trim(),
    studentId: String(studentId ?? '').trim(),
    course: String(course ?? '').trim(),
    issueDate: String(issueDate ?? '').trim(),
  };
}

/**
 * Join the certificate details into one string, then hash it.
 * Returns a 64-character hex string (the certificate's "fingerprint").
 */
function generateCertificateHash(details) {
  const c = normalize(details);
  const combined = [c.studentName, c.studentId, c.course, c.issueDate].join(SEPARATOR);
  return SHA256(combined).toString(); // hex string by default
}

/**
 * Hash a whole block (certificate hash + previous block's hash + more).
 * This is what links blocks together into a chain.
 */
function generateBlockHash({ index, timestamp, certHash, previousHash }) {
  return SHA256([index, timestamp, certHash, previousHash].join(SEPARATOR)).toString();
}

/** True only if the text looks like a valid SHA-256 hex hash. */
function isValidHash(value) {
  return /^[a-f0-9]{64}$/i.test(String(value ?? '').trim());
}

module.exports = { normalize, generateCertificateHash, generateBlockHash, isValidHash };
