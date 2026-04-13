const formEl = document.getElementById('submit-form');
const submitBtn = document.getElementById('submit-btn');
const statusEl = document.getElementById('status');
const eventTitleEl = document.getElementById('event-title');
const submitSubEl = document.getElementById('submit-sub');
const modeNoteEl = document.getElementById('mode-note');
const messageLabelEl = document.getElementById('message-label');
const submitterLabelEl = document.getElementById('submitter-label');
const photoLabelEl = document.getElementById('photo-label');
const photoHintEl = document.getElementById('photo-hint');
const photoInputEl = document.getElementById('photo');
const photoPreviewEl = document.getElementById('photo-preview');
const clearPhotoBtn = document.getElementById('clear-photo');
const submitCardEl = document.getElementById('submit-card');
const closedMessageEl = document.getElementById('closed-message');
const kindButtons = Array.from(document.querySelectorAll('.mode-btn[data-kind]'));

let _settings = {
  submissionEnabled: true,
  submissionFieldLabel: 'Naam',
  submissionRequirePhoto: false,
  eventName: '',
};

let _kind = 'screen';

const KIND_COPY = {
  screen: {
    pageSub: 'Kies hieronder of je iets voor het scherm wilt delen of een tip voor de kampkrant wilt insturen.',
    modeNote: 'Deel een foto of kort bericht. Na moderatie kan het op het scherm verschijnen.',
    messageLabel: 'Bericht (optioneel)',
    messagePlaceholder: 'Schrijf een kort bericht...',
    photoLabel: 'Foto',
    photoHint: 'Voeg een foto toe als je wilt.',
    buttonText: 'Insturen voor scherm',
    success: 'Bedankt! Je inzending wordt beoordeeld voor het scherm.',
  },
  kampkrant_tip: {
    pageSub: 'Heb je iets opvallends, grappigs of sappigs gehoord? Stuur het door naar de kampkrant.',
    modeNote: 'Dit komt bij de mediaredactie terecht en verschijnt niet rechtstreeks op het scherm.',
    messageLabel: 'Tip voor kampkrant',
    messagePlaceholder: 'Typ hier je tip, verhaal of roddel...',
    photoLabel: 'Foto of screenshot (optioneel)',
    photoHint: 'Een foto mag, maar een duidelijke tiptekst is belangrijker.',
    buttonText: 'Tip insturen',
    success: 'Top, je tip is doorgestuurd naar de kampkrant.',
  },
};

function setStatus(msg, cls = '') {
  statusEl.textContent = msg || '';
  statusEl.className = `status ${cls}`.trim();
}

function applyKindUi() {
  const copy = KIND_COPY[_kind] || KIND_COPY.screen;
  submitSubEl.textContent = copy.pageSub;
  modeNoteEl.textContent = copy.modeNote;
  messageLabelEl.textContent = copy.messageLabel;
  submitBtn.textContent = copy.buttonText;
  photoLabelEl.textContent = copy.photoLabel;
  photoHintEl.textContent = copy.photoHint;

  const messageEl = document.getElementById('message');
  if (messageEl) {
    messageEl.placeholder = copy.messagePlaceholder;
    messageEl.required = _kind === 'kampkrant_tip';
  }

  photoInputEl.required = _kind === 'screen' && Boolean(_settings.submissionRequirePhoto);

  kindButtons.forEach(btn => {
    const active = btn.dataset.kind === _kind;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function applySettings() {
  eventTitleEl.textContent = _settings.eventName || 'Deel jouw moment';
  submitterLabelEl.textContent = _settings.submissionFieldLabel || 'Naam';

  const open = _settings.submissionEnabled !== false;
  submitCardEl.classList.toggle('hidden', !open);
  closedMessageEl.classList.toggle('hidden', open);
  applyKindUi();
}

function applyTheme(themeId) {
  const current = document.getElementById('submit-theme-css');
  if (!themeId) {
    if (current) current.remove();
    return;
  }

  const href = `/themes/${encodeURIComponent(themeId)}/style.css`;
  if (current) {
    if (current.getAttribute('href') !== href) current.setAttribute('href', href);
    return;
  }

  const link = document.createElement('link');
  link.id = 'submit-theme-css';
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

async function loadSettings() {
  try {
    const res = await fetch('/api/submissions/public-config');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _settings = { ..._settings, ...(data || {}) };
    applyTheme(_settings.theme);
    applySettings();
  } catch {
    setStatus('Inzending laden niet gelukt. Vernieuw de pagina.', 'err');
  }
}

function resetForm() {
  formEl.reset();
  photoPreviewEl.removeAttribute('src');
  photoPreviewEl.style.display = 'none';
  clearPhotoBtn.classList.add('hidden');
  applyKindUi();
}

function setKind(nextKind) {
  _kind = nextKind === 'kampkrant_tip' ? 'kampkrant_tip' : 'screen';
  const url = new URL(location.href);
  url.searchParams.set('kind', _kind);
  history.replaceState(null, '', url);
  applyKindUi();
}

photoInputEl.addEventListener('change', () => {
  const file = photoInputEl.files?.[0];
  if (!file) {
    resetForm();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    photoPreviewEl.src = reader.result;
    photoPreviewEl.style.display = 'block';
    clearPhotoBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

clearPhotoBtn.addEventListener('click', () => {
  photoInputEl.value = '';
  photoPreviewEl.removeAttribute('src');
  photoPreviewEl.style.display = 'none';
  clearPhotoBtn.classList.add('hidden');
});

kindButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    setStatus('');
    setKind(btn.dataset.kind);
  });
});

formEl.addEventListener('submit', async e => {
  e.preventDefault();
  setStatus('Verzenden...');
  submitBtn.disabled = true;

  const fd = new FormData();
  fd.append('kind', _kind);
  fd.append('submitterValue', document.getElementById('submitter-value').value || '');
  fd.append('message', document.getElementById('message').value || '');
  const file = photoInputEl.files?.[0];
  if (file) fd.append('photo', file);

  try {
    const res = await fetch('/api/submissions', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    const copy = KIND_COPY[_kind] || KIND_COPY.screen;
    setStatus(copy.success, 'ok');
    resetForm();
  } catch (err) {
    setStatus(err.message || 'Verzenden mislukt', 'err');
  } finally {
    submitBtn.disabled = false;
  }
});

{
  const requestedKind = new URLSearchParams(location.search).get('kind');
  if (requestedKind === 'kampkrant_tip') _kind = 'kampkrant_tip';
}

applyKindUi();
loadSettings();
