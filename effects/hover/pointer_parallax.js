/* Slowly Effects | hover/pointer_parallax | Standalone; host determines layout and style. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.sbs-parallax').forEach(host=>{
    const layers=[...host.querySelectorAll('.sbs-parallax-layer')];
    host.addEventListener('pointermove',e=>{if(reduced.matches||e.pointerType!=='mouse')return;const r=host.getBoundingClientRect();if(!r.width||!r.height)return;const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;layers.forEach(el=>{const depth=Number(el.dataset.depth)||1;el.style.setProperty('--sbs-px',`${x*depth*Number(host.dataset.rangeX||30)}px`);el.style.setProperty('--sbs-py',`${y*depth*Number(host.dataset.rangeY||20)}px`)})});
    const reset=()=>layers.forEach(el=>{el.style.removeProperty('--sbs-px');el.style.removeProperty('--sbs-py')});
    host.addEventListener('pointerleave',reset);reduced.addEventListener?.('change',()=>{if(reduced.matches)reset()});
  });
})();
