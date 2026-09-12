/*!
 * json_viewer_component.js
 * stillness by slowly
 * Slowly JSON Viewer Component v1.0.0
 *
 * 完成品操作層。
 * Dependencies:
 * - FictionStorage
 * - SlowlyJSONViewer
 */
(function(global){
"use strict";

const VERSION="1.0.0";

const DEFAULTS={
  namespace:"slowly-json-viewer",
  collection:"documents",
  initialValue:null,
  rootLabel:"root",
  showTypes:true,
  collapsedDepth:Infinity,
  sortKeys:false
};

function resolveTarget(target){
  return typeof target==="string"
    ? document.querySelector(target)
    : target;
}

function clone(value){
  if(value===undefined) return undefined;

  if(typeof global.structuredClone==="function"){
    return global.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function fileName(name){
  return String(name||"")
    .replace(/\.(json|txt)$/i,"")
    .trim() || "未命名 JSON";
}

class JSONViewerComponent{
  constructor(target,options={}){
    this.target=target;
    this.options={...DEFAULTS,...options};

    if(!global.SlowlyJSONViewer?.mount){
      throw new Error("請先載入 SlowlyJSONViewer。");
    }

    if(!global.FictionStorage?.create){
      throw new Error("請先載入 FictionStorage。");
    }

    this.store=global.FictionStorage.create({
      namespace:this.options.namespace
    });

    this.documents=this.store.collection(
      this.options.collection
    );

    this.current=undefined;
    this.currentId=null;
    this.viewer=null;

    this.build();
    this.bind();
    this.refreshSaved();

    if(this.options.initialValue!==null){
      this.load(this.options.initialValue);
    }
  }

  build(){
    this.target.replaceChildren();

    const root=document.createElement("section");
    root.className="slowly-json-component";

    root.innerHTML=`
      <div class="sjc-toolbar">
        <button class="sjc-render" type="button">顯示 JSON</button>

        <label>
          匯入檔案
          <input
            class="sjc-file"
            type="file"
            accept=".json,.txt,application/json,text/plain"
          >
        </label>

        <button class="sjc-clear" type="button">清空</button>
        <button class="sjc-expand" type="button">全部展開</button>
        <button class="sjc-collapse" type="button">全部收合</button>
      </div>

      <textarea
        class="sjc-editor"
        spellcheck="false"
        placeholder='貼上 JSON，例如 {"hello":"world"}'
      ></textarea>

      <div class="sjc-row">
        <input
          class="sjc-name"
          type="text"
          placeholder="儲存名稱"
        >
        <button class="sjc-save" type="button">儲存</button>
      </div>

      <div class="sjc-row">
        <input
          class="sjc-search"
          type="search"
          placeholder="搜尋目前 JSON"
        >
        <button class="sjc-search-clear" type="button">
          清除標亮
        </button>
      </div>

      <p class="sjc-status" aria-live="polite"></p>

      <div class="sjc-workspace">
        <aside>
          <strong>已儲存</strong>
          <div class="sjc-saved-list"></div>
        </aside>

        <div class="sjc-viewer"></div>
      </div>
    `;

    this.target.appendChild(root);

    this.root=root;
    this.editor=root.querySelector(".sjc-editor");
    this.nameInput=root.querySelector(".sjc-name");
    this.searchInput=root.querySelector(".sjc-search");
    this.status=root.querySelector(".sjc-status");
    this.savedList=root.querySelector(".sjc-saved-list");
    this.viewerTarget=root.querySelector(".sjc-viewer");
  }

  bind(){
    this.root.querySelector(".sjc-render").onclick=()=>{
      this.loadText(this.editor.value);
    };

    this.root.querySelector(".sjc-clear").onclick=()=>{
      this.clear();
    };

    this.root.querySelector(".sjc-expand").onclick=()=>{
      this.viewer?.expandAll?.();
    };

    this.root.querySelector(".sjc-collapse").onclick=()=>{
      this.viewer?.collapseAll?.();
    };

    this.root.querySelector(".sjc-save").onclick=()=>{
      this.save();
    };

    this.root.querySelector(".sjc-search-clear").onclick=()=>{
      this.searchInput.value="";
      this.highlight("");
    };

    this.searchInput.addEventListener("input",()=>{
      this.highlight(this.searchInput.value);
    });

    this.root.querySelector(".sjc-file")
      .addEventListener("change",async event=>{
        const file=event.target.files?.[0];

        if(!file) return;

        try{
          const text=await file.text();

          this.editor.value=text;
          this.nameInput.value=fileName(file.name);

          this.loadText(text);
        }catch(error){
          this.showError(error);
        }finally{
          event.target.value="";
        }
      });
  }

  viewerOptions(){
    return {
      rootLabel:this.options.rootLabel,
      showTypes:this.options.showTypes,
      collapsedDepth:this.options.collapsedDepth,
      sortKeys:this.options.sortKeys
    };
  }

  load(value){
    try{
      this.current=clone(value);
      this.editor.value=JSON.stringify(value,null,2);

      this.viewer?.destroy?.();

      this.viewer=global.SlowlyJSONViewer.mount(
        this.viewerTarget,
        {
          ...this.viewerOptions(),
          data:value
        }
      );

      this.status.textContent="JSON 已顯示。";
      this.highlight(this.searchInput.value);

      return clone(value);

    }catch(error){
      this.showError(error);
      return null;
    }
  }

  loadText(text){
    try{
      return this.load(JSON.parse(String(text)));
    }catch(error){
      this.showError(
        "JSON 格式錯誤："+(
          error instanceof Error
            ? error.message
            : String(error)
        )
      );

      return null;
    }
  }

  async save(){
    if(this.current===undefined){
      if(this.loadText(this.editor.value)===null){
        return null;
      }
    }

    const name=
      this.nameInput.value.trim() ||
      "未命名 JSON";

    try{
      let saved;

      if(this.currentId){
        saved=await this.documents.update(
          this.currentId,
          {
            name,
            data:clone(this.current)
          }
        );
      }else{
        saved=await this.documents.add({
          name,
          data:clone(this.current)
        });

        this.currentId=saved.id;
      }

      this.nameInput.value=saved.name;

      await this.refreshSaved();

      this.status.textContent=
        `已儲存：${saved.name}`;

      return saved;

    }catch(error){
      this.showError(error);
      return null;
    }
  }

  async openSaved(id){
    try{
      const record=await this.documents.get(id);

      if(!record) return;

      this.currentId=record.id;
      this.nameInput.value=record.name||"";

      this.load(record.data);

      this.status.textContent=
        `已開啟：${record.name||"未命名 JSON"}`;

    }catch(error){
      this.showError(error);
    }
  }

  async removeSaved(id){
    try{
      await this.documents.remove(id);

      if(String(this.currentId)===String(id)){
        this.currentId=null;
      }

      await this.refreshSaved();
      this.status.textContent="已刪除。";

    }catch(error){
      this.showError(error);
    }
  }

  async refreshSaved(){
    try{
      const records=await this.documents.all();

      this.savedList.replaceChildren();

      if(!records.length){
        this.savedList.textContent="尚未儲存 JSON。";
        return;
      }

      records
        .slice()
        .sort((a,b)=>
          String(b.updatedAt||"")
            .localeCompare(String(a.updatedAt||""))
        )
        .forEach(record=>{
          const row=document.createElement("div");
          row.className="sjc-saved-item";

          const open=document.createElement("button");
          open.type="button";
          open.className="sjc-open";
          open.textContent=
            record.name||"未命名 JSON";

          open.onclick=()=>{
            this.openSaved(record.id);
          };

          const remove=document.createElement("button");
          remove.type="button";
          remove.textContent="刪除";

          remove.onclick=()=>{
            this.removeSaved(record.id);
          };

          row.append(open,remove);
          this.savedList.appendChild(row);
        });

    }catch(error){
      this.showError(error);
    }
  }

  highlight(query){
    this.viewerTarget
      .querySelectorAll(".sjc-hit")
      .forEach(el=>{
        el.classList.remove("sjc-hit");
      });

    const text=
      String(query||"")
        .trim()
        .toLocaleLowerCase();

    if(!text) return 0;

    const hits=[
      ...this.viewerTarget.querySelectorAll("*")
    ].filter(el=>{
      if(el.children.length) return false;

      return String(el.textContent||"")
        .toLocaleLowerCase()
        .includes(text);
    });

    hits.forEach(el=>{
      el.classList.add("sjc-hit");
    });

    this.status.textContent=
      hits.length
        ? `找到 ${hits.length} 個結果。`
        : "沒有找到符合內容。";

    hits[0]?.scrollIntoView({
      behavior:"smooth",
      block:"center"
    });

    return hits.length;
  }

  clear(){
    this.current=undefined;
    this.currentId=null;

    this.editor.value="";
    this.nameInput.value="";
    this.searchInput.value="";
    this.status.textContent="";

    if(this.viewer?.clear){
      this.viewer.clear();
    }else{
      this.viewerTarget.replaceChildren();
    }
  }

  showError(error){
    this.status.textContent=
      error instanceof Error
        ? error.message
        : String(error);
  }

  destroy(){
    this.viewer?.destroy?.();
    this.target.replaceChildren();
  }
}

const SlowlyJSONViewerComponent=Object.freeze({
  version:VERSION,

  mount(target,options={}){
    const el=resolveTarget(target);

    if(!el){
      throw new Error(
        "SlowlyJSONViewerComponent 找不到 mount 目標。"
      );
    }

    return new JSONViewerComponent(
      el,
      options
    );
  }
});

Object.defineProperty(
  global,
  "SlowlyJSONViewerComponent",
  {
    value:SlowlyJSONViewerComponent,
    writable:false,
    configurable:false,
    enumerable:true
  }
);

})(window);
