document.addEventListener('DOMContentLoaded', function () {
var btn = document.getElementById('adminBtn');
var modal = document.getElementById('loginModal');
if (btn && modal) {
btn.addEventListener('click', function () { modal.classList.remove('hidden'); });
}
document.addEventListener('click', function (e) {
if (e.target && e.target.classList && e.target.classList.contains('modal-close')) modal.classList.add('hidden');
if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden');
});
console.log('bootstrap ok');
});
