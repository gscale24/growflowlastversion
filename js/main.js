/* ============ ТОЧКИ ПОДКЛЮЧЕНИЯ МЕДИА ============
   Подставьте свои файлы. Кадры сцен — assets/frames/sceneX/f_NNN.jpg. */
const HERO_VIDEO_URL = "assets/hero.mp4";
const OUTRO_VIDEO_URL = "assets/hero.mp4"; // видео внутри финальной надписи — можно указать своё

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
  const ctx = canvasEl.getContext('2d', { alpha: false });
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

  // канвас ресайзится (и очищается) только если размер реально изменился —
  // назначение canvas.width/height на каждый тик — дорогая операция и
  // была главной причиной проседания кадров при скролле
  function ensureSize(img) {
    if (sizedW !== img.naturalWidth || sizedH !== img.naturalHeight) {
      sizedW = img.naturalWidth;
      sizedH = img.naturalHeight;
      canvasEl.width = sizedW;
      canvasEl.height = sizedH;
    }
  }

  // точный кадр без интерполяции — для статичных удержаний (например, во время печати)
  function drawFrame(index) {
    index = Math.max(0, Math.min(frameCount - 1, Math.round(index)));
    if (index === currentFrame && lastBlendKey === null) return;
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    currentFrame = index;
    lastBlendKey = null;
    ensureSize(img);
    ctx.globalAlpha = 1;
    ctx.drawImage(img, 0, 0);
  }

  // дробный индекс кадра — рисует соседний кадр поверх текущего с альфой
  // по дробной части, сглаживая переход между дискретными JPEG-кадрами
  function drawFrameBlended(floatIndex) {
    floatIndex = Math.max(0, Math.min(frameCount - 1, floatIndex));
    const lo = Math.floor(floatIndex);
    const hi = Math.min(frameCount - 1, lo + 1);
    const frac = floatIndex - lo;
    const key = lo + '_' + frac.toFixed(3);
    if (key === lastBlendKey) return;
    const imgLo = images[lo];
    if (!imgLo || !imgLo.complete || imgLo.naturalWidth === 0) return;
    lastBlendKey = key;
    currentFrame = lo;
    ensureSize(imgLo);
    ctx.globalAlpha = 1;
    ctx.drawImage(imgLo, 0, 0);
    if (frac > 0.008 && hi !== lo) {
      const imgHi = images[hi];
      if (imgHi && imgHi.complete && imgHi.naturalWidth > 0) {
        ctx.globalAlpha = frac;
        ctx.drawImage(imgHi, 0, 0);
        ctx.globalAlpha = 1;
      }
    }
  }

  function getProgress(scrollPos) {
    const total = sectionEl.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    const p = (scrollPos - sectionEl.offsetTop) / total;
    return Math.max(0, Math.min(1, p));
  }

  function update(scrollPos) {
    const p = getProgress(scrollPos);
    const floatIndex = p * (frameCount - 1);
    drawFrameBlended(floatIndex);
    if (onProgress) onProgress(p, Math.round(floatIndex));
    return p;
  }

  return { update, drawFrame, drawFrameBlended, getProgress, frameCount };
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
const phoneMockScreen = document.getElementById('phoneMockScreen');
const phoneMockName = document.getElementById('phoneMockName');
const phoneMockMessage = document.getElementById('phoneMockMessage');

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
      scrubC.drawFrameBlended(raiseP * (RAISE_FRAMES - 1));
    } else {
      scrubC.drawFrame(SETTLE_FRAME);
    }
  }
});

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
   HERO → SCENE A переход (кроссфейд по первым 100vh скролла)
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
const stopSections = { hero: heroEl, sceneA: sceneAEl, sceneB: sceneBEl, sceneC: sceneCEl, outro: document.getElementById('outro') };

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
   виртуальным значением smoothY. Коэффициент сглаживания считается по
   реально прошедшему времени (performance.now), а не за "тик" — иначе
   при просадке кадров (например, из-за перерисовки канваса) сглаживание
   само становится источником рывков.
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
  scrubB.update(smoothY);
  scrubC.update(smoothY);
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
    scrubB.update(smoothY);
    scrubC.update(smoothY);
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
