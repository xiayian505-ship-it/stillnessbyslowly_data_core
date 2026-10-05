/* Slowly Confetti Burst v1.0.0 | Global: SlowlyConfettiBurst | No dependencies. */
(function (global) {
  "use strict";
  const DEFAULTS = Object.freeze({ count: 30, colors: ["#ffe58f", "#fff8d8", "#e8b94e", "#f5d9a0", "#ffffff"], originX: 50, originY: 52, distanceMin: 150, distanceMax: 440, yJitterMin: -10, yJitterMax: 95, rotationMin: 220, rotationMax: 920, sizeMin: 6, sizeMax: 13, delayMin: 0, delayMax: 160, durationMin: 900, durationMax: 1450, glow: "rgba(255,226,135,.45)", borderRadius: 2, zIndex: 1, respectReducedMotion: true });
  const generations = new WeakMap();
  function num(v, f) { const n = Number(v); return Number.isFinite(n) ? n : f; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function wait(ms) { return new Promise(r => global.setTimeout(r, Math.max(0, ms))); }
  function check(root) { if (!(root instanceof Element)) throw new TypeError("SlowlyConfettiBurst.play(root): root must be a DOM Element."); }
  function clear(root) { check(root); generations.set(root, (generations.get(root) || 0) + 1); root.querySelectorAll('[data-sbs-confetti-burst]').forEach(n => n.remove()); }
  async function play(root, options) {
    check(root); const c = Object.assign({}, DEFAULTS, options || {}); clear(root); const token = generations.get(root) || 0;
    const layer = document.createElement('div'); layer.className = 'sbs-confetti-burst-layer'; layer.dataset.sbsConfettiBurst = ''; layer.dataset.sbsRespectReducedMotion = String(c.respectReducedMotion !== false); layer.style.setProperty('--sbs-confetti-z', num(c.zIndex, 1)); root.appendChild(layer);
    const colors = Array.isArray(c.colors) && c.colors.length ? c.colors : DEFAULTS.colors; const count = Math.max(0, Math.trunc(num(c.count, DEFAULTS.count))); let maxMs = 0;
    for (let i=0;i<count;i+=1) { const node=document.createElement('span'); node.className='sbs-confetti-burst-piece'; const angle=rnd(-Math.PI*.94,-Math.PI*.06); const distance=rnd(num(c.distanceMin,150),num(c.distanceMax,440)); const x=Math.cos(angle)*distance; const y=Math.sin(angle)*distance+rnd(num(c.yJitterMin,-10),num(c.yJitterMax,95)); const delay=rnd(num(c.delayMin,0),num(c.delayMax,160)); const duration=rnd(num(c.durationMin,900),num(c.durationMax,1450)); maxMs=Math.max(maxMs,delay+duration); node.style.setProperty('--sbs-confetti-origin-x', `${num(c.originX,50)}%`); node.style.setProperty('--sbs-confetti-origin-y', `${num(c.originY,52)}%`); node.style.setProperty('--sbs-confetti-x', `${x.toFixed(1)}px`); node.style.setProperty('--sbs-confetti-y', `${y.toFixed(1)}px`); node.style.setProperty('--sbs-confetti-rot', `${Math.round(rnd(num(c.rotationMin,220),num(c.rotationMax,920)))}deg`); node.style.setProperty('--sbs-confetti-size', `${rnd(num(c.sizeMin,6),num(c.sizeMax,13)).toFixed(1)}px`); node.style.setProperty('--sbs-confetti-delay', `${Math.round(delay)}ms`); node.style.setProperty('--sbs-confetti-duration', `${Math.round(duration)}ms`); node.style.setProperty('--sbs-confetti-color', colors[i % colors.length]); node.style.setProperty('--sbs-confetti-glow', c.glow); node.style.setProperty('--sbs-confetti-radius', `${num(c.borderRadius,2)}px`); layer.appendChild(node); }
    await wait(maxMs + 40); if ((generations.get(root)||0) !== token) return { played:true, interrupted:true }; layer.remove(); return { played:true, interrupted:false };
  }
  global.SlowlyConfettiBurst = Object.freeze({ version:'1.0.0', defaults:DEFAULTS, play, clear });
})(window);
