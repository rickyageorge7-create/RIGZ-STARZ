export function showMessage(element, message, kind = 'info') {
  element.textContent = message;
  element.dataset.kind = kind;
  element.hidden = !message;
}

export function setBusy(button, busy, busyLabel = 'Please wait…') {
  if (busy) {
    button.dataset.idleLabel = button.textContent;
    button.textContent = busyLabel;
  } else if (button.dataset.idleLabel) {
    button.textContent = button.dataset.idleLabel;
    delete button.dataset.idleLabel;
  }
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

