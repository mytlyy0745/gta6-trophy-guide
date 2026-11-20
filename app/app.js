// Leonida Legend — GTA VI trophy tracker.
// Fetches app/data/trophies.json (a file of this app, nothing over the network),
// renders the 55-trophy checklist, saves earned trophies in localStorage, and
// filters by kind, earned state and search. Source links open only when followed.
const STORAGE_KEY = 'leonida-legend-progress-v2';

const listEl = document.getElementById('trophy-list');
const countLineEl = document.getElementById('count-line');
const emptyNoteEl = document.getElementById('empty-note');
const progressTextEl = document.getElementById('progress-text');
const progressPctEl = document.getElementById('progress-pct');
const progressFillEl = document.getElementById('progress-fill');
const searchEl = document.getElementById('search');
const spoilerEl = document.getElementById('spoiler');
const statusEl = document.getElementById('status');
const sourceListEl = document.getElementById('source-list');

const data = await (await fetch('data/trophies.json')).json();
const trophies = data.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set(readStoredEarned());
let activeFilter = 'all';
let openGuideId = null;

function readStoredEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function storeEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function gradeName(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindName(kind) {
  return { story: 'Story', collectibles: 'Collectibles', activities: 'Activities' }[kind] ?? kind;
}

function spoilerHidden(trophy) {
  return spoilerEl.checked && trophy.kind === 'story' && !earned.has(trophy.id);
}

function trophyVisible(trophy) {
  if (activeFilter === 'online') return false;
  if (activeFilter === 'missable' && !trophy.missable) return false;
  if (activeFilter === 'earned' && !earned.has(trophy.id)) return false;
  if (activeFilter === 'remaining' && earned.has(trophy.id)) return false;
  if (activeFilter !== 'all' && activeFilter !== 'missable' && activeFilter !== 'earned'
    && activeFilter !== 'remaining' && trophy.kind !== activeFilter) return false;
  const query = searchEl.value.trim().toLowerCase();
  if (query && !(trophy.name + ' ' + trophy.description + ' ' + trophy.guide).toLowerCase().includes(query)) return false;
  return true;
}

function makeTag(text, extraClass) {
  const tag = document.createElement('span');
  tag.className = 'tag' + (extraClass ? ' ' + extraClass : '');
  tag.textContent = text;
  return tag;
}

function buildCard(trophy) {
  const li = document.createElement('li');
  li.className = 'trophy' + (earned.has(trophy.id) ? ' earned' : '');
  li.id = 'trophy-' + trophy.id;

  const head = document.createElement('div');
  head.className = 'trophy-head';

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(trophy.id);
  box.setAttribute('aria-label', 'Mark ' + trophy.name + ' as earned');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(trophy.id);
    else earned.delete(trophy.id);
    storeEarned();
    renderList();
    renderProgress();
  });

  const title = document.createElement('div');
  title.className = 'trophy-title';
  const nameEl = document.createElement('div');
  nameEl.className = 'name';
  const descEl = document.createElement('div');
  descEl.className = 'desc';
  if (spoilerHidden(trophy)) {
    nameEl.textContent = 'Hidden story trophy';
    descEl.textContent = 'Spoiler hidden — earn it to reveal its name and description.';
    descEl.classList.add('spoiler-hidden');
  } else {
    nameEl.textContent = trophy.name;
    descEl.textContent = trophy.description;
  }
  title.append(nameEl, descEl);

  const badge = document.createElement('span');
  badge.className = 'grade-badge grade-' + trophy.grade;
  badge.textContent = gradeName(trophy.grade);
  head.append(box, title, badge);

  const tags = document.createElement('div');
  tags.className = 'tags';
  tags.append(makeTag(kindName(trophy.kind)));
  tags.append(makeTag('Roadmap step ' + trophy.stage, 'stage'));
  if (trophy.missable) tags.append(makeTag('⚠ MISSABLE — do in Chapter 1', 'missable'));
  li.append(head, tags);

  if (!spoilerHidden(trophy)) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'guide-toggle';
    toggle.textContent = openGuideId === trophy.id ? 'Hide guide ▲' : 'Read the guide ▼';
    toggle.addEventListener('click', () => {
      openGuideId = openGuideId === trophy.id ? null : trophy.id;
      renderList();
    });
    const guide = document.createElement('div');
    guide.className = 'guide';
    guide.hidden = openGuideId !== trophy.id;
    const guideText = document.createElement('p');
    guideText.textContent = trophy.guide;
    const sources = document.createElement('p');
    sources.className = 'sources';
    sources.append(document.createTextNode('Sources: '));
    trophy.sources.forEach((source, i) => {
      if (i > 0) sources.append(document.createTextNode(' · '));
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = source.name;
      sources.append(link);
    });
    guide.append(guideText, sources);
    li.append(toggle, guide);
  }
  return li;
}

