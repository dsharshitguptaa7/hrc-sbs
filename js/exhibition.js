/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Digital Legacy 2026 - Exhibition & Quiz Engine
 * 12 Digital Exhibition Experiences
 */

const exhibitionTracks = [
  {
    num: "01",
    total: "12",
    code: "biography",
    title: "Digital Biography",
    eyebrow: "BIOGRAPHICAL MONOGRAPH",
    description: "An interactive, scholarly journey through the life, education, career, contributions, and enduring international legacy of Harish-Chandra.",
    path: "exhibition/biography.html",
    highlights: ["Early Kanpur & Allahabad Roots", "Cambridge & Dirac", "Institute for Advanced Study, Princeton"]
  },
  {
    num: "02",
    total: "12",
    code: "legacy",
    title: "Legacy of Harish-Chandra",
    eyebrow: "HISTORICAL IMPACT",
    description: "A deep assessment of his mathematical architecture, fundamental discoveries, and long-term impact on modern physics and harmonic analysis.",
    path: "exhibition/legacy.html",
    highlights: ["Infinite-Dimensional Representations", "Harish-Chandra Characters", "Langlands Program Foundation"]
  },
  {
    num: "03",
    total: "12",
    code: "archive",
    title: "Harish-Chandra Digital Archive",
    eyebrow: "ARCHIVAL CORPUS",
    description: "Photographs, manuscripts, institutional correspondence, verified publications, and historical ephemera preserved for research.",
    path: "exhibition/archive.html",
    highlights: ["Collected Papers", "Princeton Correspondence", "Dirac Letters"]
  },
  {
    num: "04",
    total: "12",
    code: "timeline",
    title: "The Harish-Chandra Timeline",
    eyebrow: "CHRONOLOGY",
    description: "Major milestones, turning points, mathematical breakthroughs, and institutional appointments presented in a precision chronological stream.",
    path: "exhibition/timeline.html",
    highlights: ["1923 Birth in Kanpur", "1947 Cambridge PhD", "1963 Princeton Professorship"]
  },
  {
    num: "05",
    total: "12",
    code: "research-explorer",
    title: "Research Explorer",
    eyebrow: "MATHEMATICAL TAXONOMY",
    description: "Explore Harish-Chandra's work categorized across Lie algebras, semisimple groups, differential equations, and automorphic forms with semantic filters.",
    path: "exhibition/research-explorer.html",
    highlights: ["Reductive Lie Groups", "Harmonic Analysis", "Discrete Series Representations"]
  },
  {
    num: "06",
    total: "12",
    code: "quiz",
    title: "Harish-Chandra Quiz",
    eyebrow: "SCHOLARLY CHALLENGE",
    description: "An intellectual assessment tool testing knowledge of Harish-Chandra's life, peer circle, scientific legacy, and mathematical milestones.",
    path: "exhibition/quiz.html",
    highlights: ["Timed Academic Challenges", "Instant Explanations", "Verified Historical Data"]
  },
  {
    num: "07",
    total: "12",
    code: "know-harishchandra",
    title: "Know Harish-Chandra",
    eyebrow: "DID YOU KNOW & INSIGHTS",
    description: "Curated facts, flashcards, archival anecdotes, and concise knowledge cards illuminating the humane, artistic, and disciplined mind.",
    path: "exhibition/know-harishchandra.html",
    highlights: ["Passionate Painter", "Transition from Physics to Pure Math", "Colleagues: Dirac & Pauli"]
  },
  {
    num: "08",
    total: "12",
    code: "legacy-map",
    title: "Legacy Map",
    eyebrow: "GLOBAL CARTOGRAPHY",
    description: "An interactive institutional map tracing people, universities, research centres, and global mathematicians influenced by Harish-Chandra.",
    path: "exhibition/legacy-map.html",
    highlights: ["Kanpur → Allahabad → Cambridge → IAS Princeton → Global Impact"]
  },
  {
    num: "09",
    total: "12",
    code: "tribute-wall",
    title: "Digital Tribute Wall",
    eyebrow: "COMMUNITY ARCHIVE",
    description: "Reflections, scholarly tributes, student impressions, and commemorative messages from the global academic collective.",
    path: "exhibition/tribute-wall.html",
    highlights: ["Eulogies by Freeman Dyson & Robert Langlands", "CSJMU Student Submissions"]
  },
  {
    num: "10",
    total: "12",
    code: "harishchandra-day",
    title: "Harish-Chandra Day 2026 Microsite",
    eyebrow: "CENTENARY CELEBRATION",
    description: "The official conference microsite with schedule, speakers, student competitions, registration portal, and centenary proceedings.",
    path: "exhibition/harishchandra-day.html",
    highlights: ["Keynote Schedule", "Exhibition Walkthrough", "Prize Declarations"]
  },
  {
    num: "11",
    total: "12",
    code: "then-and-now",
    title: "Then & Now",
    eyebrow: "CONTEMPORARY CONTINUITY",
    description: "Bridging 20th-century mathematical breakthroughs with 21st-century developments in quantum information, cryptography, and artificial intelligence.",
    path: "exhibition/then-and-now.html",
    highlights: ["Symmetry in Quantum Computing", "Representation Theory in Deep Learning"]
  },
  {
    num: "12",
    total: "12",
    code: "interactive-exhibition",
    title: "Interactive Exhibition",
    eyebrow: "VIRTUAL CURATION",
    description: "The flagship virtual pavilion guiding visitors seamlessly through Life, Education, Research, Epistolary Exchanges, and Living Heritage.",
    path: "exhibition/interactive-exhibition.html",
    highlights: ["Virtual Hall of Invariance", "Archival Showcase", "Interactive Formula Explorer"]
  }
];

