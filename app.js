app.js (test minimal, 30 lignes)
document.addEventListener('DOMContentLoaded', function () {
var adminBtn = document.getElementById('adminBtn');
var loginModal = document.getElementById('loginModal');
var closeBtns = document.querySelectorAll('.modal-close');
if (adminBtn && loginModal) {
adminBtn.addEventListener('click', function () {
loginModal.classList.remove('hidden');
});
}
document.addEventListener('click', function (e) {
if (e.target.classList && e.target.classList.contains('modal-overlay')) {
e.target.classList.add('hidden');
}
});
for (var i = 0; i < closeBtns.length; i++) {
closeBtns[i].addEventListener('click', function () {
if (loginModal) loginModal.classList.add('hidden');
});
}
console.log('app.js test chargé');
});
