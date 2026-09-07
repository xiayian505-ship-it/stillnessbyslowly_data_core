/* =========================================================
   Slowly Calendar Component
   v1.1
   修正：
   - 不再假設 Calendar Core 的 dayData 內含 year / month
   - 顯示與點擊日期使用 Component 自己已知的日期
   - 節慶查詢沿用 Core 原本提供的 dayData.date
========================================================= */

(function(global){
"use strict";

const WEEKDAYS=["日","一","二","三","四","五","六"];
const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const VIEW_WEEKS={week:1,"2weeks":2,"3weeks":3};

const DEFAULTS={
  view:"month",
  gridLines:false,
  showLunar:true,
  showFestivals:true,
  showSolarTerms:true,
  bold:{
    solarDate:false,
    weekend:true,
    lunar:false,
    festival:false,
    solarTerm:false
  },
  date:null
};

function resolveTarget(target){
  return typeof target==="string" ? document.querySelector(target) : target;
}

function localDate(value){
  if(value instanceof Date && !Number.isNaN(value.getTime())){
    return new Date(value.getFullYear(),value.getMonth(),value.getDate());
  }

  if(typeof value==="string"){
    const m=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m){
      const d=new Date(+m[1],+m[2]-1,+m[3]);
      if(
        d.getFullYear()===+m[1] &&
        d.getMonth()===+m[2]-1 &&
        d.getDate()===+m[3]
      ){
        return d;
      }
    }
  }

  const now=new Date();
  return new Date(now.getFullYear(),now.getMonth(),now.getDate());
}

function sameDay(a,b){
  return a.getFullYear()===b.getFullYear()
    && a.getMonth()===b.getMonth()
    && a.getDate()===b.getDate();
}

function addDays(date,days){
  const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  d.setDate(d.getDate()+days);
  return d;
}

function startOfWeek(date){
  return addDays(date,-date.getDay());
}

function getLunarText(lunar){
  if(!lunar) return "";
  return lunar.day===1 ? (lunar.monthName||"") : (lunar.dayName||"");
}

/* 保持和原 calendar_generator.html 一樣：
   Festivals 收到的是 Calendar Core 提供的 dayData.date。 */
function getFestivals(coreDate){
  const names=[];

  if(global.SolarFestivals?.getNames){
    names.push(...global.SolarFestivals.getNames(coreDate));
  }

  if(global.LunarFestivals?.getNames){
    names.push(...global.LunarFestivals.getNames(coreDate));
  }

  return names.filter(Boolean);
}

function getTerms(value){
  if(!value) return [];

  return (Array.isArray(value)?value:[value])
    .map(v=>v?.name||"")
    .filter(Boolean);
}

class CalendarComponent{
  constructor(target,options={}){
    this.target=target;
    this.options={
      ...DEFAULTS,
      ...options,
      bold:{
        ...DEFAULTS.bold,
        ...(options.bold||{})
      }
    };

    this.selected=localDate(this.options.date);
    this.focus=new Date(this.selected);
    this.cache=new Map();

    this.build();
    this.render();
  }

  build(){
    this.target.replaceChildren();

    const root=document.createElement("section");
    root.className="slowly-calendar";

    root.innerHTML=`
      <div class="sc-toolbar">
        <button class="sc-nav sc-prev" type="button" aria-label="上一段">‹</button>

        <button class="sc-title" type="button" aria-expanded="false">
          <span class="sc-title-year"></span>
          <span class="sc-title-month"></span>
        </button>

        <button class="sc-nav sc-next" type="button" aria-label="下一段">›</button>
        <button class="sc-today" type="button">今天</button>
      </div>

      <div class="sc-picker" hidden>
        <label>
          年份
          <input class="sc-picker-year" type="number" min="1901" max="2100">
        </label>

        <label>
          月份
          <select class="sc-picker-month"></select>
        </label>

        <button class="sc-picker-go" type="button">前往</button>
      </div>

      <div class="sc-hero">
        <div>
          <div class="sc-hero-month"></div>
          <div class="sc-hero-year"></div>
        </div>
        <div class="sc-hero-day"></div>
      </div>

      <div class="sc-weekdays"></div>
      <div class="sc-grid" role="grid"></div>

      <div class="sc-detail" aria-live="polite">
        <div class="sc-detail-date"></div>
        <div class="sc-detail-lunar"></div>
        <div class="sc-detail-special"></div>
      </div>

      <p class="sc-status" hidden></p>
    `;

    this.target.appendChild(root);

    this.root=root;
    this.grid=root.querySelector(".sc-grid");
    this.picker=root.querySelector(".sc-picker");
    this.pickerYear=root.querySelector(".sc-picker-year");
    this.pickerMonth=root.querySelector(".sc-picker-month");
    this.status=root.querySelector(".sc-status");

    WEEKDAYS.forEach(w=>{
      const d=document.createElement("div");
      d.className="sc-weekday";
      d.textContent=w;
      root.querySelector(".sc-weekdays").appendChild(d);
    });

    for(let i=1;i<=12;i++){
      const o=document.createElement("option");
      o.value=String(i);
      o.textContent=i+" 月";
      this.pickerMonth.appendChild(o);
    }

    root.querySelector(".sc-prev").onclick=()=>this.shift(-1);
    root.querySelector(".sc-next").onclick=()=>this.shift(1);
    root.querySelector(".sc-today").onclick=()=>this.goToday();

    const title=root.querySelector(".sc-title");

    title.onclick=()=>{
      const open=this.picker.hidden;
      this.picker.hidden=!open;
      title.setAttribute("aria-expanded",open?"true":"false");

      if(open){
        this.pickerYear.value=String(this.focus.getFullYear());
        this.pickerMonth.value=String(this.focus.getMonth()+1);
      }
    };

    root.querySelector(".sc-picker-go").onclick=()=>{
      const y=Number(this.pickerYear.value);
      const m=Number(this.pickerMonth.value);

      if(!global.Calendar?.isSupportedYear?.(y) || m<1 || m>12){
        this.showError("年份請輸入 1901～2100。");
        return;
      }

      const day=Math.min(
        this.selected.getDate(),
        new Date(y,m,0).getDate()
      );

      this.selected=new Date(y,m-1,day);
      this.focus=new Date(this.selected);

      this.picker.hidden=true;
      title.setAttribute("aria-expanded","false");

      this.render();
    };
  }

  showError(msg){
    this.status.hidden=false;
    this.status.textContent=msg;
  }

  clearError(){
    this.status.hidden=true;
    this.status.textContent="";
  }

  monthData(y,m){
    const key=y+"-"+m;

    if(!this.cache.has(key)){
      this.cache.set(key,global.Calendar.getMonth(y,m));
    }

    return this.cache.get(key);
  }

  /* 回傳 Component 已知的真實 JS Date + Core dayData。
     不再從 dayData.year / dayData.month 猜日期。 */
  dayEntry(date){
    const cleanDate=new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const data=this.monthData(
      cleanDate.getFullYear(),
      cleanDate.getMonth()+1
    );

    const dayData=data.days.find(d=>d.day===cleanDate.getDate())||null;

    return dayData ? {date:cleanDate,dayData} : null;
  }

  monthCells(){
    const year=this.focus.getFullYear();
    const month=this.focus.getMonth();
    const data=this.monthData(year,month+1);

    const cells=[
      ...Array(data.firstWeekday).fill(null)
    ];

    data.days.forEach(dayData=>{
      cells.push({
        date:new Date(year,month,dayData.day),
        dayData
      });
    });

    return cells;
  }

  weekCells(){
    const weeks=VIEW_WEEKS[this.options.view]||1;
    const start=startOfWeek(this.focus);

    return Array.from(
      {length:weeks*7},
      (_,i)=>this.dayEntry(addDays(start,i))
    );
  }

  cell(entry){
    if(!entry){
      const e=document.createElement("div");
      e.className="sc-day sc-empty";
      e.setAttribute("aria-hidden","true");
      return e;
    }

    const {date,dayData}=entry;

    const b=document.createElement("button");
    b.type="button";
    b.className="sc-day";

    if(dayData.weekday===0 || dayData.weekday===6){
      b.classList.add("is-weekend");
    }

    if(sameDay(date,new Date())){
      b.classList.add("is-today");
    }

    if(sameDay(date,this.selected)){
      b.classList.add("is-selected");
    }

    if(
      this.options.view!=="month" &&
      date.getMonth()!==this.focus.getMonth()
    ){
      b.classList.add("is-outside");
    }

    const solar=document.createElement("span");
    solar.className="sc-solar-date";
    solar.textContent=String(dayData.day);

    if(
      this.options.bold.solarDate ||
      (
        this.options.bold.weekend &&
        (dayData.weekday===0 || dayData.weekday===6)
      )
    ){
      solar.classList.add("is-bold");
    }

    b.appendChild(solar);

    if(this.options.showLunar){
      const text=getLunarText(dayData.lunar);

      if(text){
        const el=document.createElement("span");
        el.className="sc-day-detail sc-lunar";
        if(this.options.bold.lunar) el.classList.add("is-bold");
        el.textContent=text;
        b.appendChild(el);
      }
    }

    if(this.options.showFestivals){
      /* 關鍵修正：沿用 Generator 的 dayData.date */
      getFestivals(dayData.date).forEach(name=>{
        const el=document.createElement("span");
        el.className="sc-day-detail sc-festival";
        if(this.options.bold.festival) el.classList.add("is-bold");
        el.textContent=name;
        b.appendChild(el);
      });
    }

    if(this.options.showSolarTerms){
      getTerms(dayData.solarTerm).forEach(name=>{
        const el=document.createElement("span");
        el.className="sc-day-detail sc-solar-term";
        if(this.options.bold.solarTerm) el.classList.add("is-bold");
        el.textContent=name;
        b.appendChild(el);
      });
    }

    b.onclick=()=>{
      this.selected=new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      this.focus=new Date(this.selected);
      this.render();
    };

    return b;
  }

  renderDetail(){
    const entry=this.dayEntry(this.selected);
    const detail=this.root.querySelector(".sc-detail");

    detail.querySelector(".sc-detail-date").textContent=
      `${this.selected.getFullYear()} 年 ${this.selected.getMonth()+1} 月 ${this.selected.getDate()} 日`;

    if(!entry){
      detail.querySelector(".sc-detail-lunar").textContent="";
      detail.querySelector(".sc-detail-special").textContent="";
      return;
    }

    const {dayData}=entry;

    detail.querySelector(".sc-detail-lunar").textContent=
      this.options.showLunar
        ? `農曆 ${getLunarText(dayData.lunar)}`
        : "";

    const special=[];

    if(this.options.showFestivals){
      special.push(...getFestivals(dayData.date));
    }

    if(this.options.showSolarTerms){
      special.push(...getTerms(dayData.solarTerm));
    }

    detail.querySelector(".sc-detail-special").textContent=
      special.join("　");
  }

  renderHeader(){
    this.root.querySelector(".sc-title-year").textContent=
      this.focus.getFullYear()+" 年";

    this.root.querySelector(".sc-title-month").textContent=
      (this.focus.getMonth()+1)+" 月";

    this.root.querySelector(".sc-hero-month").textContent=
      MONTHS[this.selected.getMonth()];

    this.root.querySelector(".sc-hero-year").textContent=
      String(this.selected.getFullYear());

    this.root.querySelector(".sc-hero-day").textContent=
      String(this.selected.getDate());
  }

  render(){
    try{
      if(!global.Calendar?.getMonth){
        throw new Error("請先載入 Calendar Core。");
      }

      this.clearError();

      this.root.dataset.view=this.options.view;
      this.root.dataset.grid=this.options.gridLines?"on":"off";

      this.renderHeader();

      const cells=
        this.options.view==="month"
          ? this.monthCells()
          : this.weekCells();

      const frag=document.createDocumentFragment();

      cells.forEach(entry=>{
        frag.appendChild(this.cell(entry));
      });

      this.grid.replaceChildren(frag);
      this.renderDetail();

    }catch(err){
      this.grid.replaceChildren();
      this.showError(
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  shift(direction){
    if(this.options.view==="month"){
      const target=new Date(
        this.focus.getFullYear(),
        this.focus.getMonth()+direction,
        1
      );

      const day=Math.min(
        this.selected.getDate(),
        new Date(
          target.getFullYear(),
          target.getMonth()+1,
          0
        ).getDate()
      );

      this.selected=new Date(
        target.getFullYear(),
        target.getMonth(),
        day
      );

      this.focus=new Date(this.selected);

    }else{
      const weeks=VIEW_WEEKS[this.options.view]||1;
      this.selected=addDays(
        this.selected,
        direction*weeks*7
      );
      this.focus=new Date(this.selected);
    }

    this.render();
  }

  goToday(){
    this.selected=localDate();
    this.focus=new Date(this.selected);
    this.render();
  }

  setView(view){
    if(!["month","3weeks","2weeks","week"].includes(view)){
      throw new Error("不支援的 view。");
    }

    this.options.view=view;
    this.render();
  }

  setDate(value){
    this.selected=localDate(value);
    this.focus=new Date(this.selected);
    this.render();
  }

  update(options={}){
    this.options={
      ...this.options,
      ...options,
      bold:{
        ...this.options.bold,
        ...(options.bold||{})
      }
    };

    if(options.date){
      this.setDate(options.date);
    }else{
      this.render();
    }
  }

  destroy(){
    this.target.replaceChildren();
  }
}

global.SlowlyCalendar={
  mount(target,options){
    const el=resolveTarget(target);

    if(!el){
      throw new Error("SlowlyCalendar 找不到 mount 目標。");
    }

    return new CalendarComponent(el,options);
  }
};

})(window);
