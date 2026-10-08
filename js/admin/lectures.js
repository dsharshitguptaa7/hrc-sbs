/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Lecture Series & Lectures CRUD Management
 */

let allSeries = [];
let allSpeakers = [];
let currentEditingSeriesId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  loadSpeakersForSelect();
  loadLectureSeries();
  setupFormListeners();
});

async function loadLectureSeries() {
  const table = document.getElementById('series-table-body');
  if (!table) return;

  const sb = getSupabase();
  if (!sb) {
    // Fallback seed visualization
    allSeries = [
      { id: '1', year: 2026, title: 'Centenary & Digital Legacy Harish-Chandra Colloquium', theme: 'One Century of Invariance', published: true, lectures_count: 2 },
      { id: '2', year: 2025, title: 'Second Annual Harish-Chandra Memorial Lecture', theme: 'Representations of Reductive Groups', published: true, lectures_count: 2 },
      { id: '3', year: 2024, title: 'Inaugural Harish-Chandra Memorial Colloquium', theme: 'Inaugural Foundations', published: true, lectures_count: 3 }
    ];
    renderSeriesTable(allSeries);
    return;
  }

  try {
    const { data, error } = await sb
      .from('lecture_series')
      .select('*, lectures(*)')
      .order('year', { ascending: false });

    if (error) throw error;
    allSeries = data || [];
    renderSeriesTable(allSeries);
  } catch (err) {
    console.error('[HRC Admin] Error loading series:', err);
    showToast('Failed to load lecture series: ' + err.message, 'error');
  }
}

