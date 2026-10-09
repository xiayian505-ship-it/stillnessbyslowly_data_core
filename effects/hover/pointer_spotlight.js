/* Slowly Effects | hover/pointer_spotlight | Standalone; host determines layout and style. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.sbs-spotlight').forEach(host=>host.addEventListener('pointermove',e=>{if(reduced.matches||e.pointerType!=='mouse')return;const r=host.getBoundingClientRect();host.style.setProperty('--sbs-light-x',`${e.clientX-r.left}px`);host.style.setProperty('--sbs-light-y',`${e.clientY-r.top}px`)}));
})();
