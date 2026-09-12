"use strict";

/* =========================================================
   慢慢的倉庫｜Toast v1.0.0

   通用 Toast UI 行為核心。

   API：
   - SlowlyToast.create(target, options?)
   - instance.show(message, options?)
   - instance.hide()
   - instance.destroy()

   預設行為：
   - 將 message 寫入目標元素 textContent
   - 顯示時加入 activeClass（預設 "show"）
   - duration 毫秒後自動移除 activeClass
   - 重複 show() 會重設計時器
   - 同一元素重複 create() 會回傳既有實例

   不負責：
   - Toast 的內容來源
   - 多 Toast 佇列 / 堆疊
   - 業務邏輯
========================================================= */

(function(global){
  "use strict";

  const VERSION = "1.0.0";

  function resolveTarget(target){
    if(typeof target === "string"){
      return document.querySelector(target);
    }

    return target || null;
  }

  function create(target, options = {}){
    const element = resolveTarget(target);

    if(!element){
      throw new Error("Toast target not found");
    }

    if(element.__slowlyToastInstance){
      return element.__slowlyToastInstance;
    }

    const settings = {
      duration: Number.isFinite(Number(options.duration))
        ? Math.max(0, Number(options.duration))
        : 1800,
      activeClass: options.activeClass || "show"
    };

    let timer = 0;

    function clearTimer(){
      if(timer){
        clearTimeout(timer);
        timer = 0;
      }
    }

    function hide(){
      clearTimer();
      element.classList.remove(settings.activeClass);
      return api;
    }

    function show(message, showOptions = {}){
      clearTimer();

      const duration =
        Number.isFinite(Number(showOptions.duration))
          ? Math.max(0, Number(showOptions.duration))
          : settings.duration;

      element.textContent = String(message ?? "");
      element.classList.add(settings.activeClass);

      if(duration > 0){
        timer = setTimeout(() => {
          timer = 0;
          element.classList.remove(settings.activeClass);
        }, duration);
      }

      return api;
    }

    function destroy(){
      hide();

      if(element.__slowlyToastInstance === api){
        delete element.__slowlyToastInstance;
      }
    }

    const api = Object.freeze({
      element,
      show,
      hide,
      destroy
    });

    Object.defineProperty(
      element,
      "__slowlyToastInstance",
      {
        value: api,
        configurable: true
      }
    );

    return api;
  }

  global.SlowlyToast = Object.freeze({
    version: VERSION,
    create
  });
})(window);
