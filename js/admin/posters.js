/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Posters Management (Year-Grouped)
 */

let allPosters = [];
let currentEditingPosterId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  loadPosters();
  setupPosterForm();
});

async function loadPosters() {
  const table = document.getElementById('posters-table-body');
  if (!table) return;

  const sb = getSupabase();
  if (!sb) {
    allPosters = [
      { id: '1', title: 'Centenary Colloquium Official Poster', year: 2026, category: 'lecture', image_url: 'assets/posters/poster-2026.png', published: true },
      { id: '2', title: 'Second Annual Lecture Poster', year: 2025, category: 'lecture', image_url: 'assets/posters/poster-2025.png', published: true },
      { id: '3', title: 'Inaugural Memorial Colloquium Poster', year: 2024, category: 'lecture', image_url: 'assets/posters/poster-2024.png', published: true }
    ];
    renderPostersTable(allPosters);
    return;
  }

  try {
    const { data, error } = await sb.from('posters').select('*').order('year', { ascending: false });
    if (error) throw error;
    allPosters = data || [];
    renderPostersTable(allPosters);
  } catch (err) {
    console.error('[HRC Admin] Error loading posters:', err);
    showToast('Failed to load posters: ' + err.message, 'error');
  }
}

function renderPostersTable(posters) {
  const table = document.getElementById('posters-table-body');
  if (!table) return;

  if (!posters.length) {
    table.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted);">No posters uploaded yet.</td></tr>';
    return;
  }

  table.innerHTML = posters.map(p => `
    <tr>
      <td><strong style="color: var(--admin-sidebar);">${p.year}</strong></td>
      <td><strong>${escapeHtml(p.title)}</strong></td>
      <td><span class="admin-badge admin-badge-primary">${escapeHtml(p.category || 'Lecture')}</span></td>
      <td>
        <span class="admin-badge ${p.published ? 'admin-badge-success' : 'admin-badge-draft'}">
          ${p.published ? 'Published' : 'Draft'}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditPosterModal('${p.id}')">Edit</button>
          <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deletePoster('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupPosterForm() {
  const form = document.getElementById('poster-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePoster();
    });
  }
}

function openCreatePosterModal() {
  currentEditingPosterId = null;
  document.getElementById('modal-poster-title').textContent = 'Upload Year Poster';
  document.getElementById('poster-form').reset();
  document.getElementById('poster-published').checked = true;
  document.getElementById('poster-modal').classList.add('is-active');
}

function openEditPosterModal(id) {
  const p = allPosters.find(item => item.id === id);
  if (!p) return;

  currentEditingPosterId = id;
  document.getElementById('modal-poster-title').textContent = `Edit Poster: ${p.title}`;
  document.getElementById('poster-title').value = p.title;
  document.getElementById('poster-year').value = p.year;
  document.getElementById('poster-category').value = p.category || 'lecture';
  document.getElementById('poster-desc').value = p.description || '';
  document.getElementById('poster-image-url').value = p.image_url || '';
  document.getElementById('poster-published').checked = p.published;

  document.getElementById('poster-modal').classList.add('is-active');
}

function closePosterModal() {
  document.getElementById('poster-modal').classList.remove('is-active');
}

async function savePoster() {
  const title = document.getElementById('poster-title').value.trim();
  const year = parseInt(document.getElementById('poster-year').value);
  const category = document.getElementById('poster-category').value;
  const description = document.getElementById('poster-desc').value.trim();
  let image_url = document.getElementById('poster-image-url').value.trim();
  const published = document.getElementById('poster-published').checked;

  const fileInput = document.getElementById('poster-file');
  if (fileInput.files.length) {
    try {
      showToast('Uploading poster image to Supabase Storage...');
      image_url = await uploadToStorage(HRC_CONFIG.STORAGE_BUCKETS.PUBLIC_ASSETS, 'posters', fileInput.files[0]);
    } catch (uploadErr) {
      console.warn('[HRC Admin] Upload notice:', uploadErr);
      if (!image_url) image_url = 'assets/posters/poster-placeholder.png';
    }
  }

  if (!image_url) {
    image_url = 'assets/posters/poster-placeholder.png';
  }

  const sb = getSupabase();
  if (!sb) {
    showToast('Demo Mode: Poster saved.');
    closePosterModal();
    return;
  }

  try {
    const payload = { title, year, category, description, image_url, published, updated_at: new Date() };

    if (currentEditingPosterId) {
      const { error } = await sb.from('posters').update(payload).eq('id', currentEditingPosterId);
      if (error) throw error;
      showToast('Poster updated.');
    } else {
      const { error } = await sb.from('posters').insert([payload]);
      if (error) throw error;
      showToast('New year poster added.');
    }

    closePosterModal();
    loadPosters();
  } catch (err) {
    console.error('[HRC Admin] Save poster error:', err);
    showToast('Failed to save poster: ' + err.message, 'error');
  }
}

async function deletePoster(id) {
  if (!confirm('Are you sure you want to delete this poster?')) return;

  const sb = getSupabase();
  if (!sb) {
    allPosters = allPosters.filter(p => p.id !== id);
    renderPostersTable(allPosters);
    showToast('Demo Mode: Poster deleted.');
    return;
  }

  try {
    const { error } = await sb.from('posters').delete().eq('id', id);
    if (error) throw error;
    showToast('Poster removed.');
    loadPosters();
  } catch (err) {
    console.error('[HRC Admin] Delete poster error:', err);
    showToast('Failed to delete poster: ' + err.message, 'error');
  }
}
