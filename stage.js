/* Controlador de la presentación: teclado, clic, pasos y capítulos. El contenido vive en el HTML. */
(() => {
  'use strict';
  const slides = [...document.querySelectorAll('.slide')];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  let index = -1, viaje = null, motionOff = media.matches, controlsTimer;

  const nav = document.createElement('nav');
  nav.className = 'deck-controls';
  nav.setAttribute('aria-label', 'Controles de la presentación');
  nav.innerHTML = '<button type="button" data-action="prev" aria-label="Anterior" title="Anterior · ←">←</button>'
    + '<button type="button" data-action="next" aria-label="Siguiente" title="Siguiente · →">→</button>'
    + '<button type="button" data-action="chapters" title="Índice · G">Índice</button>'
    + '<button type="button" data-action="motion" title="Animación · M" aria-pressed="true">Animación</button>'
    + '<button type="button" data-action="fullscreen" aria-label="Pantalla completa" title="Pantalla completa · F">⛶</button>'
    + '<button type="button" data-action="help" aria-label="Atajos de teclado" title="Atajos · ?">?</button>';
  document.body.append(nav);
  const status = document.createElement('div');
  status.className = 'deck-status'; status.setAttribute('aria-live', 'polite');
  document.body.append(status);
  const blackout = document.createElement('div');
  blackout.className = 'blackout'; document.body.append(blackout);

  function title(slide, n) {
    const el = slide.querySelector('.gigante,.statement') || slide.querySelector('.kicker,.num');
    const copy = el?.cloneNode(true);
    copy?.querySelectorAll('br').forEach(br => br.replaceWith(' '));
    return slide.dataset.title || copy?.textContent.trim().replace(/\s+/g, ' ') || `Diapositiva ${n + 1}`;
  }
  slides.forEach((slide, n) => {
    slide.setAttribute('role', 'group'); slide.setAttribute('aria-roledescription', 'diapositiva');
    slide.setAttribute('aria-label', `${n + 1} de ${slides.length}: ${title(slide, n)}`);
  });

  function dialog(id, heading) {
    const el = document.createElement('dialog'); el.className = 'deck-dialog'; el.id = id;
    el.innerHTML = `<div class="dialog-head"><h2>${heading}</h2><button type="button" data-close>Cerrar · Esc</button></div>`;
    el.querySelector('[data-close]').addEventListener('click', () => el.close());
    document.body.append(el); return el;
  }
  const chapters = dialog('chapters', 'Índice');
  const links = document.createElement('div'); links.className = 'chapter-links';
  slides.forEach((slide, n) => {
    if (!slide.dataset.chapter) return;
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = `<span class="ch"></span><span class="pg">${String(n + 1).padStart(2, '0')}</span>`; b.querySelector('.ch').textContent = slide.dataset.chapter;
    b.addEventListener('click', () => { chapters.close(); go(n); }); links.append(b);
  });
  chapters.append(links);
  const jump = document.createElement('form'); jump.className = 'jump-form';
  jump.innerHTML = `<label for="slide-number">Ir a la diapositiva</label><input id="slide-number" type="number" min="1" max="${slides.length}" required value="1"><span>de ${slides.length}</span><button type="submit">Ir →</button>`;
  jump.addEventListener('submit', e => { e.preventDefault(); if (jump.reportValidity()) { chapters.close(); go(Number(jump.querySelector('input').value) - 1); } });
  chapters.append(jump);
  const help = dialog('shortcuts', 'Atajos del presentador');
  help.insertAdjacentHTML('beforeend', '<dl class="shortcuts"><dt>→ / Espacio</dt><dd>Siguiente paso o diapositiva</dd><dt>←</dt><dd>Paso o diapositiva anterior</dd><dt>Inicio / Fin</dt><dd>Primera / última</dd><dt>G</dt><dd>Índice y salto a una diapositiva</dd><dt>F</dt><dd>Pantalla completa</dd><dt>B / .</dt><dd>Pantalla en negro</dd><dt>M</dt><dd>Animación sí / no</dd><dt>Clic</dt><dd>Derecha: avanza. 20 % izquierdo: retrocede.</dd></dl>');

  /* Máquina del tiempo: escena 3D o, sin animación, secuencia de imágenes */
  const travelSlide = slides.find(s => s.classList.contains('viaje'));
  const fallback = document.createElement('div'); fallback.className = 'travel-fallback';
  travelSlide?.append(fallback);
  const eras = [['2026', 'city'], ['1750', 'ship'], ['12.000 a. C.', 'wheat'], ['100.000 a. C.', 'fire'], ['2026', 'city'], ['2045', 'future']];
  let eraIndex = 0, webglFailed = false;
  if (travelSlide) [...new Set(eras.map(e => e[1]))].forEach(n => { new Image().src = `img/viaje-${n}.jpg`; });
  function paintEra() {
    fallback.textContent = eras[eraIndex][0];
    fallback.style.backgroundImage = `linear-gradient(0deg,#0d1a1fbb,#0d1a1f55),url('img/viaje-${eras[eraIndex][1]}.jpg')`;
  }
  function enterTravel() {
    if (!travelSlide) return;
    if (motionOff || webglFailed || !window.THREE || !window.initViaje) { travelSlide.classList.add('fallback'); paintEra(); return; }
    try { if (!viaje) viaje = window.initViaje(travelSlide); travelSlide.classList.remove('fallback'); viaje.enter(); }
    catch (error) { webglFailed = true; travelSlide.classList.add('fallback'); paintEra(); console.warn('Máquina del tiempo sin 3D; se usan imágenes.', error); }
  }

  function setMotion(off) {
    motionOff = off; root.classList.toggle('motion-off', off);
    const b = nav.querySelector('[data-action="motion"]'); b.setAttribute('aria-pressed', String(!off));
    b.textContent = off ? 'Sin animación' : 'Animación';
    if (travelSlide && slides[index] === travelSlide) { if (viaje) viaje.leave(); enterTravel(); }
  }
  media.addEventListener('change', e => setMotion(e.matches));
  setMotion(motionOff);

  function go(n, updateHash = true) {
    n = Math.max(0, Math.min(slides.length - 1, Math.floor(n)));
    if (!Number.isFinite(n) || n === index) return;
    if (viaje && slides[index] === travelSlide) viaje.leave();
    index = n;
    slides.forEach((s, k) => { s.classList.toggle('on', k === index); s.setAttribute('aria-hidden', String(k !== index)); s.inert = k !== index; });
    const s = slides[index];
    document.body.classList.toggle('light-slide', s.matches('.chapter,.question,.future:not(.travel-photo)'));
    if (s === travelSlide) enterTravel();
    document.getElementById('barra').style.width = `${(index + 1) / slides.length * 100}%`;
    document.getElementById('pag').textContent = `${String(index + 1).padStart(2, '0')} / ${slides.length}`;
    status.textContent = `Diapositiva ${index + 1} de ${slides.length}. ${title(s, index)}`;
    jump.querySelector('input').value = index + 1;
    if (updateHash && location.hash !== `#${index + 1}`) history.replaceState(null, '', `#${index + 1}`);
  }
  function step(dir) {
    const steps = [...slides[index].querySelectorAll('.step')];
    if (!steps.length) return false;
    const target = dir > 0 ? steps.find(s => !s.classList.contains('on')) : steps.reverse().find(s => s.classList.contains('on'));
    if (!target) return false;
    target.classList.toggle('on', dir > 0); return true;
  }
  function advance(dir) {
    if (travelSlide && slides[index] === travelSlide) {
      if (travelSlide.classList.contains('fallback')) {
        const next = eraIndex + dir;
        if (next >= 0 && next < eras.length) { eraIndex = next; paintEra(); return; }
      } else if (viaje && viaje.handle(dir)) return;
    }
    if (!step(dir)) go(index + dir);
  }
  function showControls() {
    document.body.classList.add('controls-visible'); clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => document.body.classList.remove('controls-visible'), 2200);
  }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.requestFullscreen(); }
    catch { status.textContent = 'Usa el modo de pantalla completa del navegador.'; }
  }
  nav.addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.action;
    if (a === 'prev') advance(-1); if (a === 'next') advance(1);
    if (a === 'chapters') chapters.showModal(); if (a === 'help') help.showModal();
    if (a === 'motion') setMotion(!motionOff); if (a === 'fullscreen') fullscreen();
  });
  document.addEventListener('keydown', e => {
    if (e.target.isContentEditable) { if (e.key === 'Escape') e.target.blur(); return; }
    if (chapters.open || help.open || e.target.closest('input,textarea,select') || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if (e.target.closest('button') && [' ', 'Enter'].includes(e.key)) return;
    if (document.body.classList.contains('is-blackout')) { if (['b', 'B', '.', 'Escape'].includes(e.key)) document.body.classList.remove('is-blackout'); return; }
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); advance(1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); advance(-1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); }
    else if (e.key.toLowerCase() === 'f') fullscreen();
    else if (e.key.toLowerCase() === 'g') chapters.showModal();
    else if (e.key.toLowerCase() === 'm') setMotion(!motionOff);
    else if (['b', 'B', '.'].includes(e.key)) document.body.classList.add('is-blackout');
    else if (e.key === '?') help.showModal();
  });
  document.addEventListener('click', e => {
    if (e.target.closest('button,a,input,dialog,nav,[contenteditable],.punto,.matriz,.pizarra') || chapters.open || help.open) return;
    if (document.body.classList.contains('is-blackout')) { document.body.classList.remove('is-blackout'); return; }
    advance(e.clientX < innerWidth * .2 ? -1 : 1);
  });
  document.addEventListener('pointermove', showControls, { passive: true });
  document.addEventListener('focusin', showControls);
  const fromHash = () => { const h = location.hash.slice(1); go(/^\d+$/.test(h) ? Number(h) - 1 : 0); };
  window.addEventListener('hashchange', fromHash);
  document.addEventListener('visibilitychange', () => {
    if (!viaje || slides[index] !== travelSlide) return;
    if (document.hidden) viaje.leave(); else if (!motionOff) viaje.enter();
  });
  fromHash();
})();

