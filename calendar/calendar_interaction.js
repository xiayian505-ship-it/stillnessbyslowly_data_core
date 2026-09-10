/*!
 * calendar_interaction.js
 * stillness by slowly
 * Calendar Component 的獨立互動橋接層。
 */
(function(global){
"use strict";
const VERSION="1.0.0";
function pad(v){return String(v).padStart(2,"0");}
function dateKey(d){
  if(!(d instanceof Date)||Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function create(calendar){
  if(!calendar||!calendar.root||typeof calendar.render!=="function"){
    throw new Error("CalendarInteraction 需要 SlowlyCalendar.mount() 回傳的 instance。");
  }
  const listeners=new Set();
  let markers=new Set();
  let lastKey=dateKey(calendar.selected);
  const originalRender=calendar.render.bind(calendar);

  function getDate(){
    const d=calendar.selected;
    return d instanceof Date ? new Date(d.getFullYear(),d.getMonth(),d.getDate()) : null;
  }
  function getDateKey(){return dateKey(getDate());}

  function markVisibleDates(){
    const buttons=calendar.grid?.querySelectorAll(".sc-day:not(.sc-empty)")||[];
    buttons.forEach(button=>{
      button.classList.remove("has-marker");
      const solar=button.querySelector(".sc-solar-date");
      if(!solar) return;
      const day=Number(solar.textContent);
      let y=calendar.focus.getFullYear(), m=calendar.focus.getMonth();

      if(calendar.options.view!=="month" && button.classList.contains("is-outside")){
        const selected=calendar.selected.getDate();
        if(day-selected>20){ const d=new Date(y,m-1,day); y=d.getFullYear(); m=d.getMonth(); }
        else if(day-selected<-20){ const d=new Date(y,m+1,day); y=d.getFullYear(); m=d.getMonth(); }
      }
      const key=dateKey(new Date(y,m,day));
      button.dataset.calendarDate=key;
      if(markers.has(key)) button.classList.add("has-marker");
    });
  }

  function emit(){
    const key=getDateKey();
    if(!key||key===lastKey) return;
    lastKey=key;
    const event={date:getDate(),dateKey:key,calendar};
    listeners.forEach(fn=>fn(event));
  }

  calendar.render=function(){
    const result=originalRender();
    markVisibleDates();
    emit();
    return result;
  };
  markVisibleDates();

  return Object.freeze({
    version:VERSION,
    getDate,
    getDateKey,
    setMarkers(values=[]){
      markers=new Set(Array.from(values).map(v=>v instanceof Date?dateKey(v):String(v)));
      markVisibleDates();
    },
    subscribe(fn){
      if(typeof fn!=="function") throw new TypeError("listener must be a function");
      listeners.add(fn);
      return ()=>listeners.delete(fn);
    },
    destroy(){
      calendar.render=originalRender;
      listeners.clear();
      markers.clear();
    }
  });
}
global.CalendarInteraction=Object.freeze({version:VERSION,create});
})(window);