// Interactive Quiz Questions Data (Verified Historical Facts Only)
const quizQuestions = [
  {
    question: "In which historic city was Harish-Chandra born on October 11, 1923?",
    options: ["Kanpur (United Provinces)", "Allahabad (Prayagraj)", "Varanasi", "Calcutta"],
    answerIndex: 0,
    explanation: "Harish-Chandra was born in Kanpur, Uttar Pradesh (then United Provinces), where his father Chandrakishore was an executive engineer."
  },
  {
    question: "Under which Nobel Laureate in theoretical physics did Harish-Chandra complete his Ph.D. at Cambridge University in 1947?",
    options: ["Paul A. M. Dirac", "Niels Bohr", "Erwin Schrödinger", "Enrico Fermi"],
    answerIndex: 0,
    explanation: "Harish-Chandra worked under P. A. M. Dirac at the University of Cambridge, investigating relativistic wave equations."
  },
  {
    question: "At which world-renowned research institution did Harish-Chandra spend the major part of his career from 1963 until 1983 as IBM von Neumann Professor?",
    options: ["Institute for Advanced Study, Princeton", "Harvard University", "Max Planck Institute", "Tata Institute of Fundamental Research"],
    answerIndex: 0,
    explanation: "Harish-Chandra was appointed a Permanent Member and subsequent IBM von Neumann Professor of Mathematics at the Institute for Advanced Study in Princeton."
  },
  {
    question: "What major branch of mathematics did Harish-Chandra almost single-handedly construct?",
    options: ["Harmonic Analysis on Semisimple Lie Groups", "Topology of 4-Manifolds", "Non-Euclidean Hyperbolic Geometry", "Graph Theory & Combinatorics"],
    answerIndex: 0,
    explanation: "Harish-Chandra built the fundamental architecture of infinite-dimensional representation theory and harmonic analysis on reductive and semisimple Lie groups."
  },
  {
    question: "Which landmark initiative in modern number theory and geometry rests fundamentally on Harish-Chandra's discrete series representations?",
    options: ["The Langlands Program", "Fermat's Last Theorem proof", "The Poincaré Conjecture", "The Millennium Navier-Stokes equations"],
    answerIndex: 0,
    explanation: "Robert Langlands famously noted that without Harish-Chandra's work on representation theory and automorphic forms, the Langlands Program could not have been formulated."
  }
];

