// =============================================================================
// UTILS.JS - Utility Functions & Helpers
// =============================================================================

// DOM selector shortcuts
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// Toast notification
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// Modal management
const modal = {
  open(id) {
    const backdrop = $('#modal-backdrop');
    const m = document.querySelector(id);
    if (!backdrop || !m) return;
    backdrop.hidden = false;
    m.hidden = false;
  },
  closeAll() {
    const backdrop = $('#modal-backdrop');
    if (backdrop) backdrop.hidden = true;
    $$('.modal').forEach(m => m.hidden = true);
  }
};

// Close modals on backdrop click or close button
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) modal.closeAll();
  if (e.target.id === 'modal-backdrop') modal.closeAll();
});

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modal.closeAll();
});

// Format ISO date (YYYY-MM-DD) to French format (DD/MM/YYYY)
function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  if (year.length !== 4 || month.length !== 2 || day.length !== 2) return dateStr;
  return `${day}/${month}/${year}`;
}

// French phone validation regex
const PHONE_REGEX = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate French phone number
function validatePhone(phone) {
  return PHONE_REGEX.test(phone);
}

// Validate email
function validateEmail(email) {
  return EMAIL_REGEX.test(email);
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
