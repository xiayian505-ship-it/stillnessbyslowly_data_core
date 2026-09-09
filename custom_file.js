/* Slowly Custom File v1 */
(function(global){
  "use strict";

  function getRoot(target){
    if(!target) return null;
    if(typeof target === "string") return document.querySelector(target);
    return target;
  }

  function init(target){
    const root = getRoot(target);
    if(!root || root.dataset.slowlyFileReady === "true") return root;

    const input = root.querySelector(".slowly-file-native");
    const trigger = root.querySelector(".slowly-file-trigger");
    const label = root.querySelector(".slowly-file-label");

    if(!input || input.type !== "file" || !trigger) return root;

    const defaultLabel =
      root.dataset.defaultLabel ||
      label?.textContent?.trim() ||
      "選擇檔案";

    function sync(){
      trigger.disabled = input.disabled;

      if(!label) return;

      const files = input.files;
      if(!files || files.length === 0){
        label.textContent = defaultLabel;
        return;
      }

      if(files.length === 1){
        label.textContent = files[0].name;
        return;
      }

      label.textContent = `已選擇 ${files.length} 個檔案`;
    }

    function open(){
      if(input.disabled) return;
      input.click();
    }

    trigger.addEventListener("click", open);
    input.addEventListener("change", sync);

    root.dataset.slowlyFileReady = "true";
    root._slowlyFile = { input, trigger, label, sync, open };

    sync();
    return root;
  }

  function initAll(scope){
    const base = scope || document;
    return Array.from(base.querySelectorAll(".slowly-file")).map(init);
  }

  function reset(target){
    const root = getRoot(target);
    if(!root) return;

    const input = root.querySelector(".slowly-file-native");
    if(!input) return;

    input.value = "";
    root._slowlyFile?.sync();
  }

  global.SlowlyCustomFile = {
    init,
    initAll,
    reset
  };
})(window);
