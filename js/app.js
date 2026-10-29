// ========== State ==========
let goals = JSON.parse(localStorage.getItem('goals-v2') || '[]');
let currentFilter = 'all';

// ========== DOM ==========
const form = document.getElementById('add-form');
const input = document.getElementById('goal-input');
const grid = document.getElementById('goals-grid');
const toastEl = document.getElementById('toast');
const progressRing = document.getElementById('progress-ring');
const progressPercent = document.getElementById('progress-percent');
const progressLabel = document.getElementById('progress-label');
const confettiCanvas = document.getElementById('confetti');
const ctx = confettiCanvas.getContext('2d');

// ========== Helpers ==========
function save() {
  localStorage.setItem('goals-v2', JSON.stringify(goals));
}

function showToast(msg, type = 'success') {
  toastEl.textContent = msg;
  toastEl.className = `toast show ${type}`;
  setTimeout(() => toastEl.classList.remove('show'), 2800);
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

// ========== Render ==========
function updateStats() {
  const total = goals.length;
  const done = goals.filter(g => g.done).length;
  const active = total - done;
  const percent = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-active').textContent = active;

  const circumference = 2 * Math.PI * 40;
  progressRing.style.strokeDashoffset = circumference - (percent / 100) * circumference;
  progressPercent.textContent = percent + '%';
  progressLabel.textContent = total === 0 
    ? 'Начни добавлять цели' 
    : done === total 
      ? 'Все цели достигнуты! 🎉' 
      : `${done} из ${total} выполнено`;
}

function renderGoals() {
  const filtered = goals.filter(g => {
    if (currentFilter === 'active') return !g.done;
    if (currentFilter === 'done') return g.done;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
        <h3>${currentFilter === 'done' ? 'Пока нет выполненных целей' : currentFilter === 'active' ? 'Все цели выполнены!' : 'Пока пусто'}</h3>
        <p>${currentFilter === 'all' ? 'Добавь первую цель выше и начни путь к мечте' : 'Переключи фильтр или добавь новую цель'}</p>
      </div>
    `;
    updateStats();
    return;
  }

  grid.innerHTML = filtered.map((goal, i) => `
    <div class="goal-card ${goal.done ? 'completed' : ''}" style="animation-delay: ${i * 0.06}s" data-id="${goal.id}">
      <div class="goal-top">
        <button class="goal-check ${goal.done ? 'checked' : ''}" data-action="toggle" aria-label="Отметить">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <div class="goal-title">${escapeHtml(goal.text)}</div>
        <button class="goal-delete" data-action="delete" aria-label="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
      <div class="goal-meta">
        <span class="goal-date">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          ${formatDate(goal.created)}
        </span>
        <span class="priority ${goal.priority}">${goal.priority === 'high' ? 'Высокий' : goal.priority === 'medium' ? 'Средний' : 'Низкий'}</span>
      </div>
    </div>
  `).join('');

  updateStats();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== Actions ==========
form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) {
    showToast('Напиши цель сначала', 'error');
    input.focus();
    return;
  }

  const goal = {
    id: crypto.randomUUID(),
    text,
    done: false,
    created: Date.now(),
    priority: randomPriority()
  };

  goals.unshift(goal);
  save();
  input.value = '';
  renderGoals();
  showToast('Цель добавлена! 🚀');
});

grid.addEventListener('click', e => {
  const card = e.target.closest('.goal-card');
  if (!card) return;
  const id = card.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;

  if (action === 'toggle') {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    goal.done = !goal.done;
    save();
    renderGoals();
    if (goal.done) {
      showToast('Отлично! Цель достигнута 🎉');
      launchConfetti();
    } else {
      showToast('Цель снова в работе');
    }
  }

  if (action === 'delete') {
    card.style.transition = 'all 0.35s';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9) translateY(20px)';
    setTimeout(() => {
      goals = goals.filter(g => g.id !== id);
      save();
      renderGoals();
      showToast('Цель удалена');
    }, 320);
  }
});

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderGoals();
  });
});

// ========== Confetti ==========
let particles = [];
function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function launchConfetti() {
  const colors = ['#7c5cff', '#00d4ff', '#ff4d8d', '#00e5a0', '#ffb800', '#ff6b6b'];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 200,
      y: confettiCanvas.height / 2 - 100,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -14 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: Math.random() * 0.015 + 0.01,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10
    });
  }
  if (!animating) animateConfetti();
}

let animating = false;
function animateConfetti() {
  animating = true;
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;
    p.life -= p.decay;
    p.rotation += p.rotSpeed;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation * Math.PI / 180);
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  });
  if (particles.length) {
    requestAnimationFrame(animateConfetti);
  } else {
    animating = false;
  }
}

// ========== Init ==========
// Demo goals if empty
if (goals.length === 0) {
  goals = [
    { id: crypto.randomUUID(), text: 'Прочитать 12 книг за год', done: false, created: Date.now() - 86400000 * 3, priority: 'high' },
    { id: crypto.randomUUID(), text: 'Запустить свой pet-проект', done: false, created: Date.now() - 86400000 * 5, priority: 'medium' },
    { id: crypto.randomUUID(), text: 'Пробежать 10 км без остановки', done: true, created: Date.now() - 86400000 * 12, priority: 'medium' },
    { id: crypto.randomUUID(), text: 'Выучить основы TypeScript', done: false, created: Date.now() - 86400000 * 1, priority: 'low' },
  ];
  save();
}

renderGoals();

// Subtle 3D tilt on cards (mousemove)
document.addEventListener('mousemove', e => {
  document.querySelectorAll('.goal-card:not(.completed)').forEach(card => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (centerY - y) / 25;
    const rotateY = (x - centerX) / 25;
    if (Math.abs(x - centerX) < rect.width / 1.5 && Math.abs(y - centerY) < rect.height / 1.5) {
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    }
  });
});

document.addEventListener('mouseleave', () => {
  document.querySelectorAll('.goal-card').forEach(card => {
    card.style.transform = '';
  });
});
