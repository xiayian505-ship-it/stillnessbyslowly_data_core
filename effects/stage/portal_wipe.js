/* Slowly Effects | stage/portal_wipe | Standalone; host determines layout and style. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let overlay,busy=false;
  const ensure=()=>{if(!overlay){overlay=document.createElement('div');overlay.className='sbs-portal-overlay';overlay.setAttribute('aria-hidden','true');document.body.append(overlay)}return overlay};
  function reset(){if(!overlay)return;overlay.style.transition='none';overlay.classList.remove('sbs-portal-open');overlay.style.removeProperty('opacity');void overlay.offsetWidth;overlay.style.removeProperty('transition');busy=false}
  async function play({x=innerWidth/2,y=innerHeight/2,color,hold=false}={}){
    if(reduced.matches||busy)return false;
    const el=ensure();busy=true;el.style.setProperty('--sbs-portal-x',`${x}px`);el.style.setProperty('--sbs-portal-y',`${y}px`);
    if(color)el.style.setProperty('--sbs-portal-color',color);else el.style.removeProperty('--sbs-portal-color');
    el.classList.remove('sbs-portal-open');void el.offsetWidth;el.classList.add('sbs-portal-open');
    await new Promise(resolve=>setTimeout(resolve,680));
    if(!hold)reset();return true;
  }
  window.SlowlyPortalWipe={play,reset};
  document.querySelectorAll('a[data-sbs-portal-link]').forEach(a=>a.addEventListener('click',async e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.hasAttribute('download')||(a.target&&a.target!=='_self')||busy||reduced.matches)return;
    e.preventDefault();const r=a.getBoundingClientRect();await play({x:e.clientX||r.left+r.width/2,y:e.clientY||r.top+r.height/2,color:a.dataset.portalColor,hold:true});location.assign(a.href);
  }));
  addEventListener('pageshow',reset);
})();
