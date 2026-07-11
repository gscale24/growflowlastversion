/* ═══════════════════════════════════════════════════════════
   GROW FLOW — интерактивность
   ═══════════════════════════════════════════════════════════ */

/* ─── ТОЧКИ ПОДКЛЮЧЕНИЯ ВИДЕО ───────────────────────────────
   Подставьте URL своих файлов (mp4/webm). Пока строка пустая,
   вместо видео показывается монохромный фолбэк-фон. */
const HERO_VIDEO_URL = "assets/hero.mp4";
const SHOWREEL_VIDEO_URL = "assets/hero.mp4"; // пока то же видео; замените на отдельный шоурил

const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ═══════════ HERO-ВИДЕО ═══════════ */
(function initHeroVideo() {
  if (!HERO_VIDEO_URL) return;
  const video = document.getElementById("hero-video");
  const fallback = document.getElementById("hero-fallback");
  video.src = HERO_VIDEO_URL;
  video.classList.add("is-on");
  fallback.style.display = "none";
  video.play().catch(() => {});
  // если файл не загрузился/кодек не поддержан — возвращаем фолбэк-фон
  video.addEventListener("error", () => {
    video.classList.remove("is-on");
    fallback.style.display = "";
  });
})();

/* ═══════════ ШОУРИЛ: play/pause ═══════════ */
(function initShowreel() {
  const video = document.getElementById("showreel-video");
  const fallback = document.getElementById("showreel-fallback");
  const toggle = document.getElementById("showreel-toggle");
  const label = toggle.querySelector(".showreel__toggle-label");

  if (SHOWREEL_VIDEO_URL) {
    video.src = SHOWREEL_VIDEO_URL;
    video.classList.add("is-on");
    fallback.style.display = "none";
    video.addEventListener("error", () => {
      video.classList.remove("is-on");
      fallback.style.display = "";
    });
  }

  toggle.addEventListener("click", () => {
    if (!SHOWREEL_VIDEO_URL) {
      label.textContent = "Скоро";
      setTimeout(() => (label.textContent = "Play"), 1500);
      return;
    }
    if (video.paused) {
      video.play();
      label.textContent = "Pause";
      toggle.setAttribute("aria-label", "Поставить шоурил на паузу");
    } else {
      video.pause();
      label.textContent = "Play";
      toggle.setAttribute("aria-label", "Воспроизвести шоурил");
    }
  });
})();

/* ═══════════ SCROLL-REVEAL (однократный) ═══════════ */
(function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (prefersReducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el) => io.observe(el));
})();

/* ═══════════ АНИМИРОВАННЫЕ СЧЁТЧИКИ ═══════════ */
(function initCounters() {
  const counters = document.querySelectorAll("[data-count]");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const duration = 1600;
        const start = performance.now();
        (function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          el.textContent = (target * eased).toFixed(decimals);
          if (p < 1) requestAnimationFrame(tick);
        })(start);
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => io.observe(el));
})();

/* ═══════════ ПАРАЛЛАКС (отключён на touch) ═══════════ */
(function initParallax() {
  if (isTouch || prefersReducedMotion) return;
  const layers = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax),
  }));
  if (!layers.length) return;

  let ticking = false;
  function update() {
    const vh = window.innerHeight;
    layers.forEach(({ el, speed }) => {
      const rect = el.getBoundingClientRect();
      // смещение относительно центра вьюпорта
      const offset = (rect.top + rect.height / 2 - vh / 2) * speed;
      el.style.transform = `translateY(${offset.toFixed(1)}px)`;
    });
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
})();

/* ═══════════ КАСТОМНЫЙ КУРСОР (отключён на touch) ═══════════ */
(function initCursor() {
  if (isTouch) return;
  const cursor = document.querySelector(".cursor");
  document.body.classList.add("has-cursor");

  let x = 0, y = 0, cx = 0, cy = 0;
  document.addEventListener("mousemove", (e) => {
    x = e.clientX;
    y = e.clientY;
    cursor.classList.add("is-active");
  });
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));

  (function render() {
    // лёгкое отставание для плавности
    cx += (x - cx) * 0.22;
    cy += (y - cy) * 0.22;
    cursor.style.left = cx + "px";
    cursor.style.top = cy + "px";
    requestAnimationFrame(render);
  })();

  document.querySelectorAll("[data-hover]").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
  });
})();

/* ═══════════ МАГНИТНЫЕ ЭЛЕМЕНТЫ (отключены на touch) ═══════════ */
(function initMagnetic() {
  if (isTouch || prefersReducedMotion) return;
  const STRENGTH = 0.3;
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      el.style.transition = "transform 0.1s ease-out";
      el.style.transform = `translate(${dx * STRENGTH}px, ${dy * STRENGTH}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transition = "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)";
      el.style.transform = "translate(0, 0)";
    });
  });
})();

/* ═══════════ БЕГУЩАЯ СТРОКА: дублируем набор для бесшовности ═══════════ */
(function initMarquee() {
  const track = document.querySelector(".marquee__track");
  track.innerHTML += track.innerHTML;
})();

/* ═══════════ КЕЙСЫ: hover-to-play превью ═══════════ */
(function initTiles() {
  document.querySelectorAll(".tile").forEach((tile) => {
    const url = tile.dataset.video;
    const video = tile.querySelector(".tile__video");
    if (!url) return; // видео не подключено — остаётся плейсхолдер

    let loaded = false;
    tile.addEventListener("mouseenter", () => {
      if (!loaded) {
        video.src = url;
        loaded = true;
      }
      video.play().then(() => video.classList.add("is-playing")).catch(() => {});
    });
    tile.addEventListener("mouseleave", () => {
      video.pause();
      video.currentTime = 0;
      video.classList.remove("is-playing");
    });
  });
})();

/* ═══════════ ФОРМА (плейсхолдер: без бэкенда) ═══════════ */
(function initForm() {
  const form = document.getElementById("contact-form");
  const note = document.getElementById("form-note");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      note.textContent = "Заполните имя и корректный email.";
      return;
    }
    // ПЛЕЙСХОЛДЕР: подключите отправку на свой бэкенд/CRM
    note.textContent = "Спасибо! Заявка отправлена (демо-режим).";
    form.reset();
  });
})();
