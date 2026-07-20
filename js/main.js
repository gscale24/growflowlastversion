/* ============ ТОЧКИ ПОДКЛЮЧЕНИЯ МЕДИА ============
   Hero-видео + одна кадровая секвенция для «Знакомства». Остальные
   секции идут обычным потоком без картинки, фон переключают [data-theme]. */
const HERO_VIDEO_URL = "assets/hero.mp4";

const SCENES_META = {
  sceneA: { frames: 24, folder: 'assets/frames/sceneA' },
};
const TOTAL_FRAMES = SCENES_META.sceneA.frames;

/* ==================================================================
   ПРЕЛОАДЕР — агрегированный прогресс по кадрам «Знакомства»
   ================================================================== */
let loadedFramesTotal = 0;
const preloaderEl = document.getElementById('preloader');
const preloaderFill = document.getElementById('preloaderFill');
const preloaderPct = document.getElementById('preloaderPct');
let preloaderDone = false;
function finishPreloader() {
  if (preloaderDone) return;
  preloaderDone = true;
  preloaderFill.style.width = '100%';
  preloaderPct.textContent = '100%';
  preloaderEl.classList.add('is-done');
  document.getElementById('progressRail').classList.add('is-visible');
}
function bumpPreloader() {
  loadedFramesTotal++;
  const pct = Math.min(100, Math.round((loadedFramesTotal / TOTAL_FRAMES) * 100));
  preloaderFill.style.width = pct + '%';
  preloaderPct.textContent = pct + '%';
  if (loadedFramesTotal >= TOTAL_FRAMES) finishPreloader();
}
// подстраховка: не держим прелоадер вечно, если что-то не догрузилось
setTimeout(finishPreloader, 6000);

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
   ЗНАКОМСТВО — скролл-скраббинг кадров на весь экран (object-fit: cover)
   ================================================================== */
function makeCoverScrubber({ sectionEl, canvasEl, frameCount, frameFolder, frameDigits = 3, hardCuts = [], onProgress }) {
  const ctx = canvasEl.getContext('2d');
  const images = new Array(frameCount);
  const hardCutSet = new Set(hardCuts);
  let currentFrame = -1;
  let lastBlendKey = null;
  let sizedW = 0, sizedH = 0;

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

  // канвас ресайзится под реальный размер вьюпорта (а не под кадр) —
  // рисуем кадр с обрезкой по типу object-fit: cover, без полос по бокам
  function ensureCanvasSize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvasEl.clientWidth * dpr);
    const h = Math.round(canvasEl.clientHeight * dpr);
    if (w !== sizedW || h !== sizedH) {
      sizedW = w; sizedH = h;
      canvasEl.width = w; canvasEl.height = h;
    }
  }
  function drawCover(img, alpha) {
    const scale = Math.max(sizedW / img.naturalWidth, sizedH / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (sizedW - dw) / 2, (sizedH - dh) / 2, dw, dh);
  }

  function drawFrame(index) {
    index = Math.max(0, Math.min(frameCount - 1, Math.round(index)));
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    ensureCanvasSize();
    currentFrame = index; lastBlendKey = null;
    ctx.clearRect(0, 0, sizedW, sizedH);
    drawCover(img, 1);
    ctx.globalAlpha = 1;
  }

  function drawFrameBlended(floatIndex) {
    floatIndex = Math.max(0, Math.min(frameCount - 1, floatIndex));
    const lo = Math.floor(floatIndex);
    const hi = Math.min(frameCount - 1, lo + 1);
    const frac = floatIndex - lo;
    const key = lo + '_' + frac.toFixed(3);
    if (key === lastBlendKey) return;
    const imgLo = images[lo];
    if (!imgLo || !imgLo.complete || imgLo.naturalWidth === 0) return;
    ensureCanvasSize();
    lastBlendKey = key; currentFrame = lo;
    ctx.clearRect(0, 0, sizedW, sizedH);
    if (hardCutSet.has(lo) && hi !== lo) {
      // монтажная склейка (в кадрах вырезан кусок ролика) — соседние
      // кадры тут визуально не соседние, обычный кроссфейд даёт двойную
      // экспозицию (руки видно сразу в двух местах), поэтому режем жёстко
      // по середине, без промежуточного альфа-блендинга
      const img = frac < 0.5 ? imgLo : images[hi];
      if (img && img.complete && img.naturalWidth > 0) drawCover(img, 1);
    } else {
      drawCover(imgLo, 1);
      if (frac > 0.008 && hi !== lo) {
        const imgHi = images[hi];
        if (imgHi && imgHi.complete && imgHi.naturalWidth > 0) drawCover(imgHi, frac);
      }
    }
    ctx.globalAlpha = 1;
  }

  function getProgress(scrollPos) {
    const total = sectionEl.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, (scrollPos - sectionEl.offsetTop) / total));
  }
  function update(scrollPos) {
    const p = getProgress(scrollPos);
    const floatIndex = p * (frameCount - 1);
    drawFrameBlended(floatIndex);
    if (onProgress) onProgress(p);
    return p;
  }
  window.addEventListener('resize', () => { sizedW = 0; sizedH = 0; drawFrame(currentFrame); });
  return { update, drawFrame };
}

