/* ============ ТОЧКИ ПОДКЛЮЧЕНИЯ МЕДИА ============
   Hero-видео + живое видео «Знакомства» (короткий зацикленный план,
   обычный <video>, не покадровая секвенция — см. README). Остальные
   секции идут обычным потоком без картинки, фон переключают
   [data-theme]. */
const HERO_VIDEO_URL = "assets/hero.mp4";
const INTRO_VIDEO_URL = "assets/intro.mp4";

// поднято сюда, к самому началу файла — раньше жило только рядом с
// параллаксом «Кейсов», но параллакс «Знакомства» (ниже) нужен куда
// раньше по коду и на этих же трёх флагах: тач-устройства (pointer:
// coarse) и prefers-reduced-motion гасят декоративный параллакс везде
// на странице одинаково, а не по месту использования
const prefersCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const prefersNoParallax = prefersCoarsePointer || prefersReducedMotion;

/* ==================================================================
   ПРЕЛОАДЕР — раньше копился по кадрам «Знакомства» поштучно (см.
   историю makeCoverScrubber) и оправданно ждал их все: без этого
   первый проход покадрового скраббинга дёргался бы на недогруженных
   кадрах. Сейчас там живое видео, которое грузится и буферизуется
   само, без участия прелоадера (тот же принцип, что и у hero-видео,
   которое прелоадер никогда не ждал) — специально устраивать этому
   видео отдельный gate не нужно и рискованно: одно-единственное
   событие (loadeddata) как обязательное условие — точка отказа, если
   оно почему-то не придёт (ошибка кодека, сеть) страница держала бы
   пользователя на заставке до общего таймаута. finishPreloader теперь
   вызывается сразу, с минимальной задержкой ради самого бренд-момента
   (полоса успевает мигнуть, а не исчезнуть до первого кадра отрисовки)
   ================================================================== */
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
setTimeout(finishPreloader, 400);
// подстраховка на случай, если даже этот короткий таймер не выполнился
// (вкладка в фоне, где таймеры троттлятся) — не держим прелоадер вечно
setTimeout(finishPreloader, 4000);

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
   ЗНАКОМСТВО — живое видео на весь экран (object-fit: cover через CSS,
   не canvas). Раньше это был единственный на сайте покадровый
   скролл-скраббинг (см. историю в README) — заменён на обычный
   зацикленный <video>: играет по своей внутренней раскадровке, не по
   позиции скролла (тот же приём, что и в hero) — но поверх этого ещё
   лёгкий параллакс самого кадра относительно скролла, см.
   updateIntroParallax ниже.
   ================================================================== */
const introVideoEl = document.getElementById('introVideo');
const introCopy = document.getElementById('introCopy');
(function initIntroVideo() {
  if (!introVideoEl || !INTRO_VIDEO_URL) return;
  introVideoEl.src = INTRO_VIDEO_URL;
})();

// стык предыдущей секции → «Знакомство» (сейчас это Услуги, но код не
// завязан на конкретного соседа): без этого видео с первым же пикселем
// в вьюпорте уже стоит в полной яркости — это читается как щелчок, а не
// переход. rootMargin с большим отступом снизу срабатывает, пока секция
// ещё на ~40% высоты экрана ниже вьюпорта — за время transition (см.
// .intro-sticky .intro-video в css/style.css) видео успевает выйти на
// полную непрозрачность раньше, чем пользователь долистает до самого
// пина, поэтому сам момент прилипания уже ничем не выделяется на глаз.
// Разовый триггер, как и у остальных .reveal-block на странице — дальше
// не трогаем. Текст (introCopy) и запуск воспроизведения видео теперь
// висят на этом же триггере — раньше текст ждал, пока скролл-прогресс
// покадрового скраббинга дойдёт до конкретного кадра (руки на
// клавиатуре), сейчас прогресса такого рода нет: видео просто играет на
// своей внутренней раскадровке, не на позиции скролла
const introRevealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      introVideoEl.play().catch(() => {});
      introCopy.classList.add('is-visible');
      introRevealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px 40% 0px' });
