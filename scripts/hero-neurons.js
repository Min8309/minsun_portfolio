// Learning visualized as branching connections and travelling signals, not a biological simulation.
(() => {
 const hero = document.querySelector('.hero');
 const canvas = hero?.querySelector('.hero-neurons');
 const ctx = canvas?.getContext('2d');
 if (!ctx) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const fine = matchMedia('(hover: hover) and (pointer: fine)');
 const MAX_NODES = 180;
 let width = 0, height = 0, nodes = [], pulses = [];
 let visible = false, inside = false, frame = 0, last = 0, time = 0;
 let pointer = { x: 0, y: 0 }, movedAt = -10, grewAt = 0, sparkedAt = 0;
 let randomSeed = 19;
 const random = () => { randomSeed = (randomSeed * 16807) % 2147483647; return randomSeed / 2147483647; };
 const animated = () => fine.matches && !reduced.matches;
 function node(x, y, parent = null, depth = 0, grown = true) {
  const item = { x, y, parent, depth, progress: grown ? 1 : 0, energy: 0, bend: (random() - .5) * 22, children: [] };
  nodes.push(item);
  if (parent) parent.children.push(item);
  return item;
 }
 function point(item, t) {
  const p = item.parent;
  const cx = (p.x + item.x) / 2 + item.bend;
  const cy = (p.y + item.y) / 2 - item.bend;
  return { x: (1-t)**2*p.x + 2*(1-t)*t*cx + t*t*item.x, y: (1-t)**2*p.y + 2*(1-t)*t*cy + t*t*item.y };
 }
 function seed() {
  nodes = []; pulses = []; randomSeed = 19;
  const scale = Math.min(width * .16, height * .23, 145);
  for (const [rx, ry] of [[.76,.42],[.91,.24],[.91,.75],[.60,.68]]) {
   const root = node(width * rx, height * ry);
   for (let arm = 0; arm < 5; arm++) {
    let parent = root;
    let angle = arm / 5 * Math.PI * 2 + random() * .8;
    for (let depth = 1; depth <= 3; depth++) {
     angle += (random() - .5) * .8;
     const length = scale * (.27 + random() * .2);
     const next = node(Math.max(12, Math.min(width-12,parent.x+Math.cos(angle)*length)), Math.max(12,Math.min(height-12,parent.y+Math.sin(angle)*length)), parent, depth);
     if (depth === 2) node(next.x + Math.cos(angle + .8) * length * .7, next.y + Math.sin(angle + .8) * length * .7, next, 3);
     parent = next;
    }
   }
  }
 }
 function spark(item) {
  item.energy = 1;
  const paths = item.children.length ? item.children : [item];
  for (const path of paths) if (path.parent && pulses.length < 40) pulses.push({ item: path, t: 0 });
 }
 function grow() {
  if (nodes.length >= MAX_NODES) return;
  const candidates = nodes.filter(n => n.depth < 8 && n.children.length < 3 && n.progress === 1);
  let nearest = null, distance = Infinity;
  for (const item of candidates) {
   const d = Math.hypot(pointer.x - item.x, pointer.y - item.y);
   if (d > 22 && d < distance) { nearest = item; distance = d; }
  }
  if (!nearest || distance > 270) return;
  const angle = Math.atan2(pointer.y - nearest.y, pointer.x - nearest.x) + (random() - .5) * .6;
  const length = Math.min(distance * .5, 25 + random() * 22);
  const x = Math.max(10, Math.min(width-10, nearest.x + Math.cos(angle)*length));
  const y = Math.max(10, Math.min(height-10, nearest.y + Math.sin(angle)*length));
  if (nodes.some(n => Math.hypot(n.x-x,n.y-y) < 13)) return;
  node(x, y, nearest, nearest.depth + 1, false);
  spark(nearest);
 }
 function draw() {
  ctx.clearRect(0, 0, width, height);
  for (const item of nodes) {
   if (item.parent) {
    ctx.beginPath(); ctx.moveTo(item.parent.x,item.parent.y);
    for(let i=1;i<=16;i++){ const p=point(item,item.progress*i/16); ctx.lineTo(p.x,p.y); }
    ctx.strokeStyle = `rgba(68,143,158,${.28+item.energy*.36})`;
    ctx.lineWidth = Math.max(.65,1.8-item.depth*.16);
    ctx.stroke();
   }
   if (!item.parent || item.energy > .1) {
    const size = item.parent ? 2 + item.energy*2 : 6;
    const halo = ctx.createRadialGradient(item.x,item.y,0,item.x,item.y,size*4);
    halo.addColorStop(0, item.energy > .1 ? `rgba(255,255,255,${item.energy*.72})` : 'rgba(68,143,158,.28)');halo.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=halo;ctx.fillRect(item.x-size*4,item.y-size*4,size*8,size*8);
    ctx.fillStyle=item.energy > .1 ? `rgba(255,255,255,${.55+item.energy*.4})` : 'rgba(68,143,158,.55)';
    ctx.beginPath();
    for(let i=0;i<=12;i++){const a=i/12*Math.PI*2;const r=size*(1+.23*Math.sin(a*5));const x=item.x+Math.cos(a)*r,y=item.y+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
    ctx.fill();
   }
  }
  for (const pulse of pulses) {
   const p=point(pulse.item,Math.min(pulse.t,pulse.item.progress));
   const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,10);
   glow.addColorStop(0,'rgba(255,255,255,1)');glow.addColorStop(.3,'rgba(255,255,255,.85)');glow.addColorStop(1,'rgba(255,255,255,0)');
   ctx.fillStyle=glow;ctx.fillRect(p.x-10,p.y-10,20,20);
   ctx.beginPath();ctx.moveTo(p.x-3.5,p.y);ctx.lineTo(p.x+3.5,p.y);ctx.moveTo(p.x,p.y-3.5);ctx.lineTo(p.x,p.y+3.5);
   ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=1.2;ctx.stroke();
  }
 }
 function tick(timestamp) {
  frame=0;
  if(!visible||document.hidden||!animated())return;
  if(timestamp-last>=1000/30){
   const dt=Math.min((timestamp-last)/1000,.06);last=timestamp;
   if(document.body.style.overflow!=='hidden'){
    time+=dt;
    for(const n of nodes){ n.progress=Math.min(1,n.progress+dt*1.4);n.energy=Math.max(0,n.energy-dt*.9); }
    const finished=[];
    for(const p of pulses){p.t+=dt*.85;if(p.t>=1)finished.push(p)}
    pulses=pulses.filter(p=>p.t<1);
    for(const p of finished)if(p.item.children.length)spark(p.item);
    if(inside&&time-movedAt<1.3){
     if(time-grewAt>.18){grow();grewAt=time}
     if(time-sparkedAt>.4){
      const nearest=nodes.reduce((a,b)=>Math.hypot(a.x-pointer.x,a.y-pointer.y)<Math.hypot(b.x-pointer.x,b.y-pointer.y)?a:b);
      if(Math.hypot(nearest.x-pointer.x,nearest.y-pointer.y)<240)spark(nearest);
      sparkedAt=time;
     }
    }
    draw();
   }
  }
  frame=requestAnimationFrame(tick);
 }
 function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(visible&&!document.hidden&&animated())frame=requestAnimationFrame(tick);else{pulses=[];draw()}}
 function resize(){
  const box=hero.getBoundingClientRect();if(width===box.width&&height===box.height)return;
  width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  seed();draw();
 }
 hero.addEventListener('pointermove',event=>{if(!animated()||event.pointerType==='touch')return;const b=hero.getBoundingClientRect();pointer={x:event.clientX-b.left,y:event.clientY-b.top};inside=true;movedAt=time},{passive:true});
 hero.addEventListener('pointerleave',()=>{inside=false});
 reduced.addEventListener('change',sync);fine.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
 new ResizeObserver(resize).observe(hero);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()}).observe(hero);
 resize();
})();
