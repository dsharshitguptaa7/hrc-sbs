/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Events Management
 */

let allEvents = [];
let currentEditingEventId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  loadEvents();
  setupEventForm();
});

async function loadEvents() {
  const table = document.getElementById('events-table-body');
  if (!table) return;

  const sb = getSupabase();
  if (!sb) {
    allEvents = [
      { id: '1', title: 'Centenary Colloquium 2026', event_date: '2026-10-11', category: 'lecture', location: 'CSJMU Kanpur', published: true },
      { id: '2', title: 'Workshop on Lie Algebras & Symmetries', event_date: '2025-11-18', category: 'workshop', location: 'School of Basic Sciences', published: true },
      { id: '3', title: 'Second Annual Memorial Lecture', event_date: '2025-10-11', category: 'lecture', location: 'CSJMU × IITK Joint Hall', published: true }
    ];
    renderEventsTable(allEvents);
    return;
  }

  try {
    const { data, error } = await sb.from('events').select('*').order('event_date', { ascending: false });
    if (error) throw error;
    allEvents = data || [];
    renderEventsTable(allEvents);
  } catch (err) {
    console.error('[HRC Admin] Error loading events:', err);
    showToast('Failed to load events: ' + err.message, 'error');
  }
}

function renderEventsTable(events) {
  const table = document.getElementById('events-table-body');
  if (!table) return;

  if (!events.length) {
    table.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted);">No calendar events catalogued yet.</td></tr>';
    return;
  }

  table.innerHTML = events.map(ev => `
    <tr>
      <td><strong>${escapeHtml(ev.title)}</strong></td>
      <td><span class="admin-badge admin-badge-primary">${escapeHtml(ev.category)}</span></td>
      <td>${ev.event_date ? new Date(ev.event_date).toLocaleDateString() : 'TBA'}</td>
      <td>
        <span class="admin-badge ${ev.published ? 'admin-badge-success' : 'admin-badge-draft'}">
          ${ev.published ? 'Published' : 'Draft'}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditEventModal('${ev.id}')">Edit</button>
          <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteEvent('${ev.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupEventForm() {
  const form = document.getElementById('event-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveEvent();
    });
  }
}

function openCreateEventModal() {
  currentEditingEventId = null;
  document.getElementById('modal-event-title').textContent = 'Add Calendar Event';
  document.getElementById('event-form').reset();
  document.getElementById('event-published').checked = true;
  document.getElementById('event-modal').classList.add('is-active');
}

function openEditEventModal(id) {
  const ev = allEvents.find(e => e.id === id);
  if (!ev) return;

  currentEditingEventId = id;
  document.getElementById('modal-event-title').textContent = `Edit Event: ${ev.title}`;
  document.getElementById('event-title').value = ev.title;
  document.getElementById('event-category').value = ev.category || 'lecture';
  document.getElementById('event-date').value = ev.event_date || '';
  document.getElementById('event-location').value = ev.location || '';
  document.getElementById('event-desc').value = ev.description || '';
  document.getElementById('event-reg-url').value = ev.registration_url || '';
  document.getElementById('event-published').checked = ev.published;

  document.getElementById('event-modal').classList.add('is-active');
}

function closeEventModal() {
  document.getElementById('event-modal').classList.remove('is-active');
}

async function saveEvent() {
  const title = document.getElementById('event-title').value.trim();
  const category = document.getElementById('event-category').value;
  const event_date = document.getElementById('event-date').value;
  const location = document.getElementById('event-location').value.trim();
  const description = document.getElementById('event-desc').value.trim();
  const registration_url = document.getElementById('event-reg-url').value.trim();
  const published = document.getElementById('event-published').checked;

  const sb = getSupabase();
  if (!sb) {
    showToast('Demo Mode: Event saved.');
    closeEventModal();
    return;
  }

  try {
    const payload = { title, category, event_date, location, description, registration_url, published, updated_at: new Date() };

    if (currentEditingEventId) {
      const { error } = await sb.from('events').update(payload).eq('id', currentEditingEventId);
      if (error) throw error;
      showToast('Event updated successfully.');
    } else {
      const { error } = await sb.from('events').insert([payload]);
      if (error) throw error;
      showToast('New event scheduled.');
    }

    closeEventModal();
    loadEvents();
  } catch (err) {
    console.error('[HRC Admin] Save event error:', err);
    showToast('Failed to save event: ' + err.message, 'error');
  }
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;

  const sb = getSupabase();
  if (!sb) {
    allEvents = allEvents.filter(e => e.id !== id);
    renderEventsTable(allEvents);
    showToast('Demo Mode: Event deleted.');
    return;
  }

  try {
    const { error } = await sb.from('events').delete().eq('id', id);
    if (error) throw error;
    showToast('Event deleted.');
    loadEvents();
  } catch (err) {
    console.error('[HRC Admin] Delete event error:', err);
    showToast('Failed to delete event: ' + err.message, 'error');
  }
}
