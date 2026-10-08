/**
 * HARISH-CHANDRA RESEARCH CENTRE
 * Admin Authentication & Session Management
 * 
 * Verifies Supabase Auth sessions, checks roles in admin_profiles,
 * and securely guards all /admin/* routes.
 */

const HRC_AUTH = {
  currentUser: null,
  currentProfile: null,

  /**
   * Initializes session check.
   * If requireAuth is true (on admin pages), redirects to login.html if not authenticated or unauthorized.
   * If requireAuth is false (on login.html), returns boolean indicating whether valid session exists.
   */
  async init(requireAuth = true) {
    const sb = getSupabase();
    if (!sb) {
      if (requireAuth) {
        console.error('[HRC Auth] Supabase client is not available or unconfigured.');
        window.location.href = 'login.html';
      }
      return false;
    }

    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (error || !session) {
        if (requireAuth) {
          window.location.href = 'login.html';
        }
        return false;
      }

      // Retrieve verified user identity
      const { data: { user }, error: userErr } = await sb.auth.getUser();
      if (userErr || !user) {
        if (requireAuth) {
          window.location.href = 'login.html';
        }
        return false;
      }

      this.currentUser = user;
      
      // Verify user against admin_profiles table using user.id UUID
      const { data: profile, error: profileErr } = await sb
        .from('admin_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile || !['admin', 'editor'].includes(profile.role)) {
        console.error('[HRC Auth] User is authenticated but lacks admin/editor authorization in admin_profiles.');
        await sb.auth.signOut();
        this.currentUser = null;
        this.currentProfile = null;
        if (requireAuth) {
          window.location.href = 'login.html?error=unauthorized';
        }
        return false;
      }

      this.currentProfile = profile;
      this.updateUIProfile();

      // Listen for auth state changes (e.g. sign out in another tab)
      sb.auth.onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_OUT' || !newSession) {
          window.location.href = 'login.html';
        }
      });

      return true;
    } catch (err) {
      console.error('[HRC Auth] Session verification error:', err);
      if (requireAuth) {
        window.location.href = 'login.html';
      }
      return false;
    }
  },

  /**
   * Authenticates administrator using Supabase Auth and checks role in admin_profiles
   */
  async login(email, password) {
    const sb = getSupabase();
    if (!sb) {
      throw new Error('Unable to connect to the authentication service. Supabase configuration is missing or invalid.');
    }

    console.log("Supabase URL:", HRC_CONFIG.SUPABASE_URL);
    console.log("Attempting login for:", email);

    let authResponse;
    try {
      authResponse = await sb.auth.signInWithPassword({ email, password });
    } catch (netErr) {
      console.error('[HRC Auth] Network failure:', netErr);
      throw new Error(`Unable to connect to the authentication service: ${netErr.message || 'Network error'}`);
    }

    const { data, error } = authResponse;
    console.log("Auth result:", data);
    console.log("Auth error:", error);

    if (error) {
      console.warn('[HRC Auth] Sign in failed:', error);
      const msg = (error.message || '').toLowerCase();
      const code = error.code || error.status || '';

      if (msg.includes('email not confirmed')) {
        throw new Error('Email address is not confirmed. Please confirm your email or confirm the user from Supabase Authentication.');
      }
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        throw new Error(`Invalid email or password. (${error.message}${code ? ` [${code}]` : ''})`);
      }
      if (error.status === 429 || msg.includes('rate limit')) {
        throw new Error('Too many login attempts. Please wait a few moments and try again.');
      }
      
      // Return real error message with code for diagnostic clarity
      throw new Error(error.message ? `${error.message}${code ? ` (${code})` : ''}` : 'Authentication failed.');
    }

    // Get authenticated user via supabase.auth.getUser()
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    console.log("Authenticated user:", user);

    if (userErr || !user) {
      throw new Error('Authentication failed. Unable to retrieve verified user identity.');
    }

    // Verify user role in admin_profiles table using UUID (user.id)
    let profileResponse;
    try {
      profileResponse = await sb
        .from('admin_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    } catch (profErr) {
      console.error('[HRC Auth] Profile query error:', profErr);
      await sb.auth.signOut();
      throw new Error(`Unable to query administrator permissions: ${profErr.message}`);
    }

    const { data: profile, error: profileError } = profileResponse;
    console.log("Admin profile:", profile);
    console.log("Profile error:", profileError);

    if (profileError || !profile) {
      console.warn('[HRC Auth] User authenticated but no admin_profiles row found for ID:', user.id);
      await sb.auth.signOut();
      throw new Error('Authentication successful, but this account is not authorized for the Admin Portal.');
    }

    if (!['admin', 'editor'].includes(profile.role)) {
      console.warn('[HRC Auth] User role is not authorized:', profile.role);
      await sb.auth.signOut();
      throw new Error('Authentication successful, but this account does not have an admin or editor role.');
    }

    this.currentUser = user;
    this.currentProfile = profile;
    return { success: true, user, profile };
  },

  /**
   * Signs out current administrator and redirects to login.html
   */
  async logout() {
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch (err) {
        console.warn('[HRC Auth] Sign out error:', err);
      }
    }
    this.currentUser = null;
    this.currentProfile = null;
    window.location.href = 'login.html';
  },

  updateUIProfile() {
    const nameEl = document.getElementById('admin-profile-name');
    const roleEl = document.getElementById('admin-profile-role');
    if (nameEl) nameEl.textContent = this.currentProfile?.full_name || this.currentUser?.email || 'Administrator';
    if (roleEl) roleEl.textContent = this.currentProfile?.role || 'admin';
  }
};

// Global Toast Notification Helper
function showToast(message, type = 'success') {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'admin-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `admin-toast is-visible ${type === 'error' ? 'toast-error' : 'toast-success'}`;

  setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 3500);
}

// Mobile sidebar toggle helper
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.querySelector('.admin-mobile-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
    });
  }
});
