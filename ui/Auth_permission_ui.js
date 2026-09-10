/* =========================================================
   慢慢｜Auth_permission_ui.js v1.0.0
   Frontend-only Auth / Permission UI state helper

   【模組定位】
   這是一個「前端狀態與顯示」模組，不是登入系統，也不是權限系統。
   它只負責：
   1. 登入表單的送出 / loading / 錯誤訊息。
   2. 未登入 ↔ 已登入 UI 切換。
   3. 顯示宿主提供的身份 / 權限文字。
   4. 依 role / permissions 顯示或隱藏前端元素。

   【接口怎麼接】
   宿主建立 AuthPermissionUI.create({...}) 時：
   - root：本元件作用範圍的 DOM 或 selector。
   - onLogin({account,password}, ui)：接「真正登入接口」。
       例如：Supabase Auth / Firebase Auth / 自家 PHP API。
       成功後由宿主取得可信任的 session / user / role / permissions，
       再呼叫 ui.setState(...)；本模組不自行猜測登入是否成功。
   - onLogout(ui)：接「真正登出接口」。
       後端/session 清除成功後，再 ui.setState({role:"guest", ...})。
   - setState({...})：宿主把已驗證完成的身份狀態餵給 UI。
       role         : 角色字串，例如 guest / user / editor / admin。
       permissions  : 權限字串陣列，例如 ["read","edit","manage"]。
       displayName  : 可選，宿主需要時保存於 UI state。
       statusText   : 顯示用身份文字。
       permissionText：顯示用權限文字。
   - isLoggedIn(state)：可選。預設 role !== "guest" 即視為已登入。

   【資料庫 / 後端必須負責什麼】
   真正安全性不能交給這支 JS。後端 / 資料庫至少應負責：
   - 驗證帳號、Email、密碼或其他登入憑證。
   - 建立、驗證、更新、失效 session / token。
   - 決定目前使用者真正的 user id / role / permissions。
   - 驗證「這個人能不能讀這筆資料」。
   - 驗證「這個人能不能新增 / 修改 / 刪除這筆資料」。
   - 驗證資源歸屬，例如 user A 只能操作 book-1。
   - 管理者操作也必須在後端再次驗證，不能因前端顯示管理按鈕就放行。
   - 若使用 Supabase：以上資料存取限制應由 RLS / policy 等後端規則落實。
   - 若使用 Firebase / 自家 API / PHP + MySQL：由各自的 Security Rules、
     API middleware、server-side session / authorization 等機制落實。

   【重要安全界線】
   data-permission、data-auth-visible 與 setState() 全部都只是 UI。
   使用者可以修改瀏覽器 DOM / JS / localStorage，因此：
   「按鈕被隱藏」絕對不等於「沒有權限」。
   即使有人手動把管理按鈕顯示出來，真正後端仍必須拒絕未授權請求。

   【本模組刻意不做】
   - 不保存帳號密碼。
   - 不保存或驗證 session/token。
   - 不直接連任何資料庫。
   - 不直接依賴 Supabase / Firebase / PHP。
   - 不提供註冊、忘記密碼、重設密碼、Email 驗證、帳號申請。
   - 不提供 CRUD / 管理後台版型。
========================================================= */
(function(global){
  "use strict";

  function splitTokens(value){
    return String(value || "").split(/[\s,]+/).map(v=>v.trim()).filter(Boolean);
  }

  function create(options = {}){
    const root = typeof options.root === "string" ? document.querySelector(options.root) : options.root;
    if(!root) throw new Error("[AuthPermissionUI] root not found");

    const q = selector=>selector ? root.querySelector(selector) : null;
    const selectors = {
      form:"[data-auth-form]", account:"[data-auth-account]", password:"[data-auth-password]",
      submit:"[data-auth-submit]", message:"[data-auth-message]", logout:"[data-auth-logout]",
      status:"[data-auth-status]", permissionStatus:"[data-permission-status]",
      guestOnly:"[data-auth-visible='guest']", loggedInOnly:"[data-auth-visible='authenticated']",
      permissionTargets:"[data-permission]", ...options.selectors
    };
    const els = {
      form:q(selectors.form), account:q(selectors.account), password:q(selectors.password),
      submit:q(selectors.submit), message:q(selectors.message), logout:q(selectors.logout),
      status:q(selectors.status), permissionStatus:q(selectors.permissionStatus)
    };

    let state={role:"guest",permissions:[],displayName:"",statusText:"",permissionText:""};
    let loading=false;

    function isLoggedIn(){ return typeof options.isLoggedIn==="function" ? !!options.isLoggedIn(state) : state.role!=="guest"; }
    function setHidden(el,hidden){ if(el) el.hidden=!!hidden; }

    function renderPermissionTargets(){
      root.querySelectorAll(selectors.permissionTargets).forEach(el=>{
        const required=splitTokens(el.dataset.permission);
        const mode=el.dataset.permissionMode==="all"?"all":"any";
        const owned=new Set([state.role,...state.permissions]);
        const allowed=required.length===0 ? true : mode==="all" ? required.every(x=>owned.has(x)) : required.some(x=>owned.has(x));
        setHidden(el,!allowed);
      });
    }

    function render(){
      const loggedIn=isLoggedIn();
      setHidden(els.form,loggedIn); setHidden(els.logout,!loggedIn);
      root.querySelectorAll(selectors.guestOnly).forEach(el=>setHidden(el,loggedIn));
      root.querySelectorAll(selectors.loggedInOnly).forEach(el=>setHidden(el,!loggedIn));
      if(els.status) els.status.textContent=state.statusText||"";
      if(els.permissionStatus) els.permissionStatus.textContent=state.permissionText||"";
      renderPermissionTargets();
    }

    function setLoading(next,text){
      loading=!!next;
      if(els.submit){
        els.submit.disabled=loading;
        if(!els.submit.dataset.authIdleText) els.submit.dataset.authIdleText=els.submit.textContent||"登入";
        els.submit.textContent=loading?(text||options.loadingText||"登入中…"):els.submit.dataset.authIdleText;
      }
      if(els.account) els.account.disabled=loading;
      if(els.password) els.password.disabled=loading;
    }
    function setMessage(message=""){ if(els.message) els.message.textContent=String(message||""); }

    /* setState 接受的是「宿主已經確認好的結果」。
       請勿把前端自己推測出的 role 當成真正授權依據。 */
    function setState(next={}){
      state={...state,...next,permissions:Array.isArray(next.permissions)?next.permissions.map(String):state.permissions};
      render(); return getState();
    }
    function getState(){ return {...state,permissions:[...state.permissions]}; }

    async function handleSubmit(event){
      event.preventDefault(); if(loading)return;
      setMessage(""); setLoading(true);
      try{
        if(typeof options.onLogin!=="function") throw new Error("[AuthPermissionUI] onLogin is required");
        /* SECURITY BOUNDARY → 帳密從這裡交給宿主；宿主再送真正 Auth API。
           本模組不驗證、不儲存，也不直接碰資料庫。 */
        await options.onLogin({account:els.account?.value||"",password:els.password?.value||""},api);
      }catch(error){
        setMessage(typeof options.loginErrorText==="function"?options.loginErrorText(error):(options.loginErrorText||"登入失敗。"));
        els.password?.focus();
      }finally{ setLoading(false); }
    }

    async function handleLogout(){
      if(loading)return; setMessage("");
      /* SECURITY BOUNDARY → 真正 token/session 的失效由宿主 onLogout 處理。 */
      if(typeof options.onLogout==="function") await options.onLogout(api);
    }

    els.form?.addEventListener("submit",handleSubmit);
    els.logout?.addEventListener("click",handleLogout);

    const api={
      setState,getState,render,setLoading,setMessage,clearMessage(){setMessage("");},
      clearCredentials(){if(els.account)els.account.value="";if(els.password)els.password.value="";},
      clearPassword(){if(els.password)els.password.value="";}, elements:els,
      destroy(){els.form?.removeEventListener("submit",handleSubmit);els.logout?.removeEventListener("click",handleLogout);}
    };
    render(); return api;
  }

  global.AuthPermissionUI=Object.freeze({version:"1.0.0",create});
})(window);
