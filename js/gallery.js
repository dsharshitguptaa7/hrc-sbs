/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Public Archival Gallery & Posters - Supabase Dynamic Integration
 * 
 * Supports dynamic rendering of year-wise albums and archival posters
 * directly from Supabase Storage & Database with lightbox support.
 */

let publicAlbums = [];
let publicPosters = [];

async function loadPublicGalleryData() {
  const albumsContainer = document.getElementById('public-albums-container');
  const postersContainer = document.getElementById('public-posters-container');

  const sb = getSupabase();
  if (!sb) {
    // Verified local fallback records already present in static layout
    return;
  }

  try {
    // 1. Fetch Albums & Images
    const { data: albums } = await sb
      .from('gallery_albums')
      .select('*, gallery_images(*)')
      .eq('published', true)
      .order('year', { ascending: false });

    if (albums && albums.length && albumsContainer) {
      publicAlbums = albums;
      renderPublicAlbums(albums, albumsContainer);
    }

    // 2. Fetch Posters (Grouped by Year)
    const { data: posters } = await sb
      .from('posters')
      .select('*')
      .eq('published', true)
      .order('year', { ascending: false });

    if (posters && posters.length && postersContainer) {
      publicPosters = posters;
      renderPublicPosters(posters, postersContainer);
    }
  } catch (err) {
    console.warn('[HRC Gallery] Notice loading dynamic gallery:', err);
  }
}

function renderPublicAlbums(albums, container) {
  let html = '';
  albums.forEach(alb => {
    if (!alb.gallery_images || !alb.gallery_images.length) return;

    html += `
      <div style="margin-bottom: 3.5rem;">
        <div style="display: flex; align-items: baseline; gap: 1rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.6rem; margin-bottom: 1.5rem;">
          <h3 style="margin: 0; font-size: 1.5rem;">${escapeHtml(alb.title)}</h3>
          <span style="font-size: 0.82rem; font-weight: 700; color: var(--gold); letter-spacing: 0.1em;">${alb.year} EDITION</span>
        </div>
        <div class="gallery-grid">
          ${alb.gallery_images.map(img => `
            <div class="gallery-item" onclick="openLightboxFromData('${escapeHtml(img.caption || alb.title)}', '${alb.year} Archival Photographic Record')" data-reveal>
              <div class="gallery-thumb-container">
                <img src="${escapeHtml(img.image_url)}" alt="${escapeHtml(img.caption || 'Archival photograph')}" loading="lazy" onerror="this.src='assets/gallery/gallery-placeholder.png'">
              </div>
              <div class="gallery-caption-bar">
                <div class="gallery-item-title">${escapeHtml(img.caption || alb.title)}</div>
                <div class="gallery-item-year">${alb.year} Archive</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  if (html) container.innerHTML = html;
}

function renderPublicPosters(posters, container) {
  // Group by year
  const grouped = {};
  posters.forEach(p => {
    if (!grouped[p.year]) grouped[p.year] = [];
    grouped[p.year].push(p);
  });

  const sortedYears = Object.keys(grouped).sort((a, b) => b - a);

  let html = '';
  sortedYears.forEach(year => {
    html += `
      <div style="margin-bottom: 3rem;">
        <div class="chapter-badge">${year} POSTER ARCHIVE</div>
        <div class="gallery-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
          ${grouped[year].map(p => `
            <div class="gallery-item" onclick="openLightboxFromData('${escapeHtml(p.title)}', '${p.year} Official Colloquium Poster')">
              <div class="gallery-thumb-container" style="aspect-ratio: 3/4;">
                <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='assets/posters/poster-placeholder.png'">
              </div>
              <div class="gallery-caption-bar">
                <div class="gallery-item-title">${escapeHtml(p.title)}</div>
                <div class="gallery-item-year">${escapeHtml(p.category || 'Official Poster')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  if (html) container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  loadPublicGalleryData();
});
