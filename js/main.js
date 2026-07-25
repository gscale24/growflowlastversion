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
  // один непрерывный дубль (сел → руки на клавиатуру), склеек нет
  hardCuts: [],
  onProgress(p) {
    // текст появляется, когда руки лягут на клавиатуру (кадр 11 из 24 —
    // p ≈ 10/23), и остаётся на экране до конца пина
    introCopy.classList.toggle('is-visible', p >= 0.45);
  },
});

/* ==================================================================
   ФОН СЕКЦИЙ — вся страница как единое полотно с непрерывным градиентом
   между тёмными и светлыми разделами, а не набор карточек-секций со
   своим фоном каждая.

   Раньше цвет переключался дискретно (найти секцию под центром вьюпорта
   → мгновенно применить её [data-theme] → сгладить ЭТОТ скачок отдельным
   CSS transition на #bgLayer). Так и получался эффект, который viewer
   считывает как шов: секция ещё "не доехала", а фон уже прыгнул и после
   этого время просто "догоняет" целевой цвет — то есть сама смена
   привязана к событию (порог пересечения), а не к позиции скролла
   напрямую. Отсюда же плоская серая заглушка в середине перехода —
   time-based transition не знает о позиции скролла, он просто едет по
   своей кривой независимо от того, крутит ли пользователь колесо дальше
   или уже остановился.

   Вместо этого ниже цвет каждый кадр СЧИТАЕТСЯ напрямую как функция
   позиции скролла: между соседними опорными точками (границами смены
   темы) идёт RGB-интерполяция, растянутая на протяжённую зону в
   несколько сотен пикселей по обе стороны границы. Раньше это решалось
   через IntersectionObserver с rootMargin по центру вьюпорта, но с
   высокими секциями (например, вся доска «Кейсы» одним [data-theme])
   это давало гонку: секция начинает считаться "пересекающей центр" уже в
   момент, когда её верх только чуть зашёл за середину экрана. Детермини-
   рованный проход по опорным точкам (docTop) убирает и эту гонку —
   опорные точки просто идут по порядку в документе.

   Соседние опорные точки с одинаковой темой (например, все 4 карточки
   «Услуг» — светлые) схлопываются в одну — переходная зона открывается
   только там, где тема реально меняется. Тем же проходом (по отдельному,
   дискретному списку) подсвечивается активная вкладка услуги — для
   вкладки континуальность не нужна, это обычный дискретный UI-статус.
   ================================================================== */
const bgLayer = document.getElementById('bgLayer');
const rootStyle = document.documentElement.style;
const serviceTabs = Array.from(document.querySelectorAll('.services-tab'));

// цветовые опоры тем — те же значения, что раньше жили в [data-theme] CSS
const THEME_RGB = {
  light: { bg: [242, 239, 231], fg: [12, 11, 9], fgDim: [109, 104, 92], line: [12, 11, 9], lineA: 0.16, accent: [12, 11, 9] },
  dark: { bg: [10, 10, 10], fg: [245, 242, 234], fgDim: [143, 139, 130], line: [245, 242, 234], lineA: 0.12, accent: [201, 166, 104] },
};

const themeSections = Array.from(document.querySelectorAll('[data-theme]')).map((el) => ({
  el, theme: el.dataset.theme, service: el.dataset.service || null, docTop: 0,
}));

// опорные точки смены темы: старт страницы (hero — неявно тёмный, как в
// :root по умолчанию) + только те секции, где тема реально отличается от
// предыдущей опоры
let themeStops = [];
function measureThemeSections() {
  themeSections.forEach((s) => { s.docTop = s.el.getBoundingClientRect().top + window.scrollY; });
  themeStops = [{ docTop: -Infinity, theme: 'dark' }];
  themeSections.forEach((s) => {
    if (s.theme && themeStops[themeStops.length - 1].theme !== s.theme) {
      themeStops.push({ docTop: s.docTop, theme: s.theme });
    }
  });
}
measureThemeSections();
window.addEventListener('resize', measureThemeSections);
window.addEventListener('load', measureThemeSections);

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function rgbStr(c) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }
function rgbaStr(c, a) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
// smoothstep — по краям зоны переход стартует/останавливается мягче, чем
// по прямой, ещё меньше ощущается сама точка начала/конца интерполяции
function smoothstep(t) { return t * t * (3 - 2 * t); }

