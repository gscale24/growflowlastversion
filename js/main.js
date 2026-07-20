// ============ ФОНОВОЕ ВИДЕО HERO ============
// Подставьте URL своего файла (mp4/webm). Пока строка пустая, показывается
// фолбэк-градиент (hero-gradient/hero-noise).
const HERO_VIDEO_URL = "assets/hero.mp4";
(function initHeroVideo(){
  if(!HERO_VIDEO_URL) return;
  const video = document.getElementById('heroVideo');
  const bg = document.querySelector('.hero-bg');
  video.src = HERO_VIDEO_URL;
  video.classList.add('is-on');
  bg.classList.add('has-video');
  video.play().catch(()=>{});
  video.addEventListener('error', ()=>{
    video.classList.remove('is-on');
    bg.classList.remove('has-video');
  });
})();

// ============ INTRO IRIS ============
const iris = document.getElementById('iris');
setTimeout(()=>{ iris.classList.add('done'); document.body.style.overflow='auto'; }, 1500);

// ============ CUSTOM CURSOR ============
const cursorDot = document.getElementById('cursorDot');
window.addEventListener('mousemove', e=>{
  cursorDot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
});
document.querySelectorAll('[data-hover], a, button, .case-card, .team-avatar').forEach(el=>{
  el.addEventListener('mouseenter', ()=>cursorDot.classList.add('hover'));
  el.addEventListener('mouseleave', ()=>cursorDot.classList.remove('hover'));
});

// ============ SCROLL REVEAL ============
const revealEls = document.querySelectorAll('.reveal-up');
const revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
},{ threshold:0.15, rootMargin:'0px 0px -60px 0px' });
revealEls.forEach(el=>revealObserver.observe(el));

// trigger hero reveals immediately after iris closes (they're above the fold)
setTimeout(()=>{
  document.querySelectorAll('.hero .reveal-up').forEach(el=>el.classList.add('is-visible'));
},300);

// ============ HERO PARALLAX ============
const heroBg = document.querySelector('.hero-bg');
let ticking = false;
function onScroll(){
  if(!ticking){
    requestAnimationFrame(()=>{
      const y = window.scrollY;
      if(heroBg){
        const speed = 0.35;
        heroBg.style.transform = `translateY(${y*speed}px)`;
      }
      updateCasesProgress();
      ticking = false;
    });
    ticking = true;
  }
}
window.addEventListener('scroll', onScroll, { passive:true });

// ============ CASES — HORIZONTAL PINNED SCROLL ============
const casesSection = document.getElementById('cases');
const casesTrack = document.getElementById('casesTrack');

function updateCasesProgress(){
  if(!casesSection || !casesTrack) return;
  const rect = casesSection.getBoundingClientRect();
  const sectionHeight = casesSection.offsetHeight;
  const viewportH = window.innerHeight;
  const scrollableDist = sectionHeight - viewportH;
  let progress = (-rect.top) / scrollableDist;
  progress = Math.min(Math.max(progress, 0), 1);

  const trackWidth = casesTrack.scrollWidth;
  const maxTranslate = trackWidth - (window.innerWidth - 96); // account for padding
  const translateX = -progress * Math.max(maxTranslate, 0);
  casesTrack.style.transform = `translateX(${translateX}px)`;
}
window.addEventListener('resize', updateCasesProgress);

// ============ STAT COUNT-UP ============
const statEls = document.querySelectorAll('.stat-num');
const statObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      animateCount(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
},{ threshold:0.5 });
statEls.forEach(el=>statObserver.observe(el));

function animateCount(el){
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimal || '0');
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const startTime = performance.now();

  function tick(now){
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = target * eased;
    el.textContent = prefix + val.toFixed(decimals) + suffix;
    if(t < 1) requestAnimationFrame(tick);
    else el.textContent = prefix + target.toFixed(decimals) + suffix;
  }
  requestAnimationFrame(tick);
}

// ============ FINALE — ANIMATED PARTICLE FIELD ============
const canvas = document.getElementById('finaleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let canvasVisible = false;

function resizeCanvas(){
  canvas.width = canvas.offsetWidth * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}

function initParticles(){
  const count = window.innerWidth < 700 ? 40 : 90;
  particles = Array.from({length:count}, ()=>({
    x: Math.random()*canvas.offsetWidth,
    y: Math.random()*canvas.offsetHeight,
    r: Math.random()*1.6 + 0.4,
    vy: Math.random()*0.25 + 0.05,
    vx: (Math.random()-0.5)*0.15,
    o: Math.random()*0.5 + 0.15
  }));
}

function drawFinale(){
  if(!canvasVisible) return;
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  ctx.clearRect(0,0,w,h);

  const grad = ctx.createRadialGradient(w*0.5,h*0.45,0,w*0.5,h*0.45,w*0.6);
  grad.addColorStop(0,'rgba(201,166,104,0.10)');
  grad.addColorStop(1,'rgba(10,10,10,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,w,h);

  particles.forEach(p=>{
    p.y -= p.vy;
    p.x += p.vx;
    if(p.y < -10){ p.y = h+10; p.x = Math.random()*w; }
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle = `rgba(245,242,234,${p.o})`;
    ctx.fill();
  });

  requestAnimationFrame(drawFinale);
}

const finaleObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    canvasVisible = entry.isIntersecting;
    if(canvasVisible) requestAnimationFrame(drawFinale);
  });
},{ threshold:0.1 });

window.addEventListener('load', ()=>{
  resizeCanvas();
  initParticles();
  updateCasesProgress();
  finaleObserver.observe(document.getElementById('contact'));
});
window.addEventListener('resize', ()=>{ resizeCanvas(); initParticles(); });