introRevealObserver.observe(document.querySelector('.intro-sticky'));

// параллакс видео «Знакомства» — та же идея, что и у карточек «Кейсов»
// (updateCasesParallax ниже): видео едет чуть медленнее/иначе, чем сам
// скролл, создавая ощущение глубины (текст и тонировка — в обычном
// потоке страницы, никуда не сдвигаются). Секция pinned ровно на
// intro-scene.offsetHeight - 100vh пикселей скролла (см. .intro-scene в
// css/style.css) — прогресс считается от этого же диапазона: 0 в
// момент прилипания, 1 перед самым отлипанием. .intro-video специально
// на 12% выше/шире своей обёртки (см. css/style.css) — translateY в
// пределах ±INTRO_PARALLAX_PX/2 никогда не оголяет край кадра.
// Не гейтится на loadedmetadata/что-либо ещё — это transform самого
// <video>, воспроизведение и позиционирование кадра друг другу не мешают
const introSceneEl = document.getElementById('sceneA');
const INTRO_PARALLAX_PX = 70;
let introSceneTop = 0, introSceneTotal = 0;
function measureIntroScene() {
  if (!introSceneEl) return;
  const rect = introSceneEl.getBoundingClientRect();
  introSceneTop = rect.top + window.scrollY;
  introSceneTotal = introSceneEl.offsetHeight - window.innerHeight;
}
function updateIntroParallax(scrollPos) {
  if (prefersNoParallax || !introVideoEl || introSceneTotal <= 0) return;
  const progress = Math.max(0, Math.min(1, (scrollPos - introSceneTop) / introSceneTotal));
  const offset = (progress - 0.5) * INTRO_PARALLAX_PX;
  introVideoEl.style.transform = `translateY(${offset.toFixed(1)}px)`;
}
if (!prefersNoParallax) {
  measureIntroScene();
  window.addEventListener('resize', measureIntroScene);
  window.addEventListener('load', measureIntroScene);
}

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
const serviceVisuals = Array.from(document.querySelectorAll('.service-visual'));
// границы всей группы «Услуг» — .service-visual (position:fixed на весь
// экран) обязан гаснуть за её пределами, иначе currentService, однажды
// выставленный последней услугой, так и остался бы navigation ссылкой
// без сброса, и полноэкранная картинка Продакшна осталась бы висеть
// поверх «Кейсов»/«Контактов»
const servicesGroupEl = document.getElementById('sceneB');
const servicesExitVeilEl = document.querySelector('.services-exit-veil');
let servicesTop = 0, servicesBottom = 0;
function measureServicesBounds() {
  servicesTop = servicesGroupEl.getBoundingClientRect().top + window.scrollY;
  servicesBottom = servicesTop + servicesGroupEl.offsetHeight;
}
measureServicesBounds();
window.addEventListener('resize', measureServicesBounds);
window.addEventListener('load', measureServicesBounds);

// hero-pin (см. .hero-pin в css/style.css) — «Начало» стоит на месте, пока
// «Услуги» выезжают поверх него снизу как шторка/ящик, и полностью
// закрывают его только когда вся 150vh-распорка hero-pin прокручена.
// currentService по чистой математике центра вьюпорта мог стать 'smm' ещё
// на середине этого выезда — экран в этот момент реально наполовину hero,
// наполовину «Услуги» (см. скриншот бага), а .service-visual (fixed) уже
// понятия не имеет об этой шторке и просто рисуется поверх всего. Порог
// heroPinBottom не даёт полноэкранной картинке появиться, пока «Начало»
// физически не скрылось целиком.
const heroPinEl = document.querySelector('.hero-pin');
let heroPinBottom = 0;
function measureHeroPin() {
  heroPinBottom = heroPinEl.getBoundingClientRect().top + window.scrollY + heroPinEl.offsetHeight;
}
measureHeroPin();
window.addEventListener('resize', measureHeroPin);
window.addEventListener('load', measureHeroPin);

