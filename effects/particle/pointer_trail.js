/* Slowly Effects | particle/pointer_trail | Standalone; host determines layout and style. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),rand=(a,b)=>a+Math.random()*(b-a);
  document.querySelectorAll('.sbs-trail').forEach(host=>{
    const canvas=host.querySelector('canvas'),ctx=canvas?.getContext('2d');if(!ctx)return;
    const palette=(host.dataset.colors||'').split(',').map(v=>v.trim()).filter(Boolean);
    let w=0,h=0,particles=[],raf=0;
    function fit(){const r=host.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);w=Math.max(1,r.width);h=Math.max(1,r.height);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0)}
    function loop(){if(!host.isConnected){raf=0;return}ctx.clearRect(0,0,w,h);for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.025;p.life-=.024;if(p.life<=0){particles.splice(i,1);continue}ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.life+.3,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;raf=particles.length?requestAnimationFrame(loop):0}
    host.addEventListener('pointermove',e=>{if(reduced.matches||e.pointerType!=='mouse'||particles.length>125)return;const r=host.getBoundingClientRect(),color=getComputedStyle(host).color;for(let i=0;i<2;i++)particles.push({x:e.clientX-r.left,y:e.clientY-r.top,vx:rand(-.8,.8),vy:rand(-1.2,.2),r:rand(1,3),life:1,color:palette.length?palette[Math.random()*palette.length|0]:color});if(!raf)raf=requestAnimationFrame(loop)});
    const obs=typeof ResizeObserver==='function'?new ResizeObserver(fit):null;obs?.observe(host);if(!obs)addEventListener('resize',fit);reduced.addEventListener?.('change',()=>{if(reduced.matches){particles=[];ctx.clearRect(0,0,w,h)}});fit();
  });
})();
