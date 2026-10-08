/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Global Navigation & Mobile Drawer Manager
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initScrollHeader();
  initScrollObserver();
});

function initNavigation() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const closeBtn = document.querySelector('.mobile-nav-close');
  const drawerLinks = document.querySelectorAll('.mobile-nav-links a');

  if (!toggleBtn || !drawer) return;

  function openDrawer() {
    drawer.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) {
      closeDrawer();
    }
  });

  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-active')) {
      closeDrawer();
    }
  });
}

function initScrollHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

let globalScrollObserver = null;

function initScrollObserver() {
  const reveals = document.querySelectorAll('[data-reveal]');
  if (!reveals.length) return;

  if ('IntersectionObserver' in window) {
    if (!globalScrollObserver) {
      globalScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            globalScrollObserver.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1
      });
    }

    reveals.forEach(el => {
      if (!el.classList.contains('is-revealed')) {
        globalScrollObserver.observe(el);
      }
    });
  } else {
    reveals.forEach(el => el.classList.add('is-revealed'));
  }
}

// Global hook to observe dynamically injected elements
window.refreshScrollObserver = initScrollObserver;