// цветовые опоры тем — те же значения, что раньше жили в [data-theme] CSS
// services — отдельная от light опора специально для «Услуг»: те же
// нейтральные светлые тона, но подобранные под серую студийную подложку
// предметных анимаций (см. .service-visual), а не под тёплый кремовый
// light, которым по-прежнему остаются Контакты/Футер. Без этого на стыке
// текстовой колонки и полноэкранной картинки был шов — два разных
// материала на одном экране; так фон страницы и есть фон картинки.
const THEME_RGB = {
  light: { bg: [242, 239, 231], fg: [12, 11, 9], fgDim: [109, 104, 92], line: [12, 11, 9], lineA: 0.16, accent: [12, 11, 9] },
  services: { bg: [194, 194, 197], fg: [17, 17, 17], fgDim: [72, 71, 74], line: [17, 17, 17], lineA: 0.14, accent: [17, 17, 17] },
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

  // полноэкранная картинка услуги — НЕ на сглаженном scrollPos, а на
  // "сырой" window.scrollY. При быстрой прокрутке smoothY (полупериод
  // сглаживания 80мс) заметно отстаёт от реального скролла — для
  // плавно едущего фона это незаметно, а вот .service-visual, будучи
  // fixed на весь экран, при таком отставании оставался виден ПОВЕРХ
  // уже прокрученной сцены «Знакомство»: экран реально проехал в тёмную
  // сцену, а лагающий JS ещё считал, что активна услуга — отсюда
  // призрачное наложение картинки услуги на уже открывшуюся сцену.
  const rawScrollY = window.scrollY;
  const rawCenter = rawScrollY + window.innerHeight / 2;
  let currentServiceRaw = null;
  for (const s of themeSections) {
    if (s.docTop <= rawCenter) { if (s.service) currentServiceRaw = s.service; }
    else break;
  }
  // insideServices гасит все четыре, как только «Услуги» вообще ушли за
  // пределы вьюпорта — иначе currentServiceRaw, однажды выставленный,
  // остался бы висеть и поверх «Кейсов»/«Контактов». Верхняя граница —
  // rawScrollY, а не rawCenter (см. heroPinBottom ниже): «Знакомство»
  // сразу после «Услуг» — pinned-секция (.intro-sticky, position:sticky
  // top:0), которая реально закрывает экран целиком только когда верх
  // её 320vh-контейнера доскроллил до верха вьюпорта, т.е. когда
  // rawScrollY достиг servicesBottom. Если гасить картинку услуги по
  // rawCenter (раньше на пол-экрана вьюпорта), между её мгновенным
  // исчезновением и полным "прилипанием" следующей сцены остаётся
  // честная пустота: сверху — голый фон, снизу — ещё не прилипший край
  // канваса «Знакомства» (тот самый скриншот-баг с пустым верхом и
  // тёмным столом только внизу кадра)
  const insideServices = rawCenter >= servicesTop && rawScrollY < servicesBottom && rawScrollY >= heroPinBottom;
  // последняя услуга — не мгновенный .is-out на самой границе группы, а
  // ПОСТЕПЕННОЕ угасание в последние EXIT_FADE_PX перед ней, напрямую
  // функцией rawScrollY (не CSS-transition — inline opacity считается
  // каждый тик и не может отстать при быстрой прокрутке, та же техника,
  // что и у дробного кросс-фейда кадров в updateServiceScrub). К этому
  // моменту «Знакомство» под ней уже полностью прогрето и видно на всю
  // непрозрачность (см. introRevealObserver, огромный rootMargin), так
  // что угасание — настоящий кросс-фейд в готовую сцену, а не в пустоту.
  // Раньше здесь тоже был мгновенный обрыв — картинка последней услуги
  // просто "стояла" статично до самой границы, а следом сразу щёлкала в
  // «Знакомство»; фидбек был в том, что этот статичный хвост (кадр уже
  // не меняется, текста рядом тоже нет — см. .service-block-inner, он
  // в потоке и уходит из вьюпорта раньше, чем фиксированная картинка)
  // читался как пустой обрыв, а не как продуманный переход
  const EXIT_FADE_PX = 480;
  const VEIL_PEAK = 0.94;
  const lastServiceKey = serviceVisuals[serviceVisuals.length - 1]?.dataset.service;
  serviceVisuals.forEach((v) => {
    const isCurrent = insideServices && v.dataset.service === currentServiceRaw;
    v.classList.toggle('is-active', isCurrent);
    // .is-out — мгновенное (без transition) гашение строго при выходе
    // из всей группы «Услуг»: плавный кросс-фейд там, где он уместен —
    // между соседними услугами внутри группы, а не когда сцена целиком
    // сменилась на «Кейсы»/«Контакты» через любой другой путь (клавиша
    // Home/End, якорная ссылка) — там угасание успевало бы "просвечивать"
    // поверх уже начавшейся следующей секции. Для самой последней услуги
    // этот путь и так уже закрыт постепенным угасанием выше — .is-out
    // здесь просто гарантирует финальный 0, а не начинает его
    v.classList.toggle('is-out', !insideServices);
    if (isCurrent && v.dataset.service === lastServiceKey) {
      const distToEnd = servicesBottom - rawScrollY;
      if (distToEnd < EXIT_FADE_PX) {
        v.style.transition = 'none';
        v.style.opacity = Math.max(0, Math.min(1, distToEnd / EXIT_FADE_PX));
      } else {
        v.style.transition = '';
        v.style.opacity = '';
      }
    } else {
      v.style.transition = '';
      v.style.opacity = '';
    }
  });
  // «нырок в чёрное» на стыке с «Знакомством» — не сам кросс-фейд картинки
  // (это уже даёт угасание выше), а самостоятельный слой поверх обеих
  // сцен. Раньше это была симметричная волна с пиком РОВНО на границе —
  // темнота нарастала и сразу же начинала рассеиваться в одной и той же
  // точке, картинка следующей сцены проступала одновременно с пиком
  // черноты. Это не читалось как "уже стемнело, и из темноты выпадает
  // Знакомство" — скорее как обычный, просто более широкий кросс-фейд.
  // Сейчас — несимметричная огибающая с настоящим плато: чернота
  // нарастает ЗАРАНЕЕ и полностью держится (VEIL_PEAK) весь стык внутри
  // ПОКА услуга ещё показана, спадает же куда дольше и только ПОСЛЕ —
  // «Знакомство» реально проявляется уже из готовой темноты, а не
  // одновременно с ней. veilRise/veilHold/veilFall — три сегмента
  // signed-расстояния rawScrollY − servicesBottom (отрицательное —
  // подход, положительное — уже после стыка)
  if (servicesExitVeilEl) {
    const d = rawScrollY - servicesBottom;
    const RISE_START = -1150, PEAK_START = -350, PEAK_END = 200, FALL_END = 1000;
    let veilT;
    if (d <= RISE_START || d >= FALL_END) veilT = 0;
    else if (d < PEAK_START) veilT = smoothstep((d - RISE_START) / (PEAK_START - RISE_START));
    else if (d <= PEAK_END) veilT = 1;
    else veilT = 1 - smoothstep((d - PEAK_END) / (FALL_END - PEAK_END));
    servicesExitVeilEl.style.opacity = veilT * VEIL_PEAK;
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

/* ==================================================================
   УСЛУГИ — предметная картинка каждой услуги анимирована покадровой
   секвенцией (assets/frames/<key>/f_NNN.jpg), кадр строго завязан на
   прогресс скролла — не автовоспроизведение, а честный скраббинг, тот
   же принцип, что и у сцены «Знакомство» (makeCoverScrubber). Тримы и
   число кадров под каждый ролик подобраны по факту происходящего в нём:
   SEO — цикл покачивания на весь ролик; Таргет и Продакшн обрезаны до
   момента попадания стрелы / выхода лампочки на пик яркости; SMM —
   только последние 2 секунды исходного 10-секундного ролика (логотипы
   уже почти собрались во фронтальный вид) — на всём ролике вращение
   было слишком бурным и читалось как мельтешение, а не как курируемое
   движение. Кадры весят
   на порядок меньше вырезанного видео (нет теряющегося на статичной
   сцене межкадрового сжатия), а произвольный доступ к любому кадру —
   то, чего от сжатого H.264-потока с одним ключевым кадром на весь
   ролик получить не выйдет.

   Прогресс считается от "активного окна" конкретной услуги — того же
   самого промежутка, на который завязана подсветка вкладки и currentService
   в updateTheme ниже: 0 — сервис только что стал текущим (его .service-block
   докрутился до центра вьюпорта), 1 — вот-вот станет текущим следующий.
   Ровно тот же промежуток, что и у полноэкранной картинки (.service-visual,
   см. updateTheme и css/style.css) — оба гарантированно синхронны, потому
   что оба меряются от одних и тех же .service-block. */
const SERVICE_SCRUB_FRAMES = { smm: 40, target: 57, seo: 40, production: 40 };
// доля своего "активного окна" (0..1), за которую анимация обязана
// доиграть до последнего кадра и дальше держать его неподвижным. По
// умолчанию (production и SEO) это 1 — доигрывает весь путь, вплоть до
// передачи следующей услуге. Таргет и SMM снимают этот путь раньше
// (0.315 и 0.6) осознанно — у обоих есть настоящая кульминация (стрела
// внутри мишени, логотипы сошлись во фронтальный вид), и застывший на
// ней последний кадр читается как результат, а не как обрыв. У лупы
// (SEO) в исходнике нет такой кульминации — это ровный, одинаковый по
// скорости на всём протяжении поворот камеры без финальной "точки";
// пробовали снять её тем же приёмом (settle 0.55), но остановка
// картинки за 45% активного окна ДО конца карточки читалась не как
// "досняли", а как зависший/сломанный скролл — упёрлись в тишину, пока
// сама услуга ещё далеко не дочитана. Растянуть на весь путь (как
// Продакшн) для этого конкретного ролика ближе к правде: кадр меняется
// на всём протяжении чтения, никогда не стоит слепым остатком
const SERVICE_SCRUB_SETTLE = { smm: 0.6, target: 0.315 };
function serviceFramePath(key, i) {
  return `assets/frames/${key}/f_${String(i + 1).padStart(3, '0')}.jpg`;
}
const serviceScrubEls = Array.from(document.querySelectorAll('.service-block')).map((block) => {
  const frameImgs = block.querySelectorAll('.service-visual-frame');
  const img = frameImgs[0];
  const imgNext = frameImgs[1];
  const key = img && img.dataset.frames;
  const count = key ? SERVICE_SCRUB_FRAMES[key] : 0;
  return count ? { block, img, imgNext, key, count, warmed: false, top: 0, height: 0, lastIndex: 0, lastNextIndex: -1 } : null;
}).filter(Boolean);

function measureServiceScrub() {
  serviceScrubEls.forEach((s) => {
    const rect = s.block.getBoundingClientRect();
    s.top = rect.top + window.scrollY;
    s.height = rect.height;
  });
}
measureServiceScrub();
window.addEventListener('resize', measureServiceScrub);
window.addEventListener('load', measureServiceScrub);

// прогрев кэша браузера кадрами конкретного блока — заранее, с большим
// запасом по вьюпорту (см. serviceWarmupObserver ниже), а не в момент,
// когда блок реально показался: без запаса первый проход скролла по ещё
// не долетевшим по сети кадрам дёргался бы (пустой/наполовину
// прогруженный кадр — ровно то, что было видно на скриншотах бага).
// Каждый Image() держим — не только чтобы браузер закинул байты в кэш,
// но и чтобы updateServiceScrub мог спросить именно у ЭТОГО объекта,
// правда ли конкретный кадр уже дозагрузился (.complete)
function warmServiceFrames(s) {
  if (s.warmed) return;
  s.warmed = true;
  s.frameImgs = new Array(s.count);
  for (let i = 0; i < s.count; i++) {
    const im = new Image();
    im.src = serviceFramePath(s.key, i);
    s.frameImgs[i] = im;
  }
}
// первая услуга — прогреваем сразу, без ожидания приближения к вьюпорту:
// её и так видно почти сразу после hero, ждать пересечения смысла нет
if (serviceScrubEls[0]) warmServiceFrames(serviceScrubEls[0]);

// не гейтится prefersNoParallax/prefersReducedMotion — не автопроигрывание
// и не декоративный параллакс, а прямое отражение прокрутки: кадр всегда
// 1:1 со скроллом пользователя.
// Читает window.scrollY напрямую, а не сглаженный smoothY (в отличие от
// большинства других update-функций) — та же причина, что и у
// insideServices в updateTheme: скрабу нужна точность к реальному
// скроллу, а не эффект "картинка ещё доезжает" при быстрой прокрутке
//
// Кадр держится не одним <img>, а парой (см. .service-visual-frame.is-next
// в css/style.css): базовый показывает floor(pos), верхний — ceil(pos) и
// кросс-фейдит поверх него по дробной части pos. На стыке, когда base
// увеличивается на 1, верхний слой как раз доходит до полной
// непрозрачности с тем же кадром — переключение происходит визуально
// незаметно, кадры перетекают один в другой, а не "щёлкают". Раньше
// показывался ровно один кадр на Math.round(progress) — с 40 кадрами на
// текст-высоту блока это давало заметный покадровый "степ", особенно
// там, где само движение в исходнике и без того тонкое (лупа SEO)
//
// У лупы этого всё равно оказалось мало: сам ролик — почти статичный,
// едва заметный поворот камеры (см. README), так что даже кросс-фейд
// между двумя почти одинаковыми кадрами не читается как "движение,
// откликающееся на скролл" — глазу не за что зацепиться. SERVICE_SCRUB_ZOOM
// добавляет отдельный, синтетический слой движения поверх реальных
// кадров — плавный scale() на сам <img>, напрямую от progress (0..1 на
// всё активное окно, без привязки к settle/кадрам). Это transform, а не
// смена кадра — никаких дискретных шагов в принципе, честная
// суб-пиксельная плавность на любой скорости скролла, ровно то, чего не
// может дать никакая перетасовка 40 реальных кадров
const SERVICE_SCRUB_ZOOM = { seo: 0.06 };
function updateServiceScrub() {
  const center = window.scrollY + window.innerHeight / 2;
  serviceScrubEls.forEach((s) => {
    const settle = SERVICE_SCRUB_SETTLE[s.key] ?? 1;
    const raw = (center - s.top) / s.height;
    const progress = Math.max(0, Math.min(1, raw / settle));
    const pos = progress * (s.count - 1);
    const baseIdx = Math.floor(pos);
    const nextIdx = Math.min(s.count - 1, baseIdx + 1);
    const frac = pos - baseIdx;
    // кадр показываем только если он реально уже дозагрузился — иначе
    // оставляем на экране последний успешно показанный (не дёргаем на
    // пустой/битый src в процессе догрузки, см. warmServiceFrames выше)
    if (baseIdx !== s.lastIndex) {
      const im = s.frameImgs && s.frameImgs[baseIdx];
      if (im && im.complete && im.naturalWidth) {
        s.lastIndex = baseIdx;
        s.img.src = im.src;
      }
    }
    if (nextIdx !== s.lastNextIndex) {
      const imNext = s.frameImgs && s.frameImgs[nextIdx];
      if (imNext && imNext.complete && imNext.naturalWidth) {
        s.lastNextIndex = nextIdx;
        s.imgNext.src = imNext.src;
      }
    }
    // без transition — привязка к скроллу должна быть жёсткой, 1:1
    s.imgNext.style.opacity = frac;
    const zoomAmt = SERVICE_SCRUB_ZOOM[s.key];
    if (zoomAmt) {
      const scaleRaw = (center - s.top) / s.height;
      const scaleProgress = Math.max(0, Math.min(1, scaleRaw));
      const t = `scale(${(1 + scaleProgress * zoomAmt).toFixed(4)})`;
      s.img.style.transform = t;
      s.imgNext.style.transform = t;
    }
  });
}

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

// прогрев кадров — отдельный наблюдатель с большим запасом (rootMargin
// растягивает зону пересечения на целый вьюпорт до и после блока), не
// завязан на serviceRevealObserver специально: тому нужен узкий, точный
// порог под сам эффект появления текста, а прогреву сети наоборот нужно
// как можно больше форы, чтобы кадры успели догрузиться из сети раньше,
// чем реально понадобятся
const serviceWarmupObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const s = serviceScrubEls.find((x) => x.block === entry.target);
    if (s) warmServiceFrames(s);
  });
}, { rootMargin: '100% 0px 100% 0px' });
document.querySelectorAll('.service-block').forEach((el) => serviceWarmupObserver.observe(el));

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
// (prefersCoarsePointer/prefersReducedMotion/prefersNoParallax — в самом
// начале файла, общие на весь скролл-параллакс страницы)
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

