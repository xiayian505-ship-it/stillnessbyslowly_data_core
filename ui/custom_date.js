/* Slowly Custom Date v1
   stillness by slowly / UI

   目的：
   - 取代手機 / 瀏覽器原生 date 的可見介面
   - 保留原生 <input type="date"> 作為真正的資料欄位
   - 支援年月切換、日期選取、今天提示、已選日期、清除
   - 選擇或清除後同步 value，並觸發原生 input / change 事件
   - 支援 min / max / disabled
   - 支援同頁多實例，彼此隔離
   - 點外部或按 Escape 關閉
   - 程式修改 input.value 後可呼叫 instance.sync()

   基本：
     const myDate = SlowlyDate.create("#myDate");

   API：
     instance.sync()
     instance.open()
     instance.close()
     instance.destroy()

   批次：
     SlowlyDate.createAll('input[type="date"][data-slowly-date]')
*/

(function(global){
  "use strict";

  const INSTANCE_KEY = "__slowlyDateInstance";
  const instances = new Set();

  function resolveElement(target){
    if(typeof target === "string"){
      return document.querySelector(target);
    }

    return target instanceof HTMLInputElement && target.type === "date"
      ? target
      : null;
  }

  function parseDate(value){
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if(!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if(
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ){
      return null;
    }

    return { year, month, day };
  }

  function formatDate(year, month, day){
    return [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");
  }

  function todayValue(){
    const now = new Date();
    return formatDate(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
  }

  function monthFromValue(value){
    const parsed = parseDate(value);

    if(parsed){
      return { year: parsed.year, month: parsed.month };
    }

    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  function isAllowed(nativeInput, value){
    if(nativeInput.min && value < nativeInput.min) return false;
    if(nativeInput.max && value > nativeInput.max) return false;
    return true;
  }

  function closeOthers(exceptInstance){
    instances.forEach(instance=>{
      if(instance !== exceptInstance){
        instance.close();
      }
    });
  }

  function create(target, options = {}){
    const nativeInput = resolveElement(target);

    if(!nativeInput){
      console.warn("[SlowlyDate] 找不到 input[type=date]：", target);
      return null;
    }

    if(nativeInput[INSTANCE_KEY]){
      return nativeInput[INSTANCE_KEY];
    }

    const wrapper = document.createElement("div");
    wrapper.className = "slowly-date";

    if(options.className){
      wrapper.classList.add(
        ...String(options.className).split(/\s+/).filter(Boolean)
      );
    }

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "slowly-date-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.className = "slowly-date-label";

    const arrow = document.createElement("span");
    arrow.className = "slowly-date-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "▾";

    trigger.append(label, arrow);

    const panel = document.createElement("div");
    panel.className = "slowly-date-panel";
    panel.setAttribute("role", "dialog");
    panel.hidden = true;

    const header = document.createElement("div");
    header.className = "slowly-date-header";

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = "slowly-date-prev";
    prevButton.setAttribute("aria-label", "上一月");
    prevButton.textContent = "‹";

    const monthLabel = document.createElement("div");
    monthLabel.className = "slowly-date-month";
    monthLabel.setAttribute("aria-live", "polite");

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "slowly-date-next";
    nextButton.setAttribute("aria-label", "下一月");
    nextButton.textContent = "›";

    header.append(prevButton, monthLabel, nextButton);

    const weekdays = document.createElement("div");
    weekdays.className = "slowly-date-weekdays";
    ["日","一","二","三","四","五","六"].forEach(text=>{
      const item = document.createElement("span");
      item.textContent = text;
      weekdays.appendChild(item);
    });

    const days = document.createElement("div");
    days.className = "slowly-date-days";

    const footer = document.createElement("div");
    footer.className = "slowly-date-footer";

    const todayButton = document.createElement("button");
    todayButton.type = "button";
    todayButton.className = "slowly-date-today-action";
    todayButton.textContent = "今天";

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "slowly-date-clear";
    clearButton.textContent = "清除";

    footer.append(todayButton, clearButton);
    panel.append(header, weekdays, days, footer);

    nativeInput.parentNode.insertBefore(wrapper, nativeInput);
    wrapper.append(trigger, panel, nativeInput);

    nativeInput.classList.add("slowly-date-native");
    nativeInput.tabIndex = -1;
    nativeInput.setAttribute("aria-hidden", "true");

    const originalTabIndex = nativeInput.getAttribute("tabindex");
    const originalAriaHidden = nativeInput.getAttribute("aria-hidden");

    let view = monthFromValue(nativeInput.value);

    function emitValue(value){
      nativeInput.value = value;

      nativeInput.dispatchEvent(
        new Event("input", { bubbles:true })
      );

      nativeInput.dispatchEvent(
        new Event("change", { bubbles:true })
      );
    }

    function selectValue(value){
      if(!isAllowed(nativeInput, value)) return;

      emitValue(value);
      sync();
      close();
      trigger.focus();
    }

    function render(){
      const selected = parseDate(nativeInput.value);
      const today = todayValue();

      monthLabel.textContent = `${view.year} 年 ${view.month} 月`;
      days.innerHTML = "";

      const firstDay = new Date(view.year, view.month - 1, 1).getDay();
      const totalDays = new Date(view.year, view.month, 0).getDate();

      for(let i = 0; i < firstDay; i += 1){
        const spacer = document.createElement("span");
        spacer.className = "slowly-date-spacer";
        spacer.setAttribute("aria-hidden", "true");
        days.appendChild(spacer);
      }

      for(let day = 1; day <= totalDays; day += 1){
        const value = formatDate(view.year, view.month, day);
        const button = document.createElement("button");

        button.type = "button";
        button.className = "slowly-date-day";
        button.textContent = String(day);
        button.dataset.value = value;
        button.disabled = !isAllowed(nativeInput, value);

        if(value === today){
          button.classList.add("is-today");
        }

        if(
          selected &&
          selected.year === view.year &&
          selected.month === view.month &&
          selected.day === day
        ){
          button.classList.add("is-selected");
          button.setAttribute("aria-current", "date");
        }

        button.addEventListener("click", ()=>{
          selectValue(value);
        });

        days.appendChild(button);
      }

      const todayAllowed = isAllowed(nativeInput, today);
      todayButton.disabled = !todayAllowed;
      clearButton.disabled = !nativeInput.value;
    }

    function sync(){
      const parsed = parseDate(nativeInput.value);

      label.textContent = parsed
        ? nativeInput.value
        : (nativeInput.placeholder || "選擇日期");

      trigger.disabled = nativeInput.disabled;

      if(parsed){
        view = { year: parsed.year, month: parsed.month };
      }

      render();
    }

    function open(){
      if(trigger.disabled) return;

      closeOthers(instance);
      sync();

      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
    }

    function close(){
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    function toggle(){
      if(trigger.getAttribute("aria-expanded") === "true"){
        close();
      }else{
        open();
      }
    }

    function moveMonth(offset){
      const date = new Date(view.year, view.month - 1 + offset, 1);
      view = {
        year: date.getFullYear(),
        month: date.getMonth() + 1
      };
      render();
    }

    function onTriggerClick(event){
      event.stopPropagation();
      toggle();
    }

    function onPanelClick(event){
      event.stopPropagation();
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
      panel.removeEventListener("click", onPanelClick);
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("keydown", onDocumentKeydown);
      nativeInput.removeEventListener("change", onNativeChange);

      nativeInput.classList.remove("slowly-date-native");

      if(originalAriaHidden === null){
        nativeInput.removeAttribute("aria-hidden");
      }else{
        nativeInput.setAttribute("aria-hidden", originalAriaHidden);
      }

      if(originalTabIndex === null){
        nativeInput.removeAttribute("tabindex");
      }else{
        nativeInput.setAttribute("tabindex", originalTabIndex);
      }

      wrapper.parentNode.insertBefore(nativeInput, wrapper);
      wrapper.remove();

      instances.delete(instance);
      delete nativeInput[INSTANCE_KEY];
    }

    const instance = {
      input: nativeInput,
      root: wrapper,
      trigger,
      panel,
      sync,
      open,
      close,
      destroy
    };

    nativeInput[INSTANCE_KEY] = instance;
    instances.add(instance);

    trigger.addEventListener("click", onTriggerClick);
    panel.addEventListener("click", onPanelClick);
    prevButton.addEventListener("click", ()=>moveMonth(-1));
    nextButton.addEventListener("click", ()=>moveMonth(1));
    todayButton.addEventListener("click", ()=>selectValue(todayValue()));
    clearButton.addEventListener("click", ()=>{
      emitValue("");
      sync();
      close();
      trigger.focus();
    });

    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeydown);
    nativeInput.addEventListener("change", onNativeChange);

    sync();

    return instance;
  }

  function createAll(
    selector = 'input[type="date"][data-slowly-date]',
    options = {}
  ){
    return Array.from(document.querySelectorAll(selector))
      .map(input=>create(input, options))
      .filter(Boolean);
  }

  global.SlowlyDate = {
    create,
    createAll
  };

})(window);
