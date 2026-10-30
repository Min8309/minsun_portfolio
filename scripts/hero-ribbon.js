// Gentle pointer-driven deformation of the decorative SVG; content never moves.
(() => {
 const hero = document.querySelector('.hero');
 const ribbon = hero?.querySelector('.hero-ribbon');
 if (!ribbon) return;
 const motion = matchMedia('(prefers-reduced-motion: reduce)');
 const pointer = matchMedia('(hover: hover) and (pointer: fine)');
 const paths = [...ribbon.querySelectorAll('path')].map(path => ({ path, original: path.getAttribute('d') }));
 let frame = 0, visible = false, inside = false, last = 0, phase = 0;
 let targetX = 0, targetY = 0, x = 0, y = 0, strength = 0, impulse = 0;
 const enabled = () => !motion.matches && pointer.matches;
 function reset() {
  cancelAnimationFrame(frame); frame = 0; last = 0;
  x = y = targetX = targetY = strength = impulse = 0;
  ribbon.style.transform = '';
  for (const { path, original } of paths) path.setAttribute('d', original);
 }
 function tick(timestamp) {
  frame = 0;
  if (!enabled() || !visible || document.hidden) return;
  if (timestamp - last >= 1000 / 30) {
   const dt = Math.min((timestamp - last) / 1000, .05); last = timestamp;
   if (document.body.style.overflow !== 'hidden') {
    phase += dt * 1.1;
    x += (targetX - x) * .055; y += (targetY - y) * .055;
    impulse *= .95;
    strength += ((inside ? 1.6 + impulse * 4 : 0) - strength) * .045;
    ribbon.style.transform = `translate(${(x * 7).toFixed(2)}px,${(y * 5).toFixed(2)}px) rotate(${(x * .3).toFixed(3)}deg) scale(1.035)`;
    for (const { path, original } of paths) {
     let coordinate = 0, px = 0;
     const deformed = original.replace(/-?(?:\d*\.)?\d+/g, value => {
      const n = Number(value);
      if (coordinate++ % 2 === 0) { px = n; return value; }
      return (n + Math.sin(px * .005 + phase + y * .5) * strength + Math.sin(px * .009 - phase * .6) * strength * .35).toFixed(2);
     });
     path.setAttribute('d', deformed);
    }
   }
  }
  if (inside || strength > .02 || Math.abs(x) + Math.abs(y) > .01) frame = requestAnimationFrame(tick);
  else reset();
 }
 function sync() {
  cancelAnimationFrame(frame); frame = 0; last = 0;
  if (!enabled()) reset();
  else if (visible && !document.hidden && (inside || strength > .02)) frame = requestAnimationFrame(tick);
 }
 hero.addEventListener('pointermove', event => {
  if (!enabled() || event.pointerType === 'touch') return;
  const box = hero.getBoundingClientRect();
  const nx = (event.clientX - box.left) / box.width * 2 - 1;
  const ny = (event.clientY - box.top) / box.height * 2 - 1;
  impulse = Math.min(1, impulse + Math.hypot(nx - targetX, ny - targetY) * 1.4);
  targetX = nx; targetY = ny; inside = true;
  if (!frame) sync();
 }, { passive: true });
 hero.addEventListener('pointerleave', () => { inside = false; targetX = targetY = 0; });
 motion.addEventListener('change', sync); pointer.addEventListener('change', sync);
 document.addEventListener('visibilitychange', sync);
 new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(hero);
})();
