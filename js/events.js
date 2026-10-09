/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Public Events & Colloquia - Supabase Dynamic Integration
 * 
 * Automatically loads published events dynamically from Supabase database
 * with real-time category filtering, responsive cards, and graceful error handling.
 */

let allEventsData = [];
let eventsFetchError = null;

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

// Fallback seed events (used only if database/network is completely unreachable)
const fallbackEvents = [
  {
    id: "fb-ev-1",
    title: "Annual Harish-Chandra Memorial Colloquium 2026",
    category: "lecture",
    event_date: "2026-10-11",
    location: "Joint Amphitheatre, CSJMU Kanpur",
    description: "Celebrating one century of Harish-Chandra's legacy with distinguished keynote mathematicians and the culmination of the 12 Student Digital Legacy tracks.",
    registration_url: "exhibition/harishchandra-day.html",
    featured: true,
    published: true
  },
  {
    id: "fb-ev-2",
    title: "Foundational Workshop: Introduction to Lie Algebras & Symmetries",
    category: "workshop",
    event_date: "2025-11-18",
    location: "Seminar Hall, School of Basic Sciences",
    description: "Joint pedagogical seminar for postgraduate students and research scholars covering semisimple Lie groups and root systems.",
    registration_url: "lectures.html",
    featured: false,
    published: true
  },
  {
    id: "fb-ev-3",
    title: "Second Annual Harish-Chandra Memorial Lecture",
    category: "discussion",
    event_date: "2025-10-11",
    location: "CSJMU Kanpur × IIT Kanpur Collaboration",
    description: "Lectures on representation theory of real reductive groups and mathematical physics.",
    registration_url: "lectures.html",
    featured: false,
    published: true
  },
  {
    id: "fb-ev-4",
    title: "Inaugural Harish-Chandra Memorial Colloquium",
    category: "lecture",
    event_date: "2024-10-11",
    location: "Main Auditorium, CSJMU Kanpur",
    description: "Formal inauguration of the Centre and addresses by Prof. Vinay Kumar Pathak (VC, CSJMU) and Prof. Manindra Agrawal (Director, IIT Kanpur).",
    registration_url: "lectures.html",
    featured: false,
    published: true
  }
];

document.addEventListener('DOMContentLoaded', () => {
  loadPublicEvents();
  setupFilterControls();
});

/**
 * Loads published events from Supabase or fallback
 */
async function loadPublicEvents() {
  const container = document.getElementById('events-list');
  if (!container) return;

  // Render loading state
  container.innerHTML = `
    <div style="text-align: center; padding: 3rem 1rem; color: var(--slate);">
      <div class="coming-soon-dot" style="margin: 0 auto 1rem; width: 12px; height: 12px; background-color: var(--gold);"></div>
      <p style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--navy); margin-bottom: 0.3rem;">Loading Academic Calendar...</p>
      <span style="font-size: 0.85rem; color: var(--slate);">Fetching scheduled colloquia and seminars</span>
    </div>
  `;

  const sb = typeof getSupabase === 'function' ? getSupabase() : null;

  if (!sb) {
    console.warn('[HRC Events] Supabase client not available, rendering verified archive records.');
    allEventsData = fallbackEvents;
    renderEvents(allEventsData);
    return;
  }

  try {
    const { data, error } = await sb
      .from('events')
      .select('*')
      .eq('published', true)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('[HRC Events] Supabase query failed:', error);
      eventsFetchError = error;
      // If error occurs, render fallback with alert notice
      allEventsData = fallbackEvents;
      renderEvents(allEventsData, true);
      return;
    }

    allEventsData = data || [];
    renderEvents(allEventsData);
  } catch (err) {
    console.error('[HRC Events] Unexpected exception loading events:', err);
    eventsFetchError = err;
    allEventsData = fallbackEvents;
    renderEvents(allEventsData, true);
  }
}

/**
 * Maps database category to UI filter slug
 */
function getCategoryFilterSlug(cat) {
  if (!cat) return 'other';
  const c = cat.toLowerCase().trim();
  if (c === 'lecture') return 'lectures';
  if (c === 'workshop') return 'workshops';
  if (c === 'discussion') return 'discussions';
  if (c === 'seminar') return 'lectures';
  return 'other';
}

/**
 * Renders event cards list or appropriate empty state
 */
