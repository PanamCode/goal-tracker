// ========== State ==========
let goals = JSON.parse(localStorage.getItem('goals-v3') || '[]');
let habits = JSON.parse(localStorage.getItem('habits-v1') || '[]');
let currentFilter = 'all';
let currentView = 'dashboard';
let settings = JSON.parse(localStorage.getItem('settings-v1') || '{"anim":true,"confetti":true}');

// ========== DOM ==========
const toastEl = document.getElementById('toast');
const confettiCanvas = document.getElementById('confetti');
const ctx = confettiCanvas.getContext('2d');
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('mobile-menu-btn');

// ========== Helpers ==========
function saveGoals() { localStorage.setItem('goals-v3', JSON.stringify(goals)); }
function saveHabits() { localStorage.setItem('habits-v1', JSON.stringify(habits)); }
function saveSettings() { localStorage.setItem('settings-v1', JSON.stringify(settings)); }

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.className = 'toast show';
  setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function randomPriority() {
  const r = Math.random();
  if (r < 0.25) return 'high';
  if (r < 0.6) return 'medium';
  return 'low';
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ========== Navigation ==========
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    if (view === currentView) return;

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    target.classList.add('active');
    currentView = view;

    sidebar.classList.remove('open');

    if (view === 'dashboard') renderDashboard();
    if (view === 'goals') renderGoals();
    if (view === 'habits') renderHabits();
    if (view === 'stats') renderStats();
  });
});

mobileBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

// ========== Dashboard ==========
function renderDashboard() {
  const total = goals.length;
  const done = goals.filter(g => g.done).length;
  const active = total - done;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const habitsToday = habits.filter(h => h.doneToday).length;

  document.getElementById('dash-goals').textContent = active;
  document.getElementById('dash-done').textContent = done;
  document.getElementById('dash-streak').textContent = Math.max(...habits.map(h => h.streak || 0), 0) || 3;
  document.getElementById('dash-habits').textContent = habitsToday + '/' + (habits.length || 0);

  const circ = 2 * Math.PI * 52;
  const ring = document.getElementById('dash-ring');
  ring.style.strokeDasharray = circ;
  ring.style.strokeDashoffset = circ - (percent / 100) * circ;
  document.getElementById('dash-percent').textContent = percent + '%';
  document.getElementById('dash-label').textContent = total === 0
    ? 'Добавь первую цель'
    : done === total ? 'Все цели достигнуты! 🎉' : `${done} из ${total} выполнено`;

  const mini = document.getElementById('mini-goals');
  const recent = goals.slice(0, 5);
  if (!recent.length) {
    mini.innerHTML = '<p style="color:var(--muted);padding:12px 0">Пока нет целей — добавь в разделе «Цели»</p>';
    return;
  }
  mini.innerHTML = recent.map(g => `
    <div class="mini-goal ${g.done ? 'done' : ''}">
      <div class="dot"></div>
      <span>${escapeHtml(g.text)}</span>
    </div>
  `).join('');
}

