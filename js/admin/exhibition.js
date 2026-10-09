/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Digital Legacy 2026 Student Projects Manager
 * 12 Competition Tracks - CRUD & Publication Management
 */

const OFFICIAL_TRACKS = {
  1: { title: 'Digital Biography', slug: 'biography' },
  2: { title: 'Legacy of Harish-Chandra', slug: 'legacy' },
  3: { title: 'Harish-Chandra Digital Archive', slug: 'archive' },
  4: { title: 'The Harish-Chandra Timeline', slug: 'timeline' },
  5: { title: 'Research Explorer', slug: 'research-explorer' },
  6: { title: 'Harish-Chandra Quiz', slug: 'quiz' },
  7: { title: 'Know Harish-Chandra', slug: 'know-harishchandra' },
  8: { title: 'Legacy Map', slug: 'legacy-map' },
  9: { title: 'Digital Tribute Wall', slug: 'tribute-wall' },
  10: { title: 'Harish-Chandra Day 2026 Microsite', slug: 'harishchandra-day' },
  11: { title: 'Then & Now', slug: 'then-and-now' },
  12: { title: 'Interactive Exhibition', slug: 'interactive-exhibition' }
};

let allProjects = [];
let currentEditingProjectId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  loadExhibitionProjects();
  setupProjectForm();
});

function handleTrackSelectChange() {
  const select = document.getElementById('project-track-select');
  const trackNum = parseInt(select.value, 10);
  const trackNameInput = document.getElementById('project-track-name');
  if (trackNum && OFFICIAL_TRACKS[trackNum]) {
    trackNameInput.value = OFFICIAL_TRACKS[trackNum].title;
  }
}