function renderList() {
  listEl.replaceChildren();
  let shown = 0;
  for (const trophy of trophies) {
    if (!trophyVisible(trophy)) continue;
    listEl.append(buildCard(trophy));
    shown += 1;
  }
  if (activeFilter === 'online') {
    countLineEl.textContent = '0 online trophies — every one of GTA VI’s 55 trophies is earned offline, in single-player. Nothing to track here.';
    emptyNoteEl.hidden = true;
  } else if (activeFilter === 'missable') {
    countLineEl.textContent = '1 potentially missable trophy: Positive Mental Attitude. Every other trophy can be earned in free-roam after the story.';
    emptyNoteEl.hidden = shown > 0;
  } else {
    countLineEl.textContent = 'Showing ' + shown + ' of 55 trophies. Click “Read the guide” on any trophy for its guide and sources.';
    emptyNoteEl.hidden = shown > 0;
    emptyNoteEl.textContent = 'No trophies match this filter.';
  }
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  progressTextEl.textContent = n + ' / ' + total + ' earned';
  progressPctEl.textContent = Math.round((n / total) * 100) + '%';
  progressFillEl.style.width = ((n / total) * 100).toFixed(1) + '%';
}

function renderSources() {
  for (const source of data.sources ?? []) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = source.name;
    li.append(link);
    sourceListEl.append(li);
  }
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
  statusEl.textContent = 'Progress exported.';
}

async function importProgress(file) {
  const raw = JSON.parse(await file.text());
  const ids = Array.isArray(raw) ? raw : raw.earned;
  if (!Array.isArray(ids)) throw new Error('not a progress file');
  earned = new Set(ids.filter((n) => byId.has(n)));
  storeEarned();
  renderList();
  renderProgress();
  statusEl.textContent = 'Progress imported: ' + earned.size + ' earned.';
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const kind = params.get('kind');
  if (['story', 'missable', 'collectibles', 'activities', 'online', 'earned', 'remaining'].includes(kind)) {
    activeFilter = kind;
    document.querySelectorAll('.filters button').forEach((b) => b.classList.toggle('active', b.dataset.filter === kind));
  }
  if (params.get('spoiler') === '1') spoilerEl.checked = true;
  const open = Number(params.get('open'));
  if (Number.isInteger(open) && byId.has(open)) openGuideId = open;
}

document.querySelector('.filters').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filters button').forEach((b) => b.classList.toggle('active', b === button));
  renderList();
});
searchEl.addEventListener('input', renderList);
spoilerEl.addEventListener('change', renderList);
document.getElementById('export-btn').addEventListener('click', exportProgress);
document.getElementById('import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await importProgress(file);
  } catch {
    statusEl.textContent = 'That file is not a Leonida Legend progress export.';
  }
  event.target.value = '';
});
document.getElementById('reset-btn').addEventListener('click', () => {
  earned = new Set();
  storeEarned();
  renderList();
  renderProgress();
  statusEl.textContent = 'Progress reset.';
});

applyUrlParams();
renderSources();
renderList();
renderProgress();
