/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Institutional Leadership Shared Component & Data Definition
 * School of Basic Sciences | CSJMU Kanpur × IIT Kanpur
 * 
 * Centralized data definition and reusable rendering component for
 * Prof. Vinay Kumar Pathak, Vice-Chancellor, CSJMU.
 */

const VC_LEADERSHIP_PROFILE = {
  name: 'Prof. Vinay Kumar Pathak',
  designation: 'Vice-Chancellor',
  institution: 'Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur',
  photo: 'assets/images/vc-sir-csjmu.jpg',
  alt: 'Portrait of Prof. Vinay Kumar Pathak, Vice-Chancellor, CSJMU'
};

/**
 * Creates the HTML markup for the Vice-Chancellor leadership card.
 * @param {typeof VC_LEADERSHIP_PROFILE} profile
 * @returns {string} HTML markup string
 */
function createVcCardMarkup(profile = VC_LEADERSHIP_PROFILE) {
  return `
    <div class="people-card vc-card">
      <div class="people-card-photo-wrap vc-card-photo-wrap">
        <img src="${profile.photo}" alt="${profile.alt}" class="people-card-photo vc-card-photo" loading="lazy">
      </div>
      <h3 class="people-card-name vc-card-name">${profile.name}</h3>
      <div class="people-card-designation vc-card-designation">${profile.designation}</div>
      <div class="people-card-institution vc-card-institution">${profile.institution}</div>
    </div>
  `;
}

/**
 * Renders the VC leadership card into all designated mount points across pages.
 */
function renderVcLeadershipProfile() {
  const mountContainers = document.querySelectorAll('.vc-leadership-mount, [data-vc-mount]');
  if (!mountContainers.length) return;

  const cardMarkup = createVcCardMarkup(VC_LEADERSHIP_PROFILE);
  mountContainers.forEach(container => {
    container.innerHTML = cardMarkup;
  });
}

// Immediate execution if DOM elements are already available
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderVcLeadershipProfile);
} else {
  renderVcLeadershipProfile();
}

// Expose on global window object for accessibility across scripts
if (typeof window !== 'undefined') {
  window.VC_LEADERSHIP_PROFILE = VC_LEADERSHIP_PROFILE;
  window.createVcCardMarkup = createVcCardMarkup;
  window.renderVcLeadershipProfile = renderVcLeadershipProfile;
}
