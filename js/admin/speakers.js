/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Speakers Management
 */

let allSpeakers = [];
let currentEditingSpeakerId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  loadSpeakers();
  setupSpeakerForm();
});

async function loadSpeakers() {
  const table = document.getElementById('speakers-table-body');
  if (!table) return;

  const sb = getSupabase();
  if (!sb) {
    allSpeakers = [
      { id: '1', name: 'Prof. Manindra Agrawal', designation: 'Director & Professor of Computer Science', institution: 'IIT Kanpur', website_url: 'https://www.iitk.ac.in' },
      { id: '2', name: 'Prof. Vinay Kumar Pathak', designation: 'Vice Chancellor & Patron', institution: 'CSJMU Kanpur', website_url: 'https://csjmu.ac.in' },
      { id: '3', name: 'Invited Keynote Scholar', designation: 'Senior Fellow in Pure Mathematics', institution: 'Department of Mathematics, IIT Kanpur', website_url: '' }
    ];
    renderSpeakersTable(allSpeakers);
    return;
  }

  try {
    const { data, error } = await sb.from('speakers').select('*').order('name');
    if (error) throw error;
    allSpeakers = data || [];
    renderSpeakersTable(allSpeakers);
  } catch (err) {
    console.error('[HRC Admin] Error loading speakers:', err);
    showToast('Failed to load speakers: ' + err.message, 'error');
  }
}

function renderSpeakersTable(speakers) {
  const table = document.getElementById('speakers-table-body');
  if (!table) return;

  if (!speakers.length) {
    table.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--admin-text-muted);">No distinguished speakers catalogued yet.</td></tr>';
    return;
  }

  table.innerHTML = speakers.map(sp => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #E2E8F0; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">
            ${sp.photo_url ? `<img src="${escapeHtml(sp.photo_url)}" style="width: 100%; height: 100%; object-fit: cover;">` : sp.name.charAt(0)}
          </div>
          <div>
            <strong>${escapeHtml(sp.name)}</strong>
            ${sp.website_url ? `<div style="font-size: 0.72rem;"><a href="${escapeHtml(sp.website_url)}" target="_blank" style="color: var(--admin-blue);">Profile Link</a></div>` : ''}
          </div>
        </div>
      </td>
      <td>${escapeHtml(sp.designation || 'Scholar')}</td>
      <td><strong>${escapeHtml(sp.institution || 'CSJMU × IITK Collaboration')}</strong></td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditSpeakerModal('${sp.id}')">Edit</button>
          <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteSpeaker('${sp.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupSpeakerForm() {
  const form = document.getElementById('speaker-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveSpeaker();
    });
  }
}

function openCreateSpeakerModal() {
  currentEditingSpeakerId = null;
  document.getElementById('modal-speaker-title').textContent = 'Add Distinguished Speaker';
  document.getElementById('speaker-form').reset();
  document.getElementById('speaker-modal').classList.add('is-active');
}

function openEditSpeakerModal(id) {
  const sp = allSpeakers.find(s => s.id === id);
  if (!sp) return;

  currentEditingSpeakerId = id;
  document.getElementById('modal-speaker-title').textContent = `Edit Speaker: ${sp.name}`;
  document.getElementById('speaker-name').value = sp.name;
  document.getElementById('speaker-designation').value = sp.designation || '';
  document.getElementById('speaker-institution').value = sp.institution || '';
  document.getElementById('speaker-bio').value = sp.bio || '';
  document.getElementById('speaker-website').value = sp.website_url || '';
  document.getElementById('speaker-photo-url').value = sp.photo_url || '';

  document.getElementById('speaker-modal').classList.add('is-active');
}

function closeSpeakerModal() {
  document.getElementById('speaker-modal').classList.remove('is-active');
}

async function saveSpeaker() {
  const name = document.getElementById('speaker-name').value.trim();
  const designation = document.getElementById('speaker-designation').value.trim();
  const institution = document.getElementById('speaker-institution').value.trim();
  const bio = document.getElementById('speaker-bio').value.trim();
  const website_url = document.getElementById('speaker-website').value.trim();
  let photo_url = document.getElementById('speaker-photo-url').value.trim();

  // Handle file upload if present
  const photoFile = document.getElementById('speaker-photo-file').files[0];
  if (photoFile) {
    try {
      showToast('Uploading speaker photograph to Supabase Storage...');
      photo_url = await uploadToStorage(HRC_CONFIG.STORAGE_BUCKETS.PUBLIC_ASSETS, 'speakers', photoFile);
    } catch (uploadErr) {
      console.warn('[HRC Admin] Storage upload warning:', uploadErr);
      showToast('Storage upload note: using existing/placeholder photo reference.');
    }
  }

  const sb = getSupabase();
  if (!sb) {
    showToast('Demo Mode: Speaker saved.');
    closeSpeakerModal();
    return;
  }

  try {
    const payload = { name, designation, institution, bio, website_url, photo_url, updated_at: new Date() };

    if (currentEditingSpeakerId) {
      const { error } = await sb.from('speakers').update(payload).eq('id', currentEditingSpeakerId);
      if (error) throw error;
      showToast('Speaker updated successfully.');
    } else {
      const { error } = await sb.from('speakers').insert([payload]);
      if (error) throw error;
      showToast('New distinguished speaker added.');
    }

    closeSpeakerModal();
    loadSpeakers();
  } catch (err) {
    console.error('[HRC Admin] Save speaker error:', err);
    showToast('Failed to save speaker: ' + err.message, 'error');
  }
}

async function deleteSpeaker(id) {
  if (!confirm('Are you sure you want to remove this speaker?')) return;

  const sb = getSupabase();
  if (!sb) {
    allSpeakers = allSpeakers.filter(s => s.id !== id);
    renderSpeakersTable(allSpeakers);
    showToast('Demo Mode: Speaker deleted.');
    return;
  }

  try {
    const { error } = await sb.from('speakers').delete().eq('id', id);
    if (error) throw error;
    showToast('Speaker deleted.');
    loadSpeakers();
  } catch (err) {
    console.error('[HRC Admin] Delete speaker error:', err);
    showToast('Failed to delete speaker: ' + err.message, 'error');
  }
}