// ========== Goals ==========
function renderGoals() {
  const grid = document.getElementById('goals-grid');
  const filtered = goals.filter(g => {
    if (currentFilter === 'active') return !g.done;
    if (currentFilter === 'done') return g.done;
    return true;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state"><h3>Пока пусто</h3><p>Добавь первую цель выше</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map((goal, i) => `
    <div class="goal-card ${goal.done ? 'completed' : ''}" style="animation-delay:${i * 0.07}s" data-id="${goal.id}">
      <div class="goal-top">
        <button class="goal-check ${goal.done ? 'checked' : ''}" data-action="toggle">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <div class="goal-title">${escapeHtml(goal.text)}</div>
        <button class="goal-delete" data-action="delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
      <div class="goal-meta">
        <span class="goal-date">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          ${formatDate(goal.created)}
        </span>
        <span class="priority ${goal.priority}">${goal.priority === 'high' ? 'Высокий' : goal.priority === 'medium' ? 'Средний' : 'Низкий'}</span>
      </div>
    </div>
  `).join('');
}

document.getElementById('add-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('goal-input');
  const text = input.value.trim();
  if (!text) { showToast('Напиши цель'); return; }

  goals.unshift({
    id: crypto.randomUUID(),
    text,
    done: false,
    created: Date.now(),
    priority: randomPriority()
  });
  saveGoals();
  input.value = '';
  renderGoals();
  renderDashboard();
  showToast('Цель добавлена! 🚀');
});

document.getElementById('goals-grid').addEventListener('click', e => {
  const card = e.target.closest('.goal-card');
  if (!card) return;
  const id = card.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;

  if (action === 'toggle') {
    const g = goals.find(x => x.id === id);
    if (!g) return;
    g.done = !g.done;
    saveGoals();
    renderGoals();
    renderDashboard();
    if (g.done) {
      showToast('Цель достигнута! 🎉');
      if (settings.confetti) launchConfetti();
    }
  }
  if (action === 'delete') {
    card.style.transition = 'all 0.3s';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9) translateY(16px)';
    setTimeout(() => {
      goals = goals.filter(x => x.id !== id);
      saveGoals();
      renderGoals();
      renderDashboard();
      showToast('Цель удалена');
    }, 280);
  }
});

document.querySelectorAll('#goal-filters .filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#goal-filters .filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderGoals();
  });
});

// ========== Habits ==========
function renderHabits() {
  const list = document.getElementById('habits-list');
  if (!habits.length) {
    list.innerHTML = `<div class="empty-state"><h3>Нет привычек</h3><p>Добавь первую привычку выше</p></div>`;
    return;
  }
  list.innerHTML = habits.map((h, i) => `
    <div class="habit-card" style="animation-delay:${i * 0.06}s" data-id="${h.id}">
      <button class="habit-check ${h.doneToday ? 'checked' : ''}" data-action="toggle">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="habit-info">
        <div class="habit-name">${escapeHtml(h.name)}</div>
        <div class="habit-streak">🔥 ${h.streak || 0} дней подряд</div>
      </div>
      <button class="habit-delete" data-action="delete">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      </button>
    </div>
  `).join('');
}

document.getElementById('habit-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('habit-input');
  const name = input.value.trim();
  if (!name) { showToast('Напиши привычку'); return; }

  habits.unshift({
    id: crypto.randomUUID(),
    name,
    doneToday: false,
    streak: 0,
    lastDone: null
  });
  saveHabits();
  input.value = '';
  renderHabits();
  renderDashboard();
  showToast('Привычка добавлена!');
});

document.getElementById('habits-list').addEventListener('click', e => {
  const card = e.target.closest('.habit-card');
  if (!card) return;
  const id = card.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;

  if (action === 'toggle') {
    const h = habits.find(x => x.id === id);
    if (!h) return;
    h.doneToday = !h.doneToday;
    if (h.doneToday) {
      h.streak = (h.streak || 0) + 1;
      h.lastDone = todayKey();
      showToast('Отлично! +1 к серии 🔥');
      if (settings.confetti) launchConfetti();
    } else {
      h.streak = Math.max(0, (h.streak || 1) - 1);
    }
    saveHabits();
    renderHabits();
    renderDashboard();
  }
  if (action === 'delete') {
    habits = habits.filter(x => x.id !== id);
    saveHabits();
    renderHabits();
    renderDashboard();
    showToast('Привычка удалена');
  }
});

// ========== Stats ==========
function renderStats() {
  const chart = document.getElementById('goals-chart');
  const done = goals.filter(g => g.done).length;
  const active = goals.length - done;
  const max = Math.max(done, active, 1);
  chart.innerHTML = `
    <div class="bar" style="height:${(active / max) * 100}%"><span>В работе</span></div>
    <div class="bar" style="height:${(done / max) * 100}%"><span>Готово</span></div>
  `;

  const week = document.getElementById('week-bars');
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const vals = days.map(() => Math.floor(Math.random() * 5) + (habits.filter(h => h.doneToday).length > 0 ? 2 : 0));
  const maxV = Math.max(...vals, 1);
  week.innerHTML = days.map((d, i) => `
    <div class="week-bar ${vals[i] > 2 ? 'filled' : ''}" style="height:${(vals[i] / maxV) * 100}%">
      <span>${d}</span>
    </div>
  `).join('');

  const heat = document.getElementById('heatmap');
  let cells = '';
  for (let i = 0; i < 56; i++) {
    const lvl = Math.floor(Math.random() * 5);
    cells += `<div class="heat-cell ${lvl ? 'l' + lvl : ''}"></div>`;
  }
  heat.innerHTML = cells;
}

// ========== Settings ==========
document.getElementById('setting-anim').checked = settings.anim;
document.getElementById('setting-confetti').checked = settings.confetti;

document.getElementById('setting-anim').addEventListener('change', e => {
  settings.anim = e.target.checked;
  saveSettings();
  showToast(settings.anim ? 'Анимации включены' : 'Анимации выключены');
});

document.getElementById('setting-confetti').addEventListener('change', e => {
  settings.confetti = e.target.checked;
  saveSettings();
  showToast(settings.confetti ? 'Конфетти включены' : 'Конфетти выключены');
});

document.getElementById('clear-data').addEventListener('click', () => {
  if (!confirm('Точно удалить все цели и привычки?')) return;
  goals = [];
  habits = [];
  saveGoals();
  saveHabits();
  renderDashboard();
  renderGoals();
  renderHabits();
  showToast('Данные очищены');
});

// ========== Confetti ==========
let particles = [];
let animating = false;

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function launchConfetti() {
  const colors = ['#7c5cff', '#00d4ff', '#ff4d8d', '#00e5a0', '#ffb800'];
  for (let i = 0; i < 70; i++) {
    particles.push({
      x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 180,
      y: confettiCanvas.height / 2 - 80,
      vx: (Math.random() - 0.5) * 11,
      vy: Math.random() * -13 - 3,
      size: Math.random() * 7 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: Math.random() * 0.014 + 0.01,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 9
    });
  }
  if (!animating) animateConfetti();
}

function animateConfetti() {
  animating = true;
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life -= p.decay; p.rotation += p.rotSpeed;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation * Math.PI / 180);
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  });
  if (particles.length) requestAnimationFrame(animateConfetti);
  else animating = false;
}

// ========== Init ==========
if (goals.length === 0) {
  goals = [
    { id: crypto.randomUUID(), text: 'Прочитать 12 книг за год', done: false, created: Date.now() - 86400000 * 4, priority: 'high' },
    { id: crypto.randomUUID(), text: 'Запустить pet-проект', done: false, created: Date.now() - 86400000 * 6, priority: 'medium' },
    { id: crypto.randomUUID(), text: 'Пробежать 10 км', done: true, created: Date.now() - 86400000 * 14, priority: 'medium' },
    { id: crypto.randomUUID(), text: 'Выучить TypeScript', done: false, created: Date.now() - 86400000 * 2, priority: 'low' },
  ];
  saveGoals();
}
if (habits.length === 0) {
  habits = [
    { id: crypto.randomUUID(), name: 'Медитация 10 минут', doneToday: true, streak: 5, lastDone: todayKey() },
    { id: crypto.randomUUID(), name: 'Читать 20 страниц', doneToday: false, streak: 3, lastDone: null },
    { id: crypto.randomUUID(), name: 'Тренировка', doneToday: false, streak: 2, lastDone: null },
  ];
  saveHabits();
}

renderDashboard();
renderGoals();
renderHabits();
