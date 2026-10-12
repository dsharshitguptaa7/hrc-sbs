/**
 * HARISH-CHANDRA RESEARCH CENTRE (HRC-SBS)
 * Public Certificate Portal Client
 * 
 * Supports secure certificate lookup by:
 * 1. Certificate ID (e.g. HCD-2026-A1B2C3D4)
 * 2. Participant Claim Code (e.g. CLAIM-AT2026)
 * 3. Registered Email Address + Year
 * 
 * Renders interactive certificate preview and initiates direct A4 landscape PDF download.
 */

let currentCertificate = null;
let signatoriesConfig = null;

// SHA-256 Browser Web Crypto Helper
async function sha256Hex(text) {
  const enc = new TextEncoder();
  const data = enc.encode(String(text).trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  setupLookupTabs();
  setupLookupForm();
  await loadPublishedYears();
  await loadSignatories();
  checkUrlParamsForDirectLookup();
});

/**
 * Handle URL params for direct certificate link (e.g. certificates.html?id=HCD-2026-A1B2C3D4)
 */
function checkUrlParamsForDirectLookup() {
  const urlParams = new URLSearchParams(window.location.search);
  const certId = urlParams.get('id');
  const claimCode = urlParams.get('claim');
  if (certId) {
    document.getElementById('lookup-id').value = certId;
    switchLookupMode('id');
    performCertificateLookup();
  } else if (claimCode) {
    document.getElementById('lookup-claim').value = claimCode;
    switchLookupMode('claim');
    performCertificateLookup();
  }
}

/**
 * Setup Lookup Tabs (By ID, By Claim Code, By Email)
 */
function setupLookupTabs() {
  const tabs = document.querySelectorAll('.cert-lookup-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode');
      switchLookupMode(mode);
    });
  });
}

function switchLookupMode(mode) {
  document.querySelectorAll('.cert-lookup-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-mode') === mode);
  });

  document.getElementById('group-id').style.display = mode === 'id' ? 'block' : 'none';
  document.getElementById('group-claim').style.display = mode === 'claim' ? 'block' : 'none';
  document.getElementById('group-email').style.display = mode === 'email' ? 'block' : 'none';

  // Clear previous errors
  const errEl = document.getElementById('cert-lookup-error');
  if (errEl) errEl.style.display = 'none';
}

/**
 * Load published releases to populate the year dropdown
 */
async function loadPublishedYears() {
  const yearSelect = document.getElementById('lookup-year');
  if (!yearSelect) return;

  const sb = getSupabase();
  let releases = [];

  if (sb) {
    try {
      const { data, error } = await sb
        .from('site_settings')
        .select('value')
        .eq('key', 'cert_releases')
        .single();
      if (!error && data && Array.isArray(data.value)) {
        releases = data.value.filter(r => r.status === 'published');
      }
    } catch (e) {
      console.warn('[HRC Cert] Error loading releases from DB:', e);
    }
  }

  // Fallback defaults
  if (!releases.length) {
    releases = [
      { event_year: 2026, title: 'Harish-Chandra Day 2026' }
    ];
  }

  yearSelect.innerHTML = releases.map(r => `
    <option value="${r.event_year}">${r.event_year} · ${r.title}</option>
  `).join('');
}

/**
 * Load signatories config from DB or fallback
 */
async function loadSignatories() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb
        .from('site_settings')
        .select('value')
        .eq('key', 'cert_signatories')
        .single();
      if (data && data.value && data.value.signatories) {
        signatoriesConfig = data.value.signatories;
        return;
      }
    } catch (e) {}
  }

  // Standard fallback
  signatoriesConfig = {
    deputy_director: {
      name: 'Prof. Anju Dixit',
      designation: 'Deputy Director, School of Basic Sciences, CSJMU'
    },
    director: {
      name: 'Prof. R. K. Dwivedi',
      designation: 'Director, School of Basic Sciences, CSJMU'
    },
    hod_math: {
      name: 'Dr. P. N. Pathak',
      designation: 'Head of Department / Coordinator, Department of Mathematics, School of Basic Sciences, CSJMU'
    }
  };
}

/**
 * Form Submit
 */
function setupLookupForm() {
  const form = document.getElementById('cert-lookup-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      performCertificateLookup();
    });
  }
}

/**
 * Search certificate from public registry
 */
