/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Main Interactive Features: Filtering, Lightbox Keys, Smooth Scroll
 */

document.addEventListener('DOMContentLoaded', () => {
  initEventFiltering();
  initGlobalKeyboard();
});

// Event filter logic for events.html
function initEventFiltering() {
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
