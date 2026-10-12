/**
 * HARISH-CHANDRA RESEARCH CENTRE (HRC-SBS)
 * Admin Participation Certificates Management
 *
 * Full Year-Wise Admin Suite:
 * - Releases Registry (Draft / Published / Closed)
 * - Competition Registry per Release
 * - Participant Management (Single Add, Edit, CSV Bulk Import, Issue, Revoke, Delete)
 * - Signatories Asset Upload & Designation Configuration
 * - Live Certificate Canvas Preview
 * - Export Admin CSV Report
 * - Sync and Rebuild Public Registry Hash Index
 */

let allReleases = [];
let allCompetitions = [];
let allParticipants = [];
let signatoriesConfig = {};

let currentYearFilter = 'all';
let currentStatusFilter = 'all';
let currentEditingParticipantId = null;

// Helper: Secure Random Unique Certificate ID (Format: HCD-YYYY-XXXXXXXX)
function generateCertificateId(year = 2026) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  const cryptoObj = window.crypto || window.msCrypto;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const bytes = new Uint8Array(8);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < 8; i++) {
      rand += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 8; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `HCD-${year}-${rand}`;
}

// Helper: Generate Participant Claim Code
function generateClaimCode(prefix = 'CLAIM') {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${rand}`;
}

// SHA-256 Web Crypto
async function sha256Hex(text) {
  const enc = new TextEncoder();
  const data = enc.encode(String(text).trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  await loadAllCertificateData();
  setupEventListeners();
});

/**
 * Load all certificate data from site_settings table
 */
async function loadAllCertificateData() {
  const sb = getSupabase();
  if (!sb) {
    showToast('Supabase client not initialized.', 'error');
    return;
  }

  try {
    const { data, error } = await sb
      .from('site_settings')
      .select('key, value')
      .in('key', ['cert_releases', 'cert_competitions', 'cert_participants', 'cert_signatories']);

    if (error) throw error;

    const dataMap = {};
    (data || []).forEach(row => {
      dataMap[row.key] = row.value;
    });

    allReleases = Array.isArray(dataMap.cert_releases) ? dataMap.cert_releases : [];
    allCompetitions = Array.isArray(dataMap.cert_competitions) ? dataMap.cert_competitions : [];
    allParticipants = Array.isArray(dataMap.cert_participants) ? dataMap.cert_participants : [];
    signatoriesConfig = dataMap.cert_signatories || getDefaultSignatories();

    populateYearFilters();
    populateCompetitionDropdowns();
    populateSignatoriesForm();
    renderReleasesTable();
    renderCompetitionsTable();
    renderParticipantsTable();
    updateDashboardMetrics();
  } catch (err) {
    console.error('[HRC Admin] Load certificates data error:', err);
    showToast('Failed to load certificates registry: ' + err.message, 'error');
  }
}

function getDefaultSignatories() {
  return {
    order: ['deputy_director', 'director', 'hod_math'],
    signatories: {
      deputy_director: {
        name: 'Prof. Anju Dixit',
        designation: 'Deputy Director, School of Basic Sciences, CSJMU',
        signature_url: ''
      },
      director: {
        name: 'Prof. R. K. Dwivedi',
        designation: 'Director, School of Basic Sciences, CSJMU',
        signature_url: ''
      },
      hod_math: {
        name: 'Dr. P. N. Pathak',
        designation: 'Head of Department / Coordinator, Department of Mathematics, School of Basic Sciences, CSJMU',
        signature_url: ''
      }
    }
  };
}

/**
 * Update Dashboard Metrics
 */
function updateDashboardMetrics() {
  const issuedCount = allParticipants.filter(p => p.status === 'issued' || p.status === 'published').length;
  const publishedCount = allParticipants.filter(p => p.status === 'published').length;
  const revokedCount = allParticipants.filter(p => p.status === 'revoked').length;

  document.getElementById('metric-total-participants').textContent = allParticipants.length;
  document.getElementById('metric-issued-certs').textContent = issuedCount;
  document.getElementById('metric-published-certs').textContent = publishedCount;
  document.getElementById('metric-revoked-certs').textContent = revokedCount;
}

/**
 * Filter & Populate Dropdowns
 */
function populateYearFilters() {
  const yearFilterEl = document.getElementById('filter-cert-year');
  const years = Array.from(new Set(allReleases.map(r => r.event_year))).sort((a, b) => b - a);

  if (yearFilterEl) {
    const curr = yearFilterEl.value;
    yearFilterEl.innerHTML = '<option value="all">All Event Years</option>' +
      years.map(y => `<option value="${y}">Harish-Chandra Day ${y}</option>`).join('');
    if (curr) yearFilterEl.value = curr;
  }

  // Populate Participant Modal Year Dropdown
  const partYearEl = document.getElementById('part-event-year');
  if (partYearEl) {
    partYearEl.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    if (!years.includes(2026)) {
      partYearEl.innerHTML = '<option value="2026">2026</option>' + partYearEl.innerHTML;
    }
  }

  // Populate Competition Modal Year Dropdown
  const compYearEl = document.getElementById('comp-event-year');
  if (compYearEl) {
    compYearEl.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    if (!years.includes(2026)) {
      compYearEl.innerHTML = '<option value="2026">2026</option>' + compYearEl.innerHTML;
    }
  }
}

function populateCompetitionDropdowns() {
  const compSelect = document.getElementById('part-competition-id');
  if (!compSelect) return;

  const currentYear = parseInt(document.getElementById('part-event-year')?.value) || 2026;
  const comps = allCompetitions.filter(c => c.event_year === currentYear || !c.event_year);

  compSelect.innerHTML = comps.map(c => `
    <option value="${c.id}">${escapeHtml(c.name)} ${c.code ? `(${c.code})` : ''}</option>
  `).join('');
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Filters
  document.getElementById('filter-cert-year')?.addEventListener('change', (e) => {
    currentYearFilter = e.target.value;
    renderParticipantsTable();
  });

  document.getElementById('filter-cert-status')?.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    renderParticipantsTable();
  });

  document.getElementById('search-participant')?.addEventListener('input', (e) => {
    renderParticipantsTable(e.target.value);
  });

  document.getElementById('part-event-year')?.addEventListener('change', () => {
    populateCompetitionDropdowns();
  });

  // Participant Form
  document.getElementById('participant-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveParticipant();
  });

  // Release Form
  document.getElementById('release-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveRelease();
  });

  // Competition Form
  document.getElementById('competition-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveCompetition();
  });

  // Signatories Form
  document.getElementById('signatories-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSignatories();
  });
}

/**
 * =========================================================================
 * RELEASES MODULE
 * =========================================================================
 */
function renderReleasesTable() {
  const tbody = document.getElementById('releases-table-body');
  if (!tbody) return;

  if (!allReleases.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--admin-text-muted);">No releases created yet. Click "Create Release" to start.</td></tr>';
    return;
  }

  tbody.innerHTML = allReleases.map(rel => {
    const compsCount = allCompetitions.filter(c => c.event_year === rel.event_year).length;
    const partsCount = allParticipants.filter(p => p.event_year === rel.event_year).length;

    let statusBadge = '<span class="admin-badge admin-badge-draft">Draft</span>';
    if (rel.status === 'published') statusBadge = '<span class="admin-badge admin-badge-success">Published</span>';
    if (rel.status === 'closed') statusBadge = '<span class="admin-badge admin-badge-danger">Closed</span>';

    return `
      <tr>
        <td><strong>${escapeHtml(rel.title)}</strong></td>
        <td><span class="admin-badge admin-badge-primary">${rel.event_year}</span></td>
        <td>${statusBadge}</td>
        <td>${rel.release_date || '—'}</td>
        <td>${compsCount} Tracks / ${partsCount} Participants</td>
        <td>${rel.download_available ? '<span style="color: var(--admin-success); font-weight: 600;">✓ Active</span>' : '<span style="color: var(--admin-text-muted);">Disabled</span>'}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditReleaseModal('${rel.id}')">Edit</button>
            <button class="admin-btn admin-btn-sm ${rel.status === 'published' ? 'admin-btn-outline' : 'admin-btn-primary'}" onclick="toggleReleasePublish('${rel.id}')">
              ${rel.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateReleaseModal() {
  document.getElementById('release-modal-title').textContent = 'Create New Certificate Release';
  document.getElementById('release-id').value = '';
  document.getElementById('release-title').value = 'Harish-Chandra Day ' + (new Date().getFullYear());
  document.getElementById('release-year').value = new Date().getFullYear();
  document.getElementById('release-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('release-desc').value = '';
  document.getElementById('release-status').value = 'draft';
  document.getElementById('release-download-enabled').checked = true;

  document.getElementById('release-modal').classList.add('is-active');
}

function openEditReleaseModal(id) {
  const rel = allReleases.find(r => r.id === id);
  if (!rel) return;

  document.getElementById('release-modal-title').textContent = 'Edit Certificate Release';
  document.getElementById('release-id').value = rel.id;
  document.getElementById('release-title').value = rel.title;
  document.getElementById('release-year').value = rel.event_year;
  document.getElementById('release-date').value = rel.release_date || '';
  document.getElementById('release-desc').value = rel.description || '';
  document.getElementById('release-status').value = rel.status || 'draft';
  document.getElementById('release-download-enabled').checked = rel.download_available !== false;

  document.getElementById('release-modal').classList.add('is-active');
}

function closeReleaseModal() {
  document.getElementById('release-modal').classList.remove('is-active');
}

async function saveRelease() {
  const id = document.getElementById('release-id').value;
  const title = document.getElementById('release-title').value.trim();
  const event_year = parseInt(document.getElementById('release-year').value);
  const release_date = document.getElementById('release-date').value;
  const description = document.getElementById('release-desc').value.trim();
  const status = document.getElementById('release-status').value;
  const download_available = document.getElementById('release-download-enabled').checked;

  if (!title || !event_year) {
    showToast('Please provide release title and event year.', 'error');
    return;
  }

  if (id) {
    const idx = allReleases.findIndex(r => r.id === id);
    if (idx !== -1) {
      allReleases[idx] = { ...allReleases[idx], title, event_year, release_date, description, status, download_available };
    }
  } else {
    allReleases.push({
      id: 'rel_' + Date.now(),
      title,
      event_year,
      release_date,
      description,
      status,
      download_available,
      created_at: new Date().toISOString()
    });
  }

  await persistSiteSetting('cert_releases', allReleases);
  await rebuildAndSyncPublicRegistry();
  closeReleaseModal();
  populateYearFilters();
  renderReleasesTable();
  showToast('Release configuration saved successfully.');
}

async function toggleReleasePublish(id) {
  const rel = allReleases.find(r => r.id === id);
  if (!rel) return;

  rel.status = rel.status === 'published' ? 'draft' : 'published';
  await persistSiteSetting('cert_releases', allReleases);
  await rebuildAndSyncPublicRegistry();
  renderReleasesTable();
  showToast(`Release "${rel.title}" marked as ${rel.status}.`);
}

/**
 * =========================================================================
 * COMPETITIONS REGISTRY MODULE
 * =========================================================================
 */
function renderCompetitionsTable() {
  const tbody = document.getElementById('competitions-table-body');
  if (!tbody) return;

  if (!allCompetitions.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--admin-text-muted);">No competitions registered yet. Click "Add Competition" to start.</td></tr>';
    return;
  }

  tbody.innerHTML = allCompetitions.map(comp => {
    const partsCount = allParticipants.filter(p => p.competition_id === comp.id).length;
    return `
      <tr>
        <td><strong>${escapeHtml(comp.name)}</strong></td>
        <td><code>${escapeHtml(comp.code || '—')}</code></td>
        <td><span class="admin-badge admin-badge-primary">${comp.event_year}</span></td>
        <td>${comp.team_participation_enabled ? '<span class="admin-badge admin-badge-primary">Team Allowed</span>' : 'Individual'}</td>
        <td>${partsCount} Participants</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditCompetitionModal('${comp.id}')">Edit</button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteCompetition('${comp.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateCompetitionModal() {
  document.getElementById('competition-modal-title').textContent = 'Add Competition Track';
  document.getElementById('comp-id').value = '';
  document.getElementById('comp-name').value = '';
  document.getElementById('comp-code').value = '';
  document.getElementById('comp-event-year').value = 2026;
  document.getElementById('comp-desc').value = '';
  document.getElementById('comp-team-enabled').checked = false;

  document.getElementById('competition-modal').classList.add('is-active');
}

function openEditCompetitionModal(id) {
  const comp = allCompetitions.find(c => c.id === id);
  if (!comp) return;

  document.getElementById('competition-modal-title').textContent = 'Edit Competition Track';
  document.getElementById('comp-id').value = comp.id;
  document.getElementById('comp-name').value = comp.name;
  document.getElementById('comp-code').value = comp.code || '';
  document.getElementById('comp-event-year').value = comp.event_year || 2026;
  document.getElementById('comp-desc').value = comp.description || '';
  document.getElementById('comp-team-enabled').checked = !!comp.team_participation_enabled;

  document.getElementById('competition-modal').classList.add('is-active');
}

function closeCompetitionModal() {
  document.getElementById('competition-modal').classList.remove('is-active');
}

async function saveCompetition() {
  const id = document.getElementById('comp-id').value;
  const name = document.getElementById('comp-name').value.trim();
  const code = document.getElementById('comp-code').value.trim().toUpperCase();
  const event_year = parseInt(document.getElementById('comp-event-year').value);
  const description = document.getElementById('comp-desc').value.trim();
  const team_participation_enabled = document.getElementById('comp-team-enabled').checked;

  if (!name || !event_year) {
    showToast('Competition name and event year are required.', 'error');
    return;
  }

  if (id) {
    const idx = allCompetitions.findIndex(c => c.id === id);
    if (idx !== -1) {
      allCompetitions[idx] = { ...allCompetitions[idx], name, code, event_year, description, team_participation_enabled };
    }
  } else {
    allCompetitions.push({
      id: 'comp_' + Date.now(),
      name,
      code,
      event_year,
      description,
      team_participation_enabled,
      published: true
    });
  }

  await persistSiteSetting('cert_competitions', allCompetitions);
  await rebuildAndSyncPublicRegistry();
  closeCompetitionModal();
  populateCompetitionDropdowns();
  renderCompetitionsTable();
  showToast('Competition track saved successfully.');
}

async function deleteCompetition(id) {
  const comp = allCompetitions.find(c => c.id === id);
  if (!comp) return;

  const parts = allParticipants.filter(p => p.competition_id === id);
  if (parts.length > 0) {
    if (!confirm(`This competition has ${parts.length} participant records attached. Are you sure you want to delete it?`)) {
      return;
    }
  } else {
    if (!confirm(`Delete competition "${comp.name}"?`)) return;
  }

  allCompetitions = allCompetitions.filter(c => c.id !== id);
  await persistSiteSetting('cert_competitions', allCompetitions);
  await rebuildAndSyncPublicRegistry();
  renderCompetitionsTable();
  populateCompetitionDropdowns();
  showToast('Competition track deleted.');
}

/**
 * =========================================================================
 * PARTICIPANTS & CERTIFICATES REGISTRY MODULE
 * =========================================================================
 */
function renderParticipantsTable(searchQuery = '') {
  const tbody = document.getElementById('participants-table-body');
  if (!tbody) return;

  let filtered = [...allParticipants];

  if (currentYearFilter !== 'all') {
    filtered = filtered.filter(p => String(p.event_year) === String(currentYearFilter));
  }

  if (currentStatusFilter !== 'all') {
    filtered = filtered.filter(p => p.status === currentStatusFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p =>
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      (p.certificate_id && p.certificate_id.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.team_name && p.team_name.toLowerCase().includes(q)) ||
      (p.claim_code && p.claim_code.toLowerCase().includes(q))
    );
  }

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--admin-text-muted); padding: 2rem;">No matching participant records found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const compName = p.competition || (allCompetitions.find(c => c.id === p.competition_id)?.name) || '—';
    const certId = p.certificate_id || '—';
    const claimCode = p.claim_code || '—';

    let statusBadge = '<span class="admin-badge admin-badge-draft">Unissued</span>';
    if (p.status === 'issued') statusBadge = '<span class="admin-badge admin-badge-primary">Issued</span>';
    if (p.status === 'published') statusBadge = '<span class="admin-badge admin-badge-success">Published</span>';
    if (p.status === 'revoked') statusBadge = '<span class="admin-badge admin-badge-danger">Revoked</span>';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(p.full_name)}</strong>
          ${p.email ? `<div style="font-size: 0.74rem; color: var(--admin-text-muted);">${escapeHtml(p.email)}</div>` : ''}
        </td>
        <td>
          <div style="font-weight: 600; color: var(--admin-blue);">${escapeHtml(compName)}</div>
          ${p.team_name ? `<div style="font-size: 0.74rem; color: var(--admin-gold); font-weight: 500;">Team: ${escapeHtml(p.team_name)}</div>` : ''}
        </td>
        <td><span class="admin-badge admin-badge-primary">${p.event_year}</span></td>
        <td>
          <code style="font-size: 0.76rem; font-weight: 600; color: var(--admin-sidebar);">${escapeHtml(certId)}</code>
        </td>
        <td>
          <code style="font-size: 0.74rem; color: #64748B;">${escapeHtml(claimCode)}</code>
        </td>
        <td>${p.issue_date || '—'}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="previewCertificate('${p.id}')" title="Preview Certificate">👁</button>
            <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditParticipantModal('${p.id}')">Edit</button>
            ${p.status === 'unissued' ? `
              <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="issueCertificate('${p.id}')">Issue</button>
            ` : ''}
            ${p.status === 'issued' ? `
              <button class="admin-btn admin-btn-sm admin-btn-gold" onclick="publishCertificate('${p.id}')">Publish</button>
            ` : ''}
            ${p.status === 'published' ? `
              <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="revokeCertificate('${p.id}')">Revoke</button>
            ` : ''}
            ${p.status === 'revoked' ? `
              <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="reissueCertificate('${p.id}')">Re-validate</button>
            ` : ''}
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteParticipant('${p.id}')">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddParticipantModal() {
  currentEditingParticipantId = null;
  document.getElementById('participant-modal-title').textContent = 'Add Participant & Register Certificate';
  document.getElementById('part-id').value = '';
  document.getElementById('part-name').value = '';
  document.getElementById('part-email').value = '';
  document.getElementById('part-team').value = '';
  document.getElementById('part-event-year').value = 2026;
  document.getElementById('part-competition-name').value = '';
  document.getElementById('part-issue-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('part-status').value = 'published';

  document.getElementById('participant-modal').classList.add('is-active');
}

function openEditParticipantModal(id) {
  const p = allParticipants.find(x => x.id === id);
  if (!p) return;

  currentEditingParticipantId = id;
  document.getElementById('participant-modal-title').textContent = 'Edit Participant Information';
  document.getElementById('part-id').value = p.id;
  document.getElementById('part-name').value = p.full_name;
  document.getElementById('part-email').value = p.email || '';
  document.getElementById('part-team').value = p.team_name || '';
  document.getElementById('part-event-year').value = p.event_year || 2026;

  // Retrieve competition name from p.competition or linked competition record
  const compObj = allCompetitions.find(c => c.id === p.competition_id);
  const compName = p.competition || (compObj ? compObj.name : '');
  document.getElementById('part-competition-name').value = compName;

  document.getElementById('part-issue-date').value = p.issue_date || '';
  document.getElementById('part-status').value = p.status || 'published';

  document.getElementById('participant-modal').classList.add('is-active');
}

function closeParticipantModal() {
  document.getElementById('participant-modal').classList.remove('is-active');
  currentEditingParticipantId = null;
}

async function saveParticipant() {
  const id = document.getElementById('part-id').value;
  const full_name = document.getElementById('part-name').value.trim();
  const email = document.getElementById('part-email').value.trim();
  const team_name = document.getElementById('part-team').value.trim();
  const event_year = parseInt(document.getElementById('part-event-year').value);
  const competition_name = document.getElementById('part-competition-name').value.trim();
  const issue_date = document.getElementById('part-issue-date').value;
  const status = document.getElementById('part-status').value;

  if (!full_name || !event_year || !competition_name) {
    showToast('Participant name, year, and competition / track are required.', 'error');
    return;
  }

  // Check if competition_name matches an existing competition track or preserve existing ID if any
  const matchedComp = allCompetitions.find(c =>
    c.name.toLowerCase() === competition_name.toLowerCase() &&
    (c.event_year === event_year || !c.event_year)
  );
  const competition_id = matchedComp ? matchedComp.id : (id ? (allParticipants.find(p => p.id === id)?.competition_id || '') : '');

  if (id) {
    const idx = allParticipants.findIndex(p => p.id === id);
    if (idx !== -1) {
      allParticipants[idx] = {
        ...allParticipants[idx],
        full_name,
        email,
        team_name,
        event_year,
        competition_id,
        competition: competition_name,
        issue_date,
        status,
        participant_type: team_name ? 'team_member' : 'individual'
      };
    }
  } else {
    // Generate permanent unique Certificate ID and claim code
    const certId = generateCertificateId(event_year);
    const claimCode = generateClaimCode('CLAIM');

    allParticipants.push({
      id: 'part_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      full_name,
      email,
      team_name,
      event_year,
      competition_id,
      competition: competition_name,
      participant_type: team_name ? 'team_member' : 'individual',
      status,
      certificate_id: certId,
      claim_code: claimCode,
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    });
  }

  await persistSiteSetting('cert_participants', allParticipants);
  await rebuildAndSyncPublicRegistry();
  closeParticipantModal();
  renderParticipantsTable();
  updateDashboardMetrics();
  showToast('Participant record saved successfully.');
}

async function issueCertificate(id) {
  const p = allParticipants.find(x => x.id === id);
  if (!p) return;

  if (!p.certificate_id) {
    p.certificate_id = generateCertificateId(p.event_year);
  }
  if (!p.claim_code) {
    p.claim_code = generateClaimCode('CLAIM');
  }
  p.status = 'issued';
  p.issue_date = new Date().toISOString().split('T')[0];

  await persistSiteSetting('cert_participants', allParticipants);
  await rebuildAndSyncPublicRegistry();
  renderParticipantsTable();
  updateDashboardMetrics();
  showToast(`Certificate ${p.certificate_id} issued.`);
}

async function publishCertificate(id) {
  const p = allParticipants.find(x => x.id === id);
  if (!p) return;

  p.status = 'published';
  await persistSiteSetting('cert_participants', allParticipants);
  await rebuildAndSyncPublicRegistry();
  renderParticipantsTable();
  updateDashboardMetrics();
  showToast(`Certificate ${p.certificate_id} is now published and downloadable.`);
}

async function revokeCertificate(id) {
  const p = allParticipants.find(x => x.id === id);
  if (!p) return;

  if (!confirm(`Are you sure you want to revoke certificate "${p.certificate_id}" for ${p.full_name}?\n\nRevoking marks the certificate as officially invalid while permanently preserving its audit identifier.`)) {
    return;
  }

  p.status = 'revoked';
  await persistSiteSetting('cert_participants', allParticipants);
  await rebuildAndSyncPublicRegistry();
  renderParticipantsTable();
  updateDashboardMetrics();
  showToast(`Certificate ${p.certificate_id} has been revoked.`, 'warning');
}

async function reissueCertificate(id) {
  const p = allParticipants.find(x => x.id === id);
  if (!p) return;

  p.status = 'published';
  await persistSiteSetting('cert_participants', allParticipants);
  await rebuildAndSyncPublicRegistry();
  renderParticipantsTable();
  updateDashboardMetrics();
  showToast(`Certificate ${p.certificate_id} restored to published status.`);
}

async function deleteParticipant(id) {
  const p = allParticipants.find(x => x.id === id);
  if (!p) return;

  if (!confirm(`Permanently delete participant record for "${p.full_name}"?`)) return;

  allParticipants = allParticipants.filter(x => x.id !== id);
  await persistSiteSetting('cert_participants', allParticipants);
  await rebuildAndSyncPublicRegistry();
  renderParticipantsTable();
  updateDashboardMetrics();
  showToast('Participant record deleted.');
}

/**
 * =========================================================================
 * CSV BULK IMPORT MODULE
 * =========================================================================
 */
function openCsvImportModal() {
  document.getElementById('csv-file-input').value = '';
  document.getElementById('csv-import-status').textContent = '';
  document.getElementById('csv-import-modal').classList.add('is-active');
}

function closeCsvImportModal() {
  document.getElementById('csv-import-modal').classList.remove('is-active');
}

async function processCsvImport() {
  const fileInput = document.getElementById('csv-file-input');
  const statusEl = document.getElementById('csv-import-status');
  const targetYear = parseInt(document.getElementById('csv-target-year').value) || 2026;
  const autoIssue = document.getElementById('csv-auto-issue').checked;

  if (!fileInput || !fileInput.files || !fileInput.files.length) {
    statusEl.innerHTML = '<span style="color: var(--admin-danger);">Please select a CSV file to import.</span>';
    return;
  }

  const file = fileInput.files[0];
  statusEl.innerHTML = '<span class="loading-spinner"></span> Parsing and validating records...';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const rows = parseCSVText(text);

      if (rows.length < 2) {
        throw new Error('CSV file contains no data rows.');
      }

      const headers = rows[0].map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('participant'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const compIdx = headers.findIndex(h => h.includes('competition') || h.includes('track'));
      const teamIdx = headers.findIndex(h => h.includes('team'));

      if (nameIdx === -1) {
        throw new Error('CSV must contain a "Name" or "Participant Name" column.');
      }

      let importedCount = 0;
      let duplicateCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[nameIdx] || !row[nameIdx].trim()) continue;

        const fullName = row[nameIdx].trim();
        const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '';
        const compRaw = compIdx !== -1 && row[compIdx] ? row[compIdx].trim() : '';
        const teamName = teamIdx !== -1 && row[teamIdx] ? row[teamIdx].trim() : '';

        // Match competition or default to first track
        let compObj = allCompetitions.find(c =>
          (c.name && c.name.toLowerCase() === compRaw.toLowerCase()) ||
          (c.code && c.code.toLowerCase() === compRaw.toLowerCase())
        );

        if (!compObj && allCompetitions.length > 0) {
          compObj = allCompetitions[0];
        }

        // Prevent exact duplicate participant in same competition and year
        const exists = allParticipants.some(p =>
          p.event_year === targetYear &&
          p.full_name.toLowerCase() === fullName.toLowerCase() &&
          p.competition_id === (compObj ? compObj.id : '')
        );

        if (exists) {
          duplicateCount++;
          continue;
        }

        const certId = generateCertificateId(targetYear);
        const claimCode = generateClaimCode('CLAIM');

        allParticipants.push({
          id: 'part_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          full_name: fullName,
          email,
          team_name: teamName,
          event_year: targetYear,
          competition_id: compObj ? compObj.id : '',
          competition: compObj ? compObj.name : compRaw,
          participant_type: teamName ? 'team_member' : 'individual',
          status: autoIssue ? 'published' : 'unissued',
          certificate_id: certId,
          claim_code: claimCode,
          issue_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        });

        importedCount++;
      }

      await persistSiteSetting('cert_participants', allParticipants);
      await rebuildAndSyncPublicRegistry();

      renderParticipantsTable();
      updateDashboardMetrics();

      statusEl.innerHTML = `
        <span style="color: var(--admin-success); font-weight: 600;">
          ✓ Successfully imported ${importedCount} participant(s).
          ${duplicateCount > 0 ? `(${duplicateCount} duplicate(s) skipped)` : ''}
        </span>
      `;
      setTimeout(closeCsvImportModal, 2200);
      showToast(`Imported ${importedCount} participants.`);
    } catch (err) {
      console.error('CSV import error:', err);
      statusEl.innerHTML = `<span style="color: var(--admin-danger);">Import failed: ${err.message}</span>`;
    }
  };
  reader.readAsText(file);
}

function parseCSVText(text) {
  const lines = text.split(/\r\n|\n/);
  const result = [];
  lines.forEach(line => {
    if (!line.trim()) return;
    // Simple regex CSV parser supporting quotes
    const row = [];
    let inQuotes = false;
    let curr = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        row.push(curr);
        curr = '';
      } else {
        curr += c;
      }
    }
    row.push(curr);
    result.push(row.map(s => s.replace(/^"|"$/g, '').trim()));
  });
  return result;
}

/**
 * Export Admin CSV Report
 */
function exportParticipantsCsv() {
  if (!allParticipants.length) {
    showToast('No participant records to export.', 'error');
    return;
  }

  const headers = ['Certificate ID', 'Claim Code', 'Participant Name', 'Email', 'Team Name', 'Competition', 'Year', 'Issue Date', 'Status'];
  const rows = allParticipants.map(p => [
    `"${p.certificate_id || ''}"`,
    `"${p.claim_code || ''}"`,
    `"${p.full_name || ''}"`,
    `"${p.email || ''}"`,
    `"${p.team_name || ''}"`,
    `"${p.competition || ''}"`,
    `"${p.event_year || ''}"`,
    `"${p.issue_date || ''}"`,
    `"${p.status || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `HRC-Participation-Certificates-Report-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * =========================================================================
 * SIGNATORIES ASSET UPLOAD & CONFIGURATION MODULE
 * =========================================================================
 */
function populateSignatoriesForm() {
  const sigs = signatoriesConfig.signatories || {};

  // Deputy Director (Left)
  if (sigs.deputy_director) {
    document.getElementById('sig-deputy-name').value = sigs.deputy_director.name || 'Prof. Anju Dixit';
    document.getElementById('sig-deputy-desig').value = sigs.deputy_director.designation || 'Deputy Director, School of Basic Sciences, CSJMU';
    if (sigs.deputy_director.signature_url) {
      document.getElementById('sig-deputy-preview').src = sigs.deputy_director.signature_url;
      document.getElementById('sig-deputy-preview-wrap').style.display = 'block';
    }
  }

  // Director (Center)
  if (sigs.director) {
    document.getElementById('sig-dir-name').value = sigs.director.name || 'Prof. R. K. Dwivedi';
    document.getElementById('sig-dir-desig').value = sigs.director.designation || 'Director, School of Basic Sciences, CSJMU';
    if (sigs.director.signature_url) {
      document.getElementById('sig-dir-preview').src = sigs.director.signature_url;
      document.getElementById('sig-dir-preview-wrap').style.display = 'block';
    }
  }

  // HOD Mathematics (Right)
  if (sigs.hod_math) {
    document.getElementById('sig-hod-name').value = sigs.hod_math.name || 'Dr. P. N. Pathak';
    document.getElementById('sig-hod-desig').value = sigs.hod_math.designation || 'Head of Department / Coordinator, Department of Mathematics, School of Basic Sciences, CSJMU';
    if (sigs.hod_math.signature_url) {
      document.getElementById('sig-hod-preview').src = sigs.hod_math.signature_url;
      document.getElementById('sig-hod-preview-wrap').style.display = 'block';
    }
  }
}

async function uploadSignatureAsset(role, fileInput) {
  if (!fileInput || !fileInput.files || !fileInput.files.length) return;
  const file = fileInput.files[0];

  try {
    showToast(`Uploading signature image for ${role}...`);
    const cleanRole = role.replace(/[^a-zA-Z0-9]/g, '_');
    const path = `signatures/${Date.now()}_${cleanRole}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const publicUrl = await uploadToStorage(HRC_CONFIG.STORAGE_BUCKETS.PUBLIC_ASSETS, path, file);

    if (!signatoriesConfig.signatories) signatoriesConfig.signatories = {};
    if (!signatoriesConfig.signatories[role]) signatoriesConfig.signatories[role] = {};
    signatoriesConfig.signatories[role].signature_url = publicUrl;

    // Update UI Preview
    const previewWrap = document.getElementById(`sig-${role === 'deputy_director' ? 'deputy' : (role === 'director' ? 'dir' : 'hod')}-preview-wrap`);
    const previewImg = document.getElementById(`sig-${role === 'deputy_director' ? 'deputy' : (role === 'director' ? 'dir' : 'hod')}-preview`);
    if (previewImg && previewWrap) {
      previewImg.src = publicUrl;
      previewWrap.style.display = 'block';
    }

    await persistSiteSetting('cert_signatories', signatoriesConfig);
    showToast('Signature asset uploaded and linked.');
  } catch (err) {
    console.error('Signature upload failed:', err);
    showToast('Failed to upload signature asset: ' + err.message, 'error');
  }
}

async function saveSignatories() {
  const depDesig = document.getElementById('sig-deputy-desig').value.trim();
  const depInst = document.getElementById('sig-deputy-inst') ? document.getElementById('sig-deputy-inst').value.trim() : '';
  const dirDesig = document.getElementById('sig-dir-desig').value.trim();
  const dirInst = document.getElementById('sig-dir-inst') ? document.getElementById('sig-dir-inst').value.trim() : '';
  const hodDesig = document.getElementById('sig-hod-desig').value.trim();
  const hodInst = document.getElementById('sig-hod-inst') ? document.getElementById('sig-hod-inst').value.trim() : '';

  signatoriesConfig.signatories = {
    deputy_director: {
      name: document.getElementById('sig-deputy-name').value.trim(),
      designation: depInst && !depDesig.includes(depInst) ? `${depDesig}, ${depInst}` : depDesig,
      signature_url: signatoriesConfig.signatories?.deputy_director?.signature_url || ''
    },
    director: {
      name: document.getElementById('sig-dir-name').value.trim(),
      designation: dirInst && !dirDesig.includes(dirInst) ? `${dirDesig}, ${dirInst}` : dirDesig,
      signature_url: signatoriesConfig.signatories?.director?.signature_url || ''
    },
    hod_math: {
      name: document.getElementById('sig-hod-name').value.trim(),
      designation: hodInst && !hodDesig.includes(hodInst) ? `${hodDesig}, ${hodInst}` : hodDesig,
      signature_url: signatoriesConfig.signatories?.hod_math?.signature_url || ''
    }
  };

  await persistSiteSetting('cert_signatories', signatoriesConfig);
  showToast('Official signatories configuration saved.');
}

/**
 * =========================================================================
 * PREVIEW & PDF DOWNLOAD MODAL
 * =========================================================================
 */
let currentPreviewCert = null;

async function previewCertificate(id) {
  const p = allParticipants.find(x => x.id === id);
  if (!p) return;

  const compName = p.competition || (allCompetitions.find(c => c.id === p.competition_id)?.name) || 'Academic Event';
  currentPreviewCert = {
    certificate_id: p.certificate_id || generateCertificateId(p.event_year),
    participant_name: p.full_name,
    competition_name: compName,
    team_name: p.team_name,
    event_year: p.event_year,
    issue_date: p.issue_date || 'October 11, 2026',
    status: p.status,
    signatories: signatoriesConfig.signatories,
    verification_url: `${window.location.origin}/verify.html?id=${p.certificate_id}`
  };

  const modal = document.getElementById('certificate-preview-modal');
  modal.classList.add('is-active');

  const canvas = document.getElementById('admin-cert-canvas');
  if (canvas && window.HRC_CERTIFICATE) {
    await window.HRC_CERTIFICATE.renderToCanvas(canvas, currentPreviewCert, { basePath: '../' });
  }
}

function closePreviewModal() {
  document.getElementById('certificate-preview-modal').classList.remove('is-active');
  currentPreviewCert = null;
}

async function downloadPreviewPDF() {
  if (!currentPreviewCert) return;
  const canvas = document.getElementById('admin-cert-canvas');
  if (!canvas || !window.HRC_CERTIFICATE) return;

  const btn = document.getElementById('btn-admin-download-pdf');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Generating...';

  try {
    const cleanName = (currentPreviewCert.participant_name || 'Participant').replace(/[^a-zA-Z0-9]/g, '-');
    const fileName = `Harish-Chandra-Day-${currentPreviewCert.event_year}-${cleanName}-${currentPreviewCert.certificate_id}.pdf`;
    await window.HRC_CERTIFICATE.exportToPDF(canvas, fileName);
  } catch (e) {
    alert('PDF generation error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

/**
 * =========================================================================
 * PUBLIC REGISTRY REBUILD & PERSISTENCE HELPERS
 * =========================================================================
 */
async function persistSiteSetting(key, val) {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from('site_settings')
    .upsert({
      key,
      value: val,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error(`[HRC Admin] Error saving ${key}:`, error);
    throw error;
  }
}

async function rebuildAndSyncPublicRegistry() {
  const publicMap = {};

  allParticipants.forEach(p => {
    const rel = allReleases.find(r => r.id === p.release_id || r.event_year === p.event_year);
    const comp = allCompetitions.find(c => c.id === p.competition_id || c.name === p.competition);

    const isRelPublished = rel ? rel.status === 'published' : true;
    const isCertActive = p.status === 'published' || p.status === 'revoked';

    if (isRelPublished && isCertActive && p.certificate_id) {
      const compName = p.competition || (comp ? comp.name : 'Harish-Chandra Day Academic Event');
      const publicRecord = {
        certificate_id: p.certificate_id,
        status: p.status,
        event_year: p.event_year,
        competition_name: compName,
        competition_code: comp ? comp.code : '',
        participant_name: p.full_name,
        team_name: p.team_name || '',
        participant_type: p.participant_type || (p.team_name ? 'team_member' : 'individual'),
        issue_date: p.issue_date || (rel ? rel.release_date : '2026-10-11'),
        release_title: rel ? rel.title : ('Harish-Chandra Day ' + p.event_year)
      };

      // 1. By ID
      publicMap['id_' + p.certificate_id.trim().toUpperCase()] = publicRecord;

      // 2. By Claim Code hash
      if (p.claim_code) {
        sha256Hex(p.claim_code).then(hash => {
          publicMap['claim_' + hash] = publicRecord;
        });
      }

      // 3. By Email hash + Year
      if (p.email) {
        sha256Hex(p.email).then(hash => {
          publicMap['email_' + p.event_year + '_' + hash] = publicRecord;
        });
      }
    }
  });

  // Short timeout to allow promises to settle
  await new Promise(r => setTimeout(r, 60));
  await persistSiteSetting('cert_public_registry', publicMap);
  console.log('[HRC Admin] Public certificate registry index synced with', Object.keys(publicMap).length, 'keys.');
}

window.openCreateReleaseModal = openCreateReleaseModal;
window.openEditReleaseModal = openEditReleaseModal;
window.closeReleaseModal = closeReleaseModal;
window.toggleReleasePublish = toggleReleasePublish;

window.openCreateCompetitionModal = openCreateCompetitionModal;
window.openEditCompetitionModal = openEditCompetitionModal;
window.closeCompetitionModal = closeCompetitionModal;
window.deleteCompetition = deleteCompetition;

window.openAddParticipantModal = openAddParticipantModal;
window.openEditParticipantModal = openEditParticipantModal;
window.closeParticipantModal = closeParticipantModal;
window.issueCertificate = issueCertificate;
window.publishCertificate = publishCertificate;
window.revokeCertificate = revokeCertificate;
window.reissueCertificate = reissueCertificate;
window.deleteParticipant = deleteParticipant;

window.openCsvImportModal = openCsvImportModal;
window.closeCsvImportModal = closeCsvImportModal;
window.processCsvImport = processCsvImport;
window.exportParticipantsCsv = exportParticipantsCsv;

window.uploadSignatureAsset = uploadSignatureAsset;
window.previewCertificate = previewCertificate;
window.closePreviewModal = closePreviewModal;
window.downloadPreviewPDF = downloadPreviewPDF;
