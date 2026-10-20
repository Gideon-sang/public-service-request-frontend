'use strict';
/* =========================================================
   Public Service Request System - client-side demo app
   Talks to the Spring Boot REST API at API_BASE (see config.js).
   Login uses a JWT stored in localStorage and sent as a Bearer header.
   Sections: 1 Config  2 API client  3 Auth  4 Requests
             5 Views   6 Events   7 Boot
   ========================================================= */

/* ---------- 1. Config & helpers ---------- */
const CATEGORIES = ['Streetlight', 'Water issue', 'Garbage collection', 'Road damage', 'Drainage / sewer', 'Other'];
const STATUSES = ['Pending', 'In Progress', 'Resolved'];
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const statusClass = (s) => 'st-' + s.replace(/\s/g, '').toLowerCase();
const state = { user: null, requests: [], filter: { status: 'All', category: 'All', q: '' }, authMode: 'login' };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- 2. API client ---------- */
const TOKEN_KEY = 'psrs_token';
async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  let res;
  try {
    res = await fetch(API_BASE + '/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = { 401: 'Please log in again.', 403: 'You do not have permission to do that.' }[res.status];
    throw new Error(data.error || fallback || 'Something went wrong. Try again.');
  }
  return data;
}
const requests = () => state.requests;
async function loadRequests() { state.requests = state.user ? await api('/requests') : []; }

/* ---------- 3. Auth ---------- */
async function authenticate(path, payload) {
  localStorage.removeItem(TOKEN_KEY); // never send an old token to login/register
  const { token, user } = await api(path, { method: 'POST', body: payload });
  localStorage.setItem(TOKEN_KEY, token);
  state.user = user;
}
const register = (data) => authenticate('/register', data);
const login = (data) => authenticate('/login', data);
function logout() {
  localStorage.removeItem(TOKEN_KEY);
  state.user = null; state.requests = [];
  render();
}

/* ---------- 4. Requests ---------- */
// Shrink photos before upload to keep requests small.
function readImage(file, maxSize = 800) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('That image could not be read.'));
    img.src = URL.createObjectURL(file);
  });
}

async function createRequest(data) {
  await api('/requests', { method: 'POST', body: data });
  await loadRequests();
}

async function updateRequest(id, status, note) {
  await api('/requests/' + id, { method: 'PATCH', body: { status, note } });
  await loadRequests();
}

function stats(list) {
  const count = (s) => list.filter((r) => r.status === s).length;
  const resolved = count('Resolved');
  return { total: list.length, pending: count('Pending'), progress: count('In Progress'), resolved, open: list.length - resolved };
}

function exportCSV(list) {
  const rows = [['Reference', 'Category', 'Location', 'Description', 'Status', 'Citizen', 'Submitted']]
    .concat(list.map((r) => [r.ref, r.category, r.location, r.description, r.status, r.userName, r.createdAt]));
  const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'service-requests.csv';
  a.click();
}

/* ---------- 5. Views ---------- */
const stepper = (status) => {
  const i = STATUSES.indexOf(status);
  return `<ol class="steps" aria-label="Progress">${STATUSES.map((st, n) => `<li class="${n < i ? 'done' : n === i ? 'current' : ''}">${st}</li>`).join('')}</ol>`;
};

const categoryBars = (list) => {
  const count = (c) => list.filter((r) => r.category === c).length;
  const max = Math.max(1, ...CATEGORIES.map(count));
  return CATEGORIES.map((c) => `<div class="cat"><span>${esc(c)}</span><div class="track"><i style="width:${(count(c) / max) * 100}%"></i></div><b>${count(c)}</b></div>`).join('');
};

const options = (list, selected) => list.map((o) => `<option ${o === selected ? 'selected' : ''}>${esc(o)}</option>`).join('');