function renderSeriesTable(seriesList) {
  const table = document.getElementById('series-table-body');
  if (!table) return;

  if (!seriesList.length) {
    table.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted);">No lecture series created yet.</td></tr>';
    return;
  }

  table.innerHTML = seriesList.map(item => `
    <tr>
      <td><strong style="font-size: 1.1rem; color: var(--admin-sidebar);">${item.year}</strong></td>
      <td>
        <strong>${escapeHtml(item.title)}</strong>
        <div style="font-size: 0.75rem; color: var(--admin-text-muted);">${escapeHtml(item.theme || 'No theme assigned')}</div>
      </td>
      <td>
        <span class="admin-badge admin-badge-primary">${item.lectures?.length ?? item.lectures_count ?? 0} Talks</span>
      </td>
      <td>
        <span class="admin-badge ${item.published ? 'admin-badge-success' : 'admin-badge-draft'}">
          ${item.published ? 'Published' : 'Draft'}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditSeriesModal('${item.id}')">Edit</button>
          <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openAddLectureModal('${item.id}', ${item.year})">+ Talk</button>
          <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteSeries('${item.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function loadSpeakersForSelect() {
  const select = document.getElementById('lecture-speaker-select');
  if (!select) return;

  const sb = getSupabase();
  if (!sb) {
    select.innerHTML = `
      <option value="s1">Prof. Manindra Agrawal (IIT Kanpur)</option>
      <option value="s2">Prof. Vinay Kumar Pathak (CSJMU)</option>
    `;
    return;
  }

  try {
    const { data } = await sb.from('speakers').select('id, name, institution').order('name');
    allSpeakers = data || [];
    select.innerHTML = allSpeakers.map(s => `
      <option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.institution || 'Scholar')})</option>
    `).join('');
  } catch (err) {
    console.error('[HRC Admin] Error loading speakers:', err);
  }
}

function setupFormListeners() {
  const seriesForm = document.getElementById('series-form');
  if (seriesForm) {
    seriesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveLectureSeries();
    });
  }

  const lectureForm = document.getElementById('lecture-form');
  if (lectureForm) {
    lectureForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveLecture();
    });
  }
}

function openCreateSeriesModal() {
  currentEditingSeriesId = null;
  document.getElementById('modal-series-title').textContent = 'Create New Lecture Year';
  document.getElementById('series-form').reset();
  document.getElementById('series-published').checked = true;
  document.getElementById('series-modal').classList.add('is-active');
}

function openEditSeriesModal(id) {
  const item = allSeries.find(s => s.id === id);
  if (!item) return;

  currentEditingSeriesId = id;
  document.getElementById('modal-series-title').textContent = `Edit Lecture Series (${item.year})`;
  document.getElementById('series-year').value = item.year;
  document.getElementById('series-title').value = item.title;
  document.getElementById('series-theme').value = item.theme || '';
  document.getElementById('series-desc').value = item.description || '';
  document.getElementById('series-published').checked = item.published;

  document.getElementById('series-modal').classList.add('is-active');
}

function closeSeriesModal() {
  document.getElementById('series-modal').classList.remove('is-active');
}

async function saveLectureSeries() {
  const year = parseInt(document.getElementById('series-year').value);
  const title = document.getElementById('series-title').value.trim();
  const theme = document.getElementById('series-theme').value.trim();
  const description = document.getElementById('series-desc').value.trim();
  const published = document.getElementById('series-published').checked;

  const sb = getSupabase();
  if (!sb) {
    showToast('Demo Mode: Lecture series updated in memory.');
    closeSeriesModal();
    return;
  }

  try {
    const payload = { year, title, theme, description, published, updated_at: new Date() };

    if (currentEditingSeriesId) {
      const { error } = await sb.from('lecture_series').update(payload).eq('id', currentEditingSeriesId);
      if (error) throw error;
      showToast('Lecture edition updated successfully.');
    } else {
      const { error } = await sb.from('lecture_series').insert([payload]);
      if (error) throw error;
      showToast('New lecture edition added.');
    }

    closeSeriesModal();
    loadLectureSeries();
  } catch (err) {
    console.error('[HRC Admin] Save series error:', err);
    showToast('Failed to save lecture edition: ' + err.message, 'error');
  }
}

async function deleteSeries(id) {
  if (!confirm('Are you sure you want to delete this lecture series edition and all associated lectures?')) return;

  const sb = getSupabase();
  if (!sb) {
    allSeries = allSeries.filter(s => s.id !== id);
    renderSeriesTable(allSeries);
    showToast('Demo Mode: Series deleted.');
    return;
  }

  try {
    const { error } = await sb.from('lecture_series').delete().eq('id', id);
    if (error) throw error;
    showToast('Lecture series deleted.');
    loadLectureSeries();
  } catch (err) {
    console.error('[HRC Admin] Delete series error:', err);
    showToast('Failed to delete series: ' + err.message, 'error');
  }
}

// Add Lecture Modal Handlers
let targetSeriesIdForLecture = null;

function openAddLectureModal(seriesId, year) {
  targetSeriesIdForLecture = seriesId;
  document.getElementById('lecture-modal-subtitle').textContent = `Adding lecture to ${year} Annual Colloquium`;
  document.getElementById('lecture-form').reset();
  document.getElementById('lecture-modal').classList.add('is-active');
}

function closeLectureModal() {
  document.getElementById('lecture-modal').classList.remove('is-active');
}

async function saveLecture() {
  const title = document.getElementById('lecture-title').value.trim();
  const venue = document.getElementById('lecture-venue').value.trim();
  const lectureDate = document.getElementById('lecture-date').value || null;
  const description = document.getElementById('lecture-desc').value.trim();
  const speakerId = document.getElementById('lecture-speaker-select').value;

  const sb = getSupabase();
  if (!sb) {
    showToast('Demo Mode: Lecture added to year.');
    closeLectureModal();
    return;
  }

  try {
    const { data: lecture, error } = await sb.from('lectures').insert([{
      lecture_series_id: targetSeriesIdForLecture,
      title,
      venue,
      lecture_date: lectureDate,
      description
    }]).select().single();

    if (error) throw error;

    if (speakerId && lecture) {
      await sb.from('lecture_speakers').insert([{
        lecture_id: lecture.id,
        speaker_id: speakerId
      }]);
    }

    showToast('Lecture and speaker association saved.');
    closeLectureModal();
    loadLectureSeries();
  } catch (err) {
    console.error('[HRC Admin] Save lecture error:', err);
    showToast('Error saving lecture: ' + err.message, 'error');
  }
}
