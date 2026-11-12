/* Matriz valor / viabilidad. Las posiciones se guardan en este navegador. */
(() => {
  'use strict';
  const KEY = 'loreto-s1-';
  const load = k => { try { return JSON.parse(localStorage.getItem(KEY + k)) || {}; } catch { return {}; } };
  const save = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

  // Matriz valor / viabilidad: puntos arrastrables
  document.querySelectorAll('.matriz').forEach(m => {
    const pos = load('matriz');
    m.querySelectorAll('.punto').forEach(p => {
      const id = p.dataset.id;
      if (pos[id]) { p.style.left = pos[id][0] + '%'; p.style.bottom = pos[id][1] + '%'; }
      p.addEventListener('pointerdown', e => {
        e.preventDefault(); p.setPointerCapture(e.pointerId); p.classList.add('drag');
        const move = ev => {
          const r = m.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100));
          const y = Math.max(0, Math.min(100, (r.bottom - ev.clientY) / r.height * 100));
          p.style.left = x + '%'; p.style.bottom = y + '%'; pos[id] = [+x.toFixed(1), +y.toFixed(1)];
        };
        const up = () => { p.classList.remove('drag'); save('matriz', pos); p.removeEventListener('pointermove', move); p.removeEventListener('pointerup', up); };
        p.addEventListener('pointermove', move); p.addEventListener('pointerup', up);
      });
    });
  });

})();
