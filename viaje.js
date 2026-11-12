// Máquina del tiempo (Tim Urban), adaptada de la sesión de Ferrovial con la paleta de Loreto
window.VIAJE_PHOTOS = {
  fire: 'img/viaje-fire.jpg',
  wheat: 'img/viaje-wheat.jpg',
  ship: 'img/viaje-ship.jpg',
  city: 'img/viaje-city.jpg',
  future: 'img/viaje-future.jpg'
};
window.initViaje = function (slideEl) {
  const COL = { bg: 0x0d1a1f, acento: 0x5fc6dc, papel: 0xf6f5f1, gris: 0x5b6f75 };
  const PHOTOS = window.VIAJE_PHOTOS;

  const ERAS = [
    { id: 'm100000', x: -760, year: -100000, label: '100.000 a. C.', photo: 'fire' },
    { id: 'm12000',  x: -410, year: -12000,  label: '12.000 a. C.',  photo: 'wheat' },
    { id: 'y1750',   x: -155, year: 1750,    label: '1750',       photo: 'ship' },
    { id: 'y2026',   x: 0,    year: 2026,    label: '2026',       photo: 'city' },
    { id: 'y2045',   x: 75,   year: 2045,    label: '2045',       photo: 'future' }
  ];
  const byId = {}; ERAS.forEach(e => byId[e.id] = e);
  const SEQUENCE = ['y2026', 'y1750', 'm12000', 'm100000', 'y2026', 'y2045'];

  function fmtYear(y) {
    const v = Math.round(y);
    const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (v <= 0) return miles(Math.abs(v)) + ' a. C.';
    return v < 10000 ? String(v) : miles(v);
  }

  // ---- DOM ----
  const canvas = slideEl.querySelector('canvas');
  const yearValue = slideEl.querySelector('.vj-year');
  const yearHud = slideEl.querySelector('.vj-hud');
  const minimap = slideEl.querySelector('.vj-minimap');
  const cursorDot = slideEl.querySelector('.vj-cursor');
  const flashEl = slideEl.querySelector('.vj-flash');

  const X0 = ERAS[0].x, X1 = ERAS[ERAS.length-1].x;
  function mapPos(year) { const e = ERAS.find(k => k.year === year); return ((e ? e.x : X1) - X0) / (X1 - X0); }
  ERAS.forEach(era => {
    const p = mapPos(era.year) * 100;
    const tick = document.createElement('div');
    tick.className = 'vj-tick'; tick.style.left = p + '%'; tick.id = 'vjtick-' + era.id;
    minimap.appendChild(tick);
    const lbl = document.createElement('div');
    lbl.className = 'vj-lbl'; lbl.style.left = p + '%'; lbl.textContent = era.label; lbl.id = 'vjlbl-' + era.id;
    minimap.appendChild(lbl);
  });

  // ---- three ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  scene.fog = new THREE.Fog(COL.bg, 70, 430);
  const BASE_FOV = 56;
  const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 2000);

  { const grid = new THREE.GridHelper(2400, 220, COL.acento, COL.gris);
    grid.material.transparent = true; grid.material.opacity = 0.10; scene.add(grid); }
  { const g = new THREE.BufferGeometry(); const n = 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i*3] = -900 + Math.random() * 1100; pos[i*3+1] = 2 + Math.random() * 70; pos[i*3+2] = -120 + Math.random() * 200; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: COL.acento, size: 0.7, transparent: true, opacity: 0.45 }))); }
  { const len = ERAS[ERAS.length-1].x - ERAS[0].x + 70; const cx = (ERAS[0].x + ERAS[ERAS.length-1].x) / 2;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, len, 8), new THREE.MeshBasicMaterial({ color: COL.acento, transparent: true, opacity: 0.9 }));
    beam.rotation.z = Math.PI / 2; beam.position.set(cx, 0.5, 0); scene.add(beam);
    for (let x = ERAS[0].x; x <= ERAS[ERAS.length-1].x; x += 25) {
      const tk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), new THREE.MeshBasicMaterial({ color: COL.papel, transparent: true, opacity: 0.25 }));
      tk.position.set(x, 0.6, 0); scene.add(tk); } }

  function shadowTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128,128,10,128,128,120);
    g.addColorStop(0, 'rgba(95,198,220,0.35)'); g.addColorStop(1, 'rgba(95,198,220,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,256,256); return new THREE.CanvasTexture(c);
  }
  const shTex = shadowTexture();
  const loader = new THREE.TextureLoader();
  const markers = [];

  ERAS.forEach(era => {
    const group = new THREE.Group(); group.position.x = era.x;
    const clock = new THREE.Group(); clock.position.set(0, 1.95, 0.1);
    clock.add(new THREE.Mesh(new THREE.CircleGeometry(1.06, 48), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    const rim = new THREE.Mesh(new THREE.RingGeometry(1.06, 1.25, 48), new THREE.MeshBasicMaterial({ color: COL.acento, side: THREE.DoubleSide })); rim.position.z = 0.01; clock.add(rim);
    for (let i = 0; i < 12; i++) { const major = i % 3 === 0;
      const tkm = new THREE.Mesh(new THREE.PlaneGeometry(major ? 0.08 : 0.04, major ? 0.24 : 0.14), new THREE.MeshBasicMaterial({ color: 0x0d1a1f }));
      const a = (i / 12) * Math.PI * 2, r = 0.88; tkm.position.set(Math.sin(a) * r, Math.cos(a) * r, 0.02); tkm.rotation.z = -a; clock.add(tkm); }
    const minuteHand = new THREE.Group(); const mh = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.84), new THREE.MeshBasicMaterial({ color: 0x0d1a1f })); mh.position.y = 0.39; minuteHand.add(mh); minuteHand.position.z = 0.03; minuteHand.rotation.z = Math.random() * Math.PI * 2; clock.add(minuteHand);
    const hourHand = new THREE.Group(); const hh = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.56), new THREE.MeshBasicMaterial({ color: 0x0d1a1f })); hh.position.y = 0.25; hourHand.add(hh); hourHand.position.z = 0.04; hourHand.rotation.z = Math.random() * Math.PI * 2; clock.add(hourHand);
    const pin = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), new THREE.MeshBasicMaterial({ color: COL.acento })); pin.position.z = 0.05; clock.add(pin);
    group.add(clock); markers.push({ minute: minuteHand, hour: hourHand });

    const frame = new THREE.Mesh(new THREE.PlaneGeometry(34.4, 20.4), new THREE.MeshBasicMaterial({ color: COL.papel })); frame.position.set(0, 13.5, -0.05); group.add(frame);
    const tex = loader.load(PHOTOS[era.photo]); tex.anisotropy = 8;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(32, 18), new THREE.MeshBasicMaterial({ map: tex })); panel.position.set(0, 13.5, 0); group.add(panel);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.02, 1.5); group.add(sh);
    scene.add(group);
  });

  // ---- choreography ----
  let seqIndex = 0;
  const CAM_Y = 13.5, CAM_Z = 40;
  function stationCam(id) { const x = byId[id].x; return { pos: new THREE.Vector3(x, CAM_Y, CAM_Z), look: new THREE.Vector3(x, CAM_Y, 0) }; }
  let camPos = stationCam('y2026').pos.clone(), camLook = stationCam('y2026').look.clone();
  let currentYear = 2026, currentId = 'y2026', view = 'overview', zoomAnim = null, pendingTravel = null, flight = null;
  let active = false, finished = false;
  camera.position.copy(camPos); camera.lookAt(camLook);

  function setCurrentLabel(id) { slideEl.querySelectorAll('.vj-lbl').forEach(l => l.classList.remove('current')); const el = slideEl.querySelector('#vjlbl-' + id); if (el) el.classList.add('current'); }
  function revealStation(id) { const tk = slideEl.querySelector('#vjtick-' + id), lb = slideEl.querySelector('#vjlbl-' + id); if (tk) tk.classList.add('visited'); if (lb) lb.classList.add('visited'); }
  setCurrentLabel('y2026'); revealStation('y2026');

  const ease = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

  function flyTo(id) {
    const target = stationCam(id), era = byId[id], dist = Math.abs(target.pos.x - camPos.x);
    if (dist < 0.5) return;
    flight = { toId: id, from: camPos.clone(), to: target.pos.clone(), lookFrom: camLook.clone(), lookTo: target.look.clone(),
      yearFrom: currentYear, yearTo: era.year, t0: performance.now(), dur: Math.min(5200, Math.max(2200, 1500 + dist * 4.6)), arc: Math.min(58, dist * 0.09) };
    yearHud.classList.add('traveling'); yearValue.classList.add('traveling');
  }
  function arrive() {
    const era = byId[flight.toId];
    currentYear = era.year; currentId = flight.toId; camPos.copy(flight.to); camLook.copy(flight.lookTo);
    camera.fov = BASE_FOV; camera.updateProjectionMatrix();
    yearValue.textContent = era.label;
    yearHud.classList.remove('traveling'); yearValue.classList.remove('traveling');
    yearValue.classList.remove('pop'); void yearValue.offsetWidth; yearValue.classList.add('pop');
    flashEl.classList.remove('active'); void flashEl.offsetWidth; flashEl.classList.add('active');
    setCurrentLabel(flight.toId); revealStation(flight.toId);
    flight = null;
  }
  function zoomTarget() {
    const x = byId[currentId].x, fovRad = (BASE_FOV * Math.PI) / 180;
    const dV = 9 / Math.tan(fovRad / 2), dH = 16 / (Math.tan(fovRad / 2) * camera.aspect), d = Math.min(dV, dH) * 0.96;
    return { pos: new THREE.Vector3(x, 13.5, d), look: new THREE.Vector3(x, 13.5, 0) };
  }
  function startZoom(mode) {
    const tgt = mode === 'in' ? zoomTarget() : stationCam(currentId);
    zoomAnim = { from: camPos.clone(), to: tgt.pos.clone(), lookFrom: camLook.clone(), lookTo: tgt.look.clone(), t0: performance.now(), dur: mode === 'in' ? 1300 : 1000, mode };
    slideEl.classList.toggle('zoomed', mode === 'in');
  }

  // returns true if the machine consumes the keypress; false if the deck should move
  function handle(dir) {
    if (flight || zoomAnim) return true;
    if (dir > 0) {
      if (view === 'overview') {
        if (finished) return false;
        startZoom('in'); view = 'zoom';
      } else {
        pendingTravel = (seqIndex + 1 < SEQUENCE.length) ? seqIndex + 1 : null;
        if (pendingTravel === null) finished = true;
        startZoom('out'); view = 'overview';
      }
      return true;
    } else {
      if (view === 'zoom') { pendingTravel = null; startZoom('out'); view = 'overview'; return true; }
      if (seqIndex - 1 < 0) return false;
      seqIndex -= 1; finished = false; flyTo(SEQUENCE[seqIndex]); return true;
    }
  }

  window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

  function cursorFromCamX(x) {
    const pts = ERAS.map(e => ({ x: e.x, p: mapPos(e.year) }));
    if (x <= pts[0].x) return pts[0].p; if (x >= pts[pts.length-1].x) return pts[pts.length-1].p;
    for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i].x && x <= pts[i+1].x) { const k = (x - pts[i].x) / (pts[i+1].x - pts[i].x); return pts[i].p + k * (pts[i+1].p - pts[i].p); }
    return 1;
  }

  let lastNow = 0, frameId = null;
  function animate(now) {
    if (!active) { lastNow = 0; return; }
    frameId = requestAnimationFrame(animate);
    const t = now * 0.001, dt = lastNow ? (now - lastNow) / 1000 : 0; lastNow = now;
    let spinRate = 0.55;
    if (flight) { const kk = Math.min(1, (now - flight.t0) / flight.dur); const bump = Math.sin(kk * Math.PI); const dir = Math.sign(flight.yearTo - flight.yearFrom) || 1; spinRate = dir * (2 + 30 * bump); }
    markers.forEach(ck => { ck.minute.rotation.z -= dt * spinRate; ck.hour.rotation.z -= dt * spinRate / 12; });
    if (zoomAnim) {
      const k = (now - zoomAnim.t0) / zoomAnim.dur;
      if (k >= 1) { camPos.copy(zoomAnim.to); camLook.copy(zoomAnim.lookTo); const wasOut = zoomAnim.mode === 'out'; zoomAnim = null;
        if (wasOut && pendingTravel !== null) { seqIndex = pendingTravel; pendingTravel = null; flyTo(SEQUENCE[seqIndex]); } }
      else { const e = ease(k); camPos.lerpVectors(zoomAnim.from, zoomAnim.to, e); camLook.lerpVectors(zoomAnim.lookFrom, zoomAnim.lookTo, e); }
    }
    if (flight) {
      const k = (now - flight.t0) / flight.dur;
      if (k >= 1) arrive();
      else { const e = ease(k); camPos.lerpVectors(flight.from, flight.to, e); camLook.lerpVectors(flight.lookFrom, flight.lookTo, e);
        const bump = Math.sin(k * Math.PI); camPos.y = CAM_Y + flight.arc * bump; camPos.z = CAM_Z + flight.arc * 0.55 * bump;
        camera.fov = BASE_FOV + 14 * bump; camera.updateProjectionMatrix();
        yearValue.textContent = fmtYear(flight.yearFrom + (flight.yearTo - flight.yearFrom) * e); }
    }
    const calm = flight || zoomAnim || view === 'zoom';
    camera.position.set(camPos.x + (calm ? 0 : Math.sin(t * 0.45) * 0.45), camPos.y + (calm ? 0 : Math.sin(t * 0.7) * 0.3), camPos.z);
    camera.lookAt(camLook);
    cursorDot.style.left = (cursorFromCamX(camPos.x) * 100) + '%';
    renderer.render(scene, camera);
  }

  return {
    enter() { if (active) return; active = true; camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); frameId = requestAnimationFrame(animate); },
    leave() { active = false; cancelAnimationFrame(frameId); frameId = null; lastNow = 0; },
    handle
  };
};
