// =============================================================================
// APP.JS - Main Entry Point & Initialization
// =============================================================================

// Force light theme
(function initTheme() {
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.style.setProperty('--bg-primary', '#ffffff');
  document.documentElement.style.setProperty('--text-primary', '#000000');
})();

// Register auth listener early to catch URL-based events (e.g. PASSWORD_RECOVERY)
initAuthListener();

// Main initialization on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded - initializing app');

  // Setup view switching and UI listeners
  initViewSwitch();
  initListeners();

  // Setup forms
  setupInscriptionForm();
  setupContactForm();
  setupLoginForm();
  setupForgotPasswordForm();
  setupResetPasswordForm();

  // Admin forms
  setupEventForms();
  setupEditInscriptionForm();
  setupAdminUserForm();
  
  // Site config is always needed (header logo, name, etc.)
  await loadSiteConfig();

  console.log('App initialized');
});
