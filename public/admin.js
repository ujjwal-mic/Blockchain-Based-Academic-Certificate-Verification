/**
 * public/admin.js
 * ----------------
 * Admin Dashboard: issue certificates and show the ledger.
 */
(function () {
  const form = document.getElementById('issue-form');
  const resultBox = document.getElementById('issue-result');
  const tbody = document.querySelector('#ledger-table tbody');
  const chainStatus = document.getElementById('chain-status');

  // Safely put text into HTML (stops injected HTML/scripts).
  function esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function showResult(ok, html) {
    resultBox.className = 'result ' + (ok ? 'ok' : 'bad');
    resultBox.innerHTML = html;
  }

  // ---- Submit: issue a new certificate ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        showResult(
          true,
          `<h3>Certificate issued</h3>
           <p>Give this hash to the student. It is needed to verify the certificate.</p>
           <p><code>${esc(json.certHash)}</code></p>`
        );
        form.reset();
        loadLedger();
      } else {
        showResult(false, `<h3>Could not issue</h3><p>${esc(json.message)}</p>`);
      }
    } catch (err) {
      showResult(false, `<h3>Network error</h3><p>Is the server running?</p>`);
    }
  });

  // ---- Load and draw the ledger table ----
  async function loadLedger() {
    try {
      const res = await fetch('/api/ledger');
      const json = await res.json();
      tbody.innerHTML = json.blocks
        .map(
          (b) => `<tr>
            <td>${b.index}</td>
            <td>${esc(b.certificate.studentName)}</td>
            <td>${esc(b.certificate.studentId)}</td>
            <td>${esc(b.certificate.course)}</td>
            <td>${esc(b.certificate.issueDate)}</td>
            <td class="hash" title="${esc(b.certHash)}">${esc(b.certHash)}</td>
          </tr>`
        )
        .join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6">Could not load ledger.</td></tr>';
    }
  }

  // ---- Check that nobody edited ledger.json by hand ----
  async function checkChain() {
    chainStatus.textContent = 'Checking...';
    try {
      const res = await fetch('/api/ledger/validate');
      const json = await res.json();
      chainStatus.textContent = json.valid
        ? `Ledger is intact (${json.length} blocks).`
        : `Ledger was tampered with at block #${json.brokenAt}!`;
      chainStatus.style.color = json.valid ? '#17542a' : '#7a1b22';
    } catch (err) {
      chainStatus.textContent = 'Could not check.';
    }
  }

  document.getElementById('refresh-ledger').addEventListener('click', loadLedger);
  document.getElementById('check-chain').addEventListener('click', checkChain);

  loadLedger();
})();