const heroEl = document.getElementById('hero');
// раньше тут был кроссфейд hero по первым 100vh скролла (updateHero) —
// убран вместе с переходом hero на position:sticky (см. .hero-pin в
// css/style.css): «Начало» больше не тает само, оно неподвижно стоит
// на месте, пока «Услуги» выезжают поверх него как карточка/ящик —
// переход несёт эта визуальная накладка, а не угасание hero

/* ==================================================================
   ИНДИКАТОР ПРОГРЕССА ПО СТРАНИЦЕ
   ================================================================== */
const progressFill = document.getElementById('progressFill');
const railStops = Array.from(document.querySelectorAll('.progress-rail-stops li'));
// порядок ключей значим: activeKey ниже — это последняя пройденная
// опора, поэтому объект должен идти в реальном порядке разделов в
// документе (сейчас — Знакомство после Услуг, не сразу после hero)
const stopSections = {
  hero: heroEl,
  sceneB: document.getElementById('sceneB'),
  sceneA: document.getElementById('sceneA'),
  work: document.getElementById('work'),
  sceneC: document.getElementById('sceneC'),
};

// у большинства опор рейл заранее (за полэкрана) подсвечивает следующую
// секцию — уместно для простого индикатора чтения. Но sceneA
// («Знакомство») сразу после «Услуг» — pinned-сцена, которая реально
// закрывает экран только когда сам rawScrollY (не с запасом в полэкрана)
// доскроллил до её верха: та же причина, что и у insideServices выше.
// Если подсвечивать «Знакомство» на полэкрана раньше, рейл показывает
// один раздел, пока во весь экран ещё стоит картинка последней услуги —
// заметный разнобой сигналов на самом стыке
const RAIL_LEAD_FRACTION = { sceneA: 0 };
function updateProgressRail(scrollPos) {
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const overall = docHeight > 0 ? scrollPos / docHeight : 0;
  progressFill.style.height = Math.min(100, Math.max(0, overall * 100)) + '%';

  let activeKey = 'hero';
  Object.entries(stopSections).forEach(([key, el]) => {
    const lead = RAIL_LEAD_FRACTION[key] ?? 0.5;
    if (scrollPos >= el.offsetTop - window.innerHeight * lead) activeKey = key;
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
const SMOOTH_HALFLIFE_MS = 80; // за это время разрыв между smoothY и целью уменьшается вдвое
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

  updateServiceScrub();
  updateIntroParallax(smoothY);
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
    updateServiceScrub();
    updateIntroParallax(smoothY);
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
