/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Public Research Papers - Supabase Dynamic Integration
 * 
 * Dynamically queries research papers from Supabase database with
 * instant search, category filtering, and publication year sorting.
 */

let publicPapers = [];

const fallbackResearchPapers = [
  {
    id: "p1",
    title: "Representations of Semisimple Lie Groups II",
    authors: "Harish-Chandra",
    publication_year: 1954,
    category: "Representation Theory",
    journal: "Transactions of the American Mathematical Society",
    doi: "10.1090/S0002-9947-1954-0064069-4",
    abstract: "The foundational analysis establishing the subquotient theorem, fundamental properties of infinitesimal characters, and classification of irreducible representations.",
    external_url: "https://www.ams.org/journals/tran/1954-076-01/S0002-9947-1954-0064069-4/"
  },
  {
    id: "p2",
    title: "The Characters of Semisimple Lie Groups",
    authors: "Harish-Chandra",
    publication_year: 1956,
    category: "Harmonic Analysis",
    journal: "American Journal of Mathematics",
    doi: "10.2307/2372551",
    abstract: "Proof that invariant eigendistributions on real reductive Lie groups are locally integrable functions on the group and analytic on the set of regular elements.",
    external_url: "https://www.jstor.org/stable/2372551"
  },
  {
    id: "p3",
    title: "Discrete Series for Semisimple Lie Groups I",
    authors: "Harish-Chandra",
    publication_year: 1965,
    category: "Harmonic Analysis",
    journal: "Acta Mathematica",
    doi: "10.1007/BF02391779",
    abstract: "Construction and classification of square-integrable representations for real semisimple Lie groups having a compact Cartan subgroup, unlocking modern non-commutative Fourier synthesis.",
    external_url: "https://projecteuclid.org/journals/acta-mathematica"
  },
  {
    id: "p4",
    title: "Automorphic Forms on Semisimple Lie Groups",
    authors: "Harish-Chandra",
    publication_year: 1968,
    category: "Automorphic Forms",
    journal: "Lecture Notes in Mathematics, Springer-Verlag",
    doi: "10.1007/BFb0079982",
    abstract: "Systematic formulation of cusp forms and Eisenstein series for arithmetic subgroups, creating the analytical apparatus foundational to the Langlands Program.",
    external_url: "https://link.springer.com/book/10.1007/BFb0079982"
  }
];

async function loadPublicResearchPapers() {
  const container = document.getElementById('public-research-list');
  if (!container) return;

  const sb = getSupabase();
  if (!sb) {
    publicPapers = fallbackResearchPapers;
    renderPublicPapers(publicPapers);
    return;
  }

  try {
    const { data, error } = await sb
      .from('research_papers')
      .select('*')
      .eq('published', true)
      .order('publication_year', { ascending: false });

    if (error || !data || !data.length) {
      publicPapers = fallbackResearchPapers;
    } else {
      publicPapers = data;
    }
  } catch (err) {
    console.warn('[HRC Research] Database notice:', err);
    publicPapers = fallbackResearchPapers;
  }

  renderPublicPapers(publicPapers);
}

function renderPublicPapers(papers) {
  const container = document.getElementById('public-research-list');
  if (!container) return;

  if (!papers.length) {
    container.innerHTML = '<div style="padding: 2.5rem; text-align: center; color: var(--slate); background: var(--warm-white); border-radius: 8px;">No research papers match your filter criteria.</div>';
    return;
  }

  container.innerHTML = papers.map(p => `
    <div class="pillar-card" style="margin-bottom: 1.5rem;" data-reveal>
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
        <span class="pillar-num" style="font-size: 1.1rem; margin: 0;">${p.publication_year}</span>
        <span style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold); background: var(--gold-soft); padding: 0.2rem 0.6rem; border-radius: 4px;">
          ${escapeHtml(p.category)}
        </span>
      </div>
      <h3 style="font-size: 1.25rem; color: var(--navy); margin-bottom: 0.35rem;">${escapeHtml(p.title)}</h3>
      <div style="font-size: 0.88rem; color: var(--blue); font-weight: 500; margin-bottom: 0.8rem;">
        ${escapeHtml(p.authors)} · <span style="font-style: italic; color: var(--slate);">${escapeHtml(p.journal || 'Academic Proceedings')}</span>
      </div>
      <p style="font-size: 0.92rem; color: var(--charcoal-light); line-height: 1.65; margin-bottom: 1.2rem;">
        ${escapeHtml(p.abstract || 'No abstract preview catalogued.')}
      </p>
      <div style="display: flex; gap: 1rem; align-items: center; border-top: 1px solid var(--border-light); padding-top: 0.8rem;">
        ${p.pdf_url ? `<a href="${escapeHtml(p.pdf_url)}" target="_blank" class="btn btn-sm btn-outline">Read PDF Pre-print</a>` : ''}
        ${p.external_url ? `<a href="${escapeHtml(p.external_url)}" target="_blank" class="btn btn-sm btn-outline-gold">Journal Publication</a>` : ''}
        ${p.doi ? `<span style="font-size: 0.74rem; color: var(--slate);">DOI: ${escapeHtml(p.doi)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function filterResearchList() {
  const search = document.getElementById('research-search-input')?.value.toLowerCase().trim() || '';
  const category = document.getElementById('research-cat-filter')?.value || 'all';

  const filtered = publicPapers.filter(p => {
    const matchesSearch = !search || 
      p.title.toLowerCase().includes(search) || 
      p.authors.toLowerCase().includes(search) || 
      (p.abstract && p.abstract.toLowerCase().includes(search));
    const matchesCategory = category === 'all' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  renderPublicPapers(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
  loadPublicResearchPapers();
  const searchInput = document.getElementById('research-search-input');
  const catSelect = document.getElementById('research-cat-filter');
  if (searchInput) searchInput.addEventListener('input', filterResearchList);
  if (catSelect) catSelect.addEventListener('change', filterResearchList);
});
