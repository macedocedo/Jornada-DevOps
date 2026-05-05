(() => {
  const STORAGE_KEY = 'devops-roadmap-v1';
  let checked = {};
  let currentFilter = 'all';
  let searchQuery = '';

  // ── Persist ──────────────────────────────────────────────
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); } catch(_) {}
  }
  function load() {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      if (d) checked = JSON.parse(d);
    } catch(_) {}
  }
  load();

  // ── Helpers ───────────────────────────────────────────────
  const key = (secId, text) => `${secId}::${text}`;
  const totalItems = () => SECTIONS.reduce((a, s) => a + s.items.length, 0);
  const totalChecked = () => Object.values(checked).filter(Boolean).length;

  function filteredItems(section) {
    return section.items.filter(item => {
      const k = key(section.id, item.t);
      const isDone = !!checked[k];
      const matchQ = !searchQuery || item.t.toLowerCase().includes(searchQuery);
      let matchF = true;
      if (currentFilter === 'base') matchF = item.lv === 'base';
      else if (currentFilter === 'mid') matchF = item.lv === 'mid';
      else if (currentFilter === 'adv') matchF = item.lv === 'adv';
      else if (currentFilter === 'done') matchF = isDone;
      else if (currentFilter === 'todo') matchF = !isDone;
      return matchQ && matchF;
    });
  }

  // ── Progress ─────────────────────────────────────────────
  function updateProgress() {
    const t = totalItems();
    const c = totalChecked();
    const pct = t ? Math.round(c / t * 100) : 0;
    document.getElementById('done-count').textContent = c;
    document.getElementById('total-count').textContent = t;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-pct').textContent = pct + '%';
  }

  // ── Render sidebar nav ────────────────────────────────────
  function renderNav() {
    const nav = document.getElementById('nav-sections');
    nav.innerHTML = SECTIONS.map(sec => {
      const secDone = sec.items.filter(i => checked[key(sec.id, i.t)]).length;
      return `<a class="nav-item" href="#sec-${sec.id}" onclick="scrollTo('${sec.id}')">
        <span class="nav-dot" style="background:${sec.color}"></span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sec.label}</span>
        <span class="nav-count">${secDone}/${sec.items.length}</span>
      </a>`;
    }).join('');
  }

  window.scrollTo = function(id) {
    const el = document.getElementById('sec-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Render main grid ──────────────────────────────────────
  function renderSections() {
    const grid = document.getElementById('sections-grid');
    grid.innerHTML = '';

    let anyVisible = false;

    SECTIONS.forEach((sec, si) => {
      const items = filteredItems(sec);
      const secDone = items.filter(i => checked[key(sec.id, i.t)]).length;
      const secPct = items.length ? Math.round(secDone / items.length * 100) : 0;

      const card = document.createElement('div');
      card.className = 'section-card';
      card.id = 'sec-' + sec.id;
      card.style.animationDelay = (si * 0.04) + 's';

      if (!items.length) {
        card.classList.add('hidden');
      } else {
        anyVisible = true;
      }

      const lvLabels = { base: 'fund', mid: 'inter', adv: 'avançado' };

      card.innerHTML = `
        <div class="section-header" onclick="toggleSection('body-${sec.id}', this)">
          <div class="section-left">
            <span class="section-icon" style="color:${sec.color}">${sec.icon}</span>
            <div class="section-info">
              <div class="section-name">${sec.label}</div>
              <div class="section-stat">${secDone} de ${items.length} concluídos</div>
            </div>
          </div>
          <div class="section-right">
            <div class="section-bar">
              <div class="section-bar-fill" style="width:${secPct}%;background:${sec.color}"></div>
            </div>
            <span class="chevron open">▲</span>
          </div>
        </div>
        <div class="section-body open" id="body-${sec.id}">
          ${items.map(item => {
            const k = key(sec.id, item.t);
            const done = !!checked[k];
            return `<div class="item${done ? ' done' : ''}" data-key="${k}">
              <div class="checkbox">${done ? '✓' : ''}</div>
              <div class="item-text">${item.t}</div>
              <span class="item-lv lv-${item.lv}">${lvLabels[item.lv]}</span>
            </div>`;
          }).join('')}
        </div>
      `;

      grid.appendChild(card);
    });

    // Empty state
    let empty = document.querySelector('.empty-state');
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<div class="empty-icon">◌</div><div>Nenhum tópico encontrado</div>`;
      grid.after(empty);
    }
    empty.classList.toggle('visible', !anyVisible);

    // Attach click handlers
    grid.querySelectorAll('.item').forEach(el => {
      el.addEventListener('click', () => toggleItem(el));
    });
  }

  window.toggleSection = function(bodyId, header) {
    const body = document.getElementById(bodyId);
    const chev = header.querySelector('.chevron');
    body.classList.toggle('open');
    chev.classList.toggle('open');
  };

  function toggleItem(el) {
    const k = el.dataset.key;
    checked[k] = !checked[k];
    el.classList.toggle('done', checked[k]);
    const cb = el.querySelector('.checkbox');
    cb.textContent = checked[k] ? '✓' : '';
    save();
    updateProgress();
    updateSectionStats(el);
    renderNav();

    if (currentFilter === 'done' || currentFilter === 'todo') {
      renderSections();
    }
  }

  function updateSectionStats(itemEl) {
    const card = itemEl.closest('.section-card');
    if (!card) return;
    const secId = card.id.replace('sec-', '');
    const sec = SECTIONS.find(s => s.id === secId);
    if (!sec) return;
    const items = filteredItems(sec);
    const secDone = items.filter(i => checked[key(sec.id, i.t)]).length;
    const secPct = items.length ? Math.round(secDone / items.length * 100) : 0;
    const stat = card.querySelector('.section-stat');
    if (stat) stat.textContent = `${secDone} de ${items.length} concluídos`;
    const fill = card.querySelector('.section-bar-fill');
    if (fill) fill.style.width = secPct + '%';
  }

  // ── Filters ───────────────────────────────────────────────
  document.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSections();
    });
  });

  // ── Search ────────────────────────────────────────────────
  document.getElementById('search').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderSections();
  });

  // ── Reset ─────────────────────────────────────────────────
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!confirm('Limpar todo o progresso?')) return;
    checked = {};
    save();
    updateProgress();
    renderSections();
    renderNav();
  });

  // ── Init ─────────────────────────────────────────────────
  renderNav();
  renderSections();
  updateProgress();
})();
