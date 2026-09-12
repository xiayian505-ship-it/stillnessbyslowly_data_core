/* =========================================================
   Slowly JSON Viewer
   v1.0.0

   通用 JSON 結構化展示元件。
   - 不限定 schema
   - 不推測欄位語意
   - 支援 Object / Array / primitive / null
   - 支援 JSON object、JSON 字串、.json、JSON 格式 .txt
   - 純前端，不上傳、不儲存

   Global:
   window.SlowlyJSONViewer
========================================================= */

(function(global){
"use strict";

const DEFAULTS = {
  rootLabel: "root",
  showTypes: true,
  showRoot: true,
  collapsedDepth: Infinity,
  sortKeys: false
};

function resolveTarget(target){
  return typeof target === "string"
    ? document.querySelector(target)
    : target;
}

function getType(value){
  if(value === null) return "null";
  if(Array.isArray(value)) return "array";
  return typeof value;
}

function isObjectLike(value){
  return value !== null && typeof value === "object";
}

function stringifyPrimitive(value){
  if(value === null) return "null";
  if(typeof value === "string") return value;
  if(typeof value === "undefined") return "undefined";
  return String(value);
}

function orderedEntries(obj, sortKeys){
  const entries = Object.entries(obj);
  if(!sortKeys) return entries;

  return entries.sort(([a],[b]) =>
    a.localeCompare(b, undefined, {numeric:true, sensitivity:"base"})
  );
}

class JSONViewer{
  constructor(target, options={}){
    this.target = resolveTarget(target);

    if(!this.target){
      throw new Error("SlowlyJSONViewer 找不到 mount 目標。");
    }

    this.options = {
      ...DEFAULTS,
      ...options
    };

    this.value = undefined;
    this.build();
  }

  build(){
    this.target.replaceChildren();

    this.root = document.createElement("div");
    this.root.className = "slowly-json-viewer";

    this.content = document.createElement("div");
    this.content.className = "sjv-content";

    this.status = document.createElement("div");
    this.status.className = "sjv-status";
    this.status.hidden = true;

    this.root.append(this.content, this.status);
    this.target.appendChild(this.root);
  }

  setStatus(message, type="info"){
    this.status.hidden = false;
    this.status.dataset.type = type;
    this.status.textContent = message;
  }

  clearStatus(){
    this.status.hidden = true;
    this.status.removeAttribute("data-type");
    this.status.textContent = "";
  }

  load(value){
    this.value = value;
    this.clearStatus();
    this.render();
    return this;
  }

  loadText(text){
    if(typeof text !== "string"){
      throw new Error("loadText(text) 需要字串。");
    }

    try{
      return this.load(JSON.parse(text));
    }catch(err){
      this.value = undefined;
      this.content.replaceChildren();
      this.setStatus(
        "JSON 解析失敗：" + (err instanceof Error ? err.message : String(err)),
        "error"
      );
      return this;
    }
  }

  async loadFile(file){
    if(!(file instanceof Blob)){
      throw new Error("loadFile(file) 需要 File 或 Blob。");
    }

    return this.loadText(await file.text());
  }

  render(){
    this.content.replaceChildren();

    const node = this.createNode(
      this.value,
      this.options.rootLabel,
      0,
      true
    );

    if(this.options.showRoot){
      this.content.appendChild(node);
    }else if(isObjectLike(this.value)){
      const children = this.createChildren(this.value, 0);
      this.content.appendChild(children);
    }else{
      this.content.appendChild(node);
    }
  }

  createNode(value, key, depth, isRoot=false){
    const type = getType(value);

    if(type === "object" || type === "array"){
      return this.createBranch(value, key, depth, isRoot);
    }

    return this.createLeaf(value, key, type, isRoot);
  }

  createBranch(value, key, depth, isRoot){
    const wrap = document.createElement("div");
    wrap.className = "sjv-node sjv-branch";
    wrap.dataset.type = getType(value);

    const details = document.createElement("details");
    details.className = "sjv-details";

    const shouldOpen = depth < this.options.collapsedDepth;
    details.open = shouldOpen;

    const summary = document.createElement("summary");
    summary.className = "sjv-summary";

    if(!(isRoot && !this.options.showRoot)){
      const keyEl = document.createElement("span");
      keyEl.className = "sjv-key";
      keyEl.textContent = key;
      summary.appendChild(keyEl);

      if(this.options.showTypes){
        const typeEl = document.createElement("span");
        typeEl.className = "sjv-type";
        typeEl.textContent = getType(value);
        summary.appendChild(typeEl);
      }

      const countEl = document.createElement("span");
      countEl.className = "sjv-count";
      countEl.textContent = Array.isArray(value)
        ? String(value.length)
        : String(Object.keys(value).length);
      summary.appendChild(countEl);
    }

    const children = this.createChildren(value, depth + 1);

    details.append(summary, children);
    wrap.appendChild(details);

    return wrap;
  }

  createChildren(value, depth){
    const children = document.createElement("div");
    children.className = "sjv-children";

    if(Array.isArray(value)){
      value.forEach((item, index)=>{
        children.appendChild(
          this.createNode(item, String(index), depth)
        );
      });

      if(value.length === 0){
        children.appendChild(this.createEmpty("empty array"));
      }

      return children;
    }

    const entries = orderedEntries(
      value,
      this.options.sortKeys
    );

    entries.forEach(([key, item])=>{
      children.appendChild(
        this.createNode(item, key, depth)
      );
    });

    if(entries.length === 0){
      children.appendChild(this.createEmpty("empty object"));
    }

    return children;
  }

  createLeaf(value, key, type, isRoot=false){
    const row = document.createElement("div");
    row.className = "sjv-node sjv-leaf";
    row.dataset.type = type;

    if(!(isRoot && !this.options.showRoot)){
      const keyEl = document.createElement("span");
      keyEl.className = "sjv-key";
      keyEl.textContent = key;
      row.appendChild(keyEl);
    }

    if(this.options.showTypes){
      const typeEl = document.createElement("span");
      typeEl.className = "sjv-type";
      typeEl.textContent = type;
      row.appendChild(typeEl);
    }

    const valueEl = document.createElement("span");
    valueEl.className = "sjv-value";
    valueEl.textContent = stringifyPrimitive(value);
    row.appendChild(valueEl);

    return row;
  }

  createEmpty(text){
    const el = document.createElement("div");
    el.className = "sjv-empty";
    el.textContent = text;
    return el;
  }

  update(options={}){
    this.options = {
      ...this.options,
      ...options
    };

    this.render();
    return this;
  }

  expandAll(){
    this.root.querySelectorAll("details").forEach(el=>{
      el.open = true;
    });
    return this;
  }

  collapseAll(){
    this.root.querySelectorAll("details").forEach(el=>{
      el.open = false;
    });
    return this;
  }

  clear(){
    this.value = undefined;
    this.content.replaceChildren();
    this.clearStatus();
    return this;
  }

  destroy(){
    this.value = undefined;
    this.target.replaceChildren();
  }
}

global.SlowlyJSONViewer = {
  mount(target, options){
    return new JSONViewer(target, options);
  }
};

})(window);
