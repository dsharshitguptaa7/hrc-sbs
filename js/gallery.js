/**
 * HARISH-CHANDRA RESEARCH CENTRE (HRC-SBS)
 * Public Archival Gallery & Poster Archive - Dynamic Supabase Integration
 * 
 * Features:
 * - Dynamic year-wise grouping derived from published database records
 * - Dynamic year filter tabs & category pills (no hardcoded years)
 * - Automatic image container sizing: 16:9 for landscape, 9:16 for portrait
 * - Object-fit: contain for posters & archival documents to preserve full readability
 * - Object-fit: cover for photographic thumbnails with zero distortion
 * - Full interactive Lightbox with Next / Previous navigation & keyboard controls
 * - Backward compatibility for openLightboxFromData()
 */

let publicAlbums = [];
let publicPosters = [];
let activeYearFilter = 'all';
let activeCategoryFilter = 'all';
let activeSearchQuery = '';

// Lightbox State
let currentLightboxItems = [];
let currentLightboxIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  loadPublicGalleryData();
  setupLightboxKeyboardListeners();
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
 * Main Loader: Fetches published Albums & Posters from Supabase
 */
async function loadPublicGalleryData() {
  const albumsContainer = document.getElementById('public-albums-container');
  const postersContainer = document.getElementById('public-posters-container');

  const sb = getSupabase();

  if (!sb) {
    // Elegant local fallback data when operating in offline/demo mode
    publicAlbums = [
      {
        id: 'fallback-2026',
        title: 'Harish-Chandra Centenary Commemoration Assembly',
        year: 2026,
        category: 'Birth Anniversary Celebration',
        event_date: '2026-10-11',
        cleanDescription: 'Official centenary tribute assembly celebrating Harish-Chandra’s foundational contributions to representation theory and harmonic analysis.',
        gallery_images: [
          {
            id: 'fb-img-1',
            image_url: 'assets/images/harish-chandra.webp',
            caption: 'Prof. Harish-Chandra Archival Portrait',
            alt_text: 'Prof. Harish-Chandra',
            sort_order: 0,
            orientation: 'portrait'
          },
          {
            id: 'fb-img-2',
            image_url: 'assets/images/Manindar_agarwal.jpg',
            caption: 'Keynote Address on Scientific Rigour by Prof. Manindra Agrawal',
            alt_text: 'Prof. Manindra Agrawal delivering keynote',
            sort_order: 1,
            orientation: 'landscape'
          },
          {
            id: 'fb-img-3',
            image_url: 'assets/images/pathak.jpg',
            caption: 'Prof. Vinay Kumar Pathak presenting Institutional Vision',
            alt_text: 'Vice Chancellor Address',
            sort_order: 2,
            orientation: 'landscape'
          }
        ]
      },
      {
        id: 'fallback-2025',
        title: 'Second Annual Harish-Chandra Memorial Colloquium',
        year: 2025,
        category: 'Annual Memorial Lecture',
        event_date: '2025-10-11',
        cleanDescription: 'Scholars and visiting mathematicians discussing semi-simple Lie algebras and automorphic forms.',
        gallery_images: [
          {
            id: 'fb-img-4',
            image_url: 'assets/images/CS_Aravinda.jpg',
            caption: 'Memorial Colloquium Mathematical Deliberation',
            alt_text: 'Colloquium speaker',
            sort_order: 0,
            orientation: 'landscape'
          },
          {
            id: 'fb-img-5',
            image_url: 'assets/images/kalyan.jpg',
            caption: 'Distinguished Speaker Session on Lie Theory',
            alt_text: 'Research Deliberation',
            sort_order: 1,
            orientation: 'landscape'
          }
        ]
      },
      {
        id: 'fallback-2024',
        title: 'Foundation & Inaugural Ceremony of the Research Centre',
        year: 2024,
        category: 'Inauguration',
        event_date: '2024-10-11',
        cleanDescription: 'Formal inauguration of the Harish-Chandra Research Centre at School of Basic Sciences, CSJMU Kanpur in academic collaboration with IIT Kanpur.',
        gallery_images: [
          {
            id: 'fb-img-6',
            image_url: 'assets/images/trivedi.jpg',
            caption: 'Inaugural Address on Mathematical Heritage',
            alt_text: 'Inaugural Session',
            sort_order: 0,
            orientation: 'landscape'
          },
          {
            id: 'fb-img-7',
            image_url: 'assets/images/dwivedi.jpg',
            caption: 'Founding Assembly of the School of Basic Sciences',
            alt_text: 'School Seminar Hall',
            sort_order: 1,
            orientation: 'landscape'
          }
        ]
      }
    ];

    publicPosters = [
      {
        id: 'fb-poster-2026',
        title: 'National Workshop on Harish-Chandra\'s Legacy: Mathematics & Physics',
        year: 2026,
        category: 'Workshops & Conferences',
        description: 'Official commemorative centennial poster designed for the Harish-Chandra centenary conference.',
        image_url: 'https://lnppuwifovpxwqcispry.supabase.co/storage/v1/object/public/public-assets/posters/1791565328845_1000131797.png'
      }
    ];

    buildDynamicYearTabs();
    renderGallery();
    return;
  }

  try {
    // 1. Fetch published Albums with attached Images
    const { data: albumsData, error: albumErr } = await sb
      .from('gallery_albums')
      .select('*, gallery_images(*)')
      .eq('published', true)
      .order('year', { ascending: false });

    if (albumErr) throw albumErr;

    publicAlbums = (albumsData || []).map(a => {
      const meta = extractAlbumMetadata(a);
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

    // Sort albums newest year first, then display_order
    publicAlbums.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (a.display_order || 0) - (b.display_order || 0);
    });

    // 2. Fetch published Posters
    const { data: postersData, error: posterErr } = await sb
      .from('posters')
      .select('*')
      .eq('published', true)
      .order('year', { ascending: false });

    if (posterErr) throw posterErr;

    publicPosters = postersData || [];

    buildDynamicYearTabs();
    renderGallery();
  } catch (err) {
    console.warn('[HRC Gallery] Notice loading dynamic gallery:', err);
    if (albumsContainer) {
      albumsContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--slate);">
          <p>Unable to connect to live archive at this moment. Please refresh the page.</p>
        </div>
      `;
    }
  }
}

/**
 * Dynamically extract available years from actual published records
 * and render Year Navigation Tabs. Never hardcodes years!
 */
function buildDynamicYearTabs() {
  const tabsContainer = document.getElementById('gallery-year-tabs');
  if (!tabsContainer) return;

  const yearsSet = new Set();
  publicAlbums.forEach(a => { if (a.year) yearsSet.add(a.year); });
  publicPosters.forEach(p => { if (p.year) yearsSet.add(p.year); });

  const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

  let html = `<button class="filter-btn ${activeYearFilter === 'all' ? 'active' : ''}" data-year="all" onclick="filterGalleryByYear('all')">All Years</button>`;

  sortedYears.forEach(year => {
    html += `<button class="filter-btn ${activeYearFilter === String(year) ? 'active' : ''}" data-year="${year}" onclick="filterGalleryByYear('${year}')">${year}</button>`;
  });

  tabsContainer.innerHTML = html;
}

/**
 * Year tab click handler
 */
function filterGalleryByYear(year) {
  activeYearFilter = String(year);

  // Update tabs active styling
  const buttons = document.querySelectorAll('#gallery-year-tabs .filter-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.year === String(year));
  });

  renderGallery();
}

/**
 * Category pill click handler
 */
function filterGalleryByCategory(category) {
  activeCategoryFilter = category;

  // Update category buttons active styling
  const buttons = document.querySelectorAll('#gallery-category-tabs .filter-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });

  renderGallery();
}

/**
 * Real-time keyword search handler
 */
function handleGallerySearch(query) {
  activeSearchQuery = (query || '').toLowerCase().trim();
  renderGallery();
}

/**
 * Main Renderer: Renders both Institutional Gallery and Posters Archive
 */
function renderGallery() {
  renderInstitutionalAlbums();
  renderPosterArchive();
}

/**
 * Render Content Area 1: Institutional & Archival Gallery
 * Grouped year-wise, sorted newest to oldest.
 */
function renderInstitutionalAlbums() {
  const container = document.getElementById('public-albums-container');
  if (!container) return;

  // Filter albums according to active criteria
  const filtered = publicAlbums.filter(album => {
    if (activeYearFilter !== 'all' && String(album.year) !== activeYearFilter) {
      return false;
    }

    if (activeCategoryFilter !== 'all' && album.category !== activeCategoryFilter) {
      return false;
    }

    if (activeSearchQuery) {
      const matchTitle = (album.title || '').toLowerCase().includes(activeSearchQuery);
      const matchDesc = (album.cleanDescription || album.description || '').toLowerCase().includes(activeSearchQuery);
      const matchCat = (album.category || '').toLowerCase().includes(activeSearchQuery);
      const matchImages = (album.gallery_images || []).some(img =>
        (img.caption || '').toLowerCase().includes(activeSearchQuery) ||
        (img.alt_text || '').toLowerCase().includes(activeSearchQuery)
      );
      if (!matchTitle && !matchDesc && !matchCat && !matchImages) return false;
    }

    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem; background: var(--warm-white); border: 1px solid var(--border-light); border-radius: var(--radius-card);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px; stroke: var(--gold); margin-bottom: 0.8rem;">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <h3 style="font-size: 1.25rem; color: var(--navy); margin-bottom: 0.4rem;">No Archival Records Found</h3>
        <p style="color: var(--slate); font-size: 0.95rem; max-width: 500px; margin: 0 auto;">
          No institutional photo albums match the selected filter criteria. Select "All Years" or reset categories to view the repository.
        </p>
      </div>
    `;
    return;
  }

  // Group filtered albums by Year
  const groupedByYear = {};
  filtered.forEach(a => {
    if (!groupedByYear[a.year]) groupedByYear[a.year] = [];
    groupedByYear[a.year].push(a);
  });

  const sortedYears = Object.keys(groupedByYear).sort((a, b) => b - a);

  let html = '';

  sortedYears.forEach(year => {
    const yearAlbums = groupedByYear[year];

    html += `
      <div class="gallery-year-section">
        <div class="gallery-year-header">
          <div class="gallery-year-title">
            <h2>${year}</h2>
            <span class="gallery-year-badge">ANNUAL RECORDS</span>
          </div>
          <span class="gallery-year-count">${yearAlbums.length} Collection${yearAlbums.length === 1 ? '' : 's'}</span>
        </div>

        ${yearAlbums.map(album => {
          const images = album.gallery_images || [];
          const dateFormatted = album.event_date ? new Date(album.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
          const albumKey = `album_${album.id}`;

          return `
            <div class="gallery-album-card" id="${albumKey}">
              <div class="gallery-album-header">
                <div class="gallery-album-title-group">
                  <h3>${escapeHtml(album.title)}</h3>
                  <div class="gallery-album-badges" style="margin-top: 0.45rem;">
                    <span class="category-pill category-pill-gold">${escapeHtml(album.category || 'Institutional Events')}</span>
                    <span class="category-pill">${album.year} SESSION</span>
                    ${dateFormatted ? `<span class="date-pill">📅 ${dateFormatted}</span>` : ''}
                    <span style="font-size: 0.74rem; color: var(--slate); font-weight: 500;">· ${images.length} photograph${images.length === 1 ? '' : 's'}</span>
                  </div>
                  ${album.cleanDescription ? `
                    <p class="gallery-album-desc">${escapeHtml(album.cleanDescription)}</p>
                  ` : ''}
                </div>
              </div>

              ${images.length ? `
                <div class="gallery-grid">
                  ${images.map((img, imgIdx) => {
                    const isPortrait = img.orientation === 'portrait';
                    const caption = img.caption || album.title;
                    const altText = img.alt_text || caption;

                    return `
                      <div class="gallery-item" onclick="openAlbumLightbox('${album.id}', ${imgIdx})">
                        <!-- Container: 16:9 Landscape or 9:16 Portrait -->
                        <div class="gallery-thumb-container ${isPortrait ? 'is-portrait' : 'is-landscape'}">
                          <img src="${escapeHtml(img.image_url)}" 
                               alt="${escapeHtml(altText)}" 
                               onload="handleImageOrientation(this)"
                               onerror="handleImageError(this, 'gallery')">
                          <span class="thumb-orientation-badge">${isPortrait ? '9:16 Portrait' : '16:9 Landscape'}</span>
                        </div>
                        <div class="gallery-caption-bar">
                          <div class="gallery-item-title">${escapeHtml(caption)}</div>
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
                <!-- Album with cover only or awaiting photograph uploads -->
                ${album.cover_image_url ? `
                  <div style="max-width: 480px;">
                    <div class="gallery-item" onclick="openLightboxFromData('${escapeHtml(album.title)}', '${album.year} Archival Album Cover')">
                      <div class="gallery-thumb-container is-landscape">
                        <img src="${escapeHtml(album.cover_image_url)}" 
                             alt="${escapeHtml(album.title)}"
                             onload="handleImageOrientation(this)"
                             onerror="handleImageError(this, 'gallery')">
                      </div>
                      <div class="gallery-caption-bar">
                        <div class="gallery-item-title">${escapeHtml(album.title)}</div>
                        <div class="gallery-item-meta">
                          <span class="gallery-item-year">${album.year} COVER</span>
                          <span class="gallery-item-category">${escapeHtml(album.category || 'Event')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ` : `
                  <div style="padding: 2rem; background: var(--ivory); border-radius: 6px; text-align: center; color: var(--slate); font-size: 0.88rem;">
                    Photographs from this institutional session are being digitized and catalogued.
                  </div>
                `}
              `}
            </div>
          `;
        }).join('')}
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Render Content Area 2: Year-Wise Poster Archive
 * Vertical posters presented in 9:16 portrait containers with object-fit: contain
 */
function renderPosterArchive() {
  const container = document.getElementById('public-posters-container');
  const section = document.getElementById('poster-archive-section');
  if (!container) return;

  // Filter posters
  const filtered = publicPosters.filter(poster => {
    if (activeYearFilter !== 'all' && String(poster.year) !== activeYearFilter) {
      return false;
    }

    if (activeCategoryFilter !== 'all' && poster.category !== activeCategoryFilter) {
      return false;
    }

    if (activeSearchQuery) {
      const matchTitle = (poster.title || '').toLowerCase().includes(activeSearchQuery);
      const matchDesc = (poster.description || '').toLowerCase().includes(activeSearchQuery);
      const matchCat = (poster.category || '').toLowerCase().includes(activeSearchQuery);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }

    return true;
  });

  if (!filtered.length) {
    if (activeYearFilter === 'all' && activeCategoryFilter === 'all' && !activeSearchQuery) {
      if (section) section.style.display = 'none';
    } else {
      if (section) section.style.display = 'block';
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; background: var(--warm-white); border: 1px solid var(--border-light); border-radius: var(--radius-card); color: var(--slate);">
          No archival posters found matching active filters.
        </div>
      `;
    }
    return;
  }

  if (section) section.style.display = 'block';

  // Group filtered posters by Year
  const groupedByYear = {};
  filtered.forEach(p => {
    if (!groupedByYear[p.year]) groupedByYear[p.year] = [];
    groupedByYear[p.year].push(p);
  });

  const sortedYears = Object.keys(groupedByYear).sort((a, b) => b - a);

  let html = '';

  sortedYears.forEach(year => {
    const yearPosters = groupedByYear[year];

    html += `
      <div style="margin-bottom: 3.5rem;">
        <div style="display: flex; align-items: baseline; gap: 0.8rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.6rem; margin-bottom: 1.8rem;">
          <h3 style="margin: 0; font-size: 1.4rem; color: var(--navy); font-family: var(--font-heading);">${year} Poster Collection</h3>
          <span style="font-size: 0.76rem; font-weight: 700; color: var(--gold); letter-spacing: 0.08em; text-transform: uppercase;">
            ${yearPosters.length} Poster${yearPosters.length === 1 ? '' : 's'}
          </span>
        </div>

        <div class="gallery-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
          ${yearPosters.map((poster, pIdx) => `
            <div class="gallery-item" onclick="openPosterLightbox('${year}', ${pIdx})">
              <!-- Container: 9:16 Portrait with object-fit: contain for complete visibility -->
              <div class="poster-thumb-container">
                <img src="${escapeHtml(poster.image_url)}" 
                     alt="${escapeHtml(poster.title)}" 
                     onload="handleImageOrientation(this)"
                     onerror="handleImageError(this, 'poster')">
                <span class="thumb-orientation-badge">Poster Archive</span>
              </div>
              <div class="gallery-caption-bar">
                <div class="gallery-item-title">${escapeHtml(poster.title)}</div>
                <div class="gallery-item-meta">
                  <span class="gallery-item-year">${poster.year} OFFICIAL POSTER</span>
                  <span class="gallery-item-category">${escapeHtml(poster.category || 'Colloquium')}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Automatic Image Orientation Detection
 * Detects whether image is landscape (16:9) or portrait (9:16)
 * and applies container class dynamically with zero distortion.
 */
function handleImageOrientation(imgEl) {
  if (!imgEl) return;
  const nw = imgEl.naturalWidth || 1;
  const nh = imgEl.naturalHeight || 1;
  const ratio = nw / nh;
  const container = imgEl.closest('.gallery-thumb-container') || imgEl.closest('.poster-thumb-container');
  if (!container) return;

  const badge = container.querySelector('.thumb-orientation-badge');

  if (container.classList.contains('poster-thumb-container')) {
    if (ratio >= 1.15) {
      container.classList.remove('is-portrait');
      container.classList.add('is-landscape');
      if (badge) badge.textContent = 'Poster (Landscape)';
    } else {
      container.classList.remove('is-landscape');
      container.classList.add('is-portrait');
      if (badge) badge.textContent = 'Poster (Portrait)';
    }
    return;
  }

  if (ratio <= 0.85) {
    // Portrait (9:16)
    container.classList.remove('is-landscape', 'is-square');
    container.classList.add('is-portrait');
    if (badge) badge.textContent = '9:16 Portrait';
  } else if (ratio >= 1.15) {
    // Landscape (16:9)
    container.classList.remove('is-portrait', 'is-square');
    container.classList.add('is-landscape');
    if (badge) badge.textContent = '16:9 Landscape';
  } else {
    // Square / classic
    container.classList.remove('is-portrait', 'is-landscape');
    container.classList.add('is-square');
    if (badge) badge.textContent = '1:1 Square';
  }
}

/**
 * Graceful image error handler
 * Prevents broken image icons or silent failures
 */
function handleImageError(imgEl, type) {
  if (!imgEl) return;
  imgEl.onerror = null; // Prevent loop
  console.warn(`[HRC Gallery] Image failed to load: ${imgEl.src}`);

  // Use clean inline SVG placeholder matching HRC institutional palette
  if (type === 'poster') {
    imgEl.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="711" viewBox="0 0 400 711"><rect width="100%" height="100%" fill="%2306111D"/><rect x="20" y="20" width="360" height="671" fill="none" stroke="%23C9A227" stroke-width="2" stroke-dasharray="6 6"/><text x="50%" y="46%" font-family="serif" font-size="20" fill="%23E8D7A8" text-anchor="middle">HARISH-CHANDRA</text><text x="50%" y="52%" font-family="sans-serif" font-size="14" fill="%23FFFFFF" text-anchor="middle" font-weight="600">ARCHIVAL POSTER</text><text x="50%" y="58%" font-family="sans-serif" font-size="11" fill="%2394A3B8" text-anchor="middle">RESEARCH CENTRE · CSJMU</text></svg>';
  } else {
    imgEl.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="100%" height="100%" fill="%23F7F4EC"/><rect x="15" y="15" width="610" height="330" fill="none" stroke="%23C9A227" stroke-width="1.5" stroke-dasharray="6 6"/><text x="50%" y="48%" font-family="serif" font-size="18" fill="%230B1F33" text-anchor="middle">ARCHIVAL PHOTOGRAPH</text><text x="50%" y="56%" font-family="sans-serif" font-size="12" fill="%2364748B" text-anchor="middle">Harish-Chandra Research Centre Archive</text></svg>';
  }
}

/* ==========================================================================
   INTERACTIVE LIGHTBOX MODULE (Keyboard & Nav Controls)
   ========================================================================== */

/**
 * Open Lightbox for an album's photographs
 */
function openAlbumLightbox(albumId, imageIndex) {
  const album = publicAlbums.find(a => a.id === albumId);
  if (!album || !album.gallery_images || !album.gallery_images.length) return;

  currentLightboxItems = album.gallery_images.map(img => ({
    image_url: img.image_url,
    title: img.caption || album.title,
    caption: `${album.year} ${album.category || 'Institutional Record'} · Harish-Chandra Research Centre`
  }));

  currentLightboxIndex = Math.max(0, Math.min(imageIndex, currentLightboxItems.length - 1));
  renderLightboxSlide();
}

/**
 * Open Lightbox for Posters collection
 */
function openPosterLightbox(year, posterIndex) {
  const yearPosters = publicPosters.filter(p => String(p.year) === String(year));
  if (!yearPosters.length) return;

  currentLightboxItems = yearPosters.map(p => ({
    image_url: p.image_url,
    title: p.title,
    caption: `${p.year} Official Poster · ${p.category || 'Colloquium'} · Harish-Chandra Centre`
  }));

  currentLightboxIndex = Math.max(0, Math.min(posterIndex, currentLightboxItems.length - 1));
  renderLightboxSlide();
}

/**
 * Render the current slide in Lightbox Modal
 */
function renderLightboxSlide() {
  const modal = document.getElementById('lightbox-modal');
  const imgEl = document.getElementById('lightbox-img');
  const titleEl = document.getElementById('lightbox-title');
  const captionEl = document.getElementById('lightbox-caption');
  const counterEl = document.getElementById('lightbox-counter');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');

  if (!modal || !currentLightboxItems.length) return;

  const current = currentLightboxItems[currentLightboxIndex];

  if (imgEl) {
    imgEl.src = current.image_url;
    imgEl.alt = current.title;
  }
  if (titleEl) titleEl.textContent = current.title;
  if (captionEl) captionEl.textContent = current.caption;
  if (counterEl) {
    counterEl.textContent = `${currentLightboxIndex + 1} of ${currentLightboxItems.length}`;
  }

  // Prev / Next button visibility
  if (currentLightboxItems.length > 1) {
    if (prevBtn) prevBtn.style.display = 'flex';
    if (nextBtn) nextBtn.style.display = 'flex';
  } else {
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
  }

  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function lightboxNext() {
  if (!currentLightboxItems.length) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxItems.length;
  renderLightboxSlide();
}

function lightboxPrev() {
  if (!currentLightboxItems.length) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxItems.length) % currentLightboxItems.length;
  renderLightboxSlide();
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
}

/**
 * Backward compatibility helper for existing legacy callers
 */
function openLightboxFromData(title, caption) {
  currentLightboxItems = [{
    image_url: 'assets/gallery/gallery-placeholder.png',
    title: title || 'Archival Photographic Record',
    caption: caption || 'Harish-Chandra Research Centre · CSJMU Kanpur'
  }];
  currentLightboxIndex = 0;
  renderLightboxSlide();
}

/**
 * Global Keyboard Listeners: Escape to close, Left / Right arrow keys to navigate
 */
function setupLightboxKeyboardListeners() {
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('lightbox-modal');
    if (!modal || !modal.classList.contains('is-open')) return;

    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      lightboxNext();
    } else if (e.key === 'ArrowLeft') {
      lightboxPrev();
    }
  });

  // Close when clicking outside content box
  const modal = document.getElementById('lightbox-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeLightbox();
      }
    });
  }
}

// Expose globals for onclick attributes
window.filterGalleryByYear = filterGalleryByYear;
window.filterGalleryByCategory = filterGalleryByCategory;
window.handleGallerySearch = handleGallerySearch;
window.openAlbumLightbox = openAlbumLightbox;
window.openPosterLightbox = openPosterLightbox;
window.openLightboxFromData = openLightboxFromData;
window.lightboxNext = lightboxNext;
window.lightboxPrev = lightboxPrev;
window.closeLightbox = closeLightbox;
window.handleImageOrientation = handleImageOrientation;
