/*!
 * Slowly Data Search Sort Component v1
 * stillness by slowly
 *
 * 依賴：
 * - FictionSearch  https://lib.stillnessbyslowly.com/fiction/Fiction_search.js
 * - FictionSort    https://lib.stillnessbyslowly.com/fiction/Fiction_sort.js
 *
 * 元件負責：搜尋輸入 UI、排序選單 UI、組合 FictionSearch + FictionSort、資料更新後重新處理結果。
 * 宿主負責：target、data、search.fields、sort.options、onChange(result)、視覺覆寫。
 * 不負責：儲存、CRUD、Timestamp、Filter、Pagination。
 */
(function(global){
  "use strict";
  const VERSION="1.0.0";
  function clone(v){return typeof global.structuredClone==="function"?global.structuredClone(v):JSON.parse(JSON.stringify(v));}
  function resolveTarget(target){
    if(typeof target==="string"){
      const el=global.document.querySelector(target);
      if(!el) throw new Error(`[SlowlyDataSearchSort] 找不到 target：${target}`);
      return el;
    }
    if(target instanceof global.HTMLElement) return target;
    throw new TypeError("[SlowlyDataSearchSort] target 必須是 selector 字串或 HTMLElement。");
  }
  function assertDependencies(){
    if(!global.FictionSearch||typeof global.FictionSearch.search!=="function") throw new Error("[SlowlyDataSearchSort] 缺少 FictionSearch。請先載入 fiction/Fiction_search.js。");
    if(!global.FictionSort||typeof global.FictionSort.sort!=="function") throw new Error("[SlowlyDataSearchSort] 缺少 FictionSort。請先載入 fiction/Fiction_sort.js。");
  }
  function normalizeSortOptions(options){
    if(!Array.isArray(options)||options.length===0) return [];
    return options.map((raw,index)=>{
      const o=raw??{}, value=String(o.value??"").trim(), label=String(o.label??"").trim();
      if(!value) throw new Error(`[SlowlyDataSearchSort] sort.options[${index}] 缺少 value。`);
      if(!label) throw new Error(`[SlowlyDataSearchSort] sort.options[${index}] 缺少 label。`);
      return {value,label,field:String(o.field??"createdAt"),direction:o.direction==="desc"?"desc":"asc",type:String(o.type??"auto"),compare:typeof o.compare==="function"?o.compare:undefined};
    });
  }
  function normalizeOptions(rawOptions){
    const o=rawOptions??{};
    if(!Array.isArray(o.data)) throw new TypeError("[SlowlyDataSearchSort] data 必須是陣列。");
    const search=o.search===false?false:{fields:Array.isArray(o.search?.fields)?[...o.search.fields]:[],placeholder:String(o.search?.placeholder??"搜尋"),label:String(o.search?.label??"搜尋")};
    const sort=o.sort===false?false:{label:String(o.sort?.label??"排序"),options:normalizeSortOptions(o.sort?.options)};
    if(search===false&&sort===false) throw new Error("[SlowlyDataSearchSort] search 與 sort 不可同時停用。");
    if(sort!==false&&sort.options.length===0) throw new Error("[SlowlyDataSearchSort] 啟用 sort 時必須提供至少一個 sort.options。");
    let defaultSort="";
    if(sort!==false){const requested=String(o.sort?.defaultValue??"");defaultSort=sort.options.some(x=>x.value===requested)?requested:sort.options[0].value;}
    return {target:resolveTarget(o.target),data:clone(o.data),search,sort,defaultSort,onChange:typeof o.onChange==="function"?o.onChange:null};
  }
  class DataSearchSortComponent{
    constructor(rawOptions){
      assertDependencies(); this.options=normalizeOptions(rawOptions); this.target=this.options.target; this.data=this.options.data; this.result=[]; this.destroyed=false; this.keyword=""; this.sortValue=this.options.defaultSort;
      this.handleInput=this.handleInput.bind(this); this.handleChange=this.handleChange.bind(this); this.render(); this.refresh();
    }
    render(){
      this.target.innerHTML=""; const root=global.document.createElement("div"); root.className="slowly-data-search-sort"; root.dataset.sdssVersion=VERSION;
      if(this.options.search!==false){
        const group=global.document.createElement("div"),label=global.document.createElement("label"),input=global.document.createElement("input");
        group.className="sdss-group sdss-search"; label.className="sdss-label"; label.textContent=this.options.search.label; input.type="search"; input.className="sdss-control sdss-search-input"; input.placeholder=this.options.search.placeholder; input.autocomplete="off"; label.append(input); group.append(label); root.append(group); input.addEventListener("input",this.handleInput); this.searchInput=input;
      }
      if(this.options.sort!==false){
        const group=global.document.createElement("div"),label=global.document.createElement("label"),select=global.document.createElement("select");
        group.className="sdss-group sdss-sort"; label.className="sdss-label"; label.textContent=this.options.sort.label; select.className="sdss-control sdss-sort-select";
        this.options.sort.options.forEach(o=>{const item=global.document.createElement("option");item.value=o.value;item.textContent=o.label;select.append(item);});
        select.value=this.sortValue; label.append(select); group.append(label); root.append(group); select.addEventListener("change",this.handleChange); this.sortSelect=select;
      }
      this.root=root; this.target.append(root);
    }
    handleInput(e){this.keyword=e.target.value;this.refresh();}
    handleChange(e){this.sortValue=e.target.value;this.refresh();}
    process(){
      let result=[...this.data];
      if(this.options.search!==false) result=global.FictionSearch.search(result,this.keyword,this.options.search.fields);
      if(this.options.sort!==false){const selected=this.options.sort.options.find(o=>o.value===this.sortValue);if(selected) result=global.FictionSort.sort(result,{field:selected.field,direction:selected.direction,type:selected.type,compare:selected.compare});}
      return result;
    }
    refresh(){this.ensureAlive();this.result=this.process();const output=clone(this.result);if(this.options.onChange)this.options.onChange(output);return output;}
    setData(data){this.ensureAlive();if(!Array.isArray(data))throw new TypeError("[SlowlyDataSearchSort] setData(data) 的 data 必須是陣列。");this.data=clone(data);return this.refresh();}
    getResult(){this.ensureAlive();return clone(this.result);}
    ensureAlive(){if(this.destroyed)throw new Error("[SlowlyDataSearchSort] 此元件已 destroy()。");}
    destroy(){if(this.destroyed)return;if(this.searchInput)this.searchInput.removeEventListener("input",this.handleInput);if(this.sortSelect)this.sortSelect.removeEventListener("change",this.handleChange);this.target.innerHTML="";this.destroyed=true;}
  }
  const SlowlyDataSearchSort=Object.freeze({version:VERSION,create(options={}){return new DataSearchSortComponent(options);}});
  Object.defineProperty(global,"SlowlyDataSearchSort",{value:SlowlyDataSearchSort,writable:false,configurable:false,enumerable:true});
})(typeof window!=="undefined"?window:globalThis);
