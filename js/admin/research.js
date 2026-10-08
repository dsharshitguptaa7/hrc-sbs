/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Research Papers & Preprints Management
 */

let allPapers = [];
let currentEditingPaperId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  loadResearchPapers();
  setupResearchForm();
});

async function loadResearchPapers() {
  const table = document.getElementById('papers-table-body');
  if (!table) return;

  const sb = getSupabase();
  if (!sb) {
    allPapers = [
      { id: '1', title: 'Representations of Semisimple Lie Groups II', authors: 'Harish-Chandra', publication_year: 1954, category: 'Representation Theory', journal: 'Transactions of AMS', published: true },
      { id: '2', title: 'The Characters of Semisimple Lie Groups', authors: 'Harish-Chandra', publication_year: 1956, category: 'Harmonic Analysis', journal: 'American Journal of Mathematics', published: true },
      { id: '3', title: 'Discrete Series for Semisimple Lie Groups I', authors: 'Harish-Chandra', publication_year: 1965, category: 'Harmonic Analysis', journal: 'Acta Mathematica', published: true }
    ];
    renderPapersTable(allPapers);
    return;
  }

  try {
    const { data, error } = await sb.from('research_papers').select('*').order('publication_year', { ascending: false });
    if (error) throw error;
    allPapers = data || [];
    renderPapersTable(allPapers);
  } catch (err) {
    console.error('[HRC Admin] Error loading research papers:', err);
    showToast('Failed to load papers: ' + err.message, 'error');
  }
}

function renderPapersTable(papers) {
  const table = document.getElementById('papers-table-body');
  if (!table) return;

  if (!papers.length) {
    table.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted);">No papers catalogued yet.</td></tr>';
    return;
  }

  table.innerHTML = papers.map(p => `
    <tr>
      <td><strong style="color: var(--admin-sidebar);">${p.publication_year}</strong></td>
      <td>
        <strong>${escapeHtml(p.title)}</strong>
        <div style="font-size: 0.74rem; color: var(--admin-text-muted);">${escapeHtml(p.authors)}</div>
      </td>
      <td><span class="admin-badge admin-badge-primary">${escapeHtml(p.category)}</span></td>
      <td><span class="admin-badge ${p.published ? 'admin-badge-success' : 'admin-badge-draft'}">${p.published ? 'Published' : 'Draft'}</span></td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="admin-btn admin-btn-sm admin-btn-outline" onclick="openEditPaperModal('${p.id}')">Edit</button>
          <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deletePaper('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupResearchForm() {
  const form = document.getElementById('paper-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePaper();
    });
  }
}

function openCreatePaperModal() {
  currentEditingPaperId = null;
  document.getElementById('modal-paper-title').textContent = 'Upload Research Paper Record';
  document.getElementById('paper-form').reset();
  document.getElementById('paper-published').checked = true;
  document.getElementById('paper-modal').classList.add('is-active');
}

function openEditPaperModal(id) {
  const p = allPapers.find(item => item.id === id);
  if (!p) return;

  currentEditingPaperId = id;
  document.getElementById('modal-paper-title').textContent = `Edit Paper: ${p.title}`;
  document.getElementById('paper-title').value = p.title;
  document.getElementById('paper-authors').value = p.authors;
  document.getElementById('paper-year').value = p.publication_year;
  document.getElementById('paper-category').value = p.category;
  document.getElementById('paper-journal').value = p.journal || '';
  document.getElementById('paper-doi').value = p.doi || '';
  document.getElementById('paper-abstract').value = p.abstract || '';
  document.getElementById('paper-ext-url').value = p.external_url || '';
  document.getElementById('paper-pdf-url').value = p.pdf_url || '';
  document.getElementById('paper-published').checked = p.published;

  document.getElementById('paper-modal').classList.add('is-active');
}

function closePaperModal() {
  document.getElementById('paper-modal').classList.remove('is-active');
}

async function savePaper() {
  const title = document.getElementById('paper-title').value.trim();
  const authors = document.getElementById('paper-authors').value.trim();
  const publication_year = parseInt(document.getElementById('paper-year').value);
  const category = document.getElementById('paper-category').value;
  const journal = document.getElementById('paper-journal').value.trim();
  const doi = document.getElementById('paper-doi').value.trim();
  const abstract = document.getElementById('paper-abstract').value.trim();
  const external_url = document.getElementById('paper-ext-url').value.trim();
  let pdf_url = document.getElementById('paper-pdf-url').value.trim();
  const published = document.getElementById('paper-published').checked;

  const pdfFile = document.getElementById('paper-pdf-file').files[0];
  if (pdfFile) {
    try {
      showToast('Uploading research PDF to Supabase Storage...');
      pdf_url = await uploadToStorage(HRC_CONFIG.STORAGE_BUCKETS.RESEARCH_PAPERS, 'papers', pdfFile);
    } catch (uploadErr) {
      console.warn('[HRC Admin] PDF upload notice:', uploadErr);
    }
  }

  const sb = getSupabase();
  if (!sb) {
    showToast('Demo Mode: Research paper saved.');
    closePaperModal();
    return;
  }

  try {
    const payload = { title, authors, publication_year, category, journal, doi, abstract, external_url, pdf_url, published, updated_at: new Date() };

    if (currentEditingPaperId) {
      const { error } = await sb.from('research_papers').update(payload).eq('id', currentEditingPaperId);
      if (error) throw error;
      showToast('Research paper updated.');
    } else {
      const { error } = await sb.from('research_papers').insert([payload]);
      if (error) throw error;
      showToast('New research paper catalogued.');
    }

    closePaperModal();
    loadResearchPapers();
  } catch (err) {
    console.error('[HRC Admin] Save paper error:', err);
    showToast('Failed to save paper: ' + err.message, 'error');
  }
}

async function deletePaper(id) {
  if (!confirm('Are you sure you want to remove this research paper record?')) return;

  const sb = getSupabase();
  if (!sb) {
    allPapers = allPapers.filter(p => p.id !== id);
    renderPapersTable(allPapers);
    showToast('Demo Mode: Paper deleted.');
    return;
  }

  try {
    const { error } = await sb.from('research_papers').delete().eq('id', id);
    if (error) throw error;
    showToast('Research paper deleted.');
    loadResearchPapers();
  } catch (err) {
    console.error('[HRC Admin] Delete paper error:', err);
    showToast('Failed to delete paper: ' + err.message, 'error');
  }
}
