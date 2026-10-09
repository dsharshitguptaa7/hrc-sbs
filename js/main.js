/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Main Interactive Features: Filtering, Lightbox Keys, Smooth Scroll
 */

document.addEventListener('DOMContentLoaded', () => {
  initEventFiltering();
  initGlobalKeyboard();
  initPeopleCollapsibleGroups();
});

// Collapsible group logic for people.html
function initPeopleCollapsibleGroups() {
  const toggles = document.querySelectorAll('.people-group-toggle');
  if (!toggles.length) return;

  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      const targetId = toggle.getAttribute('aria-controls');
      const content = document.getElementById(targetId);

      if (!content) return;

      if (isExpanded) {
        toggle.setAttribute('aria-expanded', 'false');
        content.classList.add('collapsed');
      } else {
        toggle.setAttribute('aria-expanded', 'true');
        content.classList.remove('collapsed');
      }
    });
  });
}

// Event filter logic for events.html (if not managed by js/events.js)
function initEventFiltering() {
  if (typeof loadPublicEvents === 'function') {
    // events.html dynamic loader handles filtering natively
    return;
  }
  const filterBtns = document.querySelectorAll('.filter-btn');
  const eventCards = document.querySelectorAll('.event-card');

  if (!filterBtns.length || !eventCards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterCategory = btn.getAttribute('data-filter');

      eventCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (filterCategory === 'all' || cardCategory === filterCategory) {
          card.style.display = 'grid';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// Global keyboard accessibility for lightbox and drawer
function initGlobalKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('lightbox-modal');
      if (modal && modal.classList.contains('is-open')) {
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    }
  });
}
