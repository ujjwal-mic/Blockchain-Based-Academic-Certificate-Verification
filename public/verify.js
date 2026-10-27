/**
 * public/verify.js
 * -----------------
 * Verification Portal: check a certificate by (Student ID + Hash)
 * or by entering all certificate details.
 */
(function () {
  const form = document.getElementById('verify-form');
  const resultBox = document.getElementById('verify-result');
  const hashFields = document.getElementById('hash-fields');
  const detailsFields = document.getElementById('details-fields');

  function esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  // ---- Switch between "hash" mode and "details" mode ----
  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const mode = document.querySelector('input[name="mode"]:checked').value;
      hashFields.classList.toggle('hidden', mode !== 'hash');
      detailsFields.classList.toggle('hidden', mode !== 'details');
      resultBox.classList.add('hidden');
    });
  });

  // ---- Submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const f = Object.fromEntries(new FormData(form).entries());

    // Only send the fields that belong to the chosen mode.
    const payload =
      mode === 'hash'
        ? { studentId: f.studentId, hash: f.hash }
        : { studentId: f.studentId, studentName: f.studentName, course: f.course, issueDate: f.issueDate };

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      resultBox.classList.remove('hidden');

      if (!json.success) {
        resultBox.className = 'result bad';
        resultBox.innerHTML = `<h3>Error</h3><p>${esc(json.message)}</p>`;
      } else if (json.verified) {
        const c = json.certificate;
        resultBox.className = 'result ok';
        resultBox.innerHTML = `
          <h3>✔ ${esc(json.status)}</h3>
          <p>${esc(json.message)}</p>
          <p><b>${esc(c.studentName)}</b> (${esc(c.studentId)})<br>
             ${esc(c.course)}<br>
             Issued: ${esc(c.issueDate)}</p>
          <p>Hash: <code>${esc(json.certHash)}</code></p>`;
      } else {
        resultBox.className = 'result bad';
        resultBox.innerHTML = `<h3>✘ ${esc(json.status)}</h3><p>${esc(json.message)}</p>`;
      }
    } catch (err) {
      resultBox.classList.remove('hidden');
      resultBox.className = 'result bad';
      resultBox.innerHTML = '<h3>Network error</h3><p>Is the server running?</p>';
    }
  });
})();
