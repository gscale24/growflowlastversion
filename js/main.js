/* ============ ТОЧКИ ПОДКЛЮЧЕНИЯ МЕДИА ============
   Подставьте свои файлы. Кадры сцен — assets/frames/sceneX/f_NNN.jpg. */
const HERO_VIDEO_URL = "assets/hero.mp4";

const SCENES_META = {
  sceneA: { frames: 40, folder: 'assets/frames/sceneA' },
  sceneB: { frames: 45, folder: 'assets/frames/sceneB' },
  sceneC: { frames: 50, folder: 'assets/frames/sceneC' },
};
const TOTAL_FRAMES = SCENES_META.sceneA.frames + SCENES_META.sceneB.frames + SCENES_META.sceneC.frames;

/* ==================================================================
   ПРЕЛОАДЕР — агрегированный прогресс по всем кадрам сцен
   ================================================================== */
let loadedFramesTotal = 0;
const preloaderEl = document.getElementById('preloader');
const preloaderFill = document.getElementById('preloaderFill');
const preloaderPct = document.getElementById('preloaderPct');

function bumpPreloader() {
  loadedFramesTotal++;
  const pct = Math.min(100, Math.round((loadedFramesTotal / TOTAL_FRAMES) * 100));
  preloaderFill.style.width = pct + '%';
  preloaderPct.textContent = pct + '%';
  if (loadedFramesTotal >= TOTAL_FRAMES) finishPreloader();
}
let preloaderDone = false;
function finishPreloader() {
  if (preloaderDone) return;
  preloaderDone = true;
  preloaderEl.classList.add('is-done');
  document.getElementById('progressRail').classList.add('is-visible');
}
// подстраховка: не держим прелоадер вечно, если что-то не догрузилось
setTimeout(finishPreloader, 6000);

/* ==================================================================
   SCROLL-SCRUBBING ENGINE
   Секция высотой N*100vh содержит sticky-канвас. Прогресс скролла
   внутри секции (0..1) мапится на индекс кадра.
   ================================================================== */
function makeScrubber({ sectionEl, canvasEl, frameCount, frameFolder, frameDigits = 3, onProgress }) {
  const ctx = canvasEl.getContext('2d');
  const images = new Array(frameCount);
  let currentFrame = -1;

  function frameSrc(i) {
    const n = String(i + 1).padStart(frameDigits, '0');
    return `${frameFolder}/f_${n}.jpg`;
  }

  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.src = frameSrc(i);
    img.onload = () => { bumpPreloader(); if (i === 0) drawFrame(0); };
    img.onerror = () => { bumpPreloader(); };
    images[i] = img;
  }

  function drawFrame(index) {
    index = Math.max(0, Math.min(frameCount - 1, index));
    if (index === currentFrame) return;
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    currentFrame = index;
    canvasEl.width = img.naturalWidth;
    canvasEl.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
  }

  function getProgress() {
    const rect = sectionEl.getBoundingClientRect();
    const total = sectionEl.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    const p = (-rect.top) / total;
    return Math.max(0, Math.min(1, p));
  }

  function update() {
    const p = getProgress();
    const frameIndex = Math.floor(p * (frameCount - 1));
    drawFrame(frameIndex);
    if (onProgress) onProgress(p, frameIndex);
    return p;
  }

  return { update, drawFrame, getProgress, frameCount };
}

/* ==================================================================
   HERO ВИДЕО
   ================================================================== */
(function initHeroVideo() {
  const video = document.getElementById('heroVideo');
  const fallback = document.getElementById('heroFallback');
  if (!HERO_VIDEO_URL) return;
  video.src = HERO_VIDEO_URL;
  video.classList.add('is-on');
  fallback.style.display = 'none';
  video.play().catch(() => {});
  video.addEventListener('error', () => {
    video.classList.remove('is-on');
    fallback.style.display = '';
  });
})();

/* ==================================================================
   SCENE A — посадка в кресло + reveal текста
   ================================================================== */
const sceneAEl = document.getElementById('sceneA');
const scrubA = makeScrubber({
  sectionEl: sceneAEl,
  canvasEl: document.getElementById('canvasA'),
  frameCount: SCENES_META.sceneA.frames,
  frameFolder: SCENES_META.sceneA.folder,
  onProgress(p) {
    const copy = document.querySelector('.scene-copy--A');
    const from = parseFloat(copy.dataset.revealFrom);
    const to = parseFloat(copy.dataset.revealTo);
    copy.classList.toggle('is-visible', p >= from && p <= to + 0.15);

    const more = document.querySelector('.scroll-more');
    more.classList.toggle('is-visible', p >= 0.9);
  }
});