function updateTheme(scrollPos) {
  const center = scrollPos + window.innerHeight / 2;
  // ширина зоны, в которой цвет реально едет от одной темы к другой —
  // привязана к высоте вьюпорта, чтобы на любом экране переход читался
  // одинаково плавно, но не размывался на несколько разделов подряд.
  // Зона симметрична вокруг границы (docTop следующей опоры) — начинается
  // за half ДО неё и заканчивается через half ПОСЛЕ.
  const zone = Math.max(480, Math.min(1100, window.innerHeight * 0.9));
  const half = zone / 2;

  // Идём по опорам по порядку. Как только текущая граница ещё не
  // достигнута (центр раньше её zoneStart) — тема уже устоялась на
  // предыдущем шаге, останавливаемся. Если центр внутри зоны — это и
  // есть текущий переход, интерполируем и останавливаемся. Если центр
  // уже за zoneEnd — тема "оседает" на эту опору целиком, и проверка
  // идёт дальше, к следующей возможной границе. Важно: переключение
  // пары from/to происходит по границам самой зоны (zoneStart/zoneEnd),
  // а не по одной точке docTop посередине — иначе смена пары обрывает
  // интерполяцию на середине и цвет прыгает к чистому значению вместо
  // того, чтобы доехать до конца зоны.
  let fromTheme = themeStops[0].theme;
  let toTheme = fromTheme;
  let t = 0;
  for (let k = 1; k < themeStops.length; k++) {
    const boundary = themeStops[k].docTop;
    const zoneStart = boundary - half;
    const zoneEnd = boundary + half;
    if (center < zoneStart) break;
    if (center <= zoneEnd) {
      fromTheme = themeStops[k - 1].theme;
      toTheme = themeStops[k].theme;
      t = smoothstep((center - zoneStart) / zone);
      break;
    }
    fromTheme = themeStops[k].theme;
    toTheme = fromTheme;
    t = 0;
  }

  const a = THEME_RGB[fromTheme];
  const b = THEME_RGB[toTheme];
  const bg = lerpRGB(a.bg, b.bg, t);
  const fg = lerpRGB(a.fg, b.fg, t);
  const fgDim = lerpRGB(a.fgDim, b.fgDim, t);
  const line = lerpRGB(a.line, b.line, t);
  const lineA = lerp(a.lineA, b.lineA, t);
  const accent = lerpRGB(a.accent, b.accent, t);

  const bgColor = rgbStr(bg);
  bgLayer.style.backgroundColor = bgColor;
  rootStyle.setProperty('--bg', bgColor);
  rootStyle.setProperty('--fg', rgbStr(fg));
  rootStyle.setProperty('--fg-dim', rgbStr(fgDim));
  rootStyle.setProperty('--line', rgbaStr(line, lineA.toFixed(3)));
  rootStyle.setProperty('--accent', rgbStr(accent));

  // активная вкладка услуги — отдельный дискретный проход по секциям с
  // .service, той же логикой "последняя опора выше центра", что и раньше
  let currentService = null;
  for (const s of themeSections) {
    if (s.docTop <= center) { if (s.service) currentService = s.service; }
    else break;
  }
  if (currentService) {
    serviceTabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.service === currentService));
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
  field.addEventListener('input', () => {
    renderPhoneMock();
    pulsePhoneMock();
    // подсказку про обязательные поля убираем сразу, как только форма
    // снова стала валидной — не держим её до повторного сабмита
    if (fieldName.checkValidity() && fieldMessage.checkValidity()) {
      document.getElementById('contactFormNote').classList.remove('is-visible');
    }
  });
  field.addEventListener('focus', renderPhoneMock);
});
renderPhoneMock();

const contactForm = document.getElementById('contactForm');
const submitBtn = document.getElementById('contactSubmit');
const contactFormNote = document.getElementById('contactFormNote');
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  // валидация — required/minlength уже на самих полях (html5), но раз
  // <form novalidate> убрали, submit сам не пройдёт дальше при невалидной
  // форме без explicit reportValidity(); дублируем проверку тут, чтобы
  // показать понятную подсказку рядом с полями, а не только нативный
  // браузерный тултип
  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    contactFormNote.classList.add('is-visible');
    return;
  }
  contactFormNote.classList.remove('is-visible');
  submitBtn.classList.add('is-sending');
  submitBtn.disabled = true;
  setTimeout(() => {
    submitBtn.classList.remove('is-sending');
    submitBtn.disabled = true;
    submitBtn.querySelector('.submit-label').textContent = 'Отправлено ✓';
    document.getElementById('contactFormSuccess').classList.add('is-visible');
    phoneMockScreen.classList.add('is-sent');
  }, 900);
});

/* ==================================================================
   КЕЙСЫ — параллакс карточек доски работ
   Абсолютная позиция каждой карточки в документе считается один раз
   (и пересчитывается при resize), чтобы не зависеть от того, что
   offsetParent карточки — сама позиционированная секция .cases-group.
   ================================================================== */
// координатная сетка карточек — только desktop-раскладка (нахлёст,
// абсолютное позиционирование); на тач-устройствах (`pointer: coarse`)
// карточки уходят в простой вертикальный список (position:static,
// см. media-запрос в css/style.css) — там ни параллаксу, ни наклону
// делать нечего, наклон на full-width строке читался бы как визуальный
// баг, а не как приём. prefers-reduced-motion отдельно — desktop без
// анимации всё ещё держит статичный наклон, просто без покачивания.
const prefersCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const prefersNoParallax = prefersCoarsePointer || prefersReducedMotion;
// лёгкий постоянный наклон у каждой карточки (как у разбросанных на столе
// фотографий) — вместе с параллаксом и тройной тенью создаёт объём вместо
// плоской подложки; складывается в один transform с параллаксом ниже, а
// не отдельным CSS-правилом — иначе JS каждый кадр затирал бы его,
// перезаписывая весь inline style.transform целиком
const CASE_CARD_TILT = [-2.2, 1.6, -1.4, 2.4, -1.8, 1.2];
const caseCards = Array.from(document.querySelectorAll('.case-card')).map((el, i) => ({
  el, speed: parseFloat(el.dataset.speed) || 0, centerY: 0, tilt: CASE_CARD_TILT[i % CASE_CARD_TILT.length],
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
    c.el.style.transform = `translateY(${offset.toFixed(1)}px) rotate(${c.tilt}deg)`;
  });
}
if (!prefersNoParallax) {
  measureCaseCards();
  window.addEventListener('resize', measureCaseCards);
  window.addEventListener('load', measureCaseCards);
} else if (!prefersCoarsePointer) {
  caseCards.forEach(c => { c.el.style.transform = `rotate(${c.tilt}deg)`; });
}

