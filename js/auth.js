// =============================================================================
// AUTH.JS - Authentication & Session Management
// =============================================================================

// Global auth state
let isAdmin = false;
let adminUser = null;
let checkingAdmin = false;

// Check if current user can view a module based on role
function canViewModule(module) {
  if (!adminUser) return false;
  const role = adminUser.role;

  // Super admin can access everything
  if (role === 'super_admin') return true;

  // Admins and Association are super_admin only
  if (module === 'admins' || module === 'association') return false;

  // All other modules are accessible to viewer and editor
  return true;
}

// Check if current user can edit in a module based on role
function canEditModule(module) {
  if (!adminUser) return false;
  const role = adminUser.role;

  // Super admin can edit everything
  if (role === 'super_admin') return true;

  // Viewer can't edit anything
  if (role === 'viewer') return false;

  // Editor can edit everything except admins and association
  if (module === 'admins' || module === 'association') return false;
  return true;
}

// Listen for runtime auth state changes (login/logout after initial load)
function initAuthListener() {
  if (!_supabase.auth || typeof _supabase.auth.onAuthStateChange !== 'function') {
    console.log('initAuthListener: auth not available');
    return;
  }

  _supabase.auth.onAuthStateChange(async (event, session) => {
    setTimeout(async () => {
      if (event === 'INITIAL_SESSION' && !session){
        loadPublic();
        trackPageView();
      }

      // Handle password recovery - only in the tab that has the recovery token in the URL
      if (event === 'PASSWORD_RECOVERY') {
        modal.open('#modal-reset-password');
        return;
      }

      // Handle sign out - reset state and refresh public view
      if (event === 'SIGNED_OUT') {
        isAdmin = false;
        adminUser = null;
        unmountAdmin();
        loadPublic();
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        // Skip if already authenticated with same user
        if (checkingAdmin || (isAdmin && adminUser?.user_id === session.user.id)) {
          return;
        }

        checkingAdmin = true;

        // Fetch admin profile from admins table
        const { data: admin, error: adminError } = await _supabase
          .from('admins')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single();

        if (adminError || !admin) {
          checkingAdmin = false;
          // User exists in auth but is not an admin - sign them out
          await _supabase.auth.signOut();
          toast('Accès non autorisé');
          return;
        }

        isAdmin = true;
        adminUser = admin;

        mountAdmin();
        toast('Connecté ' +event);

        checkingAdmin = false;
      }
    }, 0);
  });
}

// Setup login form handler
function setupLoginForm() {
  const toggle = $('#admin-toggle');
  if (toggle) {
    toggle.onclick = () => modal.open('#modal-admin');
  }

  const form = $('#admin-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#admin-email').value.trim();
    const password = $('#admin-password').value;

    const { data, error } = await _supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Login error:', error);
      toast('Identifiants invalides');
      return;
    }

    // Update last_login on actual login (not on session restore)
    if (data?.user) {
      await _supabase.from('admins').update({ last_login: new Date().toISOString() }).eq('user_id', data.user.id);
      archivePastEvents();
    }

    // Clear form - onAuthStateChange will handle admin setup and UI
    modal.closeAll();
    $('#admin-email').value = '';
    $('#admin-password').value = '';
  });
}

// Logout handler
async function logout() {
  await _supabase.auth.signOut();
  toast('Déconnecté');
}

// Setup forgot password form
function setupForgotPasswordForm() {
  const forgotLink = $('#forgot-password-link');
  if (forgotLink) {
    forgotLink.onclick = (e) => {
      e.preventDefault();
      modal.closeAll();
      modal.open('#modal-forgot-password');
    };
  }

  const backToLoginLink = $('#back-to-login-link');
  if (backToLoginLink) {
    backToLoginLink.onclick = (e) => {
      e.preventDefault();
      modal.closeAll();
      modal.open('#modal-admin');
    };
  }

  const form = $('#forgot-password-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#forgot-email').value.trim();

    if (!email) {
      toast('Veuillez entrer votre email');
      return;
    }

    toast('Envoi en cours...');

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    if (error) {
      console.error('Reset password error:', error);
      toast('Erreur lors de l\'envoi');
      return;
    }

    toast('Email envoyé ! Vérifiez votre boîte de réception.');
    modal.closeAll();
    $('#forgot-email').value = '';
  };
}

// Setup reset password form (for when user clicks the reset link)
function setupResetPasswordForm() {
  const form = $('#reset-password-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const newPassword = $('#new-password').value;
    const confirmPassword = $('#confirm-password').value;

    if (newPassword.length < 6) {
      toast('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast('Les mots de passe ne correspondent pas');
      return;
    }

    toast('Enregistrement...');

    const { error } = await _supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Update password error:', error);
      toast('Erreur lors de la mise à jour du mot de passe');
      return;
    }

    toast('Mot de passe mis à jour !');
    modal.closeAll();
    $('#new-password').value = '';
    $('#confirm-password').value = '';
  };
}