const sceneAEl = document.getElementById('sceneA');
const introCopy = document.getElementById('introCopy');
const scrubA = makeCoverScrubber({
  sectionEl: sceneAEl,
  canvasEl: document.getElementById('canvasA'),
  frameCount: SCENES_META.sceneA.frames,
  frameFolder: SCENES_META.sceneA.folder,
  // между 14-м и 15-м кадром — монтажная склейка (вырезан кусок ролика
  // с чужим цветом света), кадры там не соседние по-настоящему
  hardCuts: [13],
  onProgress(p) {
    // текст появляется, когда руки уже почти легли на клавиатуру, и
    // остаётся на экране до конца пина — после этого кадр «замирает»
    // на последнем (руки на клавиатуре) и секция заканчивается
    introCopy.classList.toggle('is-visible', p >= 0.82);
  },
});

/* ==================================================================
   ФОН СЕКЦИЙ — общий фиксированный слой плавно перекрашивается, когда
   середина вьюпорта переходит в секцию с другой [data-theme].

   Раньше это решалось через IntersectionObserver с rootMargin по центру
   вьюпорта, но с высокими секциями (например, вся доска «Кейсы» одним
   [data-theme]) это давало гонку: секция начинает считаться
   "пересекающей центр" уже в момент, когда её верх только чуть зашёл за
   середину экрана — то есть ещё до того, как предыдущая секция
   реально перестала быть по центру. Если в одном кадре наблюдателя
   пересекались сразу две секции, применялась тема той, что шла последней
   в DOM, независимо от того, что фактически видно в центре экрана.
   Вместо этого просто ищем секцию, чей верх выше центра вьюпорта, но
   ближе всех к нему — детерминированно, без гонки между кадрами.
   Тем же проходом подсвечиваем активную вкладку услуги.
   ================================================================== */
const bgLayer = document.getElementById('bgLayer');
const THEME_COLORS = { light: '#f2efe7', dark: '#0a0a0a' };
const serviceTabs = Array.from(document.querySelectorAll('.services-tab'));

const themeSections = Array.from(document.querySelectorAll('[data-theme]')).map((el) => ({
  el, theme: el.dataset.theme, service: el.dataset.service || null, docTop: 0,
}));
function measureThemeSections() {
  themeSections.forEach((s) => { s.docTop = s.el.getBoundingClientRect().top + window.scrollY; });
}
measureThemeSections();
window.addEventListener('resize', measureThemeSections);
window.addEventListener('load', measureThemeSections);

function updateTheme(scrollPos) {
  const center = scrollPos + window.innerHeight / 2;
  let current = themeSections[0];
  for (const s of themeSections) {
    if (s.docTop <= center) current = s;
    else break;
  }
  if (!current) return;
  if (current.theme && THEME_COLORS[current.theme]) bgLayer.style.backgroundColor = THEME_COLORS[current.theme];
  if (current.service) {
    serviceTabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.service === current.service));
  }
}

