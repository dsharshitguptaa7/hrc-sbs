/**
 * HARISH-CHANDRA RESEARCH CENTRE (HRC-SBS)
 * Admin Panel: Comprehensive Gallery Albums & Photograph Management
 * 
 * Capabilities:
 * - Full CRUD for year-wise albums
 * - Publish / unpublish status toggling
 * - Custom & suggested category assignments
 * - Event date & display ordering
 * - Cover image upload or selection from album photos
 * - Batch photo upload with automatic aspect ratio detection (16:9 landscape & 9:16 portrait)
 * - Photo captions and alt text editing
 * - Reorder photographs within albums
 * - Live public preview before publishing
 * - Resilient database migration support with transparent fallback
 */

let allAlbums = [];
let currentAlbumId = null;
let currentAlbumPhotos = [];
let editingAlbumId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  await loadAlbums();
  setupAlbumForm();
});

/**
 * Metadata Helper: Extracts category, event_date, and display_order from
 * native columns or embedded JSON comment fallback in description.
 */
function extractAlbumMetadata(album) {
  let category = album.category || '';
  let event_date = album.event_date || '';
  let display_order = album.display_order !== undefined && album.display_order !== null ? album.display_order : 0;
  let cleanDesc = album.description || '';

  const metaMatch = cleanDesc.match(/<!--meta:(.*?)-->/s);
  if (metaMatch) {
    try {
      const meta = JSON.parse(metaMatch[1]);
      if (!category && meta.category) category = meta.category;
      if (!event_date && meta.event_date) event_date = meta.event_date;
      if ((display_order === 0 || display_order === undefined) && meta.display_order !== undefined) {
        display_order = meta.display_order;
      }
      cleanDesc = cleanDesc.replace(/<!--meta:.*?-->/s, '').trim();
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  if (!category) category = 'Institutional Events';

  return {
    category,
    event_date,
    display_order: parseInt(display_order) || 0,
    cleanDescription: cleanDesc
  };
}

/**
 * Metadata Helper: Packs metadata into description string for zero-downtime DB compatibility
 */
function packAlbumDescription(cleanDescription, meta) {
  const base = (cleanDescription || '').replace(/<!--meta:.*?-->/s, '').trim();
  const metaString = `\n<!--meta:${JSON.stringify({
    category: meta.category,
    event_date: meta.event_date,
    display_order: meta.display_order
  })}-->`;
  return base + metaString;
}

/**
 * Fetch all gallery albums and attached images from Supabase
 */
async function loadAlbums() {
  const table = document.getElementById('albums-table-body');
  if (!table) return;

  const sb = getSupabase();
  if (!sb) {
    allAlbums = [
      {
        id: 'mock-1',
        title: 'Centenary Harish-Chandra Commemoration Assembly',
        year: 2026,
        category: 'Birth Anniversary Celebration',
        event_date: '2026-10-11',
        description: 'Centenary tribute and national colloquium commemorating Harish-Chandra.',
        cover_image_url: 'assets/gallery/gallery-placeholder.png',
        published: true,
        display_order: 1,
        gallery_images: [
          { id: 'img-1', image_url: 'assets/gallery/gallery-placeholder.png', caption: 'Keynote Assembly', alt_text: 'Keynote Assembly', sort_order: 0, orientation: 'landscape' },
          { id: 'img-2', image_url: 'assets/gallery/gallery-placeholder.png', caption: 'Centenary Poster Unveiling', alt_text: 'Centenary Poster', sort_order: 1, orientation: 'portrait' }
        ]
      },
      {
        id: 'mock-2',
        title: 'Second Annual Harish-Chandra Memorial Lecture',
        year: 2025,
        category: 'Annual Memorial Lecture',
        event_date: '2025-10-11',
        description: 'Delivered by distinguished faculty in collaboration with IIT Kanpur.',
        cover_image_url: '',
        published: true,
        display_order: 2,
        gallery_images: []
      },
      {
        id: 'mock-3',
        title: 'Inaugural Ceremony of Harish-Chandra Research Centre',
        year: 2024,
        category: 'Inauguration',
        event_date: '2024-10-11',
        description: 'Foundation ceremony at School of Basic Sciences, CSJMU Kanpur.',
        cover_image_url: '',
        published: true,
        display_order: 3,
        gallery_images: []
      }
    ];
    updateMetrics();
    populateYearFilter();
    applyAlbumFilters();
    return;
  }

  try {
    const { data, error } = await sb
      .from('gallery_albums')
      .select('*, gallery_images(*)')
      .order('year', { ascending: false });

    if (error) throw error;

    allAlbums = (data || []).map(a => {
      const meta = extractAlbumMetadata(a);
      // Sort gallery images by sort_order
      if (a.gallery_images && a.gallery_images.length) {
        a.gallery_images.sort((x, y) => (x.sort_order || 0) - (y.sort_order || 0));
      }
      return {
        ...a,
        category: meta.category,
        event_date: meta.event_date,
        display_order: meta.display_order,
        cleanDescription: meta.cleanDescription
      };
    });

    // Sort albums by year descending, then display_order ascending
    allAlbums.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (a.display_order || 0) - (b.display_order || 0);
    });

    updateMetrics();
    populateYearFilter();
    applyAlbumFilters();
  } catch (err) {
    console.error('[HRC Admin] Error loading albums:', err);
    showToast('Failed to load albums: ' + err.message, 'error');
    table.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--admin-danger); padding: 2rem;">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

/**
 * Update top metric summary cards
 */
function updateMetrics() {
  const totalAlbumsEl = document.getElementById('stat-total-albums');
  const publishedAlbumsEl = document.getElementById('stat-published-albums');
  const totalPhotosEl = document.getElementById('stat-total-photos');
  const activeYearsEl = document.getElementById('stat-active-years');

  const total = allAlbums.length;
  const published = allAlbums.filter(a => a.published).length;
  const photosCount = allAlbums.reduce((sum, a) => sum + (a.gallery_images ? a.gallery_images.length : 0), 0);
  const yearsSet = new Set(allAlbums.map(a => a.year).filter(Boolean));

  if (totalAlbumsEl) totalAlbumsEl.textContent = total;
  if (publishedAlbumsEl) publishedAlbumsEl.textContent = published;
  if (totalPhotosEl) totalPhotosEl.textContent = photosCount;
  if (activeYearsEl) activeYearsEl.textContent = yearsSet.size;

  const countBadge = document.getElementById('album-count-badge');
  if (countBadge) countBadge.textContent = `${total} Album${total === 1 ? '' : 's'}`;
}

/**
 * Populate dynamic Year filter dropdown from actual database albums
 */
function populateYearFilter() {
  const yearSelect = document.getElementById('filter-year');
  if (!yearSelect) return;

  const currentVal = yearSelect.value;
  const years = Array.from(new Set(allAlbums.map(a => a.year).filter(Boolean)));
  years.sort((a, b) => b - a);

  let html = '<option value="all">All Years</option>';
  years.forEach(yr => {
    html += `<option value="${yr}">${yr}</option>`;
  });
  yearSelect.innerHTML = html;

  if (currentVal && (years.includes(parseInt(currentVal)) || currentVal === 'all')) {
    yearSelect.value = currentVal;
  }
}

/**
 * Filter and search albums
 */
function applyAlbumFilters() {
  const search = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
  const year = document.getElementById('filter-year')?.value || 'all';
  const category = document.getElementById('filter-category')?.value || 'all';
  const status = document.getElementById('filter-status')?.value || 'all';

  const filtered = allAlbums.filter(a => {
    if (search) {
      const matchTitle = (a.title || '').toLowerCase().includes(search);
      const matchDesc = (a.cleanDescription || a.description || '').toLowerCase().includes(search);
      const matchCat = (a.category || '').toLowerCase().includes(search);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }

    if (year !== 'all' && String(a.year) !== String(year)) return false;
    if (category !== 'all' && a.category !== category) return false;
    if (status === 'published' && !a.published) return false;
    if (status === 'draft' && a.published) return false;

    return true;
  });

  renderAlbumsTable(filtered);
}

function resetAlbumFilters() {
  if (document.getElementById('filter-search')) document.getElementById('filter-search').value = '';
  if (document.getElementById('filter-year')) document.getElementById('filter-year').value = 'all';
  if (document.getElementById('filter-category')) document.getElementById('filter-category').value = 'all';
  if (document.getElementById('filter-status')) document.getElementById('filter-status').value = 'all';
  applyAlbumFilters();
}

/**
 * Render the main albums table
 */
function renderAlbumsTable(albums) {
  const table = document.getElementById('albums-table-body');
  if (!table) return;

  if (!albums.length) {
    table.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--admin-text-muted);">
          No photo albums found matching the active filters.
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = albums.map(a => {
    const photosCount = a.gallery_images ? a.gallery_images.length : 0;
    const coverUrl = a.cover_image_url || (a.gallery_images && a.gallery_images.length ? a.gallery_images[0].image_url : '');
    const dateFormatted = a.event_date ? new Date(a.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

    return `
      <tr>
        <td>
          <div style="width: 54px; height: 38px; border-radius: 4px; overflow: hidden; background: #0B1F33; display: flex; align-items: center; justify-content: center; border: 1px solid var(--admin-border);">
            ${coverUrl ? `
              <img src="${escapeHtml(coverUrl)}" alt="Cover" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'font-size: 0.6rem; color: #FFF;\\'>No Img</span>';">
            ` : `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 20px; height: 20px; stroke: #94A3B8;">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            `}
          </div>
        </td>
        <td>
          <strong style="color: var(--admin-sidebar); font-size: 0.95rem;">${a.year}</strong>
          <div style="font-size: 0.68rem; color: var(--admin-text-muted);">Ord: ${a.display_order || 0}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--admin-sidebar); font-size: 0.92rem; line-height: 1.3;">
            ${escapeHtml(a.title)}
          </div>
          ${a.cleanDescription ? `
            <div style="font-size: 0.76rem; color: var(--admin-text-muted); margin-top: 0.2rem; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(a.cleanDescription)}
            </div>
          ` : ''}
        </td>
        <td>
          <span class="admin-badge admin-badge-primary" style="white-space: nowrap;">
            ${escapeHtml(a.category || 'Institutional Events')}
          </span>
        </td>
        <td style="font-size: 0.8rem; color: var(--admin-text-muted); white-space: nowrap;">
          ${dateFormatted}
        </td>
        <td>
          <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openPhotoManager('${a.id}')" title="Manage album photographs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; stroke: var(--admin-gold);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            ${photosCount} Photo${photosCount === 1 ? '' : 's'}
          </button>
        </td>
        <td>
          <span class="admin-badge ${a.published ? 'admin-badge-success' : 'admin-badge-draft'}" 
                style="cursor: pointer; user-select: none;" 
                onclick="togglePublishStatus('${a.id}', ${a.published})" 
                title="Click to toggle status">
            ${a.published ? '✓ Published' : 'Draft'}
          </span>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
            <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="openPhotoManager('${a.id}')" title="Upload & Reorder Photos">+ Photos</button>
            <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditAlbumModal('${a.id}')" title="Edit Album Details">Edit</button>
            <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="previewAlbum('${a.id}')" title="Public Layout Preview">Preview</button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteAlbum('${a.id}')" title="Delete Album">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Quick toggle publish / draft status directly from table
 */
async function togglePublishStatus(albumId, currentStatus) {
  const newStatus = !currentStatus;
  const sb = getSupabase();

  if (!sb) {
    const alb = allAlbums.find(a => a.id === albumId);
    if (alb) alb.published = newStatus;
    updateMetrics();
    applyAlbumFilters();
    showToast(`Album set to ${newStatus ? 'Published' : 'Draft'}.`);
    return;
  }

  try {
    const { error } = await sb
      .from('gallery_albums')
      .update({ published: newStatus, updated_at: new Date() })
      .eq('id', albumId);

    if (error) throw error;

    const alb = allAlbums.find(a => a.id === albumId);
    if (alb) alb.published = newStatus;

    updateMetrics();
    applyAlbumFilters();
    showToast(`Album ${newStatus ? 'published' : 'moved to drafts'}.`);
  } catch (err) {
    console.error('[HRC Admin] Toggle publish error:', err);
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

/**
 * Setup album create & edit modal form submission
 */
function setupAlbumForm() {
  const form = document.getElementById('album-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveAlbum();
    });
  }
}

function toggleCustomCategoryInput() {
  const catSelect = document.getElementById('album-category');
  const customGroup = document.getElementById('custom-category-group');
  if (catSelect && customGroup) {
    if (catSelect.value === 'Other') {
      customGroup.style.display = 'block';
    } else {
      customGroup.style.display = 'none';
    }
  }
}

/**
 * Open Create Album Modal
 */
function openCreateAlbumModal() {
  editingAlbumId = null;
  document.getElementById('album-modal-title').textContent = 'Create Photo Album';
  document.getElementById('album-form').reset();
  document.getElementById('album-published').checked = true;
  document.getElementById('album-order').value = '0';
  document.getElementById('album-year').value = new Date().getFullYear();
  document.getElementById('album-category').value = 'Institutional Events';
  toggleCustomCategoryInput();
  document.getElementById('album-modal').classList.add('is-active');
}

/**
 * Open Edit Album Modal
 */
function openEditAlbumModal(id) {
  const album = allAlbums.find(a => a.id === id);
  if (!album) return;

  editingAlbumId = id;
  document.getElementById('album-modal-title').textContent = `Edit Album: ${album.title}`;
  document.getElementById('album-title').value = album.title || '';
  document.getElementById('album-year').value = album.year || '';
  document.getElementById('album-desc').value = album.cleanDescription || album.description || '';
  document.getElementById('album-order').value = album.display_order || 0;
  document.getElementById('album-cover-url').value = album.cover_image_url || '';
  document.getElementById('album-date').value = album.event_date ? album.event_date.split('T')[0] : '';
  document.getElementById('album-published').checked = !!album.published;

  const catSelect = document.getElementById('album-category');
  const customInput = document.getElementById('album-custom-category');
  const standardCats = ['Inauguration', 'Annual Memorial Lecture', 'Birth Anniversary Celebration', 'Workshops & Conferences', 'Student Activities', 'Institutional Events', 'Historical Archives'];

  if (standardCats.includes(album.category)) {
    catSelect.value = album.category;
    if (customInput) customInput.value = '';
  } else {
    catSelect.value = 'Other';
    if (customInput) customInput.value = album.category || '';
  }
  toggleCustomCategoryInput();

  document.getElementById('album-modal').classList.add('is-active');
}

function closeAlbumModal() {
  document.getElementById('album-modal').classList.remove('is-active');
  editingAlbumId = null;
}

/**
 * Save Album (Create or Update) with resilient database fallback
 */
async function saveAlbum() {
  const submitBtn = document.getElementById('album-submit-btn');
  const title = document.getElementById('album-title').value.trim();
  const year = parseInt(document.getElementById('album-year').value);
  let category = document.getElementById('album-category').value;
  if (category === 'Other') {
    const custom = document.getElementById('album-custom-category').value.trim();
    if (custom) category = custom;
  }
  const event_date = document.getElementById('album-date').value || null;
  const display_order = parseInt(document.getElementById('album-order').value) || 0;
  const rawDescription = document.getElementById('album-desc').value.trim();
  let cover_image_url = document.getElementById('album-cover-url').value.trim();
  const published = document.getElementById('album-published').checked;
  const coverFileInput = document.getElementById('album-cover-file');

  if (!title || isNaN(year)) {
    showToast('Please provide an album title and valid year.', 'error');
    return;
  }

  // Handle Cover File Upload if selected
  if (coverFileInput && coverFileInput.files.length) {
    try {
      showToast('Uploading cover image to Supabase Storage...');
      cover_image_url = await uploadToStorage(HRC_CONFIG.STORAGE_BUCKETS.PUBLIC_ASSETS, 'gallery', coverFileInput.files[0]);
    } catch (err) {
      console.warn('[HRC Admin] Cover upload note:', err);
      showToast('Notice: Cover image uploaded locally or fallback applied.', 'warning');
    }
  }

  const sb = getSupabase();
  if (!sb) {
    if (editingAlbumId) {
      const existing = allAlbums.find(a => a.id === editingAlbumId);
      if (existing) {
        Object.assign(existing, { title, year, category, event_date, display_order, cleanDescription: rawDescription, cover_image_url, published });
      }
      showToast('Demo Mode: Album updated.');
    } else {
      const newAlbum = {
        id: 'mock-' + Date.now(),
        title,
        year,
        category,
        event_date,
        display_order,
        cleanDescription: rawDescription,
        cover_image_url,
        published,
        gallery_images: []
      };
      allAlbums.unshift(newAlbum);
      showToast('Demo Mode: Album created.');
    }
    closeAlbumModal();
    updateMetrics();
    populateYearFilter();
    applyAlbumFilters();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    // Attempt 1: Direct save with native columns
    const payloadNative = {
      title,
      description: rawDescription,
      year,
      category,
      event_date,
      display_order,
      cover_image_url,
      published,
      updated_at: new Date()
    };

    let saveError = null;

    if (editingAlbumId) {
      const { error } = await sb.from('gallery_albums').update(payloadNative).eq('id', editingAlbumId);
      saveError = error;
    } else {
      const { error } = await sb.from('gallery_albums').insert([payloadNative]);
      saveError = error;
    }

    // Attempt 2: If native columns error (code 42703 or column not found), fallback to packing metadata into description
    if (saveError && (saveError.code === '42703' || String(saveError.message).toLowerCase().includes('column'))) {
      console.warn('[HRC Admin] Using description metadata fallback for gallery_albums:', saveError.message);
      const packedDesc = packAlbumDescription(rawDescription, { category, event_date, display_order });
      const payloadFallback = {
        title,
        description: packedDesc,
        year,
        cover_image_url,
        published,
        updated_at: new Date()
      };

      if (editingAlbumId) {
        const { error: err2 } = await sb.from('gallery_albums').update(payloadFallback).eq('id', editingAlbumId);
        if (err2) throw err2;
      } else {
        const { error: err2 } = await sb.from('gallery_albums').insert([payloadFallback]);
        if (err2) throw err2;
      }
    } else if (saveError) {
      throw saveError;
    }

    showToast(editingAlbumId ? 'Album updated successfully.' : 'New photo album created.');
    closeAlbumModal();
    await loadAlbums();
  } catch (err) {
    console.error('[HRC Admin] Save album error:', err);
    showToast('Failed to save album: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Album';
    }
  }
}

/**
 * Delete an album and all of its images with confirmation
 */
async function deleteAlbum(id) {
  const album = allAlbums.find(a => a.id === id);
  const title = album ? album.title : 'this album';

  if (!confirm(`Are you sure you want to permanently delete "${title}" and all attached photographs?\n\nThis action cannot be undone.`)) {
    return;
  }

  const sb = getSupabase();
  if (!sb) {
    allAlbums = allAlbums.filter(a => a.id !== id);
    updateMetrics();
    populateYearFilter();
    applyAlbumFilters();
    showToast('Demo Mode: Album deleted.');
    return;
  }

  try {
    const { error } = await sb.from('gallery_albums').delete().eq('id', id);
    if (error) throw error;

    showToast('Album deleted successfully.');
    await loadAlbums();
  } catch (err) {
    console.error('[HRC Admin] Delete album error:', err);
    showToast('Failed to delete album: ' + err.message, 'error');
  }
}

/* ==========================================================================
   PHOTO MANAGER & MULTIPLE UPLOAD MODULE
   ========================================================================== */

/**
 * Open dedicated Photograph Manager modal for a specific album
 */
async function openPhotoManager(albumId) {
  currentAlbumId = albumId;
  const album = allAlbums.find(a => a.id === albumId);
  if (!album) return;

  document.getElementById('photo-modal-album-title').textContent = `Manage Photographs: ${album.title}`;
  document.getElementById('photo-modal-subtitle').textContent = `${album.year} · ${album.category || 'Institutional Events'}`;
  document.getElementById('batch-upload-status').textContent = '';
  document.getElementById('add-by-url-box').style.display = 'none';

  currentAlbumPhotos = (album.gallery_images || []).map((img, idx) => ({
    ...img,
    sort_order: img.sort_order !== undefined ? img.sort_order : idx
  }));

  renderAlbumPhotosList();
  document.getElementById('photo-manager-modal').classList.add('is-active');
}

function closePhotoManagerModal() {
  document.getElementById('photo-manager-modal').classList.remove('is-active');
  currentAlbumId = null;
  currentAlbumPhotos = [];
  loadAlbums(); // Refresh main table with new photo counts & covers
}

/**
 * Render photographs attached to the open album
 */
function renderAlbumPhotosList() {
  const container = document.getElementById('album-photos-list');
  const countEl = document.getElementById('album-photos-count');
  if (!container) return;

  const album = allAlbums.find(a => a.id === currentAlbumId);
  const coverUrl = album ? album.cover_image_url : '';

  if (countEl) countEl.textContent = currentAlbumPhotos.length;

  if (!currentAlbumPhotos.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; background: #FFFFFF; border: 1px dashed var(--admin-border); border-radius: 6px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 42px; height: 42px; stroke: var(--admin-text-muted); margin-bottom: 0.5rem;">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <div style="font-weight: 600; color: var(--admin-sidebar);">No photographs attached yet</div>
        <div style="font-size: 0.78rem; color: var(--admin-text-muted); margin-top: 0.2rem;">Use the upload box above to add high-resolution photographs to this album.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = currentAlbumPhotos.map((photo, index) => {
    const isCover = coverUrl && photo.image_url === coverUrl;
    const isPortrait = photo.orientation === 'portrait';

    return `
      <div class="photo-manager-card ${isCover ? 'is-cover' : ''}" id="photo-card-${index}">
        <div class="photo-manager-thumb-wrap ${isPortrait ? 'is-portrait' : ''}">
          <img src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.alt_text || photo.caption || 'Archival photograph')}" loading="lazy" onload="detectIntrinsicOrientation(this, '${index}')">
          ${isCover ? '<span class="photo-manager-badge-cover">★ Cover</span>' : ''}
          <span class="photo-manager-badge-ratio" id="ratio-badge-${index}">${photo.orientation === 'portrait' ? '9:16 Portrait' : '16:9 Landscape'}</span>
        </div>

        <div class="photo-manager-details">
          <div>
            <label class="admin-form-label" style="font-size: 0.7rem;">Caption / Title</label>
            <input type="text" class="admin-form-control photo-caption-input" data-index="${index}" value="${escapeHtml(photo.caption || '')}" placeholder="Add caption...">
          </div>
          <div>
            <label class="admin-form-label" style="font-size: 0.7rem;">Alt Text (Accessibility)</label>
            <input type="text" class="admin-form-control photo-alt-input" data-index="${index}" value="${escapeHtml(photo.alt_text || photo.caption || '')}" placeholder="Descriptive alt text...">
          </div>
        </div>

        <div class="photo-manager-actions">
          <div class="photo-reorder-btns">
            <button type="button" class="admin-btn admin-btn-sm admin-btn-outline" onclick="movePhoto(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move Earlier">▲</button>
            <button type="button" class="admin-btn admin-btn-sm admin-btn-outline" onclick="movePhoto(${index}, 1)" ${index === currentAlbumPhotos.length - 1 ? 'disabled' : ''} title="Move Later">▼</button>
          </div>

          <div style="display: flex; gap: 0.35rem;">
            <button type="button" class="admin-btn admin-btn-sm ${isCover ? 'admin-btn-gold' : 'admin-btn-outline'}" onclick="setPhotoAsCover('${photo.image_url}')" title="Set as Album Cover">
              ${isCover ? 'Cover' : '★ Set Cover'}
            </button>
            <button type="button" class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteSinglePhoto(${index})" title="Delete Image">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Automatically inspect loaded image dimensions to tag orientation
 */
function detectIntrinsicOrientation(imgEl, index) {
  if (!imgEl) return;
  const nw = imgEl.naturalWidth || 1;
  const nh = imgEl.naturalHeight || 1;
  const badge = document.getElementById(`ratio-badge-${index}`);
  const card = document.getElementById(`photo-card-${index}`);
  const wrap = card ? card.querySelector('.photo-manager-thumb-wrap') : null;

  if (nh > nw * 1.15) {
    if (badge) badge.textContent = '9:16 Portrait';
    if (wrap) wrap.classList.add('is-portrait');
    if (currentAlbumPhotos[index]) currentAlbumPhotos[index].orientation = 'portrait';
  } else {
    if (badge) badge.textContent = '16:9 Landscape';
    if (wrap) wrap.classList.remove('is-portrait');
    if (currentAlbumPhotos[index]) currentAlbumPhotos[index].orientation = 'landscape';
  }
}

/**
 * Handle Multiple Photo Upload (Batch)
 */
async function handleBatchPhotoUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length || !currentAlbumId) return;

  const statusEl = document.getElementById('batch-upload-status');
  const album = allAlbums.find(a => a.id === currentAlbumId);
  const sb = getSupabase();

  let uploadedCount = 0;
  if (statusEl) statusEl.textContent = `Preparing to upload ${files.length} photograph(s)...`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (statusEl) statusEl.textContent = `Uploading photo ${i + 1} of ${files.length}: ${file.name}...`;

    try {
      let imageUrl = '';
      if (sb) {
        imageUrl = await uploadToStorage(HRC_CONFIG.STORAGE_BUCKETS.PUBLIC_ASSETS, 'gallery', file);
      } else {
        imageUrl = URL.createObjectURL(file);
      }

      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const newOrder = currentAlbumPhotos.length;

      const newPhoto = {
        album_id: currentAlbumId,
        image_url: imageUrl,
        caption: cleanName,
        alt_text: cleanName,
        sort_order: newOrder
      };

      if (sb) {
        // Attempt insert with orientation; if column does not exist yet, fallback to clean insert
        let insertRes = await sb.from('gallery_images').insert([{ ...newPhoto, orientation }]).select();
        if (insertRes.error && (insertRes.error.code === 'PGRST204' || String(insertRes.error.message).includes('orientation'))) {
          insertRes = await sb.from('gallery_images').insert([newPhoto]).select();
        }
        if (insertRes.error) throw insertRes.error;
        if (insertRes.data && insertRes.data[0]) newPhoto.id = insertRes.data[0].id;
      } else {
        newPhoto.id = 'img-' + Date.now() + '-' + i;
      }

      currentAlbumPhotos.push(newPhoto);
      uploadedCount++;

      // If album had no cover image, auto-set first uploaded image as cover
      if (album && !album.cover_image_url && uploadedCount === 1) {
        album.cover_image_url = imageUrl;
        if (sb) {
          await sb.from('gallery_albums').update({ cover_image_url: imageUrl }).eq('id', currentAlbumId);
        }
      }
    } catch (err) {
      console.error(`[HRC Admin] Failed to upload ${file.name}:`, err);
      showToast(`Notice on ${file.name}: ${err.message}`, 'error');
    }
  }

  // Clear input
  event.target.value = '';

  if (album) {
    album.gallery_images = [...currentAlbumPhotos];
  }

  renderAlbumPhotosList();
  if (statusEl) statusEl.textContent = `✓ Successfully uploaded ${uploadedCount} photograph(s).`;
  showToast(`Uploaded ${uploadedCount} photograph(s) to album.`);
}

function toggleAddByUrlBox() {
  const box = document.getElementById('add-by-url-box');
  if (box) {
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Add photo via external or existing image URL
 */
async function addPhotoByUrl() {
  const urlInput = document.getElementById('url-photo-input');
  const captionInput = document.getElementById('url-caption-input');
  const url = (urlInput?.value || '').trim();
  const caption = (captionInput?.value || '').trim() || 'Archival photograph';

  if (!url || !currentAlbumId) {
    showToast('Please provide an image URL.', 'error');
    return;
  }

  const sb = getSupabase();
  const newOrder = currentAlbumPhotos.length;
  const newPhoto = {
    album_id: currentAlbumId,
    image_url: url,
    caption,
    alt_text: caption,
    sort_order: newOrder
  };

  try {
    if (sb) {
      const { data, error } = await sb.from('gallery_images').insert([newPhoto]).select();
      if (error) throw error;
      if (data && data[0]) newPhoto.id = data[0].id;
    } else {
      newPhoto.id = 'img-' + Date.now();
    }

    currentAlbumPhotos.push(newPhoto);
    const album = allAlbums.find(a => a.id === currentAlbumId);
    if (album) album.gallery_images = [...currentAlbumPhotos];

    urlInput.value = '';
    captionInput.value = '';
    document.getElementById('add-by-url-box').style.display = 'none';

    renderAlbumPhotosList();
    showToast('Photograph added by URL.');
  } catch (err) {
    console.error('[HRC Admin] Add photo error:', err);
    showToast('Failed to attach image: ' + err.message, 'error');
  }
}

/**
 * Reorder photograph within album
 */
async function movePhoto(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= currentAlbumPhotos.length) return;

  // Swap in array
  const temp = currentAlbumPhotos[index];
  currentAlbumPhotos[index] = currentAlbumPhotos[targetIndex];
  currentAlbumPhotos[targetIndex] = temp;

  // Update sort_order properties
  currentAlbumPhotos.forEach((p, idx) => {
    p.sort_order = idx;
  });

  renderAlbumPhotosList();

  // Persist to database
  const sb = getSupabase();
  if (sb) {
    try {
      const p1 = currentAlbumPhotos[index];
      const p2 = currentAlbumPhotos[targetIndex];
      if (p1.id) await sb.from('gallery_images').update({ sort_order: p1.sort_order }).eq('id', p1.id);
      if (p2.id) await sb.from('gallery_images').update({ sort_order: p2.sort_order }).eq('id', p2.id);
    } catch (err) {
      console.warn('[HRC Admin] Reorder sync notice:', err);
    }
  }
}

/**
 * Set selected photograph as Album Cover Image
 */
async function setPhotoAsCover(imageUrl) {
  if (!currentAlbumId) return;
  const album = allAlbums.find(a => a.id === currentAlbumId);
  if (!album) return;

  album.cover_image_url = imageUrl;

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('gallery_albums').update({ cover_image_url: imageUrl }).eq('id', currentAlbumId);
      if (error) throw error;
      showToast('Cover image updated.');
    } catch (err) {
      console.error('[HRC Admin] Cover update error:', err);
      showToast('Failed to update cover image: ' + err.message, 'error');
    }
  } else {
    showToast('Demo Mode: Cover image updated.');
  }

  renderAlbumPhotosList();
}

/**
 * Delete a single photograph from album
 */
async function deleteSinglePhoto(index) {
  const photo = currentAlbumPhotos[index];
  if (!confirm(`Delete photograph "${photo.caption || 'Archival image'}"?`)) return;

  const sb = getSupabase();
  if (sb && photo.id) {
    try {
      const { error } = await sb.from('gallery_images').delete().eq('id', photo.id);
      if (error) throw error;
    } catch (err) {
      console.error('[HRC Admin] Delete photo error:', err);
      showToast('Failed to delete photograph: ' + err.message, 'error');
      return;
    }
  }

  currentAlbumPhotos.splice(index, 1);
  const album = allAlbums.find(a => a.id === currentAlbumId);
  if (album) album.gallery_images = [...currentAlbumPhotos];

  renderAlbumPhotosList();
  showToast('Photograph deleted.');
}

/**
 * Save all captions and alt text edits made in photo manager
 */
async function saveAllPhotoDetails() {
  const captionInputs = document.querySelectorAll('.photo-caption-input');
  const altInputs = document.querySelectorAll('.photo-alt-input');
  const sb = getSupabase();

  captionInputs.forEach(input => {
    const idx = parseInt(input.dataset.index);
    if (currentAlbumPhotos[idx]) {
      currentAlbumPhotos[idx].caption = input.value.trim();
    }
  });

  altInputs.forEach(input => {
    const idx = parseInt(input.dataset.index);
    if (currentAlbumPhotos[idx]) {
      currentAlbumPhotos[idx].alt_text = input.value.trim();
    }
  });

  if (sb) {
    try {
      showToast('Saving photograph captions and metadata...');
      for (const p of currentAlbumPhotos) {
        if (p.id) {
          await sb.from('gallery_images').update({
            caption: p.caption,
            alt_text: p.alt_text,
            sort_order: p.sort_order
          }).eq('id', p.id);
        }
      }
      showToast('All photograph details saved successfully.');
    } catch (err) {
      console.error('[HRC Admin] Save captions error:', err);
      showToast('Failed to save all photo details: ' + err.message, 'error');
    }
  } else {
    showToast('Demo Mode: Photograph details saved.');
  }

  closePhotoManagerModal();
}

/* ==========================================================================
   LIVE PUBLIC ALBUM PREVIEW MODULE
   ========================================================================== */

function previewCurrentAlbumFromModal() {
  const title = document.getElementById('album-title').value.trim() || 'Untitled Album';
  const year = parseInt(document.getElementById('album-year').value) || 2026;
  const category = document.getElementById('album-category').value;
  const event_date = document.getElementById('album-date').value;
  const description = document.getElementById('album-desc').value.trim();
  const cover_image_url = document.getElementById('album-cover-url').value.trim();

  const previewAlbumObj = {
    title,
    year,
    category,
    event_date,
    cleanDescription: description,
    cover_image_url,
    gallery_images: editingAlbumId ? (allAlbums.find(a => a.id === editingAlbumId)?.gallery_images || []) : []
  };

  renderPreviewModal(previewAlbumObj);
}

function previewCurrentAlbumFromManager() {
  const album = allAlbums.find(a => a.id === currentAlbumId);
  if (!album) return;
  const previewObj = {
    ...album,
    gallery_images: currentAlbumPhotos
  };
  renderPreviewModal(previewObj);
}

function previewAlbum(albumId) {
  const album = allAlbums.find(a => a.id === albumId);
  if (!album) return;
  renderPreviewModal(album);
}

function renderPreviewModal(album) {
  const titleEl = document.getElementById('preview-album-title');
  const contentBox = document.getElementById('preview-content-box');
  if (!titleEl || !contentBox) return;

  titleEl.textContent = album.title;

  const dateFormatted = album.event_date ? new Date(album.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const images = album.gallery_images || [];

  contentBox.innerHTML = `
    <div class="gallery-album-card" style="margin: 0; box-shadow: none; border: 1px solid var(--admin-border);">
      <div class="gallery-album-header">
        <div class="gallery-album-title-group">
          <h3>${escapeHtml(album.title)}</h3>
          <div class="gallery-album-badges" style="margin-top: 0.4rem;">
            <span class="category-pill category-pill-gold">${escapeHtml(album.category || 'Institutional Events')}</span>
            <span class="category-pill">${album.year} SESSION</span>
            ${dateFormatted ? `<span class="date-pill">📅 ${dateFormatted}</span>` : ''}
            <span style="font-size: 0.74rem; color: var(--admin-text-muted);">· ${images.length} photograph${images.length === 1 ? '' : 's'}</span>
          </div>
          ${album.cleanDescription ? `<p class="gallery-album-desc">${escapeHtml(album.cleanDescription)}</p>` : ''}
        </div>
      </div>

      ${images.length ? `
        <div class="gallery-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));">
          ${images.map(img => {
            const isPortrait = img.orientation === 'portrait';
            return `
              <div class="gallery-item" style="cursor: default;">
                <div class="gallery-thumb-container ${isPortrait ? 'is-portrait' : 'is-landscape'}">
                  <img src="${escapeHtml(img.image_url)}" alt="${escapeHtml(img.alt_text || img.caption || 'Archival image')}">
                  <span class="thumb-orientation-badge">${isPortrait ? '9:16 Portrait' : '16:9 Landscape'}</span>
                </div>
                <div class="gallery-caption-bar">
                  <div class="gallery-item-title">${escapeHtml(img.caption || album.title)}</div>
                  <div class="gallery-item-meta">
                    <span class="gallery-item-year">${album.year} ARCHIVE</span>
                    <span class="gallery-item-category">${escapeHtml(album.category || 'Event')}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div style="text-align: center; padding: 3rem; color: var(--admin-text-muted); background: #FFF; border: 1px dashed var(--admin-border); border-radius: 8px;">
          ${album.cover_image_url ? `
            <div style="max-width: 480px; margin: 0 auto;">
              <div style="aspect-ratio: 16/9; overflow: hidden; border-radius: 6px; margin-bottom: 0.8rem;">
                <img src="${escapeHtml(album.cover_image_url)}" alt="Cover" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
              <div style="font-size: 0.85rem; font-weight: 600;">Cover Image Configured</div>
            </div>
          ` : `
            <div>No photographs attached yet. Upload photos in the Photograph Manager.</div>
          `}
        </div>
      `}
    </div>
  `;

  document.getElementById('preview-modal').classList.add('is-active');
}

function closePreviewModal() {
  document.getElementById('preview-modal').classList.remove('is-active');
}
