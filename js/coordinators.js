/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Public Event Coordinators Dynamic Loader
 * 
 * Fetches published event coordinators from Supabase, groups them by event_year (descending),
 * sorts by display_order then full_name, and renders cards matching the Student Core Team aesthetic.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadEventCoordinators();
});

async function loadEventCoordinators() {
  const containers = document.querySelectorAll('#coordinators-container, .coordinators-container');
  if (!containers.length) return;

  const sb = typeof getSupabase === 'function' ? getSupabase() : null;

  if (!sb) {
    console.warn('[HRC Coordinators] Supabase client unavailable.');
    containers.forEach(container => renderCoordinatorsEmptyState(container, 'Coordinators registry will be populated shortly.'));
    return;
  }

  try {
    const { data, error } = await sb
      .from('event_coordinators')
      .select('*')
      .eq('published', true)
      .order('event_year', { ascending: false })
      .order('display_order', { ascending: true })
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[HRC Coordinators] Failed to fetch coordinators:', error);
      containers.forEach(container => renderCoordinatorsEmptyState(container, 'Unable to load event coordinators at this time.'));
      return;
    }

    if (!data || data.length === 0) {
      containers.forEach(container => renderCoordinatorsEmptyState(container, 'No event coordinators published for the current academic sessions yet.'));
      return;
    }

    containers.forEach(container => renderCoordinatorsByYear(container, data));
  } catch (err) {
    console.error('[HRC Coordinators] Unexpected error:', err);
    containers.forEach(container => renderCoordinatorsEmptyState(container, 'Unable to load event coordinators at this time.'));
  }
}

function renderCoordinatorsEmptyState(container, message) {
  container.innerHTML = `
    <div style="background: var(--card-bg); border: 1px dashed var(--border-gold); border-radius: var(--radius-card); padding: 2.8rem 1.8rem; text-align: center; max-width: 980px; margin: 1.5rem auto;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.6" style="margin-bottom: 0.8rem;">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
      <h4 style="font-family: var(--font-heading); color: var(--navy); font-size: 1.2rem; margin: 0 0 0.4rem;">Event Coordinators</h4>
      <p style="color: var(--slate); font-size: 0.92rem; margin: 0;">${escapeCoordinatorsHtml(message)}</p>
    </div>
  `;
}

function renderCoordinatorsByYear(container, coordinators) {
  // Group coordinators by event_year
  const yearMap = new Map();
  coordinators.forEach(coord => {
    const yr = coord.event_year || 'General';
    if (!yearMap.has(yr)) {
      yearMap.set(yr, []);
    }
    yearMap.get(yr).push(coord);
  });

  // Sort years in descending order (numbers first descending)
  const sortedYears = Array.from(yearMap.keys()).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
    return String(b).localeCompare(String(a));
  });

  let html = '';

  sortedYears.forEach((year, index) => {
    const yearList = yearMap.get(year);
    const isFirst = index === 0;

    html += `
      <div class="coordinator-year-block" style="margin-bottom: 2.5rem;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.4rem; padding-bottom: 0.6rem; border-bottom: 2px solid var(--champagne);">
          <span style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 700; color: var(--navy);">
            Event Coordinators — ${escapeCoordinatorsHtml(String(year))}
          </span>
          <span style="font-family: var(--font-body); font-size: 0.78rem; font-weight: 600; color: var(--gold); letter-spacing: 0.08em; text-transform: uppercase; background: var(--champagne-light); padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid var(--champagne);">
            ${yearList.length} ${yearList.length === 1 ? 'Coordinator' : 'Coordinators'}
          </span>
        </div>

        <div class="student-profiles-grid" style="padding-top: 0.5rem; padding-bottom: 1.2rem;">
          ${yearList.map(coord => renderCoordinatorCard(coord)).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderCoordinatorCard(coord) {
  const name = escapeCoordinatorsHtml(coord.full_name || 'Academic Coordinator');
  const course = escapeCoordinatorsHtml(coord.course || '');
  const dept = escapeCoordinatorsHtml(coord.department || '');
  const inst = escapeCoordinatorsHtml(coord.institution || '');
  const acadYear = escapeCoordinatorsHtml(coord.academic_year || '');
  const creditRole = escapeCoordinatorsHtml(coord.credit_role || 'Event Coordinator');
  const bio = coord.bio ? escapeCoordinatorsHtml(coord.bio) : '';

  return `
    <div class="student-profile-card">
      <div class="student-profile-main">
        <h3 class="student-profile-name">${name}</h3>
        ${course ? `<div class="student-profile-program">${course}</div>` : ''}
        ${dept ? `<div class="student-profile-dept">${dept}</div>` : ''}
        ${inst ? `<div class="student-profile-inst">${inst}</div>` : ''}
        ${acadYear ? `<div class="student-profile-tenure">${acadYear}</div>` : ''}
        ${bio ? `<p style="font-size: 0.88rem; color: var(--charcoal-light); margin: 0.8rem 0 0; line-height: 1.5; font-style: normal;">${bio}</p>` : ''}
      </div>
      <div class="student-role-block">
        <hr class="student-profile-divider">
        <div class="student-role-label">Credit & Initiative Role</div>
        <p class="student-role-text">${creditRole}</p>
      </div>
    </div>
  `;
}

function escapeCoordinatorsHtml(str) {
  if (typeof escapeHtml === 'function') return escapeHtml(str);
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