/* ==================================================================
   УСЛУГИ — «ниспадающие картинки»: непрерывный скролл-параллакс на
   правой картинке-плейсхолдере (.service-object-parallax), той же
   формулой, что и у карточек «Кейсов» выше. Независим от разового
   направленного влёта при входе в вьюпорт (тот остаётся на
   .service-object, CSS-transition) и от покачивания (то остаётся на
   .service-object-card, CSS-animation) — три вложенных узла, три
   независимых transform, ни один не затирает другой. Картинка не просто
   один раз "влетает", а всё время слегка едет медленнее/быстрее текста
   по мере скролла — оттого и читается как "ниспадающая", а не просто
   разово появившаяся.
   ================================================================== */
const SERVICE_PARALLAX_SPEED = 0.1;
// у карточек «Кейсов» тот же приём без ограничения работает нормально,
// потому что доска карточек невысокая (сотни px) — там (centerY -
// viewportCenter) физически не бывает огромным. Карточка услуги же
// видна (opacity, is-visible) уже при пороге пересечения 15% — то есть
// почти сразу, когда центр вьюпорта ещё далеко от центра всего блока
// (min-height:86vh) — без ограничения множитель * дельту уносил
// картинку на 200+px от своего текста, композиция разваливалась.
// Клип держит эффект "стекает мимо текста при скролле", но не даёт
// картинке оторваться от строки.
const SERVICE_PARALLAX_MAX = 46;
const serviceParallaxEls = Array.from(document.querySelectorAll('.service-object-parallax')).map(el => ({
  el, centerY: 0,
}));
function measureServiceParallax() {
  serviceParallaxEls.forEach(s => {
    const rect = s.el.getBoundingClientRect();
    s.centerY = rect.top + window.scrollY + rect.height / 2;
  });
}
function updateServiceParallax(scrollPos) {
  if (prefersNoParallax || !serviceParallaxEls.length) return;
  const viewportCenter = scrollPos + window.innerHeight / 2;
  serviceParallaxEls.forEach(s => {
    const raw = (s.centerY - viewportCenter) * SERVICE_PARALLAX_SPEED;
    const offset = Math.max(-SERVICE_PARALLAX_MAX, Math.min(SERVICE_PARALLAX_MAX, raw));
    s.el.style.transform = `translateY(${offset.toFixed(1)}px)`;
  });
}
if (!prefersNoParallax) {
  measureServiceParallax();
  window.addEventListener('resize', measureServiceParallax);
  window.addEventListener('load', measureServiceParallax);
}

/* ==================================================================
   КЕЙСЫ — атмосферная текстура (блики + зерно), см. .cases-texture в
   css/style.css. Один непрерывный fixed-слой на весь сайт, прозрачность
   которого — гладкая функция позиции скролла: плавно наплывает при
   входе в «Кейсы» и так же плавно спадает при выходе из неё, симметрично
   по обе стороны секции, той же smoothstep-логикой, что и updateTheme —
   поэтому текстура никогда не обрывается резко на границе заставки и
   доски с карточками (внутри секции она попросту не выключается).
   ================================================================== */
const casesTexture = document.getElementById('casesTexture');
const workEl = document.getElementById('work');
let workTop = 0, workBottom = 0;
function measureCasesTexture() {
  workTop = workEl.getBoundingClientRect().top + window.scrollY;
  workBottom = workTop + workEl.offsetHeight;
}
measureCasesTexture();
window.addEventListener('resize', measureCasesTexture);
window.addEventListener('load', measureCasesTexture);

function updateCasesTexture(scrollPos) {
  if (!casesTexture) return;
  const center = scrollPos + window.innerHeight / 2;
  const fade = Math.max(480, Math.min(1100, window.innerHeight * 0.9));
  const inT = smoothstep(Math.max(0, Math.min(1, (center - (workTop - fade / 2)) / fade)));
  const outT = smoothstep(Math.max(0, Math.min(1, ((workBottom + fade / 2) - center) / fade)));
  casesTexture.style.opacity = Math.min(inT, outT).toFixed(3);
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
  updateServiceParallax(smoothY);
  updateCasesParallax(smoothY);
  updateCasesTexture(smoothY);
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
    updateServiceParallax(smoothY);
    updateCasesParallax(smoothY);
    updateCasesTexture(smoothY);
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