/* ==================================================================
   SCENE B — ручка + услуги по сегментам
   ================================================================== */
const serviceData = {
  smm: {
    num: '01', title: 'SMM и комьюнити',
    desc: 'Строим сообщество вокруг бренда: от контент-плана и визуального языка до ежедневной модерации и роста живой аудитории.',
    scope: ['Контент-стратегия и рубрикатор', 'Съёмка и дизайн постов', 'Модерация и работа с комьюнити', 'Ежемесячная аналитика вовлечённости']
  },
  performance: {
    num: '02', title: 'Performance и таргет',
    desc: 'Настраиваем связку трафик → лид → продажа и держим её под постоянной оптимизацией по цифрам.',
    scope: ['Настройка рекламных кабинетов', 'A/B тестирование креативов', 'Сквозная аналитика и CRM-интеграция', 'Еженедельная оптимизация ставок']
  },
  seo: {
    num: '03', title: 'SEO-продвижение',
    desc: 'Выводим сайты в топ выдачи: техническая оптимизация, семантическое ядро и контент, который отвечает на реальные запросы.',
    scope: ['Технический аудит и исправления', 'Сбор семантического ядра', 'SEO-контент и внутренняя перелинковка', 'Ежемесячный отчёт по позициям']
  },
  production: {
    num: '04', title: 'Контент-продакшн',
    desc: 'Съёмки, монтаж и моушн-дизайн под каждую площадку — от вертикальных reels до имиджевых роликов.',
    scope: ['Сценарий и раскадровка', 'Съёмочный день под ключ', 'Монтаж и цветокоррекция', 'Адаптация под форматы площадок']
  }
};

const sceneBEl = document.getElementById('sceneB');
const serviceItems = Array.from(document.querySelectorAll('.service-item'));
const SEGMENTS = serviceItems.length;

const scrubB = makeScrubber({
  sectionEl: sceneBEl,
  canvasEl: document.getElementById('canvasB'),
  frameCount: SCENES_META.sceneB.frames,
  frameFolder: SCENES_META.sceneB.folder,
  onProgress(p) {
    const segment = Math.min(SEGMENTS - 1, Math.floor(p * SEGMENTS));
    serviceItems.forEach((item, i) => {
      item.classList.toggle('is-active', i === segment);
    });
  }
});

serviceItems.forEach(item => {
  item.addEventListener('click', () => openServiceModal(item.dataset.service));
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openServiceModal(item.dataset.service); }
  });
  item.setAttribute('tabindex', '0');
});

// хоткеи 1–4 — быстрый переход к описанию услуги
window.addEventListener('keydown', (e) => {
  if (!['1', '2', '3', '4'].includes(e.key)) return;
  if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  const idx = parseInt(e.key, 10) - 1;
  if (serviceItems[idx]) openServiceModal(serviceItems[idx].dataset.service);
});

const modal = document.getElementById('serviceModal');
function openServiceModal(key) {
  const data = serviceData[key];
  if (!data) return;
  document.getElementById('modalNum').textContent = data.num;
  document.getElementById('modalTitle').textContent = data.title;
  document.getElementById('modalDesc').textContent = data.desc;
  const scopeEl = document.getElementById('modalScope');
  scopeEl.innerHTML = '';
  data.scope.forEach(line => {
    const li = document.createElement('li');
    li.textContent = line;
    scopeEl.appendChild(li);
  });
  modal.classList.add('is-open');
}
document.getElementById('modalClose').addEventListener('click', () => modal.classList.remove('is-open'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('is-open'); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('is-open'); });

/* ==================================================================
   SCENE C — заметки (скролл поднимает кадр), дальше —
   мокап телефона с живым текстом, синхронным вводу в форме
   ================================================================== */
const sceneCEl = document.getElementById('sceneC');
const TOTAL_C = SCENES_META.sceneC.frames;
const RAISE_FRAMES = 34;      // 0..33 — сцена разворачивается по скроллу
const SETTLE_FRAME = TOTAL_C - 1; // финальный статичный кадр на время ввода