function authView() {
  const isLogin = state.authMode === 'login';
  return `
  <section class="card auth">
    <h1>Report a county service problem</h1>
    <p class="muted">Residents of Murang'a County can report issues such as broken streetlights, water problems and uncollected garbage, then track progress until resolved.</p>
    <div class="tabs">
      <button class="btn ${isLogin ? 'active' : ''}" data-act="mode" data-mode="login">Log in</button>
      <button class="btn ${!isLogin ? 'active' : ''}" data-act="mode" data-mode="register">Create account</button>
    </div>
    <form id="authForm">
      ${isLogin ? '' : '<label for="name">Full name</label><input id="name" required minlength="2" autocomplete="name">'}
      <label for="email">Email</label><input id="email" type="email" required autocomplete="email">
      <label for="password">Password</label>
      <input id="password" type="password" required minlength="6" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
      <div id="authError" class="error" role="alert"></div>
      <button class="btn" type="submit">${isLogin ? 'Log in' : 'Create account'}</button>
    </form>
    <p class="muted">Demo admin: admin@demo.com / Admin@123</p>
  </section>`;
}

function requestCard(r, isAdmin) {
  const adminBox = isAdmin ? `
    <div class="admin-box">
      <select aria-label="Status">${options(STATUSES, r.status)}</select>
      <input aria-label="Note to citizen" placeholder="Note to citizen (optional)" value="${esc(r.note)}">
      <button class="btn small" data-act="save" data-id="${r.id}">Save update</button>
    </div>` : '';
  return `
  <article class="card" data-id="${r.id}">
    <div class="row"><strong>${esc(r.ref)}</strong><span class="badge ${statusClass(r.status)}">${r.status}</span></div>
    <h3>${esc(r.category)}</h3>
    <p class="muted">${esc(r.location)} | ${fmt(r.createdAt)}${isAdmin ? ' | ' + esc(r.userName) : ''}</p>
    ${stepper(r.status)}
    <p>${esc(r.description)}</p>
    ${r.image ? `<img class="thumb" src="${r.image}" alt="Photo attached to ${esc(r.ref)}">` : ''}
    ${r.note && !isAdmin ? `<p class="note">Update from the county: ${esc(r.note)}</p>` : ''}
    ${adminBox}
    <details><summary>Status history</summary><ul class="timeline">
      ${r.history.map((h) => `<li><b>${h.status}</b> - ${fmt(h.at)}${h.note ? ' (' + esc(h.note) + ')' : ''}</li>`).join('')}
    </ul></details>
  </article>`;
}

function citizenView() {
  const mine = requests().filter((r) => r.userId === state.user.id);
  const s = stats(mine);
  return `
  <div class="split">
    <section class="card">
      <h2>New service request</h2>
      <form id="requestForm">
        <label for="category">Category</label><select id="category" required>${options(CATEGORIES)}</select>
        <label for="location">Location</label><input id="location" required placeholder="e.g. Murang'a town, near Kiriaini Road">
        <label for="description">What is the problem?</label><textarea id="description" required minlength="10"></textarea>
        <label for="image">Photo (optional)</label><input id="image" type="file" accept="image/*">
        <div id="reqError" class="error" role="alert"></div>
        <button class="btn" type="submit">Submit request</button>
      </form>
    </section>
    <section>
      <h2>My requests</h2>
      <p class="muted">${s.total} submitted | ${s.open} open | ${s.resolved} resolved</p>
      ${mine.length ? mine.map((r) => requestCard(r, false)).join('') : '<div class="empty">No requests yet. Submit your first one using the form.</div>'}
    </section>
  </div>`;
}

function adminList() {
  const { status, category, q } = state.filter;
  const list = requests().filter((r) =>
    (status === 'All' || r.status === status) && (category === 'All' || r.category === category) &&
    `${r.ref} ${r.location} ${r.description} ${r.userName}`.toLowerCase().includes(q.toLowerCase()));
  return list.length ? list.map((r) => requestCard(r, true)).join('') : '<div class="empty">No requests match these filters.</div>';
}

