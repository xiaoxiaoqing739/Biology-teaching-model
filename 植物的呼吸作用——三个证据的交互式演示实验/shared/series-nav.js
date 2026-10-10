export function showToast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function bindReset(reset) {
  document.querySelector('#reset')?.addEventListener('click', reset);
}