async function loadExhibitionProjects() {
  const table = document.getElementById('exhibition-table-body');
  if (!table) return;

  const sb = getSupabase();
  if (!sb) {
    allProjects = [];
    renderProjectsTable(allProjects);
    return;
  }

  try {
    const { data, error } = await sb
      .from('exhibition_projects')
      .select('*')
      .order('track_number', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    allProjects = data || [];
    renderProjectsTable(allProjects);
  } catch (err) {
    console.error('[HRC Admin] Error loading exhibition projects:', err);
    showToast('Failed to load exhibition projects: ' + err.message, 'error');
  }
}

function renderProjectsTable(projects) {
  const table = document.getElementById('exhibition-table-body');
  if (!table) return;

  if (!projects || projects.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem 1rem; color: var(--admin-text-muted);">
          <div style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--admin-sidebar);">No student projects recorded yet.</div>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">Click "<strong>+ Add Student Project</strong>" above to add completed tracks by student teams.</p>
          <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="openAddProjectModal()">+ Add First Project</button>
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = projects.map(p => {
    const trackNumStr = String(p.track_number).padStart(2, '0');
    const trackTitle = escapeHtml(p.title || OFFICIAL_TRACKS[p.track_number]?.title || `Track ${trackNumStr}`);
    const student = escapeHtml(p.student_name || p.team_name || '—');
    const course = escapeHtml(p.course || '—');
    const year = p.year || 2026;
    const projectUrl = p.project_url ? escapeHtml(p.project_url) : '';
    const isPub = !!p.published;

    return `
      <tr>
        <td>
          <strong style="color: var(--admin-gold); font-size: 1.05rem; font-family: 'Playfair Display', serif;">Track ${trackNumStr}</strong>
        </td>
        <td>
          <strong>${trackTitle}</strong>
        </td>
        <td>
          <span style="font-weight: 500;">${student}</span>
        </td>
        <td>
          <span style="color: var(--admin-text-muted);">${course}</span>
        </td>
        <td>
          <span>${year}</span>
        </td>
        <td>
          ${projectUrl ? `
            <a href="${projectUrl}" target="_blank" rel="noopener noreferrer" class="admin-btn admin-btn-sm admin-btn-outline" style="display: inline-flex; align-items: center; gap: 0.3rem;">
              <span>View Link</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          ` : '<span style="color: var(--admin-text-muted); font-size: 0.8rem;">No URL</span>'}
        </td>
        <td>
          <button type="button" class="admin-badge ${isPub ? 'admin-badge-success' : 'admin-badge-draft'}" style="cursor: pointer; border: none;" onclick="togglePublish('${p.id}', ${!isPub})" title="Click to toggle publish status">
            ${isPub ? 'Published' : 'Draft'}
          </button>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditProjectModal('${p.id}')">Edit</button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteProject('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddProjectModal() {
  currentEditingProjectId = null;
  document.getElementById('modal-project-title').textContent = 'Add Student Project';
  document.getElementById('project-submit-btn').textContent = 'Save Project';

  document.getElementById('project-track-select').value = '';
  document.getElementById('project-track-name').value = '';
  document.getElementById('project-student-name').value = '';
  document.getElementById('project-course').value = '';
  document.getElementById('project-year').value = '2026';
  document.getElementById('project-url').value = '';
  document.getElementById('project-published').checked = true;

  document.getElementById('track-modal').classList.add('is-active');
}

function openEditProjectModal(id) {
  const p = allProjects.find(item => item.id === id);
  if (!p) return;

  currentEditingProjectId = id;
  const trackNumStr = String(p.track_number).padStart(2, '0');
  document.getElementById('modal-project-title').textContent = `Edit Track ${trackNumStr} Project`;
  document.getElementById('project-submit-btn').textContent = 'Update Project';

  document.getElementById('project-track-select').value = String(p.track_number);
  document.getElementById('project-track-name').value = p.title || OFFICIAL_TRACKS[p.track_number]?.title || '';
  document.getElementById('project-student-name').value = p.student_name || p.team_name || '';
  document.getElementById('project-course').value = p.course || '';
  document.getElementById('project-year').value = p.year || 2026;
  document.getElementById('project-url').value = p.project_url || '';
  document.getElementById('project-published').checked = !!p.published;

  document.getElementById('track-modal').classList.add('is-active');
}

function closeProjectModal() {
  document.getElementById('track-modal').classList.remove('is-active');
}

function setupProjectForm() {
  const form = document.getElementById('project-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProject();
    });
  }
}

function generateSlug(trackNumber, trackName, studentName) {
  const baseTrack = OFFICIAL_TRACKS[trackNumber]?.slug || `track-${trackNumber}`;
  const cleanStudent = (studentName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const timestamp = Date.now().toString().slice(-6);
  return `${baseTrack}-${cleanStudent || 'proj'}-${timestamp}`;
}

async function saveProject() {
  const track_number = parseInt(document.getElementById('project-track-select').value, 10);
  const title = document.getElementById('project-track-name').value.trim();
  const student_name = document.getElementById('project-student-name').value.trim();
  const course = document.getElementById('project-course').value.trim();
  const year = parseInt(document.getElementById('project-year').value, 10) || 2026;
  const project_url = document.getElementById('project-url').value.trim();
  const published = document.getElementById('project-published').checked;

  if (!track_number || track_number < 1 || track_number > 12) {
    showToast('Please select a valid track between 01 and 12.', 'error');
    return;
  }

  if (!title) {
    showToast('Track Name is required.', 'error');
    return;
  }

  if (!student_name) {
    showToast('Student Name is required.', 'error');
    return;
  }

  // Validate URL: Must be a valid http:// or https:// URL
  if (!project_url || !/^https?:\/\/.+/i.test(project_url)) {
    showToast('Project URL must be a valid link starting with http:// or https://', 'error');
    return;
  }

  try {
    new URL(project_url);
  } catch (_) {
    showToast('Please enter a valid Project URL format.', 'error');
    return;
  }

  const sb = getSupabase();
  if (!sb) {
    showToast('Database client unavailable.', 'error');
    return;
  }

  const submitBtn = document.getElementById('project-submit-btn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const payload = {
      track_number,
      title,
      student_name,
      team_name: student_name,
      year,
      project_url,
      published,
      updated_at: new Date()
    };

    // Include course field
    if (course) {
      payload.course = course;
    } else {
      payload.course = null;
    }

    if (currentEditingProjectId) {
      // UPDATE
      let { error } = await sb.from('exhibition_projects').update(payload).eq('id', currentEditingProjectId);
      if (error && error.message && error.message.includes('course')) {
        // Fallback if course column was not yet applied
        delete payload.course;
        const res = await sb.from('exhibition_projects').update(payload).eq('id', currentEditingProjectId);
        if (res.error) throw res.error;
      } else if (error) {
        throw error;
      }
      showToast('Project updated successfully.');
    } else {
      // INSERT
      payload.slug = generateSlug(track_number, title, student_name);
      let { error } = await sb.from('exhibition_projects').insert([payload]);
      if (error && error.message && error.message.includes('course')) {
        // Fallback if course column was not yet applied
        delete payload.course;
        const res = await sb.from('exhibition_projects').insert([payload]);
        if (res.error) throw res.error;
      } else if (error) {
        throw error;
      }
      showToast('Student project added successfully.');
    }

    closeProjectModal();
    await loadExhibitionProjects();
  } catch (err) {
    console.error('[HRC Admin] Save project error:', err);
    showToast('Failed to save project: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function togglePublish(id, newStatus) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb.from('exhibition_projects').update({
      published: newStatus,
      updated_at: new Date()
    }).eq('id', id);

    if (error) throw error;
    showToast(newStatus ? 'Project published.' : 'Project moved to draft.');
    await loadExhibitionProjects();
  } catch (err) {
    console.error('[HRC Admin] Toggle publish error:', err);
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

async function deleteProject(id) {
  const p = allProjects.find(item => item.id === id);
  const trackNum = p ? String(p.track_number).padStart(2, '0') : '';
  const student = p ? p.student_name : 'this project';

  if (!confirm(`Are you sure you want to delete Track ${trackNum} project by "${student}"? This action cannot be undone.`)) {
    return;
  }

  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb.from('exhibition_projects').delete().eq('id', id);
    if (error) throw error;
    showToast('Project deleted successfully.');
    await loadExhibitionProjects();
  } catch (err) {
    console.error('[HRC Admin] Delete project error:', err);
    showToast('Failed to delete project: ' + err.message, 'error');
  }
}