const phoneMock = document.getElementById('phoneMock');
const phoneMockBody = phoneMock.querySelector('.phone-mock-body');
const phoneMockScreen = phoneMock.querySelector('.phone-mock-screen');
const phoneMockLabel = document.getElementById('phoneMockLabel');
const phoneMockText = document.getElementById('phoneMockText');

const scrubC = makeScrubber({
  sectionEl: sceneCEl,
  canvasEl: document.getElementById('canvasC'),
  frameCount: TOTAL_C,
  frameFolder: SCENES_META.sceneC.folder,
  onProgress(p) {
    const typingPhase = p >= 0.68;
    phoneMock.classList.toggle('is-visible', typingPhase);
    if (!typingPhase) {
      const raiseP = Math.min(1, p / 0.68);
      scrubC.drawFrame(Math.floor(raiseP * (RAISE_FRAMES - 1)));
    } else {
      scrubC.drawFrame(SETTLE_FRAME);
    }
  }
});

function renderPhoneMock() {
  const name = fieldName.value.trim();
  const message = fieldMessage.value.trim();
  const active = document.activeElement;
  const text = active === fieldMessage && message ? message : name;
  phoneMockLabel.textContent = active === fieldMessage ? 'Что нужно сделать' : 'Как к вам обращаться';
  phoneMockText.innerHTML = escapeHtml(text) + '<span class="phone-mock-cursor">|</span>';
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function pulsePhoneMock() {
  phoneMockBody.classList.remove('is-pulsing');
  void phoneMockBody.offsetWidth; // restart animation
  phoneMockBody.classList.add('is-pulsing');
}

const fieldName = document.getElementById('fieldName');
const fieldMessage = document.getElementById('fieldMessage');
[fieldName, fieldMessage].forEach(field => {
  field.addEventListener('input', () => { renderPhoneMock(); pulsePhoneMock(); });
  field.addEventListener('focus', renderPhoneMock);
});
renderPhoneMock();

const contactForm = document.getElementById('contactForm');
const submitBtn = document.getElementById('contactSubmit');
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitBtn.classList.add('is-sending');
  submitBtn.disabled = true;
  setTimeout(() => {
    submitBtn.classList.remove('is-sending');
    submitBtn.disabled = false;
    submitBtn.querySelector('.submit-label').textContent = 'Заявка отправлена ✓';
    phoneMockScreen.classList.add('is-sent');
    if (!phoneMockScreen.querySelector('.phone-mock-check')) {
      const check = document.createElement('span');
      check.className = 'phone-mock-check';
      check.innerHTML = '✓ Отправлено';
      phoneMockScreen.appendChild(check);
    }
  }, 900);
});

/* ==================================================================
   HERO → SCENE A переход (кроссфейд по первым 100vh скролла)
   ================================================================== */
const heroEl = document.getElementById('hero');
function updateHero() {
  const p = Math.min(1, window.scrollY / window.innerHeight);
  heroEl.style.opacity = String(1 - p);
  heroEl.style.transform = `scale(${1 + p * 0.06})`;
}

/* ==================================================================
   ИНДИКАТОР ПРОГРЕССА ПО СТРАНИЦЕ
   ================================================================== */
const progressFill = document.getElementById('progressFill');
const railStops = Array.from(document.querySelectorAll('.progress-rail-stops li'));
const stopSections = { hero: heroEl, sceneA: sceneAEl, sceneB: sceneBEl, sceneC: sceneCEl };

function updateProgressRail() {
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const overall = docHeight > 0 ? window.scrollY / docHeight : 0;
  progressFill.style.height = Math.min(100, Math.max(0, overall * 100)) + '%';

  let activeKey = 'hero';
  Object.entries(stopSections).forEach(([key, el]) => {
    if (window.scrollY >= el.offsetTop - window.innerHeight * 0.5) activeKey = key;
  });
  railStops.forEach(li => li.classList.toggle('is-active', li.dataset.stop === activeKey));
}

/* ==================================================================
   MAIN SCROLL LOOP
   ================================================================== */
let ticking = false;
function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateHero();
      scrubA.update();
      scrubB.update();
      scrubC.update();
      updateProgressRail();
      ticking = false;
    });
    ticking = true;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
window.addEventListener('load', onScroll);
