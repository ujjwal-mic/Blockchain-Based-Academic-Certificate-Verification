/**
 * routes/certificates.js
 * -----------------------
 * The API endpoints:
 *   POST /api/issue   - admin issues a new certificate
 *   POST /api/verify  - anyone checks a certificate
 *   GET  /api/ledger  - list all blocks (for demo / admin table)
 *   GET  /api/ledger/validate - check the whole chain is untouched
 */
const express = require('express');
const { generateCertificateHash, normalize, isValidHash } = require('../utils/hash');
const { addBlock, findByHash, readLedger, validateChain } = require('../utils/ledger');

const router = express.Router();

const REQUIRED = ['studentName', 'studentId', 'course', 'issueDate'];

/** Return a list of the required fields that are missing or empty. */
function missingFields(body) {
  return REQUIRED.filter((f) => !String(body?.[f] ?? '').trim());
}

// ---------------------------------------------------------------
// POST /api/issue  ->  create hash + store in ledger
// ---------------------------------------------------------------
router.post('/issue', async (req, res, next) => {
  try {
    const missing = missingFields(req.body);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
    }

    const certificate = normalize(req.body);
    const certHash = generateCertificateHash(certificate);
    const block = await addBlock(certificate, certHash);

    res.status(201).json({
      success: true,
      message: 'Certificate issued and stored in the ledger.',
      certHash,
      block,
    });
  } catch (err) {
    if (err.code === 'DUPLICATE') {
      return res.status(409).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// ---------------------------------------------------------------
// POST /api/verify  ->  re-hash and compare with the ledger
//
// Two ways to verify:
//   A) Student ID + Hash                      (send: studentId, hash)
//   B) Full certificate details               (send: studentName, studentId, course, issueDate)
// ---------------------------------------------------------------
router.post('/verify', (req, res, next) => {
  try {
    const body = req.body || {};
    const studentId = String(body.studentId ?? '').trim();
    const providedHash = String(body.hash ?? '').trim();
    const hasAllDetails = missingFields(body).length === 0;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    let hashToCheck;
    let method;

    if (hasAllDetails) {
      // Mode B: we calculate the hash ourselves from the details given.
      hashToCheck = generateCertificateHash(body);
      method = 'details';
    } else if (providedHash) {
      // Mode A: the person gave us a hash directly.
      if (!isValidHash(providedHash)) {
        return res.json({
          success: true,
          verified: false,
          status: 'Fake/Altered Certificate',
          message: 'The hash is not a valid SHA-256 value.',
        });
      }
      hashToCheck = providedHash;
      method = 'hash';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either the certificate hash, or all certificate details.',
      });
    }

    // Look for a block with this hash that belongs to this student ID.
    const block = findByHash(hashToCheck, studentId);

    if (block) {
      return res.json({
        success: true,
        verified: true,
        status: 'Verified',
        message: 'This certificate is genuine. It matches a record in the ledger.',
        method,
        certificate: block.certificate,
        certHash: block.certHash,
        issuedAt: block.timestamp,
        blockIndex: block.index,
      });
    }

    res.json({
      success: true,
      verified: false,
      status: 'Fake/Altered Certificate',
      message: 'No matching record found. The details were changed or never issued.',
      method,
      calculatedHash: hashToCheck,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// GET /api/ledger  ->  show all issued certificates
// ---------------------------------------------------------------
router.get('/ledger', (req, res, next) => {
  try {
    res.json({ success: true, blocks: readLedger() });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// GET /api/ledger/validate  ->  check nobody edited ledger.json
// ---------------------------------------------------------------
router.get('/ledger/validate', (req, res, next) => {
  try {
    res.json({ success: true, ...validateChain() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
