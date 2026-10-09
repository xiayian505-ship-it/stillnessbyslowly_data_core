/* Slowly Effects | background/floating_symbols | Standalone; host determines layout and style. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');const rand=(a,b)=>a+Math.random()*(b-a);
  document.querySelectorAll('.sbs-symbols').forEach(host=>{
    const canvas=host.querySelector('canvas'),ctx=canvas?.getContext('2d');if(!ctx)return;
    let w=0,h=0,items=[],raf=0,last=0;
    const glyphs=Array.from(host.dataset.symbols||'♠♥♦♣◆');
    const palette=(host.dataset.colors||'').split(',').map(v=>v.trim()).filter(Boolean);
    function spawn(anywhere=false){return{x:rand(0,w),y:anywhere?rand(0,h):h+35,ch:glyphs[Math.random()*glyphs.length|0]||'✦',size:rand(17,35),v:rand(9,22),rot:rand(-.5,.5),turn:rand(-.25,.25),alpha:rand(.1,.32),color:palette.length?palette[Math.random()*palette.length|0]:null}}
    function draw(){ctx.clearRect(0,0,w,h);ctx.textAlign='center';const color=getComputedStyle(host).color;for(const a of items){ctx.save();ctx.globalAlpha=a.alpha;ctx.fillStyle=a.color||color;ctx.translate(a.x,a.y);ctx.rotate(a.rot);ctx.font=`900 ${a.size}px serif`;ctx.fillText(a.ch,0,0);ctx.restore()}ctx.globalAlpha=1}
    function fit(){const b=host.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);w=Math.max(1,b.width);h=Math.max(1,b.height);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);items=Array.from({length:Math.max(1,Math.min(150,Number(host.dataset.count)||(w<600?9:16)))},()=>spawn(true));draw()}
    function loop(t){if(!host.isConnected)return;const dt=Math.min((t-(last||t))/1000,.05);last=t;if(!document.hidden){for(let i=0;i<items.length;i++){items[i].y-=items[i].v*dt;items[i].rot+=items[i].turn*dt;if(items[i].y<-50)items[i]=spawn()}draw()}raf=requestAnimationFrame(loop)}
    function motion(){cancelAnimationFrame(raf);last=0;draw();if(!reduced.matches)raf=requestAnimationFrame(loop)}
    const obs=typeof ResizeObserver==='function'?new ResizeObserver(fit):null;obs?.observe(host);if(!obs)addEventListener('resize',fit);reduced.addEventListener?.('change',motion);fit();motion();
  });
})();
