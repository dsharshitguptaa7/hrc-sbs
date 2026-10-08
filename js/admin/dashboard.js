/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Dashboard Metrics & Quick Actions
 */

document.addEventListener('DOMContentLoaded', async () => {
  await HRC_AUTH.init(true);
  loadDashboardMetrics();
  loadRecentActivity();
});

async function loadDashboardMetrics() {
  const sb = getSupabase();
  if (!sb) {
    // Show verified seed counts when operating in standalone/demo mode
    setStat('stat-events', '4');
    setStat('stat-lectures', '3');
    setStat('stat-speakers', '5');
    setStat('stat-posters', '6');
    setStat('stat-gallery', '8');
    setStat('stat-research', '4');
    setStat('stat-exhibition', '12');
    return;
  }

  try {
    const [events, series, speakers, posters, gallery, research, exhibition] = await Promise.all([
      sb.from('events').select('id', { count: 'exact', head: true }),
      sb.from('lecture_series').select('id', { count: 'exact', head: true }),
      sb.from('speakers').select('id', { count: 'exact', head: true }),
      sb.from('posters').select('id', { count: 'exact', head: true }),
      sb.from('gallery_images').select('id', { count: 'exact', head: true }),
      sb.from('research_papers').select('id', { count: 'exact', head: true }),
      sb.from('exhibition_projects').select('id', { count: 'exact', head: true })
    ]);

    setStat('stat-events', events.count ?? 0);
    setStat('stat-lectures', series.count ?? 0);
    setStat('stat-speakers', speakers.count ?? 0);
    setStat('stat-posters', posters.count ?? 0);
    setStat('stat-gallery', gallery.count ?? 0);
    setStat('stat-research', research.count ?? 0);
    setStat('stat-exhibition', exhibition.count ?? 12);
  } catch (err) {
    console.error('[HRC Admin] Error loading metrics:', err);
  }
}

function setStat(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

async function loadRecentActivity() {
  const tableBody = document.getElementById('recent-activity-table');
  if (!tableBody) return;

  const sb = getSupabase();
  if (!sb) {
    tableBody.innerHTML = `
      <tr>
        <td><strong>Lecture Series 2026</strong></td>
        <td><span class="admin-badge admin-badge-primary">Lecture Series</span></td>
        <td><span class="admin-badge admin-badge-success">Published</span></td>
        <td>System Seed</td>
      </tr>
      <tr>
        <td><strong>Prof. Manindra Agrawal Keynote</strong></td>
        <td><span class="admin-badge admin-badge-primary">Speakers</span></td>
        <td><span class="admin-badge admin-badge-success">Published</span></td>
        <td>System Seed</td>
      </tr>
      <tr>
        <td><strong>12 Student Exhibition Tracks</strong></td>
        <td><span class="admin-badge admin-badge-primary">Exhibition</span></td>
        <td><span class="admin-badge admin-badge-success">Published</span></td>
        <td>System Seed</td>
      </tr>
    `;
    return;
  }

  try {
    const { data: events, error } = await sb
      .from('events')
      .select('title, category, published, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !events || !events.length) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--admin-text-muted);">No recent entries found.</td></tr>';
      return;
    }

    tableBody.innerHTML = events.map(ev => `
      <tr>
        <td><strong>${escapeHtml(ev.title)}</strong></td>
        <td><span class="admin-badge admin-badge-primary">${escapeHtml(ev.category)}</span></td>
        <td><span class="admin-badge ${ev.published ? 'admin-badge-success' : 'admin-badge-draft'}">${ev.published ? 'Published' : 'Draft'}</span></td>
        <td>${new Date(ev.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('[HRC Admin] Recent activity error:', err);
  }
}
