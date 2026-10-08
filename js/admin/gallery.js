/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Gallery Albums & Image Management
 */

let allAlbums = [];
let currentAlbumId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  loadAlbums();
  setupAlbumForm();
});

async function loadAlbums() {
  const table = document.getElementById('albums-table-body');
  if (!table) return;

  const sb = getSupabase();
  if (!sb) {
    allAlbums = [
      { id: '1', title: 'Inaugural Colloquium Archive', year: 2024, published: true, images_count: 2 },
      { id: '2', title: 'Second Annual Lecture Series', year: 2025, published: true, images_count: 2 },
      { id: '3', title: 'Centenary Preview Exhibition', year: 2026, published: true, images_count: 2 }
    ];
    renderAlbumsTable(allAlbums);
    return;
  }

  try {
    const { data, error } = await sb.from('gallery_albums').select('*, gallery_images(*)').order('year', { ascending: false });
    if (error) throw error;
    allAlbums = data || [];
    renderAlbumsTable(allAlbums);
  } catch (err) {
    console.error('[HRC Admin] Error loading albums:', err);
    showToast('Failed to load albums: ' + err.message, 'error');
  }
}

function renderAlbumsTable(albums) {
  const table = document.getElementById('albums-table-body');
  if (!table) return;

  if (!albums.length) {
    table.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted);">No albums created yet.</td></tr>';
    return;
  }

  table.innerHTML = albums.map(a => `
    <tr>
      <td><strong style="color: var(--admin-sidebar);">${a.year}</strong></td>
      <td><strong>${escapeHtml(a.title)}</strong></td>
      <td><span class="admin-badge admin-badge-primary">${a.gallery_images?.length ?? a.images_count ?? 0} Images</span></td>
      <td><span class="admin-badge ${a.published ? 'admin-badge-success' : 'admin-badge-draft'}">${a.published ? 'Published' : 'Draft'}</span></td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openAddImageModal('${a.id}')">+ Add Image</button>
          <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteAlbum('${a.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupAlbumForm() {
  const form = document.getElementById('album-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveAlbum();
    });
  }

  const imgForm = document.getElementById('image-upload-form');
  if (imgForm) {
    imgForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveImageToAlbum();
    });
  }
}

function openCreateAlbumModal() {
  document.getElementById('album-form').reset();
  document.getElementById('album-published').checked = true;
  document.getElementById('album-modal').classList.add('is-active');
}

function closeAlbumModal() {
  document.getElementById('album-modal').classList.remove('is-active');
}

async function saveAlbum() {
  const title = document.getElementById('album-title').value.trim();
  const year = parseInt(document.getElementById('album-year').value);
  const description = document.getElementById('album-desc').value.trim();
  const published = document.getElementById('album-published').checked;

  const sb = getSupabase();
  if (!sb) {
    showToast('Demo Mode: Album created.');
    closeAlbumModal();
    return;
  }

  try {
    const { error } = await sb.from('gallery_albums').insert([{ title, year, description, published }]);
    if (error) throw error;
    showToast('Album created.');
    closeAlbumModal();
    loadAlbums();
  } catch (err) {
    console.error('[HRC Admin] Album save error:', err);
    showToast('Failed to create album: ' + err.message, 'error');
  }
}

async function deleteAlbum(id) {
  if (!confirm('Are you sure you want to delete this album and all its images?')) return;

  const sb = getSupabase();
  if (!sb) {
    allAlbums = allAlbums.filter(a => a.id !== id);
    renderAlbumsTable(allAlbums);
    showToast('Demo Mode: Album deleted.');
    return;
  }

  try {
    const { error } = await sb.from('gallery_albums').delete().eq('id', id);
    if (error) throw error;
    showToast('Album deleted.');
    loadAlbums();
  } catch (err) {
    console.error('[HRC Admin] Album delete error:', err);
    showToast('Failed to delete album: ' + err.message, 'error');
  }
}

// Add Image Modal
function openAddImageModal(albumId) {
  currentAlbumId = albumId;
  document.getElementById('image-upload-form').reset();
  document.getElementById('image-modal').classList.add('is-active');
}

function closeImageModal() {
  document.getElementById('image-modal').classList.remove('is-active');
}

async function saveImageToAlbum() {
  const caption = document.getElementById('img-caption').value.trim();
  let image_url = document.getElementById('img-url').value.trim();
  const file = document.getElementById('img-file').files[0];

  if (file) {
    try {
      showToast('Uploading image to Supabase Storage...');
      image_url = await uploadToStorage(HRC_CONFIG.STORAGE_BUCKETS.PUBLIC_ASSETS, 'gallery', file);
    } catch (err) {
      console.warn('[HRC Admin] Storage notice:', err);
      if (!image_url) image_url = 'assets/gallery/gallery-placeholder.png';
    }
  }

  if (!image_url) image_url = 'assets/gallery/gallery-placeholder.png';

  const sb = getSupabase();
  if (!sb) {
    showToast('Demo Mode: Image added to album.');
    closeImageModal();
    return;
  }

  try {
    const { error } = await sb.from('gallery_images').insert([{
      album_id: currentAlbumId,
      image_url,
      caption,
      alt_text: caption
    }]);
    if (error) throw error;
    showToast('Photograph attached to album.');
    closeImageModal();
    loadAlbums();
  } catch (err) {
    console.error('[HRC Admin] Image save error:', err);
    showToast('Failed to add image: ' + err.message, 'error');
  }
}