async function fetchExhibitionProjectsFromDB() {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('exhibition_projects')
      .select('*')
      .eq('published', true)
      .order('track_number', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[HRC Exhibition] DB query error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[HRC Exhibition] Notice loading projects from DB:', err);
    return [];
  }
}

async function renderExhibitionGrid(containerId = 'exhibition-tracks-grid', basePath = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const dbProjects = await fetchExhibitionProjectsFromDB();

  // Group published student projects by track_number (1 to 12)
  const projectsByTrack = {};
  dbProjects.forEach(proj => {
    const num = parseInt(proj.track_number, 10);
    if (!projectsByTrack[num]) {
      projectsByTrack[num] = [];
    }
    projectsByTrack[num].push(proj);
  });

  // Render cards for all 12 competition tracks
  container.innerHTML = exhibitionTracks.map(track => {
    const trackNum = parseInt(track.num, 10);
    const assignedProjects = projectsByTrack[trackNum] || [];

    // If published project(s) exist for this track:
    if (assignedProjects.length > 0) {
      return assignedProjects.map(p => {
        const studentName = escapeHtml(p.student_name || p.team_name || 'Student Contributor');
        const course = p.course?.trim() ? escapeHtml(p.course.trim()) : '';
        const year = p.year || 2026;
        const metaLine = course ? `${course} · ${year}` : `${year}`;
        const projectUrl = escapeHtml(p.project_url || '#');
        const trackTitle = escapeHtml(p.title || track.title);

        return `
          <div class="exhibition-project-card" data-reveal>
            <div class="track-index-row">
              <span class="track-number">Track ${track.num}</span>
              <span class="track-pill">${escapeHtml(track.eyebrow)}</span>
            </div>
            <h3 class="track-title">${trackTitle}</h3>
            <div class="project-student-meta">
              <div class="project-student-name">${studentName}</div>
              <div class="project-student-course">${metaLine}</div>
            </div>
            <a href="${projectUrl}" target="_blank" rel="noopener noreferrer" class="project-view-btn">
              <span>VIEW PROJECT</span>
              <span>→</span>
            </a>
          </div>
        `;
      }).join('');
    }

    // If track has no student project yet: Display "Project coming soon"
    const linkPath = basePath ? `${basePath}${track.path.replace('exhibition/', '')}` : track.path;
    return `
      <div class="exhibition-card-pending" data-reveal>
        <div class="track-index-row">
          <span class="track-number">Track ${track.num}</span>
          <span class="track-pill">${escapeHtml(track.eyebrow)}</span>
        </div>
        <h3 class="track-title">${escapeHtml(track.title)}</h3>
        <p class="track-desc">${escapeHtml(track.description)}</p>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(11, 31, 51, 0.08);">
          <div class="coming-soon-badge">
            <span class="coming-soon-dot"></span>
            <span>Project coming soon</span>
          </div>
          <a href="${linkPath}" style="font-size: 0.76rem; font-weight: 600; color: var(--blue); text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;">
            <span>Curatorial Track</span>
            <span>→</span>
          </a>
        </div>
      </div>
    `;
  }).join('');

  if (typeof window.refreshScrollObserver === 'function') {
    window.refreshScrollObserver();
  }
}

// Lightbox state handler
let activeLightboxTitle = '';
let activeLightboxCaption = '';

function openLightboxFromData(title, caption) {
  const modal = document.getElementById('lightbox-modal');
  if (!modal) return;

  document.getElementById('lightbox-title').innerText = title || 'Archival Photographic Record';
  document.getElementById('lightbox-caption').innerText = caption || 'Harish-Chandra Research Centre Archive';
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
}

// Quiz interactive runner
let currentQuestionIndex = 0;
let userScore = 0;

function initQuizRunner() {
  const quizBox = document.getElementById('quiz-active-card');
  if (!quizBox) return;

  loadQuestion(0);
}