function renderEvents(events, isFallback = false) {
  const container = document.getElementById('events-list');
  if (!container) return;

  if (!events || events.length === 0) {
    container.innerHTML = `
      <div style="background: var(--warm-white); border: 1px dashed var(--border-gold); border-radius: var(--radius-card); padding: 3.5rem 2rem; text-align: center; margin-top: 1rem;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" style="margin-bottom: 1rem;">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <h3 style="font-family: var(--font-heading); color: var(--navy); margin-bottom: 0.5rem;">No Events Scheduled</h3>
        <p style="color: var(--slate); font-size: 0.95rem; max-width: 500px; margin: 0 auto;">
          There are currently no published events or colloquia in this calendar. Please check back soon or explore the past lecture archive.
        </p>
        <div style="margin-top: 1.5rem;">
          <a href="lectures.html" class="btn btn-sm btn-outline">Explore Lecture Archive</a>
        </div>
      </div>
    `;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  let html = '';

  if (isFallback) {
    html += `
      <div style="margin-bottom: 1.2rem; padding: 0.65rem 1rem; background: rgba(201, 162, 39, 0.08); border-left: 3px solid var(--gold); font-size: 0.82rem; color: var(--charcoal-light); border-radius: 0 4px 4px 0;">
        <strong>Notice:</strong> Operating in offline archive mode. Displaying preserved institutional proceedings.
      </div>
    `;
  }

  html += events.map(ev => {
    // Parse date parts safely
    let day = '--';
    let monthYear = 'TBA';
    let isUpcoming = false;

    if (ev.event_date) {
      // Parse YYYY-MM-DD cleanly to avoid timezone shifting
      const parts = ev.event_date.split('-');
      if (parts.length >= 3) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const dayNum = parseInt(parts[2], 10);
        day = String(dayNum);
        monthYear = `${monthNames[monthIndex] || ''} ${year}`;
        
        const eventDateObj = new Date(year, monthIndex, dayNum);
        isUpcoming = eventDateObj >= today;
      }
    }

    const filterCategory = getCategoryFilterSlug(ev.category);
    
    // Status pill
    let statusPillHtml = '';
    if (isUpcoming) {
      statusPillHtml = `<span class="event-status-pill event-status-upcoming">Upcoming</span>`;
    } else {
      statusPillHtml = `<span class="event-status-pill event-status-past">Concluded Archive</span>`;
    }

    // Action button
    let actionBtnHtml = '';
    if (ev.registration_url && ev.registration_url.trim()) {
      const regUrl = ev.registration_url.trim();
      const isExternal = regUrl.startsWith('http://') || regUrl.startsWith('https://');
      const isMicrosite = regUrl.includes('exhibition') || regUrl.includes('harishchandra-day');
      const btnClass = isMicrosite ? 'btn btn-sm btn-gold' : 'btn btn-sm btn-primary';
      const btnLabel = isMicrosite ? 'View Microsite' : (isUpcoming ? 'Register / Details' : 'View Talk / Archive');
      const targetAttr = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
      
      actionBtnHtml = `<a href="${escapeHtmlStr(regUrl)}" class="${btnClass}" ${targetAttr}>${btnLabel}</a>`;
    } else {
      actionBtnHtml = `<a href="lectures.html" class="btn btn-sm btn-outline">Archive</a>`;
    }

    // Meta details (time / venue)
    const venueText = ev.location ? `<span>Venue: ${escapeHtmlStr(ev.location)}</span>` : '';
    const descText = ev.description ? `<p style="font-size: 0.92rem; color: var(--charcoal-light); margin: 0; line-height: 1.55;">${escapeHtmlStr(ev.description)}</p>` : '';

    return `
      <div class="event-card" data-category="${filterCategory}">
        <div class="event-date-box">
          <div class="event-date-day">${day}</div>
          <div class="event-date-month">${monthYear}</div>
        </div>
        <div class="event-details">
          <div style="margin-bottom: 0.3rem;">
            ${statusPillHtml}
          </div>
          <h4>${escapeHtmlStr(ev.title)}</h4>
          ${venueText ? `<div class="event-meta">${venueText}</div>` : ''}
          ${descText}
        </div>
        <div>
          ${actionBtnHtml}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  // Re-apply current active category filter
  applyActiveFilter();
}

/**
 * Sets up category filter buttons
 */
function setupFilterControls() {
  const filterBtns = document.querySelectorAll('.filter-tabs .filter-btn');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyActiveFilter();
    });
  });
}

/**
 * Filters visible event cards based on active filter button
 */
function applyActiveFilter() {
  const activeBtn = document.querySelector('.filter-tabs .filter-btn.active');
  const filterCategory = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
  const eventCards = document.querySelectorAll('#events-list .event-card');

  let visibleCount = 0;
  eventCards.forEach(card => {
    const cardCategory = card.getAttribute('data-category');
    if (filterCategory === 'all' || cardCategory === filterCategory) {
      card.style.display = 'grid';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  // Check if all cards in this category are hidden
  const emptyFilterNotice = document.getElementById('empty-filter-notice');
  if (visibleCount === 0 && eventCards.length > 0) {
    if (!emptyFilterNotice) {
      const notice = document.createElement('div');
      notice.id = 'empty-filter-notice';
      notice.style.cssText = 'background: var(--warm-white); border: 1px dashed var(--border-light); border-radius: var(--radius-card); padding: 2.5rem 1.5rem; text-align: center; margin-top: 1rem; color: var(--slate); font-size: 0.95rem;';
      notice.innerHTML = 'No events currently listed under this specific category.';
      document.getElementById('events-list').appendChild(notice);
    }
  } else if (emptyFilterNotice) {
    emptyFilterNotice.remove();
  }
}
