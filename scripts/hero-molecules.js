// A lightweight, original interpretation of flowing molecular membranes.
(() => {
  const hero = document.querySelector('.hero');
  const canvas = hero?.querySelector('.hero-molecules');
  const context = canvas?.getContext('2d');
  if (!context) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const lobes = Array.from({ length: 7 }, (_, i) => ({
    angle: i * Math.PI * 2 / 7,
    phase: i * 1.71,
    scale: 0.56 + (i % 3) * 0.14
  }));
  let width = 0, height = 0, radius = 0;
  let x = 0, y = 0, targetX = 0, targetY = 0;
  let inside = false, visible = false, frame = 0, last = 0, time = 0;
  const animated = () => finePointer.matches && !reduced.matches;
  const home = () => ({ x: width * .8, y: height * .45 });

  function draw() {
    context.clearRect(0, 0, width, height);
    const centers = lobes.map(lobe => {
      const angle = lobe.angle + time * .11;
      const spread = radius * (.58 + .12 * Math.sin(time * .6 + lobe.phase));
      return {
        x: x + Math.cos(angle) * spread,
        y: y + Math.sin(angle) * spread * .85,
        r: radius * lobe.scale * (.92 + .08 * Math.sin(time + lobe.phase)),
        phase: lobe.phase
      };
    });
    // Fine filaments create translucent, breathing surfaces rather than solid balls.
    for (const lobe of centers) {
      for (let ring = 0; ring < 12; ring++) {
        const depth = (ring / 11) * 2 - 1;
        const slice = Math.sqrt(Math.max(.025, 1 - depth * depth));
        const tilt = Math.sin(time * .35 + lobe.phase) * .65;
        context.beginPath();
        for (let point = 0; point <= 84; point++) {
          const angle = point / 84 * Math.PI * 2;
          const ripple = 1 + .065 * Math.sin(angle * 3 + time * 1.05 + lobe.phase)
            + .035 * Math.cos(angle * 5 - time * .7 + ring * .13);
          const u = Math.cos(angle) * lobe.r * slice * ripple;
          const v = Math.sin(angle) * lobe.r * slice * ripple;
          const px = lobe.x + u * Math.cos(tilt) - v * Math.sin(tilt) * .52;
          const py = lobe.y + u * Math.sin(tilt) + v * Math.cos(tilt) * .52 + depth * lobe.r * .58;
          if (!point) context.moveTo(px, py); else context.lineTo(px, py);
        }
        context.strokeStyle = `rgba(36,82,245,${.055 + .065 * (1 - Math.abs(depth))})`;
        context.lineWidth = ring % 4 === 0 ? .85 : .45;
        context.stroke();
      }
      // A few moving highlights suggest energy flowing across the membranes.
      const angle = time * .6 + lobe.phase;
      const px = lobe.x + Math.cos(angle) * lobe.r * .75;
      const py = lobe.y + Math.sin(angle) * lobe.r * .4;
      const light = context.createRadialGradient(px, py, 0, px, py, 13);
      light.addColorStop(0, 'rgba(36,82,245,.22)');
      light.addColorStop(1, 'rgba(36,82,245,0)');
      context.fillStyle = light;
      context.fillRect(px - 13, py - 13, 26, 26);
    }
  }

  function tick(timestamp) {
    frame = 0;
    if (!visible || document.hidden || !animated()) return;
    if (timestamp - last >= 1000 / 30) {
      const delta = Math.min((timestamp - last) / 1000, .06);
      last = timestamp;
      // Freeze behind modal windows to keep attention on the content being read.
      if (document.body.style.overflow !== 'hidden') {
        time += delta;
        const destination = inside ? { x: targetX, y: targetY } : home();
        x += (destination.x - x) * .075;
        y += (destination.y - y) * .075;
        draw();
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (visible && !document.hidden && animated()) frame = requestAnimationFrame(tick);
    else draw();
  }
  function resize() {
    const bounds = hero.getBoundingClientRect();
    const firstSize = !width;
    width = bounds.width;
    height = bounds.height;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    radius = Math.min(width * .17, height * .25, 165);
    if (firstSize || !inside) ({ x, y } = home());
    draw();
  }
  hero.addEventListener('pointermove', event => {
    if (!animated() || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    targetX = event.clientX - bounds.left;
    targetY = event.clientY - bounds.top;
    inside = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { inside = false; });
  reduced.addEventListener('change', sync);
  finePointer.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }).observe(hero);
  resize();
})();
