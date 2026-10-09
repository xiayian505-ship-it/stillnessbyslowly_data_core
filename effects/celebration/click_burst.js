/* Slowly Effects | celebration/click_burst | Standalone; host determines layout and style. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),rand=(a,b)=>a+Math.random()*(b-a);
  function burst({container,x,y,color,count=70}={}){
    if(reduced.matches||!(container instanceof HTMLElement))return;
    const box=container.getBoundingClientRect(),cv=document.createElement('canvas'),ctx=cv.getContext('2d');if(!ctx)return;
    const d=Math.min(devicePixelRatio||1,2);cv.className='sbs-click-burst-canvas';cv.width=Math.max(1,Math.round(box.width*d));cv.height=Math.max(1,Math.round(box.height*d));ctx.setTransform(d,0,0,d,0,0);container.append(cv);
    const fill=color||getComputedStyle(container).color;
    const parts=Array.from({length:Math.max(1,Math.min(count,200))},()=>{const a=rand(0,Math.PI*2),v=rand(2,7);return{x:x??box.width/2,y:y??box.height/2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,decay:rand(.015,.035),radius:rand(1,3)}});
    function draw(){if(!container.isConnected){cv.remove();return}ctx.clearRect(0,0,box.width,box.height);for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.04;p.life-=p.decay;if(p.life<=0){parts.splice(i,1);continue}ctx.globalAlpha=p.life;ctx.fillStyle=fill;ctx.beginPath();ctx.arc(p.x,p.y,p.radius*p.life+.3,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;if(parts.length)requestAnimationFrame(draw);else cv.remove()}
    requestAnimationFrame(draw);
  }
  window.SlowlyClickBurst={burst};
})();
