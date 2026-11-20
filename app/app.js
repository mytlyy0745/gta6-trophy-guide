// Leonida Legend — GTA VI trophy tracker.
// Loads app/data/trophies.json, renders the checklist, saves earned trophies in
// localStorage, and filters by kind, grade and search. No network at run time
// beyond the app's own files; source links open only when the reader follows them.
const STORAGE_KEY = 'leonida-legend-progress-v1';
const listEl = document.getElementById('trophyList');
const earnedCountEl = document.getElementById('earnedCount');
const progressFillEl = document.getElementById('progressFill');
const progressDetailEl = document.getElementById('progressDetail');
const gradeCountsEl = document.getElementById('gradeCounts');
const filterNoteEl = document.getElementById('filterNote');
const emptyNoteEl = document.getElementById('emptyNote');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');
const earnedOnlyEl = document.getElementById('earnedOnly');

const data = await (await fetch('data/trophies.json')).json();
const trophies = data.trophies;

let earned = new Set(loadEarned());
let kindFilter = 'all';
let openId = null;

function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function saveEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function gradeLabel(grade) {
  return grade[0].toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  return { story: 'Story', collectibles: 'Collectibles', activities: 'Activities' }[kind] ?? kind;
}

function isSpoilerHidden(trophy) {
  return spoilerEl.checked && trophy.kind === 'story' && !earned.has(trophy.id);
}

function trophyMatches(trophy) {
  if (kindFilter === 'online') return false;
  if (kindFilter === 'missable' && !trophy.missable) return false;
  if (kindFilter !== 'all' && kindFilter !== 'missable' && trophy.kind !== kindFilter) return false;
  if (gradeEl.value !== 'all' && trophy.grade !== gradeEl.value) return false;
  if (earnedOnlyEl.checked && !earned.has(trophy.id)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(trophy.name + ' ' + trophy.description + ' ' + trophy.guide).toLowerCase().includes(q)) return false;
  return true;
}

function buildTrophyCard(trophy) {
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
    saveEarned();
    renderTrophyList();
    renderProgress();
  });
  const title = document.createElement('div');
  title.className = 'trophy-title';
  const name = document.createElement('div');
  name.className = 'name';
  const desc = document.createElement('div');
  desc.className = 'desc';
  if (isSpoilerHidden(trophy)) {
    name.textContent = 'Hidden story trophy';
    desc.textContent = 'Spoiler hidden — earn it to reveal its name and description.';
    desc.classList.add('spoiler-hidden');
  } else {
    name.textContent = trophy.name;
    desc.textContent = trophy.description;
  }
  title.append(name, desc);
  const badge = document.createElement('span');
  badge.className = 'grade-badge grade-' + trophy.grade;
  badge.textContent = gradeLabel(trophy.grade);
  head.append(box, title, badge);

  const tags = document.createElement('div');
  tags.className = 'tags';
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = kindLabel(trophy.kind);
  tags.append(kindTag);
  const stageTag = document.createElement('span');
  stageTag.className = 'tag stage';
  stageTag.textContent = 'Roadmap step ' + trophy.stage;
  tags.append(stageTag);
  if (trophy.missable) {
    const missTag = document.createElement('span');
    missTag.className = 'tag missable';
    missTag.textContent = '⚠ MISSABLE — do in Chapter 1';
    tags.append(missTag);
  }

  li.append(head, tags);

  if (!isSpoilerHidden(trophy)) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'guide-toggle';
    toggle.textContent = openId === trophy.id ? 'Hide guide ▲' : 'Read the guide ▼';
    const guide = document.createElement('div');
    guide.className = 'guide';
    guide.hidden = openId !== trophy.id;
    const guideText = document.createElement('p');
    guideText.textContent = trophy.guide;
    const sources = document.createElement('p');
    sources.className = 'sources';
    sources.append(document.createTextNode('Sources: '));
    trophy.sources.forEach((s, i) => {
      if (i > 0) sources.append(document.createTextNode(' · '));
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.name;
      sources.append(a);
    });
    guide.append(guideText, sources);
    toggle.addEventListener('click', () => {
      openId = openId === trophy.id ? null : trophy.id;
      renderTrophyList();
    });
    li.append(toggle, guide);
  }
  return li;
}

function renderTrophyList() {
  listEl.replaceChildren();
  let shown = 0;
  for (const trophy of trophies) {
    if (!trophyMatches(trophy)) continue;
    listEl.append(buildTrophyCard(trophy));
    shown += 1;
  }
  emptyNoteEl.hidden = shown > 0 || kindFilter === 'online';
  if (kindFilter === 'online') {
    filterNoteEl.textContent = '0 online trophies — every one of GTA VI’s 55 trophies is earned offline, in single-player. Nothing to track here.';
  } else if (kindFilter === 'missable') {
    filterNoteEl.textContent = '1 potentially missable trophy: Positive Mental Attitude. Every other trophy can be earned in free-roam after the story.';
  } else if (shown === 0) {
    filterNoteEl.textContent = 'No trophies match this filter.';
  } else {
    filterNoteEl.textContent = `Showing ${shown} of 55 trophies. Click “Read the guide” on any trophy for its guide and sources.`;
  }
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  earnedCountEl.textContent = String(n);
  progressFillEl.style.width = ((n / total) * 100).toFixed(1) + '%';
  progressDetailEl.textContent = ((n / total) * 100).toFixed(0) + '% to the platinum';
  const byGrade = {};
  for (const t of trophies) if (earned.has(t.id)) byGrade[t.grade] = (byGrade[t.grade] ?? 0) + 1;
  gradeCountsEl.textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${byGrade[g] ?? 0} ${g}`)
    .join(' · ');
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  const raw = JSON.parse(await file.text());
  const ids = Array.isArray(raw) ? raw : raw.earned;
  if (!Array.isArray(ids)) throw new Error('not a progress file');
  const valid = new Set(trophies.map((t) => t.id));
  earned = new Set(ids.filter((n) => valid.has(n)));
  saveEarned();
  renderTrophyList();
  renderProgress();
}

function applyDeepLink() {
  const params = new URLSearchParams(location.search);
  const kind = params.get('kind');
  if (['story', 'missable', 'collectibles', 'activities', 'online'].includes(kind)) {
    kindFilter = kind;
    document.querySelectorAll('#kindFilters button').forEach((b) => b.classList.toggle('active', b.dataset.kind === kind));
  }
  if (params.get('spoiler') === '1') spoilerEl.checked = true;
  const open = Number(params.get('open'));
  if (Number.isInteger(open) && trophies.some((t) => t.id === open)) openId = open;
}

document.getElementById('kindFilters').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-kind]');
  if (!button) return;
  kindFilter = button.dataset.kind;
  document.querySelectorAll('#kindFilters button').forEach((b) => b.classList.toggle('active', b === button));
  renderTrophyList();
});
searchEl.addEventListener('input', renderTrophyList);
gradeEl.addEventListener('change', renderTrophyList);
spoilerEl.addEventListener('change', renderTrophyList);
earnedOnlyEl.addEventListener('change', renderTrophyList);
document.getElementById('export').addEventListener('click', exportProgress);
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await importProgress(file);
  } catch {
    alert('That file is not a Leonida Legend progress export.');
  }
  e.target.value = '';
});
document.getElementById('missableJump').addEventListener('click', () => {
  kindFilter = 'missable';
  document.querySelectorAll('#kindFilters button').forEach((b) => b.classList.toggle('active', b.dataset.kind === 'missable'));
  openId = 28;
  renderTrophyList();
  document.getElementById('trophy-28')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

applyDeepLink();
renderTrophyList();
renderProgress();
