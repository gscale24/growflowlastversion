/* ============ ТОЧКИ ПОДКЛЮЧЕНИЯ МЕДИА ============
   Hero/outro-видео + одна кадровая секвенция для «Знакомства». Остальные
   секции идут обычным потоком без картинки, фон переключают [data-theme]. */
const HERO_VIDEO_URL = "assets/hero.mp4";
const OUTRO_VIDEO_URL = "assets/hero.mp4"; // видео внутри финальной надписи — можно указать своё

const SCENES_META = {
  sceneA: { frames: 40, folder: 'assets/frames/sceneA' },
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
function makeCoverScrubber({ sectionEl, canvasEl, frameCount, frameFolder, frameDigits = 3, onProgress }) {
  const ctx = canvasEl.getContext('2d');
  const images = new Array(frameCount);
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
    drawCover(imgLo, 1);
    if (frac > 0.008 && hi !== lo) {
      const imgHi = images[hi];
      if (imgHi && imgHi.complete && imgHi.naturalWidth > 0) drawCover(imgHi, frac);
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
  onProgress(p) {
    // текст появляется, когда руки уже почти легли на клавиатуру, и
    // остаётся на экране до конца пина — после этого кадр «замирает»
    // на последнем (руки на клавиатуре) и секция заканчивается
    introCopy.classList.toggle('is-visible', p >= 0.82);
  },
});

/* ==================================================================
   ФОН СЕКЦИЙ — общий фиксированный слой плавно перекрашивается, когда
   середина вьюпорта пересекает секцию с другой [data-theme], вместо
   резкой смены цвета на границе блока. Тем же наблюдателем подсвечиваем
   активную вкладку услуги, когда в фокусе конкретная карточка.
   ================================================================== */
const bgLayer = document.getElementById('bgLayer');
const THEME_COLORS = { light: '#f2efe7', dark: '#0a0a0a' };
const serviceTabs = Array.from(document.querySelectorAll('.services-tab'));

const themeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const theme = entry.target.dataset.theme;
    if (theme && THEME_COLORS[theme]) bgLayer.style.backgroundColor = THEME_COLORS[theme];
    const service = entry.target.dataset.service;
    if (service) {
      serviceTabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.service === service));
    }
  });
}, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
document.querySelectorAll('[data-theme]').forEach((el) => themeObserver.observe(el));

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
  outro: document.getElementById('outro'),
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
    updateProgressRail(smoothY);
  }, { passive: true });
}

/* ==================================================================
   OUTRO — гигантская надпись «GROW FLOW» с видео в маске букв
   (destination-in: рисуем кадр видео, затем "вырезаем" его текстом).
   Рисуем только пока секция видна — вне вьюпорта цикл остановлен.
   ================================================================== */
(function initOutro() {
  const section = document.getElementById('outro');
  const video = document.getElementById('outroVideo');
  const canvas = document.getElementById('outroCanvas');
  const fallbackText = document.querySelector('.outro-fallback-text');
  const ctx = canvas.getContext('2d');
  let active = false;
  let rafId = null;
  let videoReady = false;

  function useFallback() {
    canvas.style.display = 'none';
    fallbackText.style.display = 'block';
  }

  if (!OUTRO_VIDEO_URL) {
    useFallback();
    return;
  }
  video.src = OUTRO_VIDEO_URL;
  video.addEventListener('error', useFallback);
  video.addEventListener('loadeddata', () => { videoReady = true; });
  video.play().catch(() => {});

  // офскрин-канвас с маской: обе строки текста рисуются сюда обычным
  // source-over (объединяются), а затем одной операцией destination-in
  // накладываются на видео — так деструктив-in не "пересекает" два
  // непересекающихся textFill друг с другом, а честно объединяет их
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');
  let maskW = 0, maskH = 0;

  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || section.clientWidth * 0.8;
    const h = canvas.clientHeight || section.clientHeight * 0.55;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    maskW = maskCanvas.width = canvas.width;
    maskH = maskCanvas.height = canvas.height;

    maskCtx.clearRect(0, 0, maskW, maskH);
    maskCtx.fillStyle = '#fff';
    maskCtx.textAlign = 'center';
    maskCtx.textBaseline = 'middle';
    const fontSize = maskH * 0.36;
    maskCtx.font = `600 ${fontSize}px "Playfair Display", Georgia, serif`;
    maskCtx.fillText('GROW', maskW / 2, maskH * 0.3);
    maskCtx.fillText('FLOW', maskW / 2, maskH * 0.72);
  }

  function drawMaskedFrame() {
    if (!videoReady || video.videoWidth === 0) { if (active) rafId = requestAnimationFrame(drawMaskedFrame); return; }
    const w = canvas.width, h = canvas.height;

    // 1) кадр видео, вписанный в канвас по типу cover
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    const vRatio = video.videoWidth / video.videoHeight;
    const cRatio = w / h;
    let dw, dh, dx, dy;
    if (vRatio > cRatio) { dh = h; dw = h * vRatio; dx = (w - dw) / 2; dy = 0; }
    else { dw = w; dh = w / vRatio; dx = 0; dy = (h - dh) / 2; }
    ctx.drawImage(video, dx, dy, dw, dh);

    // 2) вырезаем готовой маской (обе строки уже объединены на ней)
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0, maskW, maskH);
    ctx.globalCompositeOperation = 'source-over';

    if (active) rafId = requestAnimationFrame(drawMaskedFrame);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        canvas.classList.add('is-visible');
        if (!active) {
          active = true;
          // не блокируемся навечно, если шрифт почему-то не подгрузится
          Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 1500)),
          ]).then(() => { if (active) { sizeCanvas(); drawMaskedFrame(); } });
        }
      } else {
        active = false;
        if (rafId) cancelAnimationFrame(rafId);
      }
    });
  }, { threshold: 0.15 });
  io.observe(section);

  window.addEventListener('resize', () => { if (active) sizeCanvas(); });
})();