function loadQuestion(index) {
  const quizBox = document.getElementById('quiz-active-card');
  if (!quizBox) return;

  if (index >= quizQuestions.length) {
    showQuizResults();
    return;
  }

  currentQuestionIndex = index;
  const q = quizQuestions[index];
  const progressPercent = ((index) / quizQuestions.length) * 100;

  quizBox.innerHTML = `
    <div class="quiz-header">
      <span class="chapter-badge">QUESTION ${index + 1} OF ${quizQuestions.length}</span>
      <span style="font-size: 0.82rem; font-weight: 600; color: var(--gold);">SCORE: ${userScore}</span>
    </div>
    <div class="quiz-progress-bar">
      <div class="quiz-progress-fill" style="width: ${progressPercent}%;"></div>
    </div>
    <div class="quiz-question-text">${escapeHtml(q.question)}</div>
    <div class="quiz-options">
      ${q.options.map((opt, optIdx) => `
        <button class="quiz-opt-btn" onclick="handleQuizAnswer(${optIdx}, this)">
          <span>${escapeHtml(opt)}</span>
          <span style="opacity: 0.4;">[Option ${optIdx + 1}]</span>
        </button>
      `).join('')}
    </div>
    <div id="quiz-feedback" class="quiz-feedback-box"></div>
    <div id="quiz-next-container" style="display: none; text-align: right;">
      <button class="btn btn-primary" onclick="loadQuestion(${index + 1})">Next Question →</button>
    </div>
  `;
}

function handleQuizAnswer(selectedIdx, btnElement) {
  const q = quizQuestions[currentQuestionIndex];
  const allBtns = document.querySelectorAll('.quiz-opt-btn');
  allBtns.forEach(btn => btn.disabled = true);

  const feedbackBox = document.getElementById('quiz-feedback');
  const nextContainer = document.getElementById('quiz-next-container');

  if (selectedIdx === q.answerIndex) {
    btnElement.classList.add('correct');
    userScore++;
    feedbackBox.style.display = 'block';
    feedbackBox.style.borderLeft = '4px solid #4CAF50';
    feedbackBox.innerHTML = `<strong>Correct.</strong> ${escapeHtml(q.explanation)}`;
  } else {
    btnElement.classList.add('wrong');
    allBtns[q.answerIndex].classList.add('correct');
    feedbackBox.style.display = 'block';
    feedbackBox.style.borderLeft = '4px solid #E57373';
    feedbackBox.innerHTML = `<strong>Incorrect.</strong> ${escapeHtml(q.explanation)}`;
  }

  nextContainer.style.display = 'block';
}

function showQuizResults() {
  const quizBox = document.getElementById('quiz-active-card');
  if (!quizBox) return;

  const percentage = Math.round((userScore / quizQuestions.length) * 100);

  quizBox.innerHTML = `
    <div style="text-align: center; padding: 2rem 1rem;">
      <div class="chapter-badge">ASSESSMENT COMPLETE</div>
      <h3 style="font-size: 2rem; margin: 0.6rem 0; color: var(--navy);">Final Score: ${userScore} / ${quizQuestions.length} (${percentage}%)</h3>
      <p style="max-width: 500px; margin: 0 auto 1.8rem; color: var(--charcoal-light);">
        ${percentage >= 80 ? 'Exceptional scholarship. You have a profound command of Harish-Chandra\'s historical legacy and mathematical journey.' : 'Thank you for exploring Harish-Chandra\'s heritage. We encourage you to visit the Digital Archive and Biography for deeper insights.'}
      </p>
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-gold" onclick="resetQuiz()">Retake Quiz</button>
        <a href="archive.html" class="btn btn-outline">Explore Digital Archive</a>
      </div>
    </div>
  `;
}

function resetQuiz() {
  userScore = 0;
  loadQuestion(0);
}

document.addEventListener('DOMContentLoaded', () => {
  // If current page is inside exhibition/ subdirectory (e.g. exhibition/index.html),
  // track links should be relative without "exhibition/" prefix.
  const isInsideExhibitionDir = window.location.pathname.includes('/exhibition/') || window.location.pathname.endsWith('/exhibition');
  const basePath = isInsideExhibitionDir ? '' : 'exhibition/';
  renderExhibitionGrid('exhibition-tracks-grid', basePath);
  initQuizRunner();
});
