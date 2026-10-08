/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Public Lecture Archive - Supabase Dynamic Integration
 * 
 * Automatically loads lecture series, distinguished orators, and lectures
 * dynamically from Supabase database with seamless fallback to verified seed data.
 */

let lectureSeriesData = [];

// Verified baseline seeds
const fallbackLectureSeries = [
  {
    year: 2026,
    title: "Centenary & Digital Legacy Harish-Chandra Colloquium",
    date: "October 11, 2026",
    venue: "CSJMU Kanpur & IIT Kanpur Joint Amphitheatre",
    description: "Centenary Edition. A global academic congress convening scholars, mathematicians, and students to commemorate the 100-year legacy of Dr. Harish-Chandra and celebrate the culmination of the 12 Digital Legacy tracks.",
    speakers: [
      {
        name: "[KEYNOTE SPEAKER TO BE ANNOUNCED]",
        designation: "Centenary Orator",
        institution: "Global Mathematical Community / Institute for Advanced Study",
        talkTitle: "One Century of Invariance: The Harish-Chandra Legacy in 21st Century Science"
      },
      {
        name: "[STUDENT SYMPOSIUM LEAD]",
        designation: "Digital Legacy 2026 Track Convenor",
        institution: "CSJMU Kanpur",
        talkTitle: "Presentation of the 12 Student Digital Legacy Exhibitions & Archival Corpus"
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
    date: "October 11, 2025",
    venue: "School of Basic Sciences Seminar Hall, CSJMU",
    description: "Focused on representations of reductive Lie groups, algebraic structures, and mathematical physics. The colloquium highlighted student research initiatives, inter-institutional collaborations, and preliminary preparations for the 2026 Centenary & Digital Legacy initiatives.",
    speakers: [
      {
        name: "Invited Scholar in Pure Mathematics",
        designation: "Senior Fellow / Visiting Professor",
        institution: "Department of Mathematics, IIT Kanpur",
        talkTitle: "From Dirac's Quantum Mechanics to Harish-Chandra's Infinite-Dimensional Representations"
      },
      {
        name: "Visiting Researcher in Theoretical Physics",
        designation: "School of Basic Sciences Guest Speaker",
        institution: "CSJMU Kanpur",
        talkTitle: "Symmetries, Invariant Differential Operators, and Contemporary Quantum Systems"
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
    date: "October 11, 2024",
    venue: "Main Auditorium, CSJMU Kanpur (in collaboration with IIT Kanpur)",
    description: "The formal commencement of the Harish-Chandra Research Centre and the inaugural annual memorial lecture celebrating the legacy of Harish-Chandra. The gathering brought together foundational scholars in mathematics, representation theory, and theoretical physics to deliberate on the persistent impact of harmonic analysis on modern science.",
    speakers: [
      {
        name: "Prof. Manindra Agrawal",
        designation: "Director & Professor of Computer Science",
        institution: "Indian Institute of Technology Kanpur (IITK)",
        talkTitle: "Computational Complexity, Primes, and the Spirit of Indian Mathematical Rigour"
      },
      {
        name: "Prof. Vinay Kumar Pathak",
        designation: "Vice Chancellor",
        institution: "Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur",
        talkTitle: "Building Centers of Scholarly Invariance: The Vision of Harish-Chandra Research Centre"
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
    const { data: seriesList, error } = await sb
      .from('lecture_series')
      .select(`
        id, year, title, description, theme,
        lectures (
          id, title, description, lecture_date, venue,
          lecture_speakers (
            speakers (name, designation, institution, photo_url)
          )
        )
      `)
      .eq('published', true)
      .order('year', { ascending: false });

    if (error || !seriesList || !seriesList.length) {
      lectureSeriesData = fallbackLectureSeries;
      return;
    }

    lectureSeriesData = seriesList.map(s => {
      const speakers = [];
      s.lectures?.forEach(l => {
        l.lecture_speakers?.forEach(ls => {
          if (ls.speakers) {
            speakers.push({
              name: ls.speakers.name,
              designation: ls.speakers.designation,
              institution: ls.speakers.institution,
              photo_url: ls.speakers.photo_url,
              talkTitle: l.title
            });
          }
        });
      });

      return {
        year: s.year,
        title: s.title,
        date: s.lectures?.[0]?.lecture_date ? new Date(s.lectures[0].lecture_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : `October ${s.year}`,
        venue: s.lectures?.[0]?.venue || "CSJMU Kanpur × IIT Kanpur",
        description: s.description || "Annual memorial lecture series celebrating invariant mathematics.",
        speakers: speakers.length ? speakers : [
          {
            name: "Distinguished Academic Guest",
            designation: "Visiting Scholar",
            institution: "CSJMU × IITK Collaboration",
            talkTitle: s.title
          }
        ],
        gallery: [
          {
            title: `Proceedings & Deliberations ${s.year}`,
            caption: `Official photographic record from the ${s.year} Colloquium.`
          }
        ]
      };
    });
  } catch (err) {
    console.error('[HRC] Dynamic lecture fetch notice:', err);
    lectureSeriesData = fallbackLectureSeries;
  }
}

function renderLectureYear(year, targetContainerId = 'lecture-display-area') {
  const container = document.getElementById(targetContainerId);
  if (!container) return;

  const data = lectureSeriesData.find(item => item.year === year) || lectureSeriesData[0];
  if (!data) {
    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--slate);">No lecture series published yet.</div>';
    return;
  }

  // Update tabs active class
  const tabs = document.querySelectorAll('.lecture-year-tab');
  tabs.forEach(tab => {
    if (parseInt(tab.getAttribute('data-year')) === data.year) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const speakersHtml = data.speakers.map(sp => `
    <div class="speaker-card">
      <div class="speaker-header">
        <div class="speaker-avatar editorial-placeholder" style="width: 72px; height: 72px; padding: 0.2rem; min-height: auto;">
          ${sp.photo_url ? `<img src="${escapeHtml(sp.photo_url)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 24px; height: 24px; margin: 0;">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          `}
        </div>
        <div class="speaker-info">
          <h4>${escapeHtml(sp.name)}</h4>
          <div class="speaker-designation">${escapeHtml(sp.designation || 'Scholar')}</div>
          <div class="speaker-institution">${escapeHtml(sp.institution || 'CSJMU × IITK')}</div>
        </div>
      </div>
      <div class="speaker-talk">
        <div class="talk-label">LECTURE / CONVERSATION</div>
        <div class="talk-title">“${escapeHtml(sp.talkTitle)}”</div>
      </div>
    </div>
  `).join('');

  const galleryHtml = data.gallery.map(img => `
    <div class="gallery-item" onclick="openLightboxFromData('${escapeHtml(img.title)}', '${escapeHtml(img.caption)}')">
      <div class="gallery-thumb-container editorial-placeholder" style="aspect-ratio: 16/9; min-height: 160px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span class="ph-title">${escapeHtml(img.title)}</span>
        <span class="ph-note">ARCHIVAL RECORD [${data.year}]</span>
      </div>
      <div class="gallery-caption-bar">
        <div class="gallery-item-title">${escapeHtml(img.title)}</div>
        <div class="gallery-item-year">${escapeHtml(img.caption)}</div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="lecture-content-panel" data-reveal>
      <div class="lecture-edition-header">
        <div class="edition-badge">ANNUAL LECTURE ARCHIVE · ${data.year} EDITION</div>
        <h3>${escapeHtml(data.title)}</h3>
        <p style="font-size: 1.05rem; max-width: 820px; margin-top: 0.8rem; line-height: 1.7;">
          ${escapeHtml(data.description)}
        </p>
        <div class="lecture-meta-strip">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${escapeHtml(data.date)}
          </span>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${escapeHtml(data.venue)}
          </span>
        </div>
      </div>

      <div style="margin-bottom: 2.8rem;">
        <div class="eyebrow">DISTINGUISHED SPEAKERS & ORATORS</div>
        <div class="speakers-grid">
          ${speakersHtml}
        </div>
      </div>

      <div>
        <div class="eyebrow">LECTURE ARCHIVAL GALLERY</div>
        <div class="gallery-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
          ${galleryHtml}
        </div>
      </div>
    </div>
  `;
}

async function initLectureSystem() {
  await fetchLectureSeriesFromDB();
  const navContainer = document.getElementById('lecture-year-nav');
  if (!navContainer) return;

  // Build year tabs (newest year first)
  navContainer.innerHTML = lectureSeriesData.map(item => `
    <button class="lecture-year-tab" data-year="${item.year}" onclick="renderLectureYear(${item.year})">
      ${item.year}
      <span class="badge-count">${item.speakers.length} talks</span>
    </button>
  `).join('');

  if (lectureSeriesData.length > 0) {
    renderLectureYear(lectureSeriesData[0].year);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLectureSystem();
});
