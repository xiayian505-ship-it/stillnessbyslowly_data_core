/* Slowly Effects | background/starfield | Standalone; host determines layout and style. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const rand=(a,b)=>a+Math.random()*(b-a);
  document.querySelectorAll('.sbs-stars').forEach(host=>{
    const canvas=host.querySelector('canvas'),ctx=canvas?.getContext('2d');if(!ctx)return;
    let w=0,h=0,stars=[],raf=0;
    const draw=t=>{ctx.clearRect(0,0,w,h);ctx.fillStyle=host.dataset.color||getComputedStyle(host).color;for(const s of stars){ctx.globalAlpha=reduced.matches?.6:.22+.75*Math.abs(Math.sin(t*.001*s.speed+s.phase));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1};
    const fit=()=>{const box=host.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);w=Math.max(1,box.width);h=Math.max(1,box.height);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);const n=Math.max(1,Math.min(400,Number(host.dataset.count)||Math.round(w*h/6000)));stars=Array.from({length:n},()=>({x:rand(0,w),y:rand(0,h),r:rand(.4,1.5),phase:rand(0,7),speed:rand(.5,2)}));draw(0)};
    const loop=t=>{if(!host.isConnected)return;if(!document.hidden)draw(t);raf=requestAnimationFrame(loop)};
    const motion=()=>{cancelAnimationFrame(raf);draw(0);if(!reduced.matches)raf=requestAnimationFrame(loop)};
    const obs=typeof ResizeObserver==='function'?new ResizeObserver(fit):null;obs?.observe(host);if(!obs)addEventListener('resize',fit);reduced.addEventListener?.('change',motion);fit();motion();
  });
})();