function adminView() {
  const s = stats(requests());
  const pct = (n) => (s.total ? (n / s.total) * 100 : 0);
  return `
  <h1>Admin dashboard</h1>
  <div class="stats">
    <div class="stat"><b>${s.total}</b>Total requests</div>
    <div class="stat pending"><b>${s.open}</b>Open cases</div>
    <div class="stat"><b>${s.resolved}</b>Resolved cases</div>
    <div class="stat progress"><b>${s.progress}</b>In progress</div>
  </div>
  <section class="card">
    <h3>Open vs resolved (${Math.round(pct(s.resolved))}% resolved)</h3>
    <div class="bar" role="img" aria-label="${s.open} open, ${s.resolved} resolved">
      <span style="width:${pct(s.pending)}%;background:var(--pending)"></span>
      <span style="width:${pct(s.progress)}%;background:var(--progress)"></span>
      <span style="width:${pct(s.resolved)}%;background:var(--resolved)"></span>
    </div>
    <div class="legend"><span>Pending: ${s.pending}</span><span>In progress: ${s.progress}</span><span>Resolved: ${s.resolved}</span></div>
  </section>
  <section class="card"><h3>Requests by category</h3>${categoryBars(requests())}</section>
  <div class="filters">
    <input id="q" type="search" placeholder="Search reference, location, citizen..." aria-label="Search" value="${esc(state.filter.q)}">
    <select id="fStatus" aria-label="Filter by status">${options(['All', ...STATUSES], state.filter.status)}</select>
    <select id="fCategory" aria-label="Filter by category">${options(['All', ...CATEGORIES], state.filter.category)}</select>
    <button class="btn ghost small" data-act="export">Export CSV</button>
  </div>
  <div id="list">${adminList()}</div>`;
}

function render() {
  const u = state.user;
  $('#nav').innerHTML = u
    ? `<span>${esc(u.name)}<em class="role">${u.role}</em></span><button class="btn ghost small" data-act="logout">Log out</button>` : '';
  $('#app').innerHTML = !u ? authView() : u.role === 'admin' ? adminView() : citizenView();
}

/* ---------- 6. Events (delegated) ---------- */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'logout') logout();
  if (act === 'mode') { state.authMode = btn.dataset.mode; render(); }
  if (act === 'export') exportCSV(requests());
  if (act === 'save') {
    const card = btn.closest('article');
    try {
      await updateRequest(btn.dataset.id, card.querySelector('select').value, card.querySelector('input').value.trim());
      toast('Request updated');
      render();
    } catch (err) { toast(err.message); }
  }
});

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const submit = form.querySelector('button[type=submit]');
  submit.disabled = true;
  try {
    if (form.id === 'authForm') {
      const data = { name: form.name?.value, email: form.email.value, password: form.password.value };
      await (state.authMode === 'login' ? login(data) : register(data));
      await loadRequests();
      render();
    }
    if (form.id === 'requestForm') {
      const image = await readImage(form.image.files[0]);
      await createRequest({ category: form.category.value, location: form.location.value.trim(), description: form.description.value.trim(), image });
      toast('Request submitted');
      render();
    }
  } catch (err) {
    const box = form.querySelector('.error');
    if (box) box.textContent = err.message;
  } finally { submit.disabled = false; }
});

document.addEventListener('input', (e) => {
  const map = { q: 'q', fStatus: 'status', fCategory: 'category' };
  if (!map[e.target.id]) return;
  state.filter[map[e.target.id]] = e.target.value;
  $('#list').innerHTML = adminList();
});

/* ---------- 7. Boot ---------- */
(async function boot() {
  try {
    if (localStorage.getItem(TOKEN_KEY)) { state.user = await api('/me'); await loadRequests(); }
  } catch { localStorage.removeItem(TOKEN_KEY); state.user = null; }
  render();
})();
