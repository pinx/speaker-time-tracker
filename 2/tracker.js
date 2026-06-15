/**
 * Speaker Time Tracker
 * Tracks speaking time per participant and auto-switches
 * the active speaker via the Web Speech API.
 */

const COLORS = [
  { bg: '#EEEDFE', text: '#3C3489', bar: '#7F77DD' },
  { bg: '#E1F5EE', text: '#085041', bar: '#1D9E75' },
  { bg: '#FAECE7', text: '#712B13', bar: '#D85A30' },
  { bg: '#FBEAF0', text: '#72243E', bar: '#D4537E' },
  { bg: '#E6F1FB', text: '#0C447C', bar: '#378ADD' },
  { bg: '#EAF3DE', text: '#27500A', bar: '#639922' },
  { bg: '#FAEEDA', text: '#633806', bar: '#BA7517' },
  { bg: '#FCEBEB', text: '#791F1F', bar: '#E24B4A' },
];

// ── State ────────────────────────────────────────────────
let members   = [];   // { id, name, seconds, color }
let activeId  = null;
let paused    = false;
let listening = false;
let colorIdx  = 0;
let recognition = null;
let lastHeardId = null;

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── Helpers ──────────────────────────────────────────────
function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function fmt(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Members ──────────────────────────────────────────────
function addMember() {
  const inp  = document.getElementById('nameInput');
  const name = inp.value.trim();
  if (!name) return;
  const id    = Date.now();
  const color = COLORS[colorIdx % COLORS.length];
  colorIdx++;
  members.push({ id, name, seconds: 0, color });
  inp.value = '';
  render();
}

function removeMember(id) {
  if (activeId === id) activeId = null;
  members = members.filter(m => m.id !== id);
  render();
}

function selectMember(id) {
  if (paused) return;
  activeId = (activeId === id) ? null : id;
  render();
}

// ── Timer ────────────────────────────────────────────────
setInterval(() => {
  if (paused || !activeId) return;
  const m = members.find(m => m.id === activeId);
  if (m) { m.seconds++; renderTimes(); }
}, 1000);

// ── Controls ─────────────────────────────────────────────
function togglePause() {
  paused = !paused;
  document.getElementById('pauseBtn').textContent = paused ? '▶ Resume' : '⏸ Pause';
}

function resetAll() {
  members.forEach(m => m.seconds = 0);
  activeId    = null;
  paused      = false;
  lastHeardId = null;
  document.getElementById('pauseBtn').textContent = '⏸ Pause';
  render();
}

// ── Speech recognition ───────────────────────────────────
function toggleListen() {
  if (!SpeechRec) {
    setMicStatus('err', 'Speech recognition not supported in this browser (try Chrome or Edge)');
    return;
  }
  if (listening) stopListening(); else startListening();
}

function startListening() {
  recognition = new SpeechRec();
  recognition.continuous      = true;
  recognition.interimResults  = true;
  recognition.lang            = 'en-US';

  recognition.onstart = () => {
    listening = true;
    document.getElementById('listenBtn').textContent = '🎙 Stop listening';
    setMicStatus('on', 'Listening — say a participant\'s name to switch speaker');
  };

  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    document.getElementById('transcriptPreview').textContent = transcript;
    detectSpeaker(transcript.toLowerCase());
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      setMicStatus('err', 'Microphone access denied — check browser permissions');
      listening = false;
    } else if (e.error !== 'no-speech') {
      setMicStatus('err', `Speech error: ${e.error}`);
    }
  };

  // Auto-restart on end (browser cuts off after ~60 s of silence)
  recognition.onend = () => {
    if (listening) recognition.start();
  };

  recognition.start();
}

function stopListening() {
  listening = false;
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }
  document.getElementById('listenBtn').textContent = '🎤 Start listening';
  setMicStatus('', 'Click "Start listening" to enable voice detection');
  document.getElementById('transcriptPreview').textContent = '';
  lastHeardId = null;
}

/**
 * Scan the live transcript for any participant's first or last name.
 * Switches the active speaker to the best (longest) match found.
 */
function detectSpeaker(text) {
  if (paused) return;

  let bestId = null, bestLen = 0;
  for (const m of members) {
    const parts = m.name.toLowerCase().split(/\s+/);
    for (const part of parts) {
      if (part.length >= 2 && text.includes(part) && part.length > bestLen) {
        bestLen = part.length;
        bestId  = m.id;
      }
    }
  }

  if (bestId && bestId !== lastHeardId) {
    lastHeardId = bestId;
    activeId    = bestId;
    renderTimes();
    flashDetected(bestId);
  }
}

function flashDetected(id) {
  // Remove any stale detected badges
  document.querySelectorAll('.badge.detected').forEach(b => b.remove());
  const row = document.getElementById('row-' + id);
  if (!row) return;
  const badge = document.createElement('span');
  badge.className   = 'badge detected';
  badge.textContent = 'detected';
  row.querySelector('.mname').appendChild(badge);
  setTimeout(() => badge.remove(), 2000);
}

function setMicStatus(state, label) {
  const dot = document.getElementById('micDot');
  const lbl = document.getElementById('micLabel');
  dot.className = 'mic-dot' + (state ? ' ' + state : '');
  lbl.textContent = label;
}

// ── Rendering ────────────────────────────────────────────
function renderTimes() {
  const total = members.reduce((a, m) => a + m.seconds, 0);
  for (const m of members) {
    const tEl = document.getElementById('t-' + m.id);
    const bEl = document.getElementById('b-' + m.id);
    const pEl = document.getElementById('p-' + m.id);
    const pct = total > 0 ? Math.round(m.seconds / total * 100) : 0;
    if (tEl) tEl.textContent = fmt(m.seconds);
    if (bEl) bEl.style.width = pct + '%';
    if (pEl) pEl.textContent = total > 0 ? pct + '%' : '';
  }
  const fEl = document.getElementById('footerBar');
  if (fEl) fEl.textContent = total > 0 ? 'Total meeting time: ' + fmt(total) : '';
}

function render() {
  const list     = document.getElementById('memberList');
  const controls = document.getElementById('controlsRow');

  if (members.length === 0) {
    list.innerHTML = '<p class="empty">Add participants to get started</p>';
    controls.style.display = 'none';
    document.getElementById('footerBar').textContent = '';
    return;
  }

  controls.style.display = 'flex';

  const total = members.reduce((a, m) => a + m.seconds, 0);
  list.innerHTML = members.map(m => {
    const isActive = m.id === activeId;
    const pct      = total > 0 ? Math.round(m.seconds / total * 100) : 0;
    return `
      <div class="member-row${isActive ? ' active' : ''}" id="row-${m.id}" onclick="selectMember(${m.id})">
        <div class="avatar" style="background:${m.color.bg};color:${m.color.text}">${initials(m.name)}</div>
        <div class="minfo">
          <div class="mname">
            ${m.name}
            ${isActive ? '<span class="badge speaking">speaking</span>' : ''}
          </div>
          <div class="bar-wrap">
            <div class="bar" id="b-${m.id}" style="width:${pct}%;background:${m.color.bar}"></div>
          </div>
          <div class="pct" id="p-${m.id}">${total > 0 ? pct + '%' : ''}</div>
        </div>
        <div class="tdisp" id="t-${m.id}">${fmt(m.seconds)}</div>
        <button class="rm" onclick="event.stopPropagation(); removeMember(${m.id})" aria-label="Remove ${m.name}">×</button>
      </div>`;
  }).join('');
}

// ── Init ─────────────────────────────────────────────────
document.getElementById('nameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addMember();
});
