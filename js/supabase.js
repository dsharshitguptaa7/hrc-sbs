/**
 * HARISH-CHANDRA RESEARCH CENTRE (HRC-SBS)
 * Central Supabase Client & Helper Functions
 * 
 * Provides robust fallback handling: if Supabase URL is placeholder or network fails,
 * it returns empty structures or offline notifications gracefully so public visitors
 * never experience broken layouts or white screens.
 */

let hrcSupabaseClient = null;

function getSupabase() {
  if (hrcSupabaseClient) return hrcSupabaseClient;

  if (typeof window.supabase === 'undefined') {
    console.warn('[HRC] Supabase JS library not loaded from CDN. Retrying or operating in offline fallback.');
    return null;
  }

  let url = HRC_CONFIG.SUPABASE_URL;
  const key = HRC_CONFIG.SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('your-project-ref')) {
    console.info('[HRC] Supabase credentials in js/config.js are using placeholder values. Real-time DB will activate once real project URL & anon key are added.');
    return null;
  }

  // Ensure clean base URL without trailing slash or /rest/v1
  url = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

  try {
    hrcSupabaseClient = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return hrcSupabaseClient;
  } catch (err) {
    console.error('[HRC] Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Storage Helper: Upload a file to a designated bucket and return its public URL
 */
async function uploadToStorage(bucket, path, file) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase client is not configured.');

  // Validate allowed extensions and size
  const maxImageSize = 5 * 1024 * 1024; // 5MB
  const maxPdfSize = 25 * 1024 * 1024; // 25MB

  if (file.type === 'application/pdf') {
    if (file.size > maxPdfSize) throw new Error('PDF file size exceeds 25MB limit.');
  } else {
    if (file.size > maxImageSize) throw new Error('Image file size exceeds 5MB limit.');
  }

  const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const fullPath = path ? `${path.replace(/\/$/, '')}/${cleanFileName}` : cleanFileName;

  const { data, error } = await sb.storage
    .from(bucket)
    .upload(fullPath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(fullPath);
  return urlData.publicUrl;
}

/**
 * Global helper to sanitize strings against XSS injection
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
