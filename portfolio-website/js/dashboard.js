/* NumanOS — CRM dashboard: router + module views (all wired to the Flask API). */
(function () {
  if (!API.isAuthed()) {
    location.href = 'login.html';
    return;
  }

  const view = document.getElementById('view');

  /* ---------- helpers ---------- */
  const esc = (s) =>
    (s == null ? '' : String(s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) =>
    '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  const setHTML = (h) => (view.innerHTML = h);
  const loadingView = () => setHTML('<div class="empty"><i class="fas fa-circle-notch fa-spin"></i> Loading…</div>');
  const head = (title, sub) => `<div class="view-head"><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>`;
  const onDelete = (resource) =>
    view.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        b.disabled = true;
        await API.del('/' + resource + '/' + b.dataset.del);
        route();
      })
    );

  const monthKey = (d) => {
    const x = new Date(d);
    return isNaN(x) ? '' : x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0');
  };
  const monthLabel = (k) => {
    if (!k) return 'No date';
    const [y, m] = k.split('-');
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };
  const relTime = (d) => {
    const t = new Date(d).getTime();
    if (isNaN(t)) return '';
    const diff = t - Date.now();
    const abs = Math.abs(diff);
    const day = 86400000;
    const mins = Math.round(abs / 60000);
    const hrs = Math.round(abs / 3600000);
    const days = Math.round(abs / day);
    let s;
    if (abs < 3600000) s = mins + 'm';
    else if (abs < day) s = hrs + 'h';
    else s = days + 'd';
    return diff >= 0 ? 'in ' + s : s + ' ago';
  };

  /* tiny, safe markdown (input is escaped first, then formatted) */
  function mdToHtml(src) {
    const lines = esc(src || '').split('\n');
    const inline = (t) =>
      t
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    let html = '';
    let inList = false;
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, '');
      const bullet = line.match(/^\s*[-*]\s+(.*)/);
      if (bullet) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + inline(bullet[1]) + '</li>';
        continue;
      }
      if (inList) { html += '</ul>'; inList = false; }
      if (/^###\s/.test(line)) html += '<h4>' + inline(line.slice(4)) + '</h4>';
      else if (/^##\s/.test(line)) html += '<h3>' + inline(line.slice(3)) + '</h3>';
      else if (/^#\s/.test(line)) html += '<h3>' + inline(line.slice(2)) + '</h3>';
      else if (line.trim() === '') html += '';
      else html += '<p>' + inline(line) + '</p>';
    }
    if (inList) html += '</ul>';
    return html;
  }

  function downloadCSV(filename, rows) {
    const csv = rows
      .map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toast(msg, kind = 'ok') {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.innerHTML = (kind === 'err' ? '<i class="fas fa-circle-exclamation"></i> ' : '<i class="fas fa-circle-check"></i> ') + esc(msg);
    t.className = 'toast ' + kind + ' show';
    clearTimeout(t._t);
    t._t = setTimeout(() => (t.className = 'toast ' + kind), 3000);
  }

  /* ---------- user ---------- */
  async function loadUser() {
    let u = API.getUser();
    try {
      const r = await API.get('/auth/me');
      u = r.user;
      API.setUser(u);
    } catch (e) { /* keep cached */ }
    if (u) {
      document.getElementById('userName').textContent = (u.name || 'User').split(' ')[0];
      document.getElementById('userEmail').textContent = u.email || '';
      document.getElementById('userAvatar').textContent = (u.name || 'NI')
        .split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
    }
    return u;
  }

  /* ---------- nav + router ---------- */
  const navLinks = [...document.querySelectorAll('#dashNav a')];
  navLinks.forEach((a) => a.addEventListener('click', () => (location.hash = '#/' + a.dataset.view)));
  document.getElementById('signOut').addEventListener('click', () => {
    API.token.clear();
    location.href = 'login.html';
  });
  document.getElementById('hamburger').addEventListener('click', () =>
    document.getElementById('sidebar').classList.toggle('open')
  );

  async function route() {
    const v = location.hash.replace('#/', '') || 'overview';
    const fn = views[v] || overview;
    navLinks.forEach((a) => a.classList.toggle('active', a.dataset.view === (views[v] ? v : 'overview')));
    document.getElementById('sidebar').classList.remove('open');
    loadingView();
    try {
      await fn();
    } catch (e) {
      setHTML('<div class="empty">' + esc(e.message) + '</div>');
    }
  }
  window.addEventListener('hashchange', route);

  /* ===================== OVERVIEW ===================== */
  async function overview() {
    const s = await API.get('/stats');
    const u = API.getUser() || {};
    const card = (icon, value, label) =>
      `<div class="stat-card"><div class="stat-ico"><i class="fas ${icon}"></i></div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
    const mods = [
      ['expenses', 'fa-wallet', 'Expense Tracker', 'Transactions, budgets & totals'],
      ['storage', 'fa-folder-open', 'Cloud Storage', 'Upload and manage your files'],
      ['notes', 'fa-note-sticky', 'Notes', 'Notion-style notes & search'],
      ['meetings', 'fa-calendar-check', 'Meetings', 'Client bookings & calendar'],
      ['ai', 'fa-robot', 'AI Assistant', 'Ask questions over your data'],
      ['email', 'fa-envelope', 'Email Generator', 'Draft client emails with AI'],
      ['projects', 'fa-diagram-project', 'Projects', "What you're working on"],
      ['integrations', 'fa-plug', 'Integrations', 'Connect other services'],
    ];

    const meetingsList = (s.meetings_list || []).map((m) => ({ ...m, _t: m.when ? new Date(m.when).getTime() : 0 }));
    const next = meetingsList.filter((m) => m._t >= Date.now()).sort((a, b) => a._t - b._t)[0];
    const recentProjects = s.projects_list || [];

    const comingUp = next
      ? `<div class="list-item"><div><h4>${esc(next.title || 'Meeting')}</h4>
           <p><i class="fas fa-clock"></i> ${esc(new Date(next.when).toLocaleString())} · <b>${esc(relTime(next.when))}</b>${next.client ? ' · ' + esc(next.client) : ''}</p></div>
           ${next.link ? `<a class="btn btn-primary btn-sm" href="${esc(next.link)}" target="_blank"><i class="fas fa-video"></i> Join</a>` : ''}</div>`
      : '<div class="empty" style="padding:18px 0">No upcoming meetings.</div>';

    const projHtml = recentProjects.length
      ? recentProjects.map((p) => `<div class="list-item"><div><h4>${esc(p.name || 'Project')} <span class="chip ${statusClass(p.status)}">${esc(p.status || 'Active')}</span></h4><p>${esc(p.tech || '')}</p></div>${p.link ? `<a class="icon-btn" href="${esc(p.link)}" target="_blank"><i class="fas fa-arrow-up-right-from-square"></i></a>` : ''}</div>`).join('')
      : '<div class="empty" style="padding:18px 0">No projects yet.</div>';

    setHTML(
      '<span class="dash-chip"><i class="fas fa-wand-magic-sparkles"></i> My Account Overview</span>' +
      head('Welcome back, ' + esc((u.name || 'Numan').split(' ')[0]) + ' 👋', "Here's your command center.") +
        `<div class="stat-grid">
          ${card('fa-sack-dollar', money(s.expenses_total), 'Expenses tracked')}
          ${card('fa-folder-open', s.files, 'Files stored')}
          ${card('fa-note-sticky', s.notes, 'Notes')}
          ${card('fa-calendar-check', s.meetings, 'Meetings')}
        </div>
        <div class="two-col">
          <div class="panel"><div class="panel-head"><h2><i class="fas fa-calendar-day"></i> Coming up</h2><a class="auth-link" data-go="meetings">View all</a></div>${comingUp}</div>
          <div class="panel"><div class="panel-head"><h2><i class="fas fa-diagram-project"></i> Recent projects</h2><a class="auth-link" data-go="projects">View all</a></div>${projHtml}</div>
        </div>
        <div class="view-head" style="margin-top:8px"><h1 style="font-size:1.15rem">Your modules</h1></div>
        <div class="module-grid">
          ${mods
            .map(
              ([v, ic, t, d]) =>
                `<div class="module-card" data-go="${v}"><div class="mod-ico"><i class="fas ${ic}"></i></div><h3>${t}</h3><p>${d}</p></div>`
            )
            .join('')}
        </div>`
    );
    view.querySelectorAll('[data-go]').forEach((c) => c.addEventListener('click', () => (location.hash = '#/' + c.dataset.go)));
  }

  /* ===================== EXPENSES ===================== */
  const expFilter = { month: 'all', cat: 'all' };
  async function expenses() {
    const [items, prefs] = await Promise.all([API.get('/expenses'), API.get('/prefs')]);
    const budget = Number(prefs.monthly_budget || 0);
    const thisMonth = monthKey(new Date());

    const months = [...new Set(items.map((e) => monthKey(e.date || e.created_at)).filter(Boolean))].sort().reverse();
    const cats = [...new Set(items.map((e) => e.category || 'Other'))].sort();
    if (expFilter.month !== 'all' && !months.includes(expFilter.month)) expFilter.month = 'all';
    if (expFilter.cat !== 'all' && !cats.includes(expFilter.cat)) expFilter.cat = 'all';

    const monthSpend = items
      .filter((e) => monthKey(e.date || e.created_at) === thisMonth)
      .reduce((a, e) => a + Number(e.amount || 0), 0);
    const pct = budget ? Math.min(100, (monthSpend / budget) * 100) : 0;
    const over = budget && monthSpend > budget;

    setHTML(
      head('Expense Tracker', 'Track spending, categories, budget and trends.') +
        `<div class="stat-grid" id="expStats"></div>
        <div class="panel" id="budgetPanel">
          <div class="panel-head"><h2><i class="fas fa-bullseye"></i> Monthly budget</h2>
            <span class="muted-sm">${esc(monthLabel(thisMonth))}</span></div>
          <div class="budget-row">
            <div class="budget-input">
              <label>Budget</label>
              <div class="inline-field"><span>$</span><input id="budgetInput" type="number" min="0" step="50" value="${budget || ''}" placeholder="e.g. 2000"></div>
              <button class="btn btn-primary btn-sm" id="saveBudget"><i class="fas fa-floppy-disk"></i> Save</button>
            </div>
            <div class="budget-meter">
              <div class="budget-meter-head">
                <span>${money(monthSpend)} spent${budget ? ' of ' + money(budget) : ''}</span>
                <span class="${over ? 'over' : ''}">${budget ? Math.round(pct) + '%' : 'set a budget'}</span>
              </div>
              <div class="bar-track lg"><div class="bar-fill ${over ? 'danger' : ''}" style="width:${budget ? pct : 0}%"></div></div>
              ${over ? `<p class="over-note"><i class="fas fa-triangle-exclamation"></i> Over budget by ${money(monthSpend - budget)}</p>` : ''}
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Add expense</h2></div>
          <form id="expForm" class="form-grid">
            <div class="field"><label>Title</label><input name="title" required placeholder="AWS bill"></div>
            <div class="field"><label>Amount</label><input name="amount" type="number" step="0.01" required placeholder="0.00"></div>
            <div class="field"><label>Category</label><select name="category"><option>Cloud</option><option>Software</option><option>Hardware</option><option>Travel</option><option>Office</option><option>Subscriptions</option><option>Other</option></select></div>
            <div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-full" type="submit"><i class="fas fa-plus"></i> Add</button></div>
          </form>
        </div>
        <div class="two-col">
          <div class="panel">
            <div class="panel-head"><h2>By category</h2></div>
            <div id="expChart"></div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <h2>Transactions</h2>
              <div class="filters">
                <select id="fMonth" class="mini-select"><option value="all">All months</option>${months.map((m) => `<option value="${m}" ${expFilter.month === m ? 'selected' : ''}>${esc(monthLabel(m))}</option>`).join('')}</select>
                <select id="fCat" class="mini-select"><option value="all">All categories</option>${cats.map((c) => `<option value="${esc(c)}" ${expFilter.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
                <button class="icon-btn" id="exportCsv" title="Export CSV"><i class="fas fa-file-csv"></i></button>
              </div>
            </div>
            <div id="expTable"></div>
          </div>
        </div>`
    );

    const renderFiltered = () => {
      const filtered = items.filter(
        (e) =>
          (expFilter.month === 'all' || monthKey(e.date || e.created_at) === expFilter.month) &&
          (expFilter.cat === 'all' || (e.category || 'Other') === expFilter.cat)
      );
      const total = filtered.reduce((a, e) => a + Number(e.amount || 0), 0);
      const byCat = {};
      filtered.forEach((e) => {
        const c = e.category || 'Other';
        byCat[c] = (byCat[c] || 0) + Number(e.amount || 0);
      });

      document.getElementById('expStats').innerHTML =
        `<div class="stat-card"><div class="stat-ico"><i class="fas fa-sack-dollar"></i></div><div class="stat-value">${money(total)}</div><div class="stat-label">${expFilter.month === 'all' ? 'Total tracked' : 'Filtered total'}</div></div>
         <div class="stat-card"><div class="stat-ico"><i class="fas fa-receipt"></i></div><div class="stat-value">${filtered.length}</div><div class="stat-label">Transactions</div></div>
         <div class="stat-card"><div class="stat-ico"><i class="fas fa-layer-group"></i></div><div class="stat-value">${Object.keys(byCat).length}</div><div class="stat-label">Categories</div></div>`;

      const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      const max = sorted.length ? Math.max(...sorted.map((c) => c[1])) : 0;
      document.getElementById('expChart').innerHTML = sorted.length
        ? sorted
            .map(
              ([c, v]) =>
                `<div class="bar-row"><span class="bar-label">${esc(c)}</span><div class="bar-track"><div class="bar-fill" style="width:${max ? (v / max) * 100 : 0}%"></div></div><span class="bar-val">${money(v)}</span></div>`
            )
            .join('')
        : '<div class="empty">No data for this filter.</div>';

      const rows = filtered
        .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
        .map(
          (e) => `<tr>
            <td>${esc(e.title || '—')}</td>
            <td><span class="chip gray">${esc(e.category || 'Other')}</span></td>
            <td>${fmtDate(e.date || e.created_at)}</td>
            <td style="font-weight:600">${money(e.amount)}</td>
            <td style="text-align:right"><button class="icon-btn" data-del="${e.id}"><i class="fas fa-trash"></i></button></td>
          </tr>`
        )
        .join('');
      document.getElementById('expTable').innerHTML = filtered.length
        ? `<table class="data-table"><thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Amount</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
        : '<div class="empty">No expenses match — add one or change filters.</div>';
      onDelete('expenses');
    };
    renderFiltered();

    document.getElementById('fMonth').addEventListener('change', (e) => { expFilter.month = e.target.value; renderFiltered(); });
    document.getElementById('fCat').addEventListener('change', (e) => { expFilter.cat = e.target.value; renderFiltered(); });
    document.getElementById('exportCsv').addEventListener('click', () => {
      const rows = [['Title', 'Category', 'Date', 'Amount']];
      items.forEach((e) => rows.push([e.title, e.category, fmtDate(e.date || e.created_at), e.amount]));
      downloadCSV('numanos-expenses.csv', rows);
      toast('Exported ' + items.length + ' transactions');
    });
    document.getElementById('saveBudget').addEventListener('click', async () => {
      await API.put('/prefs', { monthly_budget: Number(document.getElementById('budgetInput').value) || 0 });
      toast('Budget saved');
      route();
    });
    document.getElementById('expForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      await API.post('/expenses', {
        title: f.title.value,
        amount: parseFloat(f.amount.value) || 0,
        category: f.category.value,
        date: f.date.value,
      });
      toast('Expense added');
      route();
    });
  }

  /* ===================== STORAGE ===================== */
  async function storage() {
    const files = await API.get('/storage');
    const totalKb = files.reduce((a, f) => a + (f.size || 0), 0);
    const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1024).toFixed(1) + ' KB');
    const fileIcon = (mime) => {
      const m = mime || '';
      if (m.startsWith('image/')) return 'fa-file-image';
      if (m.includes('pdf')) return 'fa-file-pdf';
      if (m.startsWith('video/')) return 'fa-file-video';
      if (m.includes('zip') || m.includes('compressed')) return 'fa-file-zipper';
      if (m.includes('sheet') || m.includes('csv')) return 'fa-file-csv';
      return 'fa-file';
    };
    const rows = files
      .map(
        (f) => `<tr>
          <td><i class="fas ${fileIcon(f.mime)}" style="color:var(--accent);margin-right:8px"></i>${esc(f.name)}</td>
          <td>${fmtSize(f.size || 0)}</td>
          <td>${fmtDate(f.created_at)}</td>
          <td style="text-align:right">
            <button class="icon-btn" data-dl="${f.id}" data-name="${esc(f.name)}"><i class="fas fa-download"></i></button>
            <button class="icon-btn" data-del="${f.id}"><i class="fas fa-trash"></i></button>
          </td></tr>`
      )
      .join('');
    setHTML(
      head('Personal Cloud Storage', 'Upload, download and manage your files.') +
        `<div class="stat-grid">
          <div class="stat-card"><div class="stat-ico"><i class="fas fa-folder-open"></i></div><div class="stat-value">${files.length}</div><div class="stat-label">Files</div></div>
          <div class="stat-card"><div class="stat-ico"><i class="fas fa-hard-drive"></i></div><div class="stat-value">${fmtSize(totalKb)}</div><div class="stat-label">Total size</div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Upload a file</h2></div>
          <div class="dropzone" id="dropzone">
            <i class="fas fa-cloud-arrow-up"></i>
            <p>Drag &amp; drop a file here, or <label for="fileInput" class="link-btn">browse</label></p>
            <input type="file" id="fileInput" hidden>
            <div id="fileChosen" class="muted-sm"></div>
            <button class="btn btn-primary" id="uploadBtn" disabled><i class="fas fa-cloud-arrow-up"></i> Upload</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Your files (${files.length})</h2></div>
          ${
            files.length
              ? `<table class="data-table"><thead><tr><th>Name</th><th>Size</th><th>Uploaded</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
              : '<div class="empty">No files yet — upload your first above.</div>'
          }
        </div>`
    );
    const input = document.getElementById('fileInput');
    const dropzone = document.getElementById('dropzone');
    const chosen = document.getElementById('fileChosen');
    const uploadBtn = document.getElementById('uploadBtn');
    const setFile = (file) => {
      input._file = file;
      chosen.textContent = file ? 'Selected: ' + file.name : '';
      uploadBtn.disabled = !file;
    };
    input.addEventListener('change', () => setFile(input.files[0]));
    ['dragover', 'dragenter'].forEach((ev) =>
      dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('drag'); })
    );
    ['dragleave', 'drop'].forEach((ev) =>
      dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); })
    );
    dropzone.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]); });
    uploadBtn.addEventListener('click', async () => {
      const file = input._file || input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Uploading…';
      await API.upload('/storage', fd);
      toast('File uploaded');
      route();
    });
    view.querySelectorAll('[data-dl]').forEach((b) =>
      b.addEventListener('click', async () => {
        const res = await fetch(API.downloadUrl('/storage/' + b.dataset.dl + '/download'), {
          headers: { Authorization: 'Bearer ' + API.token.get() },
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = b.dataset.name;
        a.click();
        URL.revokeObjectURL(url);
      })
    );
    onDelete('storage');
  }

  /* ===================== NOTES ===================== */
  let noteSearch = '';
  let noteTag = '';
  async function notes() {
    const items = await API.get('/notes');
    const allTags = [...new Set(items.flatMap((n) => n.tags || []))].sort();

    setHTML(
      head('Notes', 'A Notion-style space for your knowledge (markdown supported).') +
        `<div class="panel">
          <div class="panel-head"><h2 id="noteFormTitle">New note</h2><button class="icon-btn" id="noteNew">Clear</button></div>
          <form id="noteForm">
            <input type="hidden" name="id">
            <div class="field" style="margin-bottom:12px"><label>Title</label><input name="title" required placeholder="Note title"></div>
            <div class="field" style="margin-bottom:12px"><label>Tags (comma-separated)</label><input name="tags" placeholder="devops, client, idea"></div>
            <div class="field" style="margin-bottom:12px"><label>Content — supports **bold**, *italic*, # headings, - lists, links</label><textarea name="content" rows="6" placeholder="Write anything… (these feed the AI Assistant)"></textarea></div>
            <button class="btn btn-primary" type="submit"><i class="fas fa-floppy-disk"></i> Save note</button>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head">
            <h2>All notes (<span id="noteCount">${items.length}</span>)</h2>
            <div class="dash-search compact"><i class="fas fa-magnifying-glass"></i><input id="noteSearchInput" placeholder="Search notes…" value="${esc(noteSearch)}"></div>
          </div>
          ${allTags.length ? `<div class="tag-row" id="tagRow"><button class="tag-pill ${!noteTag ? 'active' : ''}" data-tag="">All</button>${allTags.map((t) => `<button class="tag-pill ${noteTag === t ? 'active' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
          <div id="noteList"></div>
        </div>`
    );

    const renderList = () => {
      const q = noteSearch.toLowerCase();
      const filtered = items.filter((n) => {
        const matchesQ = !q || (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
        const matchesTag = !noteTag || (n.tags || []).includes(noteTag);
        return matchesQ && matchesTag;
      });
      document.getElementById('noteCount').textContent = filtered.length;
      document.getElementById('noteList').innerHTML = filtered.length
        ? filtered
            .map(
              (n) => `<div class="note-card">
                <div class="note-card-head">
                  <h4>${esc(n.title || 'Untitled')}</h4>
                  <div style="display:flex;gap:6px">
                    <button class="icon-btn" data-edit="${n.id}"><i class="fas fa-pen"></i></button>
                    <button class="icon-btn" data-del="${n.id}"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
                <div class="note-md">${mdToHtml((n.content || '').slice(0, 600))}</div>
                ${(n.tags || []).length ? '<div class="tag-row sm">' + n.tags.map((t) => `<span class="tag-pill static">#${esc(t)}</span>`).join('') + '</div>' : ''}
                <div class="muted-sm">${fmtDate(n.updated_at || n.created_at)}</div>
              </div>`
            )
            .join('')
        : '<div class="empty">No notes match your search.</div>';
      bindNoteActions();
    };

    const form = document.getElementById('noteForm');
    const reset = () => {
      form.reset();
      form.id.value = '';
      document.getElementById('noteFormTitle').textContent = 'New note';
    };
    const bindNoteActions = () => {
      view.querySelectorAll('[data-edit]').forEach((b) =>
        b.addEventListener('click', () => {
          const n = items.find((x) => x.id === b.dataset.edit);
          form.id.value = n.id;
          form.title.value = n.title || '';
          form.tags.value = (n.tags || []).join(', ');
          form.content.value = n.content || '';
          document.getElementById('noteFormTitle').textContent = 'Edit note';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
      );
      view.querySelectorAll('[data-del]').forEach((b) =>
        b.addEventListener('click', async () => {
          b.disabled = true;
          await API.del('/notes/' + b.dataset.del);
          route();
        })
      );
    };

    document.getElementById('noteNew').addEventListener('click', reset);
    document.getElementById('noteSearchInput').addEventListener('input', (e) => { noteSearch = e.target.value; renderList(); });
    view.querySelectorAll('[data-tag]').forEach((b) =>
      b.addEventListener('click', () => { noteTag = b.dataset.tag; route(); })
    );
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const tags = form.tags.value.split(',').map((t) => t.trim()).filter(Boolean);
      const body = { title: form.title.value, content: form.content.value, tags };
      if (form.id.value) await API.patch('/notes/' + form.id.value, body);
      else await API.post('/notes', body);
      toast('Note saved');
      route();
    });
    renderList();
  }

  /* ===================== MEETINGS ===================== */
  async function meetings() {
    const items = (await API.get('/meetings')).map((m) => ({ ...m, _t: m.when ? new Date(m.when).getTime() : 0 }));
    const upcoming = items.filter((m) => m._t >= Date.now()).sort((a, b) => a._t - b._t);
    const past = items.filter((m) => m._t < Date.now()).sort((a, b) => b._t - a._t);

    const row = (m, isPast) => `<div class="list-item ${isPast ? 'dim' : ''}">
        <div>
          <h4>${esc(m.title || 'Meeting')} ${m.client ? '· <span style="color:var(--text-secondary)">' + esc(m.client) + '</span>' : ''}</h4>
          <p><i class="fas fa-clock"></i> ${m.when ? esc(new Date(m.when).toLocaleString()) : 'No time set'} ${m.when ? '· <b>' + esc(relTime(m.when)) + '</b>' : ''}</p>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${m.link && !isPast ? `<a class="btn btn-primary btn-sm" href="${esc(m.link)}" target="_blank"><i class="fas fa-video"></i> Join</a>` : ''}
          <button class="icon-btn" data-medit="${m.id}"><i class="fas fa-pen"></i></button>
          <button class="icon-btn" data-del="${m.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;

    setHTML(
      head('Client Meetings', 'Book and track meetings with your clients.') +
        `<div class="panel">
          <div class="panel-head"><h2 id="mFormTitle">Schedule a meeting</h2><button class="icon-btn" id="mNew">Clear</button></div>
          <form id="mForm" class="form-grid">
            <input type="hidden" name="id">
            <div class="field"><label>Title</label><input name="title" required placeholder="Consultation call"></div>
            <div class="field"><label>Client</label><input name="client" placeholder="Acme Inc."></div>
            <div class="field"><label>When</label><input name="when" type="datetime-local"></div>
            <div class="field"><label>Meeting link</label><input name="link" placeholder="https://meet.google.com/…"></div>
            <div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-full" type="submit"><i class="fas fa-plus"></i> Save</button></div>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head"><h2><i class="fas fa-calendar-day"></i> Upcoming (${upcoming.length})</h2></div>
          ${upcoming.length ? upcoming.map((m) => row(m, false)).join('') : '<div class="empty">No upcoming meetings.</div>'}
        </div>
        ${past.length ? `<div class="panel"><div class="panel-head"><h2><i class="fas fa-clock-rotate-left"></i> Past (${past.length})</h2></div>${past.map((m) => row(m, true)).join('')}</div>` : ''}`
    );
    const form = document.getElementById('mForm');
    const reset = () => { form.reset(); form.id.value = ''; document.getElementById('mFormTitle').textContent = 'Schedule a meeting'; };
    document.getElementById('mNew').addEventListener('click', reset);
    view.querySelectorAll('[data-medit]').forEach((b) =>
      b.addEventListener('click', () => {
        const m = items.find((x) => x.id === b.dataset.medit);
        form.id.value = m.id;
        form.title.value = m.title || '';
        form.client.value = m.client || '';
        form.when.value = m.when ? new Date(m.when).toISOString().slice(0, 16) : '';
        form.link.value = m.link || '';
        document.getElementById('mFormTitle').textContent = 'Edit meeting';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
    );
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = { title: form.title.value, client: form.client.value, when: form.when.value, link: form.link.value };
      if (form.id.value) await API.patch('/meetings/' + form.id.value, body);
      else await API.post('/meetings', body);
      toast('Meeting saved');
      route();
    });
    onDelete('meetings');
  }

  /* ===================== AI ASSISTANT ===================== */
  async function ai() {
    setHTML(
      head('AI Assistant', 'Ask questions over your notes, expenses, projects & meetings.') +
        `<div class="panel">
          <div class="chat-log" id="chatLog">
            <div class="chat-msg ai">Hi! I'm your NumanOS assistant. I can search your notes and crunch your data. Try a prompt below.</div>
          </div>
          <div class="chip-row" id="suggestions">
            <button class="suggest">How much have I spent this month?</button>
            <button class="suggest">Summarise my notes</button>
            <button class="suggest">What projects am I working on?</button>
            <button class="suggest">What meetings are coming up?</button>
          </div>
          <form id="chatForm" style="display:flex;gap:10px;margin-top:12px">
            <input class="field" style="flex:1" name="msg" placeholder="Ask anything about your workspace…" autocomplete="off" required
              ><button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane"></i></button>
          </form>
        </div>`
    );
    const log = document.getElementById('chatLog');
    const addUser = (text) => {
      const d = document.createElement('div');
      d.className = 'chat-msg user';
      d.textContent = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    };
    const addAI = () => {
      const d = document.createElement('div');
      d.className = 'chat-msg ai';
      d.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    };
    const ask = async (q) => {
      addUser(q);
      const bubble = addAI();
      try {
        const r = await API.post('/ai/chat', { message: q });
        bubble.innerHTML = mdToHtml(r.answer);
      } catch (e) {
        bubble.textContent = e.message;
      }
      log.scrollTop = log.scrollHeight;
    };
    document.getElementById('chatForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const input = ev.target.msg;
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      ask(q);
    });
    view.querySelectorAll('.suggest').forEach((b) => b.addEventListener('click', () => ask(b.textContent)));
  }

  /* ===================== EMAIL ===================== */
  async function email() {
    const drafts = await API.get('/email/drafts');
    setHTML(
      head('Email Generator', 'Draft client emails with AI (Claude).') +
        `<div class="panel">
          <form id="emailForm" class="form-grid">
            <div class="field"><label>Intent</label><select name="intent"><option value="follow-up">Follow-up</option><option value="cold outreach">Cold outreach</option><option value="proposal">Proposal</option><option value="meeting confirmation">Meeting confirmation</option><option value="thank-you">Thank-you</option></select></div>
            <div class="field"><label>Recipient</label><input name="recipient" placeholder="Jane at Acme"></div>
            <div class="field"><label>Tone</label><select name="tone"><option>professional</option><option>friendly</option><option>concise</option><option>persuasive</option></select></div>
            <div class="field" style="grid-column:1/-1"><label>Context / notes</label><textarea name="context" rows="3" placeholder="What's this email about?"></textarea></div>
            <div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-full" type="submit"><i class="fas fa-wand-magic-sparkles"></i> Generate</button></div>
          </form>
        </div>
        <div class="panel" id="emailOut" style="display:none">
          <div class="panel-head"><h2>Draft</h2><button class="icon-btn" id="copyEmail"><i class="fas fa-copy"></i> Copy</button></div>
          <pre id="emailText" class="email-draft"></pre>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Saved drafts (${drafts.length})</h2></div>
          <div id="draftList">${renderDrafts(drafts)}</div>
        </div>`
    );
    bindDraftActions();

    document.getElementById('emailForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Generating…';
      try {
        const r = await API.post('/email/generate', {
          intent: f.intent.value,
          recipient: f.recipient.value || 'the client',
          tone: f.tone.value,
          context: f.context.value,
        });
        document.getElementById('emailOut').style.display = 'block';
        document.getElementById('emailText').textContent = r.content;
        document.getElementById('emailOut').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        toast('Draft generated');
      } catch (e) {
        toast(e.message, 'err');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate';
      }
    });
    document.getElementById('copyEmail').addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById('emailText').textContent);
      toast('Copied to clipboard');
    });
  }

  function renderDrafts(drafts) {
    if (!drafts.length) return '<div class="empty">No drafts yet — generate one above.</div>';
    return drafts
      .map(
        (d) => `<div class="draft-item">
          <div class="draft-head">
            <div><b>${esc((d.intent || 'email').replace(/^\w/, (c) => c.toUpperCase()))}</b> → ${esc(d.recipient || 'recipient')} <span class="chip gray">${esc(d.tone || '')}</span></div>
            <div style="display:flex;gap:6px">
              <button class="icon-btn" data-copy="${d.id}"><i class="fas fa-copy"></i></button>
              <button class="icon-btn" data-deldraft="${d.id}"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <pre class="email-draft sm" data-content="${d.id}">${esc(d.content || '')}</pre>
          <div class="muted-sm">${fmtDate(d.created_at)}</div>
        </div>`
      )
      .join('');
  }

  function bindDraftActions() {
    view.querySelectorAll('[data-copy]').forEach((b) =>
      b.addEventListener('click', () => {
        const pre = view.querySelector('[data-content="' + b.dataset.copy + '"]');
        navigator.clipboard.writeText(pre ? pre.textContent : '');
        toast('Copied to clipboard');
      })
    );
    view.querySelectorAll('[data-deldraft]').forEach((b) =>
      b.addEventListener('click', async () => {
        b.disabled = true;
        await API.del('/email/drafts/' + b.dataset.deldraft);
        route();
      })
    );
  }

  /* ===================== PROJECTS ===================== */
  const statusClass = (s) => (s === 'Done' ? 'green' : s === 'Planned' ? 'gray' : '');
  let projFilter = 'All';
  async function projects() {
    const items = await API.get('/projects');
    const counts = { All: items.length, Active: 0, Planned: 0, Done: 0 };
    items.forEach((p) => (counts[p.status] = (counts[p.status] || 0) + 1));
    const filtered = items.filter((p) => projFilter === 'All' || (p.status || 'Active') === projFilter);

    const rows = filtered
      .map(
        (p) => `<div class="list-item">
          <div style="min-width:0">
            <h4>${esc(p.name || 'Project')} <span class="chip ${statusClass(p.status)}">${esc(p.status || 'Active')}</span>
              ${p.source === 'github' ? '<span class="chip gray"><i class="fab fa-github"></i> GitHub</span>' : ''}
              ${p.stars ? `<span class="chip gray"><i class="fas fa-star" style="color:var(--accent)"></i> ${p.stars}</span>` : ''}
            </h4>
            ${p.desc ? `<p>${esc(p.desc)}</p>` : ''}
            <p>${p.tech ? '<span class="tag-pill static">' + esc(p.tech) + '</span>' : ''} ${p.link ? '· <a class="auth-link" href="' + esc(p.link) + '" target="_blank">Open</a>' : ''}</p>
          </div>
          <div style="display:flex;gap:6px">
            <button class="icon-btn" data-pedit="${p.id}"><i class="fas fa-pen"></i></button>
            <button class="icon-btn" data-del="${p.id}"><i class="fas fa-trash"></i></button>
          </div>
        </div>`
      )
      .join('');

    setHTML(
      head('Projects', "What you're building and working on.") +
        `<div class="panel">
          <div class="panel-head"><h2 id="pFormTitle">Add project</h2><button class="icon-btn" id="pNew">Clear</button></div>
          <form id="pForm" class="form-grid">
            <input type="hidden" name="id">
            <div class="field"><label>Name</label><input name="name" required placeholder="FinGuard"></div>
            <div class="field"><label>Status</label><select name="status"><option>Active</option><option>Planned</option><option>Done</option></select></div>
            <div class="field"><label>Tech</label><input name="tech" placeholder="AWS, GCP, Istio"></div>
            <div class="field"><label>Link</label><input name="link" placeholder="https://github.com/…"></div>
            <div class="field" style="grid-column:1/-1"><label>Description</label><input name="desc" placeholder="Short summary"></div>
            <div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-full" type="submit"><i class="fas fa-plus"></i> Save</button></div>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head">
            <h2>All projects</h2>
            <div class="seg-group">${['All', 'Active', 'Planned', 'Done'].map((sname) => `<button class="seg ${projFilter === sname ? 'active' : ''}" data-filter="${sname}">${sname} <span class="seg-count">${counts[sname] || 0}</span></button>`).join('')}</div>
          </div>
          ${filtered.length ? rows : '<div class="empty">No projects in this view — add one above or import from GitHub (Integrations).</div>'}
        </div>`
    );
    const form = document.getElementById('pForm');
    const reset = () => { form.reset(); form.id.value = ''; document.getElementById('pFormTitle').textContent = 'Add project'; };
    document.getElementById('pNew').addEventListener('click', reset);
    view.querySelectorAll('[data-filter]').forEach((b) =>
      b.addEventListener('click', () => { projFilter = b.dataset.filter; route(); })
    );
    view.querySelectorAll('[data-pedit]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = items.find((x) => x.id === b.dataset.pedit);
        form.id.value = p.id;
        form.name.value = p.name || '';
        form.status.value = p.status || 'Active';
        form.tech.value = p.tech || '';
        form.link.value = p.link || '';
        form.desc.value = p.desc || '';
        document.getElementById('pFormTitle').textContent = 'Edit project';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
    );
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = { name: form.name.value, status: form.status.value, tech: form.tech.value, link: form.link.value, desc: form.desc.value };
      if (form.id.value) await API.patch('/projects/' + form.id.value, body);
      else await API.post('/projects', body);
      toast('Project saved');
      route();
    });
    onDelete('projects');
  }

  /* ===================== INTEGRATIONS ===================== */
  async function integrations() {
    const items = await API.get('/integrations');
    const order = { github: 0, slack: 1, gmail: 2, gcal: 3, gdrive: 4, stripe: 5 };
    items.sort((a, b) => (order[a.key] ?? 9) - (order[b.key] ?? 9));

    const card = (i) => {
      const cfg = i.config || {};
      if (i.kind === 'github') {
        return `<div class="int-card">
          <div class="int-head"><div class="mod-ico"><i class="${esc(i.icon)} fa-fw"></i></div>
            <div><h3>${esc(i.name)} ${i.connected ? '<span class="chip green">Connected</span>' : ''}</h3><p>${esc(i.desc)}</p></div></div>
          <div class="int-body">
            <div class="inline-field"><span><i class="fab fa-github"></i></span><input id="ghUser" placeholder="github-username" value="${esc(cfg.username || '')}"></div>
            <button class="btn btn-primary btn-sm" id="ghImport"><i class="fas fa-download"></i> Import repos → Projects</button>
          </div>
        </div>`;
      }
      if (i.kind === 'slack') {
        return `<div class="int-card">
          <div class="int-head"><div class="mod-ico"><i class="${esc(i.icon)} fa-fw"></i></div>
            <div><h3>${esc(i.name)} ${i.connected ? '<span class="chip green">Connected</span>' : ''}</h3><p>${esc(i.desc)}</p></div></div>
          <div class="int-body">
            <div class="inline-field"><span><i class="fas fa-link"></i></span><input id="slackUrl" placeholder="https://hooks.slack.com/services/…" value="${esc(cfg.webhook_url || '')}"></div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-outline btn-sm" id="slackSave"><i class="fas fa-floppy-disk"></i> Save</button>
              <button class="btn btn-primary btn-sm" id="slackTest"><i class="fas fa-paper-plane"></i> Send test</button>
            </div>
          </div>
        </div>`;
      }
      // OAuth — honest "requires setup" state, no fake toggle
      return `<div class="int-card">
        <div class="int-head"><div class="mod-ico"><i class="${esc(i.icon)} fa-fw"></i></div>
          <div><h3>${esc(i.name)}</h3><p>${esc(i.desc)}</p></div></div>
        <div class="int-body">
          <span class="chip gray"><i class="fas fa-lock"></i> Requires OAuth setup</span>
          <button class="btn btn-outline btn-sm" disabled title="Add OAuth credentials in backend/.env to enable"><i class="fas fa-plug"></i> Connect</button>
        </div>
      </div>`;
    };

    setHTML(
      head('Integrations', 'Connect real services. GitHub & Slack work now; OAuth apps need credentials.') +
        `<div class="int-grid">${items.map(card).join('')}</div>`
    );

    const gh = items.find((i) => i.key === 'github');
    const slack = items.find((i) => i.key === 'slack');

    const ghBtn = document.getElementById('ghImport');
    if (ghBtn) {
      ghBtn.addEventListener('click', async () => {
        const username = document.getElementById('ghUser').value.trim();
        if (!username) return toast('Enter a GitHub username', 'err');
        ghBtn.disabled = true;
        ghBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Importing…';
        try {
          const r = await API.post('/integrations/github/import', { username });
          toast(`Imported ${r.imported} repo(s) from @${r.username}`);
          location.hash = '#/projects';
        } catch (e) {
          toast(e.message, 'err');
          ghBtn.disabled = false;
          ghBtn.innerHTML = '<i class="fas fa-download"></i> Import repos → Projects';
        }
      });
    }
    const slackSave = document.getElementById('slackSave');
    if (slackSave) {
      slackSave.addEventListener('click', async () => {
        await API.put('/integrations/' + slack.id + '/config', { webhook_url: document.getElementById('slackUrl').value.trim() });
        toast('Slack webhook saved');
      });
      document.getElementById('slackTest').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        await API.put('/integrations/' + slack.id + '/config', { webhook_url: document.getElementById('slackUrl').value.trim() });
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending…';
        try {
          const r = await API.post('/integrations/slack/test');
          toast(r.message || 'Sent');
        } catch (err) {
          toast(err.message, 'err');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send test';
        }
      });
    }
  }

  /* ===================== SETTINGS (incl. MFA) ===================== */
  async function settings() {
    const u = (await API.get('/auth/me')).user;
    setHTML(
      head('Settings', 'Your profile and security.') +
        `<div class="panel">
          <div class="panel-head"><h2>Profile</h2></div>
          <p style="color:var(--text-secondary);font-size:0.9rem"><b>${esc(u.name)}</b><br>${esc(u.email)}<br>${esc(u.role || '')}</p>
        </div>
        <div class="panel">
          <div class="panel-head"><h2><i class="fas fa-shield-halved"></i> Multi-Factor Authentication</h2>
            <span class="chip ${u.mfa_enabled ? 'green' : 'gray'}">${u.mfa_enabled ? 'Enabled' : 'Disabled'}</span></div>
          <div id="mfaArea"></div>
        </div>`
    );
    const area = document.getElementById('mfaArea');

    if (u.mfa_enabled) {
      area.innerHTML =
        '<p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:12px">MFA is protecting your account.</p>' +
        '<button class="btn btn-outline" id="mfaDisable"><i class="fas fa-toggle-off"></i> Disable MFA</button>';
      document.getElementById('mfaDisable').addEventListener('click', async () => {
        await API.post('/auth/mfa/disable');
        route();
      });
      return;
    }

    area.innerHTML =
      '<p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:12px">Add an authenticator app (Google Authenticator, Authy, 1Password).</p>' +
      '<button class="btn btn-primary" id="mfaSetup"><i class="fas fa-qrcode"></i> Set up MFA</button>';
    document.getElementById('mfaSetup').addEventListener('click', async () => {
      const r = await API.post('/auth/mfa/setup');
      const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(r.otpauth_url);
      area.innerHTML = `
        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
          <img src="${qr}" alt="Scan QR" style="border-radius:8px;background:#fff;padding:6px">
          <div style="flex:1;min-width:220px">
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">Scan the QR, or enter this secret manually:</p>
            <div class="mfa-secret">${esc(r.secret)}</div>
            <div class="field" style="margin-top:14px"><label>Enter the 6-digit code to enable</label><input id="mfaEnableCode" inputmode="numeric" maxlength="6" placeholder="123456"></div>
            <button class="btn btn-primary" id="mfaEnable" style="margin-top:10px"><i class="fas fa-check"></i> Enable MFA</button>
            <div id="mfaErr" class="auth-error" style="display:none;margin-top:10px"></div>
          </div>
        </div>`;
      document.getElementById('mfaEnable').addEventListener('click', async () => {
        try {
          await API.post('/auth/mfa/enable', { code: document.getElementById('mfaEnableCode').value.trim() });
          route();
        } catch (e) {
          const err = document.getElementById('mfaErr');
          err.textContent = e.message;
          err.style.display = 'block';
        }
      });
    });
  }

  const views = { overview, expenses, storage, notes, meetings, ai, email, projects, integrations, settings };

  /* ---------- init ---------- */
  loadUser().then(() => {
    if (!location.hash) location.hash = '#/overview';
    route();
  });
})();