/* ==================================================================
   REVEAL-ПО-СКРОЛЛУ — карточки/блоки плавно "разворачиваются" при
   входе в вьюпорт, один раз, дальше не трогаем.
   ================================================================== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

// направление скролла — карточки и картинки услуг "прилетают" оттуда,
// откуда реально едет скролл (сверху при скролле вниз, снизу при скролле вверх)
let lastScrollY = window.scrollY;
let scrollDirection = 'down';
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (Math.abs(y - lastScrollY) > 0.5) {
    scrollDirection = y > lastScrollY ? 'down' : 'up';
    lastScrollY = y;
  }
}, { passive: true });

// услуги — особый случай: появляются при скролле вниз и точно так же
// плавно исчезают при скролле вверх (не одноразовый reveal), направление
// влёта берём из scrollDirection на момент срабатывания
const serviceRevealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    entry.target.dataset.dir = scrollDirection;
    entry.target.classList.toggle('is-visible', entry.isIntersecting);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.service-block').forEach((el) => serviceRevealObserver.observe(el));

/* ==================================================================
   УСЛУГИ — вкладки скроллят к своей карточке; хоткеи 1–4 и кнопка
   «Подробнее» открывают модалку с полным составом работ.
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

// клик по вкладке — скроллит к соответствующей карточке услуги
serviceTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const block = document.getElementById('service-' + tab.dataset.service);
    if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

document.querySelectorAll('.service-more').forEach((btn) => {
  btn.addEventListener('click', () => openServiceModal(btn.dataset.service));
});

// хоткеи 1–4 — быстрый переход к описанию услуги
window.addEventListener('keydown', (e) => {
  if (!['1', '2', '3', '4'].includes(e.key)) return;
  if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  const idx = parseInt(e.key, 10) - 1;
  if (serviceTabs[idx]) openServiceModal(serviceTabs[idx].dataset.service);
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
  data.scope.forEach((line) => {
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
   КОНТАКТЫ — телефон-мокап: живой текст, синхронный вводу в форме
   (сам мокап появляется вместе с реveal-блоком секции через CSS).
   ================================================================== */
const phoneMockBody = document.querySelector('.phone-mock-body');
const phoneMockScreen = document.getElementById('phoneMockScreen');
const phoneMockName = document.getElementById('phoneMockName');
const phoneMockMessage = document.getElementById('phoneMockMessage');

function renderPhoneMock() {
  const active = document.activeElement;
  const nameCursor = active === fieldName ? '<span class="phone-mock-cursor">|</span>' : '';
  const msgCursor = active === fieldMessage ? '<span class="phone-mock-cursor">|</span>' : '';
  phoneMockName.innerHTML = escapeHtml(fieldName.value) + nameCursor;
  phoneMockMessage.innerHTML = escapeHtml(fieldMessage.value) + msgCursor;
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
  }, 900);
});

/* ==================================================================
   КЕЙСЫ — параллакс карточек доски работ
   Абсолютная позиция каждой карточки в документе считается один раз
   (и пересчитывается при resize), чтобы не зависеть от того, что
   offsetParent карточки — сама позиционированная секция .cases-group.
   ================================================================== */
const prefersNoParallax = window.matchMedia('(pointer: coarse)').matches
  || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const caseCards = Array.from(document.querySelectorAll('.case-card')).map(el => ({
  el, speed: parseFloat(el.dataset.speed) || 0, centerY: 0,
}));
function measureCaseCards() {
  caseCards.forEach(c => {
    const rect = c.el.getBoundingClientRect();
    c.centerY = rect.top + window.scrollY + rect.height / 2;
  });
}
function updateCasesParallax(scrollPos) {
  if (prefersNoParallax || !caseCards.length) return;
  const viewportCenter = scrollPos + window.innerHeight / 2;
  caseCards.forEach(c => {
    const offset = (c.centerY - viewportCenter) * c.speed;
    c.el.style.transform = `translateY(${offset.toFixed(1)}px)`;
  });
}
if (!prefersNoParallax) {
  measureCaseCards();
  window.addEventListener('resize', measureCaseCards);
  window.addEventListener('load', measureCaseCards);
}

