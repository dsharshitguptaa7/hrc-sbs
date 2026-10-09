/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Event Coordinators Management
 * 
 * Full CRUD, publish/unpublish toggle, filtering by event year & status,
 * display ordering, live preview, and error handling.
 */

let allCoordinators = [];
let currentEditingCoordinatorId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  loadCoordinators();
  setupCoordinatorForm();
  setupLivePreview();
});

async function loadCoordinators() {
  const table = document.getElementById('coordinators-table-body');
  if (!table) return;

  const sb = getSupabase();
  if (!sb) {
    showToast('Supabase client not initialized.', 'error');
    table.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--admin-danger);">Database client unavailable.</td></tr>';
    return;
  }

  try {
    const { data, error } = await sb
      .from('event_coordinators')
      .select('*')
      .order('event_year', { ascending: false })
      .order('display_order', { ascending: true })
      .order('full_name', { ascending: true });

    if (error) throw error;

    allCoordinators = data || [];
    populateYearFilter(allCoordinators);
    applyFilters();
  } catch (err) {
    console.error('[HRC Admin] Error loading coordinators:', err);
    showToast('Failed to load coordinators: ' + err.message, 'error');
    table.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--admin-danger);">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function populateYearFilter(coordinators) {
  const filterYear = document.getElementById('filter-year');
  if (!filterYear) return;

  const currentSelection = filterYear.value;
  const years = Array.from(new Set(coordinators.map(c => c.event_year))).filter(Boolean);
  years.sort((a, b) => b - a);

  let optionsHtml = '<option value="all">All Years</option>';
  years.forEach(yr => {
    optionsHtml += `<option value="${yr}">${yr}</option>`;
  });

  filterYear.innerHTML = optionsHtml;
  if (years.includes(parseInt(currentSelection, 10)) || currentSelection === 'all') {
    filterYear.value = currentSelection;
  }
}

function applyFilters() {
  const filterYearVal = document.getElementById('filter-year')?.value || 'all';
  const filterStatusVal = document.getElementById('filter-status')?.value || 'all';

  let filtered = allCoordinators.slice();

  if (filterYearVal !== 'all') {
    const targetYr = parseInt(filterYearVal, 10);
    filtered = filtered.filter(c => c.event_year === targetYr);
  }

  if (filterStatusVal === 'published') {
    filtered = filtered.filter(c => c.published === true);
  } else if (filterStatusVal === 'draft') {
    filtered = filtered.filter(c => c.published === false);
  }

  const counter = document.getElementById('coordinators-counter');
  if (counter) {
    counter.textContent = `Showing ${filtered.length} of ${allCoordinators.length} records`;
  }

  renderCoordinatorsTable(filtered);
}

function renderCoordinatorsTable(coordinators) {
  const table = document.getElementById('coordinators-table-body');
  if (!table) return;

  if (!coordinators.length) {
    table.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--admin-text-muted); padding: 2rem;">No event coordinators found matching your filter criteria.</td></tr>';
    return;
  }

  table.innerHTML = coordinators.map(coord => {
    const isPub = coord.published;
    return `
      <tr>
        <td>
          <strong>${escapeHtml(coord.full_name)}</strong>
          ${coord.bio ? `<div style="font-size: 0.75rem; color: var(--admin-text-muted); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(coord.bio)}</div>` : ''}
        </td>
        <td>
          <div style="font-size: 0.84rem; font-weight: 600; color: var(--admin-blue);">${escapeHtml(coord.course)}</div>
          <div style="font-size: 0.74rem; color: var(--admin-text-muted);">${escapeHtml(coord.department || '—')}</div>
        </td>
        <td>
          <span class="admin-badge admin-badge-primary">${coord.event_year}</span>
        </td>
        <td>${escapeHtml(coord.academic_year || '—')}</td>
        <td style="max-width: 240px;">
          <div style="font-size: 0.82rem; font-style: italic; color: var(--admin-sidebar); line-height: 1.35;">${escapeHtml(coord.credit_role)}</div>
        </td>
        <td>${coord.display_order ?? 0}</td>
        <td>
          <span class="admin-badge ${isPub ? 'admin-badge-success' : 'admin-badge-draft'}" style="cursor: pointer;" onclick="togglePublishCoordinator('${coord.id}', ${!isPub})" title="Click to quick toggle status">
            ${isPub ? 'Published' : 'Draft'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditCoordinatorModal('${coord.id}')">Edit</button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteCoordinator('${coord.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function setupCoordinatorForm() {
  const form = document.getElementById('coordinator-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveCoordinator();
    });
  }
}

function setupLivePreview() {
  const inputs = ['coord-full-name', 'coord-course', 'coord-department', 'coord-institution', 'coord-academic-year', 'coord-event-year', 'coord-credit-role'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateCardPreview);
    }
  });
}

