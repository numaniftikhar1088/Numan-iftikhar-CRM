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
    setHTML(
      '<span class="dash-chip"><i class="fas fa-wand-magic-sparkles"></i> My Account Overview</span>' +
      head('Welcome back, ' + esc((u.name || 'Numan').split(' ')[0]) + ' 👋', "Here's your command center.") +
        `<div class="stat-grid">
          ${card('fa-sack-dollar', money(s.expenses_total), 'Expenses tracked')}
          ${card('fa-folder-open', s.files, 'Files stored')}
          ${card('fa-note-sticky', s.notes, 'Notes')}
          ${card('fa-calendar-check', s.meetings, 'Meetings')}
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
  async function expenses() {
    const [items, summary] = await Promise.all([API.get('/expenses'), API.get('/expenses/summary')]);
    const rows = items
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
    setHTML(
      head('Expense Tracker', 'Track spending, categories and totals.') +
        `<div class="stat-grid">
          <div class="stat-card"><div class="stat-ico"><i class="fas fa-sack-dollar"></i></div><div class="stat-value">${money(summary.total)}</div><div class="stat-label">Total tracked</div></div>
          <div class="stat-card"><div class="stat-ico"><i class="fas fa-receipt"></i></div><div class="stat-value">${summary.count}</div><div class="stat-label">Transactions</div></div>
          <div class="stat-card"><div class="stat-ico"><i class="fas fa-layer-group"></i></div><div class="stat-value">${Object.keys(summary.by_category || {}).length}</div><div class="stat-label">Categories</div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Add expense</h2></div>
          <form id="expForm" class="form-grid">
            <div class="field"><label>Title</label><input name="title" required placeholder="AWS bill"></div>
            <div class="field"><label>Amount</label><input name="amount" type="number" step="0.01" required placeholder="0.00"></div>
            <div class="field"><label>Category</label><select name="category"><option>Cloud</option><option>Software</option><option>Hardware</option><option>Travel</option><option>Office</option><option>Other</option></select></div>
            <div class="field"><label>Date</label><input name="date" type="date"></div>
            <div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-full" type="submit"><i class="fas fa-plus"></i> Add</button></div>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Transactions</h2></div>
          ${
            items.length
              ? `<table class="data-table"><thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Amount</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
              : '<div class="empty">No expenses yet — add your first above.</div>'
          }
        </div>`
    );
    document.getElementById('expForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      await API.post('/expenses', {
        title: f.title.value,
        amount: parseFloat(f.amount.value) || 0,
        category: f.category.value,
        date: f.date.value,
      });
      route();
    });
    onDelete('expenses');
  }

  /* ===================== STORAGE ===================== */
  async function storage() {
    const files = await API.get('/storage');
    const rows = files
      .map(
        (f) => `<tr>
          <td><i class="fas fa-file" style="color:var(--text-muted);margin-right:8px"></i>${esc(f.name)}</td>
          <td>${(f.size / 1024).toFixed(1)} KB</td>
          <td>${fmtDate(f.created_at)}</td>
          <td style="text-align:right">
            <button class="icon-btn" data-dl="${f.id}" data-name="${esc(f.name)}"><i class="fas fa-download"></i></button>
            <button class="icon-btn" data-del="${f.id}"><i class="fas fa-trash"></i></button>
          </td></tr>`
      )
      .join('');
    setHTML(
      head('Personal Cloud Storage', 'Upload, download and manage your files.') +
        `<div class="panel">
          <div class="panel-head"><h2>Upload a file</h2></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <input type="file" id="fileInput" style="flex:1;min-width:220px;color:var(--text-secondary)">
            <button class="btn btn-primary" id="uploadBtn"><i class="fas fa-cloud-arrow-up"></i> Upload</button>
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
    document.getElementById('uploadBtn').addEventListener('click', async () => {
      const input = document.getElementById('fileInput');
      if (!input.files.length) return;
      const fd = new FormData();
      fd.append('file', input.files[0]);
      const btn = document.getElementById('uploadBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Uploading…';
      await API.upload('/storage', fd);
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
  async function notes() {
    const items = await API.get('/notes');
    const cards = items
      .map(
        (n) => `<div class="list-item">
          <div style="min-width:0">
            <h4>${esc(n.title || 'Untitled')}</h4>
            <p>${esc((n.content || '').slice(0, 160))}</p>
          </div>
          <div style="display:flex;gap:6px">
            <button class="icon-btn" data-edit="${n.id}"><i class="fas fa-pen"></i></button>
            <button class="icon-btn" data-del="${n.id}"><i class="fas fa-trash"></i></button>
          </div>
        </div>`
      )
      .join('');
    setHTML(
      head('Notes', 'A Notion-style space for your knowledge.') +
        `<div class="panel">
          <div class="panel-head"><h2 id="noteFormTitle">New note</h2><button class="icon-btn" id="noteNew">Clear</button></div>
          <form id="noteForm">
            <input type="hidden" name="id">
            <div class="field" style="margin-bottom:12px"><label>Title</label><input name="title" required placeholder="Note title"></div>
            <div class="field" style="margin-bottom:12px"><label>Content</label><textarea name="content" placeholder="Write anything… (these feed the AI Assistant)"></textarea></div>
            <button class="btn btn-primary" type="submit"><i class="fas fa-floppy-disk"></i> Save note</button>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>All notes (${items.length})</h2></div>
          ${items.length ? cards : '<div class="empty">No notes yet — create one above.</div>'}
        </div>`
    );
    const form = document.getElementById('noteForm');
    const reset = () => {
      form.reset();
      form.id.value = '';
      document.getElementById('noteFormTitle').textContent = 'New note';
    };
    document.getElementById('noteNew').addEventListener('click', reset);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = { title: form.title.value, content: form.content.value };
      if (form.id.value) await API.patch('/notes/' + form.id.value, body);
      else await API.post('/notes', body);
      route();
    });
    view.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => {
        const n = items.find((x) => x.id === b.dataset.edit);
        form.id.value = n.id;
        form.title.value = n.title || '';
        form.content.value = n.content || '';
        document.getElementById('noteFormTitle').textContent = 'Edit note';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
    );
    onDelete('notes');
  }

  /* ===================== MEETINGS ===================== */
  async function meetings() {
    const items = await API.get('/meetings');
    const rows = items
      .map(
        (m) => `<div class="list-item">
          <div>
            <h4>${esc(m.title || 'Meeting')} ${m.client ? '· <span style="color:var(--text-secondary)">' + esc(m.client) + '</span>' : ''}</h4>
            <p><i class="fas fa-clock"></i> ${m.when ? esc(new Date(m.when).toLocaleString()) : 'No time set'} ${m.link ? '· <a class="auth-link" href="' + esc(m.link) + '" target="_blank">Join link</a>' : ''}</p>
          </div>
          <button class="icon-btn" data-del="${m.id}"><i class="fas fa-trash"></i></button>
        </div>`
      )
      .join('');
    setHTML(
      head('Client Meetings', 'Book and track meetings with your clients.') +
        `<div class="panel">
          <div class="panel-head"><h2>Schedule a meeting</h2></div>
          <form id="mForm" class="form-grid">
            <div class="field"><label>Title</label><input name="title" required placeholder="Consultation call"></div>
            <div class="field"><label>Client</label><input name="client" placeholder="Acme Inc."></div>
            <div class="field"><label>When</label><input name="when" type="datetime-local"></div>
            <div class="field"><label>Meeting link</label><input name="link" placeholder="https://meet.google.com/…"></div>
            <div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-full" type="submit"><i class="fas fa-plus"></i> Add</button></div>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Upcoming (${items.length})</h2></div>
          ${items.length ? rows : '<div class="empty">No meetings scheduled yet.</div>'}
        </div>`
    );
    document.getElementById('mForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      await API.post('/meetings', { title: f.title.value, client: f.client.value, when: f.when.value, link: f.link.value });
      route();
    });
    onDelete('meetings');
  }

  /* ===================== AI ASSISTANT ===================== */
  async function ai() {
    setHTML(
      head('AI Assistant', 'Ask questions over your notes & data (RAG + Claude).') +
        `<div class="panel">
          <div class="chat-log" id="chatLog">
            <div class="chat-msg ai">Hi! I'm your NumanOS assistant. Ask me about your notes, expenses or projects.
Tip: add notes first — I retrieve them as context.</div>
          </div>
          <form id="chatForm" style="display:flex;gap:10px">
            <input class="field" style="flex:1" name="msg" placeholder="e.g. Summarise my notes about FinGuard" autocomplete="off" required
              ><button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane"></i></button>
          </form>
        </div>`
    );
    const log = document.getElementById('chatLog');
    const add = (cls, text) => {
      const d = document.createElement('div');
      d.className = 'chat-msg ' + cls;
      d.textContent = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    };
    document.getElementById('chatForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const input = ev.target.msg;
      const q = input.value.trim();
      if (!q) return;
      add('user', q);
      input.value = '';
      const thinking = add('ai', '…');
      try {
        const r = await API.post('/ai/chat', { message: q });
        thinking.textContent = r.answer;
      } catch (e) {
        thinking.textContent = e.message;
      }
      log.scrollTop = log.scrollHeight;
    });
  }

  /* ===================== EMAIL ===================== */
  async function email() {
    setHTML(
      head('Email Generator', 'Draft client emails with AI (Claude).') +
        `<div class="panel">
          <form id="emailForm" class="form-grid">
            <div class="field"><label>Intent</label><select name="intent"><option value="follow-up">Follow-up</option><option value="cold outreach">Cold outreach</option><option value="proposal">Proposal</option><option value="meeting confirmation">Meeting confirmation</option><option value="thank-you">Thank-you</option></select></div>
            <div class="field"><label>Recipient</label><input name="recipient" placeholder="Jane at Acme"></div>
            <div class="field"><label>Tone</label><select name="tone"><option>professional</option><option>friendly</option><option>concise</option><option>persuasive</option></select></div>
            <div class="field" style="grid-column:1/-1"><label>Context / notes</label><textarea name="context" placeholder="What's this email about?"></textarea></div>
            <div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-full" type="submit"><i class="fas fa-wand-magic-sparkles"></i> Generate</button></div>
          </form>
        </div>
        <div class="panel" id="emailOut" style="display:none">
          <div class="panel-head"><h2>Draft</h2><button class="icon-btn" id="copyEmail"><i class="fas fa-copy"></i> Copy</button></div>
          <pre id="emailText" style="white-space:pre-wrap;font-family:inherit;color:var(--text-primary);line-height:1.6"></pre>
        </div>`
    );
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
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate';
      }
    });
    document.getElementById('copyEmail').addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById('emailText').textContent);
    });
  }

  /* ===================== PROJECTS ===================== */
  async function projects() {
    const items = await API.get('/projects');
    const statusClass = (s) => (s === 'Done' ? 'green' : s === 'Planned' ? 'gray' : '');
    const rows = items
      .map(
        (p) => `<div class="list-item">
          <div>
            <h4>${esc(p.name || 'Project')} <span class="chip ${statusClass(p.status)}">${esc(p.status || 'Active')}</span></h4>
            <p>${esc(p.tech || '')} ${p.link ? '· <a class="auth-link" href="' + esc(p.link) + '" target="_blank">Link</a>' : ''}</p>
          </div>
          <button class="icon-btn" data-del="${p.id}"><i class="fas fa-trash"></i></button>
        </div>`
      )
      .join('');
    setHTML(
      head('Projects', "What you're building and working on.") +
        `<div class="panel">
          <div class="panel-head"><h2>Add project</h2></div>
          <form id="pForm" class="form-grid">
            <div class="field"><label>Name</label><input name="name" required placeholder="FinGuard"></div>
            <div class="field"><label>Status</label><select name="status"><option>Active</option><option>Planned</option><option>Done</option></select></div>
            <div class="field"><label>Tech</label><input name="tech" placeholder="AWS, GCP, Istio"></div>
            <div class="field"><label>Link</label><input name="link" placeholder="https://github.com/…"></div>
            <div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-full" type="submit"><i class="fas fa-plus"></i> Add</button></div>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>All projects (${items.length})</h2></div>
          ${items.length ? rows : '<div class="empty">No projects yet — add one above.</div>'}
        </div>`
    );
    document.getElementById('pForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      await API.post('/projects', { name: f.name.value, status: f.status.value, tech: f.tech.value, link: f.link.value });
      route();
    });
    onDelete('projects');
  }

  /* ===================== INTEGRATIONS ===================== */
  async function integrations() {
    const items = await API.get('/integrations');
    const cards = items
      .map(
        (i) => `<div class="module-card" style="cursor:default">
          <div class="mod-ico"><i class="fab ${esc(i.icon)} fa-fw"></i></div>
          <h3>${esc(i.name)}</h3>
          <p>${esc(i.desc)}</p>
          <button class="btn ${i.connected ? 'btn-outline' : 'btn-primary'} btn-sm" data-toggle="${i.id}" style="margin-top:12px">
            ${i.connected ? '<i class="fas fa-check"></i> Connected' : '<i class="fas fa-plug"></i> Connect'}
          </button>
        </div>`
      )
      .join('');
    setHTML(head('Integrations', 'Connect Gmail, Calendar, Drive, Slack, GitHub and more.') + `<div class="module-grid">${cards}</div>`);
    view.querySelectorAll('[data-toggle]').forEach((b) =>
      b.addEventListener('click', async () => {
        b.disabled = true;
        await API.post('/integrations/' + b.dataset.toggle + '/toggle');
        route();
      })
    );
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