/* ==================================================================
   HERO → следующая секция (кроссфейд по первым 100vh скролла)
   ================================================================== */
const heroEl = document.getElementById('hero');
function updateHero(scrollPos) {
  const p = Math.min(1, scrollPos / window.innerHeight);
  heroEl.style.opacity = String(1 - p);
  heroEl.style.transform = `scale(${1 + p * 0.06})`;
}

/* ==================================================================
   ИНДИКАТОР ПРОГРЕССА ПО СТРАНИЦЕ
   ================================================================== */
const progressFill = document.getElementById('progressFill');
const railStops = Array.from(document.querySelectorAll('.progress-rail-stops li'));
const stopSections = {
  hero: heroEl,
  sceneA: document.getElementById('sceneA'),
  sceneB: document.getElementById('sceneB'),
  work: document.getElementById('work'),
  sceneC: document.getElementById('sceneC'),
};

function updateProgressRail(scrollPos) {
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const overall = docHeight > 0 ? scrollPos / docHeight : 0;
  progressFill.style.height = Math.min(100, Math.max(0, overall * 100)) + '%';

  let activeKey = 'hero';
  Object.entries(stopSections).forEach(([key, el]) => {
    if (scrollPos >= el.offsetTop - window.innerHeight * 0.5) activeKey = key;
  });
  railStops.forEach(li => li.classList.toggle('is-active', li.dataset.stop === activeKey));
}

/* ==================================================================
   MAIN SCROLL LOOP — сглаженный скролл (lerp, независимый от FPS)
   Реальная позиция скролла (window.scrollY) плавно "догоняется"
   виртуальным значением smoothY, коэффициент сглаживания считается по
   реально прошедшему времени, а не за "тик" — так эффект не зависит
   от частоты кадров.
   ================================================================== */
const SMOOTH_HALFLIFE_MS = 55; // за это время разрыв между smoothY и целью уменьшается вдвое
let smoothY = window.scrollY;
let rafRunning = false;
let lastTickTime = 0;

function frameTick(now) {
  const dt = lastTickTime ? Math.min(now - lastTickTime, 64) : 16.67;
  lastTickTime = now;
  const targetY = window.scrollY;
  const factor = 1 - Math.pow(2, -dt / SMOOTH_HALFLIFE_MS);
  smoothY += (targetY - smoothY) * factor;
  const diff = Math.abs(targetY - smoothY);
  if (diff < 0.4) smoothY = targetY;

  updateHero(smoothY);
  scrubA.update(smoothY);
  updateCasesParallax(smoothY);
  updateTheme(smoothY);
  updateProgressRail(smoothY);

  if (diff < 0.4) {
    rafRunning = false;
  } else {
    requestAnimationFrame(frameTick);
  }
}
function kickScroll() {
  if (!rafRunning) {
    rafRunning = true;
    lastTickTime = 0;
    requestAnimationFrame(frameTick);
  }
}
window.addEventListener('scroll', kickScroll, { passive: true });
window.addEventListener('resize', kickScroll);
window.addEventListener('load', kickScroll);
kickScroll();

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // без сглаживания — мгновенно синхронизируем с реальным скроллом
  window.removeEventListener('scroll', kickScroll);
  window.addEventListener('scroll', () => {
    smoothY = window.scrollY;
    updateHero(smoothY);
    scrubA.update(smoothY);
    updateCasesParallax(smoothY);
    updateTheme(smoothY);
    updateProgressRail(smoothY);
  }, { passive: true });
}

/* ==================================================================
   ЗАСТАВКА КЕЙСОВ — «НАШИ РАБОТЫ» на размытом фоне, разворачивается
   один раз при входе в вьюпорт (фон крутится в CSS-анимации всё время).
   ================================================================== */
(function initCasesIntro() {
  const intro = document.querySelector('.cases-intro');
  if (!intro) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        intro.classList.add('is-visible');
        io.unobserve(intro);
      }
    });
  }, { threshold: 0.3 });
  io.observe(intro);
})();
