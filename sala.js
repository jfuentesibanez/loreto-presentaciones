/* Dinámicas de sala: pizarra, matriz, votos y hoja de cierre. Se guardan en este navegador. */
(() => {
  'use strict';
  const KEY = 'loreto-s1-';
  const load = k => { try { return JSON.parse(localStorage.getItem(KEY + k)) || {}; } catch { return {}; } };
  const save = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

  // Texto editable (pizarra y hoja de cierre)
  document.querySelectorAll('[data-store="pizarra"],[data-store="cierre"]').forEach(box => {
    const name = box.dataset.store, data = load(name);
    box.querySelectorAll('[contenteditable][data-key]').forEach(el => {
      if (data[el.dataset.key] != null) el.innerHTML = data[el.dataset.key];
      el.addEventListener('input', () => { data[el.dataset.key] = el.innerHTML; save(name, data); });
    });
  });

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

  // Votación de casos
  document.querySelectorAll('.votos').forEach(box => {
    const votes = load('votos');
    const paint = b => { const n = votes[b.dataset.id] || 0; b.querySelector('i').textContent = n ? '●'.repeat(Math.min(n, 12)) + (n > 12 ? ` ${n}` : '') : ''; b.classList.toggle('con', n > 0); b.dataset.n = n; };
    box.querySelectorAll('button').forEach(b => {
      paint(b);
      b.addEventListener('click', e => {
        const n = (votes[b.dataset.id] || 0) + (e.shiftKey ? -1 : 1);
        votes[b.dataset.id] = Math.max(0, n); save('votos', votes); paint(b);
      });
    });
  });

  // Copiar resumen
  document.querySelectorAll('[data-copiar]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const txt = el => el.innerText.trim().replace(/\n+/g, ' / ');
      const out = ['GRUPO LORETO · SESIÓN 1 · 13 NOV 2026', ''];
      document.querySelectorAll('.pizarra > div').forEach(d => out.push(`${d.querySelector('b').textContent}: ${txt(d.querySelector('.campo')) || '—'}`));
      out.push('', 'MATRIZ (viabilidad, valor · 0–100)');
      document.querySelectorAll('.matriz .punto').forEach(p => out.push(`${p.innerText.replace(/\s+/g, ' ').trim()}: ${parseFloat(p.style.left).toFixed(0)}, ${parseFloat(p.style.bottom).toFixed(0)}`));
      if (document.querySelector('.votos')) out.push('', 'VOTOS');
      [...document.querySelectorAll('.votos button')].sort((a, b) => b.dataset.n - a.dataset.n)
        .forEach(b => out.push(`${b.dataset.n} · ${b.childNodes[1].textContent.trim()} (${b.querySelector('.area').textContent})`));
      out.push('', 'HOJA DE CIERRE');
      document.querySelectorAll('.cierre tr').forEach((tr, i) => { if (i) out.push([...tr.cells].map(c => txt(c) || '—').join(' | ')); });
      const aviso = btn.parentElement.querySelector('.aviso');
      try { await navigator.clipboard.writeText(out.join('\n')); aviso.textContent = 'Copiado'; }
      catch { aviso.textContent = 'No se pudo copiar'; }
      setTimeout(() => { aviso.textContent = ''; }, 2500);
    });
  });
})();