async function performCertificateLookup() {
  const activeTab = document.querySelector('.cert-lookup-tab.active');
  const mode = activeTab ? activeTab.getAttribute('data-mode') : 'id';
  const errorEl = document.getElementById('cert-lookup-error');
  const submitBtn = document.getElementById('cert-search-btn');

  if (errorEl) errorEl.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Searching...';
  }

  try {
    let registryKey = '';
    if (mode === 'id') {
      const rawId = document.getElementById('lookup-id').value.trim().toUpperCase();
      if (!rawId) throw new Error('Please enter your unique Certificate ID (e.g. HCD-2026-A1B2C3D4).');
      registryKey = 'id_' + rawId;
    } else if (mode === 'claim') {
      const rawClaim = document.getElementById('lookup-claim').value.trim();
      if (!rawClaim) throw new Error('Please enter your private Claim Code.');
      const claimHash = await sha256Hex(rawClaim);
      registryKey = 'claim_' + claimHash;
    } else if (mode === 'email') {
      const rawEmail = document.getElementById('lookup-email').value.trim();
      const year = document.getElementById('lookup-year').value;
      if (!rawEmail) throw new Error('Please enter your registered email address.');
      const emailHash = await sha256Hex(rawEmail);
      registryKey = `email_${year}_${emailHash}`;
    }

    // Query DB site_settings for cert_public_registry
    const sb = getSupabase();
    let record = null;

    if (sb) {
      const { data, error } = await sb
        .from('site_settings')
        .select('value')
        .eq('key', 'cert_public_registry')
        .single();

      if (!error && data && data.value && data.value[registryKey]) {
        record = data.value[registryKey];
      }
    }

    if (!record) {
      throw new Error('No matching participation certificate found for the provided details. Please verify your Certificate ID or Claim Code.');
    }

    currentCertificate = record;
    await displayCertificateResult(record);
  } catch (err) {
    console.warn('[HRC Cert] Lookup error:', err);
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Find Certificate →';
    }
  }
}

/**
 * Display Certificate Result and Render Canvas
 */
async function displayCertificateResult(cert) {
  const resultCard = document.getElementById('cert-result-card');
  if (!resultCard) return;

  resultCard.style.display = 'block';
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Update Metadata Badges
  document.getElementById('res-participant-name').textContent = cert.participant_name;
  document.getElementById('res-competition-name').textContent = cert.competition_name;
  document.getElementById('res-cert-id').textContent = cert.certificate_id;
  document.getElementById('res-event-year').textContent = cert.event_year;
  document.getElementById('res-issue-date').textContent = cert.issue_date || 'October 11, 2026';

  const teamEl = document.getElementById('res-team-box');
  if (teamEl) {
    if (cert.team_name && cert.team_name.trim() !== '') {
      teamEl.style.display = 'block';
      document.getElementById('res-team-name').textContent = cert.team_name;
    } else {
      teamEl.style.display = 'none';
    }
  }

  const statusBadge = document.getElementById('res-status-badge');
  if (statusBadge) {
    if (cert.status === 'revoked') {
      statusBadge.textContent = 'Revoked Certificate';
      statusBadge.className = 'cert-badge cert-badge-revoked';
      document.getElementById('btn-download-pdf').style.display = 'none';
    } else {
      statusBadge.textContent = 'Verified & Official';
      statusBadge.className = 'cert-badge cert-badge-verified';
      document.getElementById('btn-download-pdf').style.display = 'inline-flex';
    }
  }

  // Verification URL
  const verifyUrl = `${window.location.origin}/verify.html?id=${cert.certificate_id}`;
  const verifyLinkEl = document.getElementById('res-verify-link');
  if (verifyLinkEl) {
    verifyLinkEl.href = verifyUrl;
    verifyLinkEl.textContent = verifyUrl;
  }

  // Render on Preview Canvas
  const canvas = document.getElementById('certificate-preview-canvas');
  if (canvas && window.HRC_CERTIFICATE) {
    await window.HRC_CERTIFICATE.renderToCanvas(canvas, {
      ...cert,
      signatories: signatoriesConfig,
      verification_url: verifyUrl
    });
  }
}

/**
 * Trigger PDF Download
 */
async function downloadCertificatePDF() {
  if (!currentCertificate) return;
  const canvas = document.getElementById('certificate-preview-canvas');
  if (!canvas || !window.HRC_CERTIFICATE) return;

  const btn = document.getElementById('btn-download-pdf');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Generating PDF...';

  try {
    const cleanName = (currentCertificate.participant_name || 'Participant').replace(/[^a-zA-Z0-9]/g, '-');
    const fileName = `Harish-Chandra-Day-${currentCertificate.event_year}-${cleanName}-${currentCertificate.certificate_id}.pdf`;
    await window.HRC_CERTIFICATE.exportToPDF(canvas, fileName);
  } catch (err) {
    console.error('PDF Generation failed:', err);
    alert('Failed to generate PDF: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

window.downloadCertificatePDF = downloadCertificatePDF;
