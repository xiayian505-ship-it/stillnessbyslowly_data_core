/* Slowly Custom Select v1
   stillness by slowly / UI

   目的：
   - 取代手機 / 瀏覽器原生 select 的可見介面
   - 保留原生 <select> 作為真正的資料欄位
   - 同步 value / option 文字 / disabled
   - 選擇後正常觸發原生 change 事件
   - 支援同頁多實例，彼此隔離
   - 點外部或按 Escape 關閉
   - 程式修改 select.value 後可呼叫 instance.sync()

   基本：
     const mySelect = SlowlySelect.create("#mySelect");

   API：
     instance.sync()
     instance.open()
     instance.close()
     instance.destroy()

   批次：
     SlowlySelect.createAll("select[data-slowly-select]")
*/

(function(global){
  "use strict";

  const INSTANCE_KEY = "__slowlySelectInstance";
  const instances = new Set();

  function resolveElement(target){
    if(typeof target === "string"){
      return document.querySelector(target);
    }

    return target instanceof HTMLSelectElement ? target : null;
  }

  function closeOthers(exceptInstance){
    instances.forEach(instance=>{
      if(instance !== exceptInstance){
        instance.close();
      }
    });
  }

  function create(target, options = {}){
    const nativeSelect = resolveElement(target);

    if(!nativeSelect){
      console.warn("[SlowlySelect] 找不到 select：", target);
      return null;
    }

    if(nativeSelect[INSTANCE_KEY]){
      return nativeSelect[INSTANCE_KEY];
    }

    const wrapper = document.createElement("div");
    wrapper.className = "slowly-select";

    if(options.className){
      wrapper.classList.add(
        ...String(options.className).split(/\s+/).filter(Boolean)
      );
    }

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "slowly-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.className = "slowly-select-label";

    const arrow = document.createElement("span");
    arrow.className = "slowly-select-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "▾";

    trigger.append(label, arrow);

    const menu = document.createElement("div");
    menu.className = "slowly-select-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    const ariaLabel = nativeSelect.getAttribute("aria-label");
    if(ariaLabel){
      menu.setAttribute("aria-label", ariaLabel);
    }

    nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
    wrapper.append(trigger, menu, nativeSelect);

    nativeSelect.classList.add("slowly-select-native");
    nativeSelect.tabIndex = -1;
    nativeSelect.setAttribute("aria-hidden", "true");

    let optionButtons = [];

    function rebuildOptions(){
      menu.innerHTML = "";

      optionButtons = Array.from(nativeSelect.options).map((option, index)=>{
        const button = document.createElement("button");
        button.type = "button";
        button.className = "slowly-select-option";
        button.setAttribute("role", "option");
        button.dataset.index = String(index);
        button.dataset.value = option.value;
        button.textContent = option.textContent;
        button.disabled = option.disabled;

        button.addEventListener("click", ()=>{
          if(button.disabled) return;

          nativeSelect.selectedIndex = Number(button.dataset.index);
          sync();

          nativeSelect.dispatchEvent(
            new Event("change", { bubbles:true })
          );

          close();
          trigger.focus();
        });

        menu.appendChild(button);
        return button;
      });
    }

    function sync(){
      const nativeOptions = Array.from(nativeSelect.options);

      const needsRebuild =
        nativeOptions.length !== optionButtons.length ||
        nativeOptions.some((option, index)=>{
          const button = optionButtons[index];

          return !button ||
            button.dataset.value !== option.value ||
            button.textContent !== option.textContent ||
            button.disabled !== option.disabled;
        });

      if(needsRebuild){
        rebuildOptions();
      }

      const selected = nativeSelect.options[nativeSelect.selectedIndex];
      label.textContent = selected ? selected.textContent : "";
      trigger.disabled = nativeSelect.disabled;

      optionButtons.forEach((button, index)=>{
        const option = nativeSelect.options[index];
        const isSelected = !!option && index === nativeSelect.selectedIndex;

        button.setAttribute(
          "aria-selected",
          isSelected ? "true" : "false"
        );

        if(option){
          button.dataset.value = option.value;
          button.textContent = option.textContent;
          button.disabled = option.disabled;
        }
      });
    }

    function open(){
      if(trigger.disabled) return;

      closeOthers(instance);
      sync();

      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
    }

    function close(){
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    function toggle(){
      if(trigger.getAttribute("aria-expanded") === "true"){
        close();
      }else{
        open();
      }
    }

    function onTriggerClick(event){
      event.stopPropagation();
      toggle();
    }

    function onDocumentClick(event){
      if(!wrapper.contains(event.target)){
        close();
      }
    }

    function onDocumentKeydown(event){
      if(event.key === "Escape"){
        close();
      }
    }

    function onNativeChange(){
      sync();
    }

    function destroy(){
      close();

      trigger.removeEventListener("click", onTriggerClick);
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("keydown", onDocumentKeydown);
      nativeSelect.removeEventListener("change", onNativeChange);

      nativeSelect.classList.remove("slowly-select-native");
      nativeSelect.removeAttribute("aria-hidden");
      nativeSelect.removeAttribute("tabindex");

      wrapper.parentNode.insertBefore(nativeSelect, wrapper);
      wrapper.remove();

      instances.delete(instance);
      delete nativeSelect[INSTANCE_KEY];
    }

    rebuildOptions();

    const instance = {
      select: nativeSelect,
      root: wrapper,
      trigger,
      menu,
      sync,
      open,
      close,
      destroy
    };

    nativeSelect[INSTANCE_KEY] = instance;
    instances.add(instance);

    trigger.addEventListener("click", onTriggerClick);
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeydown);
    nativeSelect.addEventListener("change", onNativeChange);

    sync();

    return instance;
  }

  function createAll(selector = "select[data-slowly-select]", options = {}){
    return Array.from(document.querySelectorAll(selector))
      .map(select=>create(select, options))
      .filter(Boolean);
  }

  global.SlowlySelect = {
    create,
    createAll
  };

})(window);