function updateCardPreview() {
  const box = document.getElementById('coord-preview-box');
  if (!box) return;

  const name = document.getElementById('coord-full-name')?.value.trim() || 'Coordinator Name';
  const course = document.getElementById('coord-course')?.value.trim() || 'Course Program';
  const role = document.getElementById('coord-credit-role')?.value.trim() || 'Credit & Initiative Role';
  const yr = document.getElementById('coord-event-year')?.value.trim() || '2026';
  const acadYr = document.getElementById('coord-academic-year')?.value.trim() || '';

  box.innerHTML = `
    <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-top: 3px solid #C9A227; border-radius: 6px; padding: 0.8rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <strong style="color: #0B1F33; font-size: 0.95rem;">${escapeHtml(name)}</strong>
        <span style="font-size: 0.72rem; color: #1E4E79; font-weight: 600;">Year ${escapeHtml(yr)}</span>
      </div>
      <div style="color: #1E4E79; font-size: 0.8rem; font-weight: 500;">${escapeHtml(course)} ${acadYr ? `(${escapeHtml(acadYr)})` : ''}</div>
      <div style="font-size: 0.78rem; font-style: italic; color: #475569; margin-top: 0.4rem; border-top: 1px solid #E2E8F0; padding-top: 0.3rem;">
        Role: ${escapeHtml(role)}
      </div>
    </div>
  `;
}

function openCreateCoordinatorModal() {
  currentEditingCoordinatorId = null;
  document.getElementById('modal-coordinator-title').textContent = 'Add Event Coordinator';
  document.getElementById('coordinator-form').reset();
  
  // Set default values
  document.getElementById('coord-event-year').value = new Date().getFullYear();
  document.getElementById('coord-academic-year').value = '2025–2027';
  document.getElementById('coord-department').value = 'Department of Mathematics';
  document.getElementById('coord-institution').value = 'School of Basic Sciences, CSJMU';
  document.getElementById('coord-display-order').value = '0';
  document.getElementById('coord-published').checked = true;

  updateCardPreview();
  document.getElementById('coordinator-modal').classList.add('is-active');
}

function openEditCoordinatorModal(id) {
  const coord = allCoordinators.find(c => c.id === id);
  if (!coord) return;

  currentEditingCoordinatorId = id;
  document.getElementById('modal-coordinator-title').textContent = `Edit Coordinator: ${coord.full_name}`;
  
  document.getElementById('coord-full-name').value = coord.full_name || '';
  document.getElementById('coord-event-year').value = coord.event_year || '';
  document.getElementById('coord-course').value = coord.course || '';
  document.getElementById('coord-academic-year').value = coord.academic_year || '';
  document.getElementById('coord-department').value = coord.department || '';
  document.getElementById('coord-institution').value = coord.institution || '';
  document.getElementById('coord-credit-role').value = coord.credit_role || '';
  document.getElementById('coord-bio').value = coord.bio || '';
  document.getElementById('coord-display-order').value = coord.display_order ?? 0;
  document.getElementById('coord-published').checked = Boolean(coord.published);

  updateCardPreview();
  document.getElementById('coordinator-modal').classList.add('is-active');
}

function closeCoordinatorModal() {
  document.getElementById('coordinator-modal').classList.remove('is-active');
}

async function saveCoordinator() {
  const full_name = document.getElementById('coord-full-name').value.trim();
  const event_year = parseInt(document.getElementById('coord-event-year').value.trim(), 10);
  const course = document.getElementById('coord-course').value.trim();
  const academic_year = document.getElementById('coord-academic-year').value.trim();
  const department = document.getElementById('coord-department').value.trim();
  const institution = document.getElementById('coord-institution').value.trim();
  const credit_role = document.getElementById('coord-credit-role').value.trim();
  const bio = document.getElementById('coord-bio').value.trim();
  const display_order = parseInt(document.getElementById('coord-display-order').value || '0', 10);
  const published = document.getElementById('coord-published').checked;

  if (!full_name || !course || !credit_role || isNaN(event_year)) {
    showToast('Please fill in all required fields (Name, Event Year, Course, Role).', 'error');
    return;
  }

  const sb = getSupabase();
  if (!sb) {
    showToast('Supabase client unavailable.', 'error');
    return;
  }

  const saveBtn = document.getElementById('btn-save-coordinator');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  try {
    const payload = {
      full_name,
      event_year,
      course,
      academic_year,
      department,
      institution,
      credit_role,
      bio: bio || null,
      display_order,
      published,
      updated_at: new Date().toISOString()
    };

    if (currentEditingCoordinatorId) {
      const { error } = await sb
        .from('event_coordinators')
        .update(payload)
        .eq('id', currentEditingCoordinatorId);

      if (error) throw error;
      showToast('Coordinator details updated successfully.');
    } else {
      const { error } = await sb
        .from('event_coordinators')
        .insert([payload]);

      if (error) throw error;
      showToast('New event coordinator added successfully.');
    }

    closeCoordinatorModal();
    await loadCoordinators();
  } catch (err) {
    console.error('[HRC Admin] Save coordinator error:', err);
    showToast('Failed to save coordinator: ' + err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Coordinator';
    }
  }
}

async function togglePublishCoordinator(id, newStatus) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb
      .from('event_coordinators')
      .update({ published: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    showToast(newStatus ? 'Coordinator published.' : 'Coordinator moved to draft.');
    await loadCoordinators();
  } catch (err) {
    console.error('[HRC Admin] Toggle publish error:', err);
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

async function deleteCoordinator(id) {
  const coord = allCoordinators.find(c => c.id === id);
  const name = coord ? coord.full_name : 'this coordinator';

  if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
    return;
  }

  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb
      .from('event_coordinators')
      .delete()
      .eq('id', id);

    if (error) throw error;
    showToast('Coordinator deleted successfully.');
    await loadCoordinators();
  } catch (err) {
    console.error('[HRC Admin] Delete coordinator error:', err);
    showToast('Failed to delete coordinator: ' + err.message, 'error');
  }
}
