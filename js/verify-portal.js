/**
 * HARISH-CHANDRA RESEARCH CENTRE (HRC-SBS)
 * Public Certificate Verification Script
 *
 * Verifies certificate validity by ID from URL query ?id=HCD-2026-XXXXXXXX.
 * Displays official participant name, competition, event year, and validity status.
 * If revoked, shows prominent warning and blocks downloading.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const certId = urlParams.get('id');

  const inputEl = document.getElementById('verify-search-input');
  if (certId && inputEl) {
    inputEl.value = certId;
    verifyCertificate(certId);
  }

  const form = document.getElementById('verify-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = inputEl ? inputEl.value.trim().toUpperCase() : '';
      if (val) verifyCertificate(val);
    });
  }
});

async function verifyCertificate(rawId) {
  const cleanId = rawId.trim().toUpperCase();
  const loadingEl = document.getElementById('verify-loading');
  const resultEl = document.getElementById('verify-result');
  const errorEl = document.getElementById('verify-error');

  if (loadingEl) loadingEl.style.display = 'block';
  if (resultEl) resultEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';

  try {
    const sb = getSupabase();
    let cert = null;

    if (sb) {
      const { data, error } = await sb
        .from('site_settings')
        .select('value')
        .eq('key', 'cert_public_registry')
        .single();

      if (!error && data && data.value) {
        cert = data.value['id_' + cleanId];
      }
    }

    if (!cert) {
      throw new Error(`Certificate with ID "${cleanId}" was not found in the official registry. Please check for typographical errors.`);
    }

    // Populate result elements
    document.getElementById('res-cert-id').textContent = cert.certificate_id;
    document.getElementById('res-participant').textContent = cert.participant_name;
    document.getElementById('res-competition').textContent = cert.competition_name;
    document.getElementById('res-year').textContent = cert.event_year;
    document.getElementById('res-date').textContent = cert.issue_date || 'October 11, 2026';

    const teamRow = document.getElementById('res-team-row');
    if (teamRow) {
      if (cert.team_name && cert.team_name.trim() !== '') {
        teamRow.style.display = 'flex';
        document.getElementById('res-team').textContent = cert.team_name;
      } else {
        teamRow.style.display = 'none';
      }
    }

    // Status Banner
    const statusWrap = document.getElementById('res-status-banner');
    const downloadBtn = document.getElementById('res-download-btn');

    if (cert.status === 'revoked') {
      statusWrap.className = 'verify-status-banner is-revoked';
      statusWrap.innerHTML = `
        <div class="verify-status-icon">✕</div>
        <div>
          <h4>Officially Revoked</h4>
          <p>This certificate was officially issued but has since been revoked by academic authority. It is no longer valid.</p>
        </div>
      `;
      if (downloadBtn) downloadBtn.style.display = 'none';
    } else {
      statusWrap.className = 'verify-status-banner is-valid';
      statusWrap.innerHTML = `
        <div class="verify-status-icon">✓</div>
        <div>
          <h4>Authentic & Officially Issued</h4>
          <p>Verified Harish-Chandra Day Participation Record under the School of Basic Sciences, CSJMU Kanpur × IIT Kanpur.</p>
        </div>
      `;
      if (downloadBtn) {
        downloadBtn.style.display = 'inline-flex';
        downloadBtn.href = `certificates.html?id=${cert.certificate_id}`;
      }
    }

    if (resultEl) resultEl.style.display = 'block';
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}
