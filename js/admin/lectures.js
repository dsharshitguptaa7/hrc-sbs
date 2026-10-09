/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Lecture Series & Lectures CRUD Management
 */

let allSeries = [];
let allSpeakers = [];
let currentEditingSeriesId = null;
let currentEditingLectureId = null;
let targetSeriesIdForLecture = null;

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
    allSeries = [];
    renderSeriesTable(allSeries);
    return;
  }

  try {
    const { data, error } = await sb
      .from('lecture_series')
      .select(`
        *,
        lectures (
          *,
          lecture_speakers (
            speaker_id,
            speakers (id, name, institution)
          )
        )
      `)
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

  table.innerHTML = seriesList.map(item => {
    const lectures = Array.isArray(item.lectures) ? item.lectures : [];
    const count = lectures.length;

    const lecturesListHtml = lectures.length ? `
      <div style="margin-top: 0.6rem; display: flex; flex-direction: column; gap: 0.4rem;">
        ${lectures.map(lec => {
          const speakerName = lec.lecture_speakers?.[0]?.speakers?.name || 'No speaker assigned';
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: rgba(11, 31, 51, 0.04); padding: 0.45rem 0.65rem; border-radius: 4px; font-size: 0.8rem; border-left: 2px solid var(--admin-gold);">
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: 600; color: var(--admin-sidebar); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(lec.title)}">
                  ${escapeHtml(lec.title)}
                </div>
                <div style="font-size: 0.72rem; color: var(--admin-text-muted);">
                  👤 ${escapeHtml(speakerName)} ${lec.lecture_date ? `· 📅 ${escapeHtml(lec.lecture_date)}` : ''}
                </div>
              </div>
              <div style="display: flex; gap: 0.3rem; flex-shrink: 0;">
                <button type="button" class="admin-btn admin-btn-sm admin-btn-outline" style="padding: 0.15rem 0.45rem; font-size: 0.72rem;" onclick="openEditLectureModal('${lec.id}', '${item.id}', ${item.year})" title="Edit talk title, speaker, and details">Edit</button>
                <button type="button" class="admin-btn admin-btn-sm admin-btn-danger" style="padding: 0.15rem 0.45rem; font-size: 0.72rem;" onclick="deleteLecture('${lec.id}')" title="Delete talk">✕</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : '<div style="font-size: 0.75rem; color: var(--admin-text-muted); margin-top: 0.4rem; font-style: italic;">No talks attached yet. Click "+ Talk" to add.</div>';

    return `
      <tr>
        <td style="vertical-align: top;"><strong style="font-size: 1.15rem; color: var(--admin-sidebar); font-family: 'Playfair Display', serif;">${item.year}</strong></td>
        <td style="vertical-align: top;">
          <strong style="font-size: 0.95rem;">${escapeHtml(item.title)}</strong>
          ${item.theme ? `<div style="font-size: 0.75rem; color: var(--admin-gold); font-weight: 600; text-transform: uppercase; margin-top: 0.15rem;">${escapeHtml(item.theme)}</div>` : ''}
          ${item.description ? `<p style="font-size: 0.8rem; color: var(--admin-text-muted); margin-top: 0.3rem; line-height: 1.4;">${escapeHtml(item.description)}</p>` : ''}
        </td>
        <td style="vertical-align: top; min-width: 280px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2rem;">
            <span class="admin-badge admin-badge-primary">${count} ${count === 1 ? 'Talk' : 'Talks'}</span>
            <button class="admin-btn admin-btn-sm admin-btn-outline" style="padding: 0.15rem 0.5rem; font-size: 0.72rem;" onclick="openAddLectureModal('${item.id}', ${item.year})">+ Add Talk</button>
          </div>
          ${lecturesListHtml}
        </td>
        <td style="vertical-align: top;">
          <span class="admin-badge ${item.published ? 'admin-badge-success' : 'admin-badge-draft'}">
            ${item.published ? 'Published' : 'Draft'}
          </span>
        </td>
        <td style="vertical-align: top;">
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditSeriesModal('${item.id}')">Edit Series</button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteSeries('${item.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadSpeakersForSelect() {
  const select = document.getElementById('lecture-speaker-select');
  if (!select) return;

  const sb = getSupabase();
  if (!sb) return;

  try {
    const { data, error } = await sb.from('speakers').select('id, name, institution').order('name');
    if (error) throw error;
    allSpeakers = data || [];
    select.innerHTML = '<option value="">-- Select Speaker (Optional) --</option>' + allSpeakers.map(s => `
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
  const year = parseInt(document.getElementById('series-year').value, 10);
  const title = document.getElementById('series-title').value.trim();
  const theme = document.getElementById('series-theme').value.trim();
  const description = document.getElementById('series-desc').value.trim();
  const published = document.getElementById('series-published').checked;

  if (!year || isNaN(year)) {
    showToast('Please enter a valid year.', 'error');
    return;
  }

  if (!title) {
    showToast('Colloquium title is required.', 'error');
    return;
  }

  const sb = getSupabase();
  if (!sb) {
    showToast('Database unavailable.', 'error');
    return;
  }

  try {
    const payload = {
      year,
      title,
      theme: theme || null,
      description: description || null,
      published,
      updated_at: new Date()
    };

    if (currentEditingSeriesId) {
      const { error } = await sb.from('lecture_series').update(payload).eq('id', currentEditingSeriesId);
      if (error) throw error;
      showToast('Lecture series updated successfully.');
    } else {
      const { error } = await sb.from('lecture_series').insert([payload]);
      if (error) throw error;
      showToast('New lecture series created.');
    }

    closeSeriesModal();
    await loadLectureSeries();
  } catch (err) {
    console.error('[HRC Admin] Save series error:', err);
    showToast('Failed to save lecture series: ' + (err.message || 'Unknown error'), 'error');
  }
}

async function deleteSeries(id) {
  const item = allSeries.find(s => s.id === id);
  const year = item ? item.year : '';
  if (!confirm(`Are you sure you want to delete the ${year} lecture series edition and all associated lectures? This action cannot be undone.`)) {
    return;
  }

  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb.from('lecture_series').delete().eq('id', id);
    if (error) throw error;
    showToast('Lecture series deleted successfully.');
    await loadLectureSeries();
  } catch (err) {
    console.error('[HRC Admin] Delete series error:', err);
    showToast('Failed to delete series: ' + err.message, 'error');
  }
}

// Lecture Modal Handlers (Add & Edit)
function openAddLectureModal(seriesId, year) {
  targetSeriesIdForLecture = seriesId;
  currentEditingLectureId = null;

  const titleEl = document.getElementById('modal-lecture-title');
  const submitBtn = document.getElementById('lecture-submit-btn');
  if (titleEl) titleEl.textContent = 'Add Academic Lecture / Talk';
  if (submitBtn) submitBtn.textContent = 'Attach Talk to Year';

  document.getElementById('lecture-modal-subtitle').textContent = `Adding talk to ${year} Annual Colloquium`;
  document.getElementById('lecture-form').reset();
  document.getElementById('lecture-modal').classList.add('is-active');
}

function openEditLectureModal(lectureId, seriesId, year) {
  targetSeriesIdForLecture = seriesId;
  currentEditingLectureId = lectureId;

  // Find lecture from allSeries
  let foundLecture = null;
  for (const s of allSeries) {
    const l = s.lectures?.find(item => item.id === lectureId);
    if (l) {
      foundLecture = l;
      break;
    }
  }

  if (!foundLecture) return;

  const titleEl = document.getElementById('modal-lecture-title');
  const submitBtn = document.getElementById('lecture-submit-btn');
  if (titleEl) titleEl.textContent = 'Edit Academic Lecture / Talk';
  if (submitBtn) submitBtn.textContent = 'Update Lecture';

  document.getElementById('lecture-modal-subtitle').textContent = `Editing lecture for ${year} Annual Colloquium`;
  document.getElementById('lecture-title').value = foundLecture.title || '';
  document.getElementById('lecture-venue').value = foundLecture.venue || '';
  document.getElementById('lecture-date').value = foundLecture.lecture_date || '';
  document.getElementById('lecture-desc').value = foundLecture.description || '';

  const speakerId = foundLecture.lecture_speakers?.[0]?.speaker_id || '';
  document.getElementById('lecture-speaker-select').value = speakerId;

  document.getElementById('lecture-modal').classList.add('is-active');
}

function closeLectureModal() {
  document.getElementById('lecture-modal').classList.remove('is-active');
  currentEditingLectureId = null;
}

async function saveLecture() {
  const title = document.getElementById('lecture-title').value.trim();
  const venue = document.getElementById('lecture-venue').value.trim();
  const lectureDate = document.getElementById('lecture-date').value || null;
  const description = document.getElementById('lecture-desc').value.trim();
  const speakerId = document.getElementById('lecture-speaker-select').value;

  if (!title) {
    showToast('Lecture title is required.', 'error');
    return;
  }

  const sb = getSupabase();
  if (!sb) {
    showToast('Database unavailable.', 'error');
    return;
  }

  const submitBtn = document.getElementById('lecture-submit-btn');
  const originalText = submitBtn ? submitBtn.textContent : 'Saving...';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    if (currentEditingLectureId) {
      // UPDATE existing lecture
      const { error: updateErr } = await sb
        .from('lectures')
        .update({
          title,
          venue: venue || null,
          lecture_date: lectureDate,
          description: description || null,
          updated_at: new Date()
        })
        .eq('id', currentEditingLectureId);

      if (updateErr) throw updateErr;

      // Update speaker association: delete existing links and insert new if speaker selected
      await sb.from('lecture_speakers').delete().eq('lecture_id', currentEditingLectureId);

      if (speakerId) {
        const { error: spErr } = await sb.from('lecture_speakers').insert([{
          lecture_id: currentEditingLectureId,
          speaker_id: speakerId
        }]);
        if (spErr) console.warn('[HRC Admin] Speaker association notice:', spErr);
      }

      showToast('Lecture updated successfully.');
    } else {
      // INSERT new lecture
      const { data: lecture, error: insertErr } = await sb
        .from('lectures')
        .insert([{
          lecture_series_id: targetSeriesIdForLecture,
          title,
          venue: venue || null,
          lecture_date: lectureDate,
          description: description || null
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      if (speakerId && lecture) {
        const { error: spErr } = await sb.from('lecture_speakers').insert([{
          lecture_id: lecture.id,
          speaker_id: speakerId
        }]);
        if (spErr) console.warn('[HRC Admin] Speaker association notice:', spErr);
      }

      showToast('Lecture added to year successfully.');
    }

    closeLectureModal();
    await loadLectureSeries();
  } catch (err) {
    console.error('[HRC Admin] Save lecture error:', err);
    showToast('Failed to save lecture: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

async function deleteLecture(lectureId) {
  if (!confirm('Are you sure you want to delete this lecture?')) return;

  const sb = getSupabase();
  if (!sb) return;

  try {
    const { error } = await sb.from('lectures').delete().eq('id', lectureId);
    if (error) throw error;
    showToast('Lecture deleted successfully.');
    await loadLectureSeries();
  } catch (err) {
    console.error('[HRC Admin] Delete lecture error:', err);
    showToast('Failed to delete lecture: ' + err.message, 'error');
  }
}
