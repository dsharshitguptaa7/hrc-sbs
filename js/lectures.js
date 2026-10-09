/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Public Lecture Archive - Supabase Dynamic Integration
 * 
 * Automatically loads lecture series, distinguished orators, and lectures
 * dynamically from Supabase database with seamless fallback to verified seed data.
 */

let lectureSeriesData = [];
let lectureFetchError = null;

// Safe HTML escaping helper
function escapeHtmlStr(str) {
  if (typeof escapeHtml === 'function') {
    return escapeHtml(str);
  }
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Verified baseline seeds
const fallbackLectureSeries = [
  {
    year: 2026,
    title: "Centenary & Digital Legacy Harish-Chandra Colloquium",
    theme: "One Century of Invariance",
    date: "October 11, 2026",
    venue: "CSJMU Kanpur & IIT Kanpur Joint Amphitheatre",
    description: "Centenary Edition. A global academic congress convening scholars, mathematicians, and students to commemorate the 100-year legacy of Harish-Chandra and celebrate the culmination of the 12 Digital Legacy tracks.",
    lectures: [
      {
        id: "fb-1",
        title: "One Century of Invariance: The Harish-Chandra Legacy in 21st Century Science",
        lectureDate: "October 11, 2026",
        venue: "Joint Amphitheatre, CSJMU × IITK",
        description: "Keynote address analyzing Harish-Chandra's transformative impact on harmonic analysis and representation theory.",
        speaker: {
          name: "Distinguished Centenary Keynote Orator",
          designation: "Centenary Orator",
          institution: "Institute for Advanced Study / International Mathematical Union",
          photo_url: ""
        }
      },
      {
        id: "fb-2",
        title: "Presentation of the 12 Student Digital Legacy Exhibitions & Archival Corpus",
        lectureDate: "October 11, 2026",
        venue: "Joint Amphitheatre, CSJMU × IITK",
        description: "Special symposium presentation unveiling student curatorial tracks, digital archives, and educational interactive tools.",
        speaker: {
          name: "Student Symposium Lead",
          designation: "Digital Legacy 2026 Track Convenor",
          institution: "School of Basic Sciences, CSJMU Kanpur",
          photo_url: ""
        }
      }
    ],
    gallery: [
      {
        title: "Centenary Programme Schedule & Exhibition",
        caption: "Official digital exhibition preview and proceedings."
      }
    ]
  },
  {
    year: 2025,
    title: "Second Annual Harish-Chandra Memorial Lecture",
    theme: "Representations of Reductive Groups",
    date: "October 11, 2025",
    venue: "School of Basic Sciences Seminar Hall, CSJMU",
    description: "Focused on representations of reductive Lie groups, algebraic structures, and mathematical physics. The colloquium highlighted student research initiatives, inter-institutional collaborations, and preliminary preparations for the 2026 Centenary & Digital Legacy initiatives.",
    lectures: [
      {
        id: "fb-3",
        title: "From Dirac's Quantum Mechanics to Harish-Chandra's Infinite-Dimensional Representations",
        lectureDate: "October 11, 2025",
        venue: "Seminar Hall, SBS, CSJMU",
        description: "An expository analysis of the transition from early theoretical physics formulations to Harish-Chandra's profound representation theory.",
        speaker: {
          name: "Invited Scholar in Pure Mathematics",
          designation: "Senior Fellow / Visiting Professor",
          institution: "Department of Mathematics, IIT Kanpur",
          photo_url: ""
        }
      },
      {
        id: "fb-4",
        title: "Symmetries, Invariant Differential Operators, and Contemporary Quantum Systems",
        lectureDate: "October 11, 2025",
        venue: "Seminar Hall, SBS, CSJMU",
        description: "Deliberations on invariant differential operators on semi-simple Lie algebras and their implications in modern physics.",
        speaker: {
          name: "Visiting Researcher in Theoretical Physics",
          designation: "School of Basic Sciences Guest Speaker",
          institution: "CSJMU Kanpur",
          photo_url: ""
        }
      }
    ],
    gallery: [
      {
        title: "Academic Colloquium 2025",
        caption: "Interactive lecture session with students and researchers."
      }
    ]
  },
  {
    year: 2024,
    title: "Inaugural Harish-Chandra Memorial Colloquium",
    theme: "Foundations of Invariant Harmonic Analysis",
    date: "October 11, 2024",
    venue: "Main Auditorium, CSJMU Kanpur (in collaboration with IIT Kanpur)",
    description: "The formal commencement of the Harish-Chandra Research Centre and the inaugural annual memorial lecture celebrating the legacy of Harish-Chandra. The gathering brought together foundational scholars in mathematics, representation theory, and theoretical physics to deliberate on the persistent impact of harmonic analysis on modern science.",
    lectures: [
      {
        id: "fb-5",
        title: "Computational Complexity, Primes, and the Spirit of Indian Mathematical Rigour",
        lectureDate: "October 11, 2024",
        venue: "Main Auditorium, CSJMU Kanpur",
        description: "Opening keynote exploring algorithmic depth, number-theoretic foundations, and the philosophical legacy of rigorous Indian mathematics.",
        speaker: {
          name: "Prof. Manindra Agrawal",
          designation: "Director & Professor of Computer Science",
          institution: "Indian Institute of Technology Kanpur (IITK)",
          photo_url: "assets/images/Manindar_agarwal.jpg"
        }
      },
      {
        id: "fb-6",
        title: "Building Centers of Scholarly Invariance: The Vision of Harish-Chandra Research Centre",
        lectureDate: "October 11, 2024",
        venue: "Main Auditorium, CSJMU Kanpur",
        description: "Inaugural address establishing the collaborative vision between CSJMU and IIT Kanpur for archival preservation and advanced mathematics research.",
        speaker: {
          name: "Prof. Vinay Kumar Pathak",
          designation: "Vice Chancellor",
          institution: "Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur",
          photo_url: "assets/images/pathak.jpg"
        }
      }
    ],
    gallery: [
      {
        title: "Inauguration Ceremony & Commemoration",
        caption: "Formal academic proceedings and lighting of the lamp at CSJMU Kanpur."
      },
      {
        title: "Colloquium Discussions & Deliberation",
        caption: "Faculty and scholars from IIT Kanpur and CSJMU participating in the scientific session."
      }
    ]
  }
];

async function fetchLectureSeriesFromDB() {
  const sb = getSupabase();
  if (!sb) {
    lectureSeriesData = fallbackLectureSeries;
    return;
  }

  try {
    lectureFetchError = null;
    const { data: seriesList, error } = await sb
      .from('lecture_series')
      .select(`
        id, year, title, description, theme, published,
        lectures (
          id, title, description, lecture_date, venue,
          lecture_speakers (
            speakers (id, name, designation, institution, photo_url)
          )
        )
      `)
      .eq('published', true)
      .order('year', { ascending: false });

    if (error) {
      console.error('[HRC] Dynamic lecture fetch error:', error);
      lectureFetchError = error;
      lectureSeriesData = fallbackLectureSeries;
      return;
    }

    if (!seriesList || !seriesList.length) {
      lectureSeriesData = [];
      return;
    }

    lectureSeriesData = seriesList.map(s => {
      // Map all associated lectures for this series
      const rawLectures = Array.isArray(s.lectures) ? s.lectures : [];

      // Sort lectures by date if available, otherwise by title
      const sortedLectures = [...rawLectures].sort((a, b) => {
        if (a.lecture_date && b.lecture_date) {
          return new Date(a.lecture_date) - new Date(b.lecture_date);
        }
        return (a.title || '').localeCompare(b.title || '');
      });

      const lectures = sortedLectures.map(l => {
        let primarySpeaker = null;
        if (Array.isArray(l.lecture_speakers) && l.lecture_speakers.length > 0) {
          primarySpeaker = l.lecture_speakers[0]?.speakers || null;
        }

        const formattedDate = l.lecture_date
          ? new Date(l.lecture_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : null;

        return {
          id: l.id,
          title: l.title || 'Untitled Lecture',
          description: l.description || '',
          lectureDate: formattedDate,
          venue: l.venue || '',
          speaker: primarySpeaker ? {
            name: primarySpeaker.name,
            designation: primarySpeaker.designation || 'Distinguished Scholar',
            institution: primarySpeaker.institution || 'CSJMU × IITK',
            photo_url: primarySpeaker.photo_url || ''
          } : null
        };
      });

      // Series-level date & venue (from first lecture if available, or defaults)
      const primaryDate = lectures[0]?.lectureDate || `October ${s.year}`;
      const primaryVenue = lectures[0]?.venue || "CSJMU Kanpur × IIT Kanpur";

      return {
        id: s.id,
        year: s.year,
        title: s.title || `Annual Harish-Chandra Colloquium ${s.year}`,
        theme: s.theme || '',
        description: s.description || '',
        date: primaryDate,
        venue: primaryVenue,
        lectures: lectures,
        gallery: [
          {
            title: `Proceedings & Deliberations ${s.year}`,
            caption: `Official photographic record from the ${s.year} Colloquium.`
          }
        ]
      };
    });
  } catch (err) {
    console.error('[HRC] Dynamic lecture fetch exception:', err);
    lectureFetchError = err;
    lectureSeriesData = fallbackLectureSeries;
  }
}

function renderLectureYear(year, targetContainerId = 'lecture-display-area') {
  const container = document.getElementById(targetContainerId);
  if (!container) return;

  const data = lectureSeriesData.find(item => item.year === year) || lectureSeriesData[0];
  if (!data) {
    container.innerHTML = `
      <div class="lecture-content-panel">
        <div style="padding: 3rem 1.5rem; text-align: center; color: var(--slate);">
          <h4 style="color: var(--navy); margin-bottom: 0.4rem;">No published lecture series found.</h4>
          <p style="font-size: 0.9rem;">Colloquia archives will be displayed once published by administrators.</p>
        </div>
      </div>
    `;
    return;
  }

  // Update tabs active state
  const tabs = document.querySelectorAll('.lecture-year-tab');
  tabs.forEach(tab => {
    const tabYear = parseInt(tab.getAttribute('data-year'), 10);
    if (tabYear === data.year) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    } else {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    }
  });

  // Render lecture / speaker cards
  let lecturesSectionHtml = '';

  if (data.lectures && data.lectures.length > 0) {
    const lectureCardsHtml = data.lectures.map(l => {
      const sp = l.speaker;
      const speakerName = sp ? escapeHtmlStr(sp.name) : 'Speaker to be announced';
      const speakerDesig = sp ? escapeHtmlStr(sp.designation || 'Keynote Orator') : 'Invited Keynote Scholar';
      const speakerInst = sp ? escapeHtmlStr(sp.institution || 'CSJMU × IITK') : 'Harish-Chandra Research Centre';

      return `
        <div class="speaker-card">
          <div class="speaker-header">
            <div class="speaker-avatar editorial-placeholder" style="width: 72px; height: 72px; padding: 0.2rem; min-height: auto;">
              ${sp && sp.photo_url ? `<img src="${escapeHtmlStr(sp.photo_url)}" alt="${speakerName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 24px; height: 24px; margin: 0;">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              `}
            </div>
            <div class="speaker-info">
              <h4>${speakerName}</h4>
              <div class="speaker-designation">${speakerDesig}</div>
              <div class="speaker-institution">${speakerInst}</div>
            </div>
          </div>
          <div class="speaker-talk">
            <div class="talk-label">ACADEMIC LECTURE / PRESENTATION</div>
            <div class="talk-title">“${escapeHtmlStr(l.title)}”</div>
            ${l.lectureDate || l.venue ? `
              <div style="font-size: 0.78rem; color: var(--slate); margin-top: 0.6rem; display: flex; flex-wrap: wrap; gap: 0.8rem;">
                ${l.lectureDate ? `<span>📅 ${escapeHtmlStr(l.lectureDate)}</span>` : ''}
                ${l.venue ? `<span>📍 ${escapeHtmlStr(l.venue)}</span>` : ''}
              </div>
            ` : ''}
            ${l.description ? `
              <p style="font-size: 0.84rem; color: var(--charcoal-light); margin-top: 0.6rem; line-height: 1.5;">
                ${escapeHtmlStr(l.description)}
              </p>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    lecturesSectionHtml = `
      <div style="margin-bottom: 2.8rem;">
        <div class="eyebrow">DISTINGUISHED SPEAKERS & SCIENTIFIC TALKS</div>
        <div class="speakers-grid">
          ${lectureCardsHtml}
        </div>
      </div>
    `;
  } else {
    // Meaningful empty state when series has no lectures yet
    lecturesSectionHtml = `
      <div style="margin: 2rem 0 2.8rem;">
        <div class="eyebrow">DISTINGUISHED SPEAKERS & SCIENTIFIC TALKS</div>
        <div class="lecture-empty-state" style="padding: 2.8rem 1.6rem; text-align: center; background: rgba(11, 31, 51, 0.02); border-radius: var(--radius-card); border: 1px dashed var(--border-light); margin-top: 1rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 44px; height: 44px; margin: 0 auto 0.8rem; color: var(--gold); display: block;">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <h4 style="font-size: 1.15rem; color: var(--navy); margin-bottom: 0.4rem;">No published lectures are available for this year yet.</h4>
          <p style="font-size: 0.88rem; color: var(--slate); max-width: 520px; margin: 0 auto;">
            Colloquium proceedings and scheduled lectures for the ${data.year} series will be catalogued here upon formal academic announcement.
          </p>
        </div>
      </div>
    `;
  }

  // Gallery section
  const galleryItems = Array.isArray(data.gallery) && data.gallery.length ? data.gallery : [
    { title: `Colloquium Proceedings ${data.year}`, caption: `Official archival documentation for ${data.year}.` }
  ];

  const galleryHtml = galleryItems.map(img => `
    <div class="gallery-item" onclick="openLightboxFromData('${escapeHtmlStr(img.title)}', '${escapeHtmlStr(img.caption)}')">
      <div class="gallery-thumb-container editorial-placeholder" style="aspect-ratio: 16/9; min-height: 160px; cursor: pointer;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span class="ph-title">${escapeHtmlStr(img.title)}</span>
        <span class="ph-note">ARCHIVAL RECORD [${data.year}]</span>
      </div>
      <div class="gallery-caption-bar">
        <div class="gallery-item-title">${escapeHtmlStr(img.title)}</div>
        <div class="gallery-item-year">${escapeHtmlStr(img.caption)}</div>
      </div>
    </div>
  `).join('');

  // Note: We deliberately do NOT put [data-reveal] on .lecture-content-panel
  // so that the content is fully visible immediately upon tab render/selection.
  container.innerHTML = `
    <div class="lecture-content-panel">
      <div class="lecture-edition-header">
        <div class="edition-badge">ANNUAL LECTURE ARCHIVE · ${data.year} EDITION</div>
        <h3>${escapeHtmlStr(data.title)}</h3>
        ${data.theme ? `
          <div style="font-size: 0.9rem; color: var(--gold); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem;">
            ${escapeHtmlStr(data.theme)}
          </div>
        ` : ''}
        ${data.description ? `
          <p style="font-size: 1.05rem; max-width: 820px; margin-top: 0.8rem; line-height: 1.7;">
            ${escapeHtmlStr(data.description)}
          </p>
        ` : `
          <p style="font-size: 1.02rem; max-width: 820px; margin-top: 0.6rem; line-height: 1.6; color: var(--slate);">
            Annual memorial colloquium and lecture proceedings organized under the auspices of the School of Basic Sciences, CSJMU Kanpur in collaboration with IIT Kanpur.
          </p>
        `}
        <div class="lecture-meta-strip">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${escapeHtmlStr(data.date)}
          </span>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${escapeHtmlStr(data.venue)}
          </span>
        </div>
      </div>

      ${lecturesSectionHtml}

      <div>
        <div class="eyebrow">LECTURE ARCHIVAL GALLERY</div>
        <div class="gallery-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
          ${galleryHtml}
        </div>
      </div>
    </div>
  `;
}

// Lightbox helper for archival gallery cards
function openLightboxFromData(title, caption) {
  let modal = document.getElementById('lecture-lightbox-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lecture-lightbox-modal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(11, 31, 51, 0.78)';
    modal.style.backdropFilter = 'blur(4px)';
    modal.style.zIndex = '9999';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '1.5rem';

    modal.innerHTML = `
      <div style="max-width: 580px; width: 100%; background: var(--warm-white); padding: 2.2rem; border-radius: var(--radius-card); position: relative; border: 1px solid var(--border-gold); text-align: center; box-shadow: var(--shadow-card);">
        <button onclick="closeLectureLightbox()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; line-height: 1; cursor: pointer; color: var(--slate); padding: 0.3rem;">&times;</button>
        <div style="font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); font-weight: 600; margin-bottom: 0.6rem;">Archival Record</div>
        <h3 id="lecture-lightbox-title" style="font-size: 1.35rem; margin-bottom: 0.8rem; color: var(--navy);"></h3>
        <p id="lecture-lightbox-caption" style="font-size: 0.94rem; color: var(--charcoal-light); line-height: 1.6;"></p>
        <button class="btn btn-sm btn-outline" style="margin-top: 1.4rem;" onclick="closeLectureLightbox()">Close Record</button>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLectureLightbox();
    });

    document.body.appendChild(modal);
  }

  const titleEl = document.getElementById('lecture-lightbox-title');
  const captionEl = document.getElementById('lecture-lightbox-caption');
  if (titleEl) titleEl.textContent = title || 'Archival Photographic Record';
  if (captionEl) captionEl.textContent = caption || 'Proceedings from the Harish-Chandra Memorial Colloquium.';

  modal.style.display = 'flex';
}

function closeLectureLightbox() {
  const modal = document.getElementById('lecture-lightbox-modal');
  if (modal) modal.style.display = 'none';
}

window.openLightboxFromData = openLightboxFromData;
window.closeLectureLightbox = closeLectureLightbox;

async function initLectureSystem() {
  const container = document.getElementById('lecture-display-area');
  const navContainer = document.getElementById('lecture-year-nav');

  // Subtle loading state
  if (container) {
    container.innerHTML = `
      <div style="padding: 3.5rem 1.5rem; text-align: center; color: var(--slate);">
        <div style="display: inline-block; width: 32px; height: 32px; border: 3px solid var(--champagne); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 1rem;"></div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        <div style="font-size: 1.05rem; font-weight: 500; color: var(--navy); margin-bottom: 0.3rem;">Loading Colloquia Archive...</div>
        <div style="font-size: 0.82rem; color: var(--slate);">Retrieving annual lecture series and keynote proceeding records</div>
      </div>
    `;
  }

  await fetchLectureSeriesFromDB();

  if (!navContainer || !container) return;

  // Handle case where fetch produced no series at all
  if (!lectureSeriesData || lectureSeriesData.length === 0) {
    navContainer.innerHTML = '';
    container.innerHTML = `
      <div class="lecture-content-panel">
        <div style="padding: 3.5rem 1.5rem; text-align: center; color: var(--slate);">
          <h4 style="color: var(--navy); margin-bottom: 0.5rem;">No lecture series available</h4>
          <p style="font-size: 0.9rem; max-width: 480px; margin: 0 auto;">No published lecture series were found in the database. Please check back later or check admin settings.</p>
        </div>
      </div>
    `;
    return;
  }

  // Build year tabs (newest year first)
  navContainer.innerHTML = lectureSeriesData.map(item => {
    const count = Array.isArray(item.lectures) ? item.lectures.length : 0;
    const countLabel = count === 1 ? '1 talk' : `${count} talks`;
    return `
      <button class="lecture-year-tab" data-year="${item.year}" onclick="renderLectureYear(${item.year})">
        ${item.year}
        <span class="badge-count">${countLabel}</span>
      </button>
    `;
  }).join('');

  // Render the initial active year
  renderLectureYear(lectureSeriesData[0].year);
}

document.addEventListener('DOMContentLoaded', () => {
  initLectureSystem();
});
