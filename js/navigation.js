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

  // Set accessibility attributes
  if (!drawer.id) drawer.id = 'mobile-nav-drawer';
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.setAttribute('aria-controls', drawer.id);
  if (!toggleBtn.getAttribute('aria-label')) {
    toggleBtn.setAttribute('aria-label', 'Open Navigation Menu');
  }
  drawer.setAttribute('aria-hidden', 'true');

  function openDrawer() {
    drawer.style.display = 'block';
    void drawer.offsetWidth; // Force reflow for smooth transition
    drawer.classList.add('is-active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 50);
    }
  }

  function closeDrawer(returnFocus = true) {
    drawer.classList.remove('is-active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!drawer.classList.contains('is-active')) {
        drawer.style.display = 'none';
      }
    }, 320);
    if (returnFocus && toggleBtn) {
      toggleBtn.focus();
    }
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (drawer.classList.contains('is-active')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDrawer();
    });
  }

  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) {
      closeDrawer();
    }
  });

  drawerLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer(false);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (!drawer.classList.contains('is-active')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeDrawer();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = Array.from(drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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
