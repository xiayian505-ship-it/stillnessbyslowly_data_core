/*!
 * Realtime_sync.js
 * stillness by slowly
 *
 * 通用 Supabase Realtime 同步工具。
 * 不負責登入、不負責資料儲存、不負責 UI。
 * 只負責：
 * - 訂閱 / 解除訂閱 postgres_changes
 * - 接收遠端變更
 * - 以版本欄位（預設 updated_at）判斷是否為較新版本
 * - 忽略已知版本 / 舊版本事件
 * - Realtime 重新連線後通知 host 重新載入最新資料
 *
 * 用法：
 * <script src="https://lib.stillnessbyslowly.com/data/Realtime_sync.js"></script>
 *
 * const sync = RealtimeSync.create({
 *   client: supabaseClient,
 *   table: "books",
 *   filter: `owner_id=eq.${userId}`,
 *   versionField: "updated_at",
 *   onRemote: async event => {
 *     console.log(event.record, event.version);
 *   },
 *   onReconnect: async () => {
 *     // 建議重新 SELECT 最新資料，再 sync.setKnownVersion(updated_at)
 *   }
 * });
 *
 * sync.setKnownVersion(currentUpdatedAt);
 * await sync.subscribe();
 */

(function(global){
  "use strict";

  const VERSION = "1.0.0";

  function normalizeText(value){
    return String(value ?? "").trim();
  }

  function normalizeVersion(value){
    if(value === null || value === undefined || value === ""){
      return null;
    }

    const text = String(value);
    const time = Date.parse(text);

    if(Number.isNaN(time)){
      return null;
    }

    return {
      raw: text,
      time
    };
  }

  /**
   * 比較兩個時間版本。
   * @returns {number|null}
   * -1: left 較舊
   *  0: 相同
   *  1: left 較新
   * null: 至少一邊無法判斷
   */
  function compareVersion(left, right){
    const a = normalizeVersion(left);
    const b = normalizeVersion(right);

    if(!a || !b){
      return null;
    }

    if(a.time < b.time) return -1;
    if(a.time > b.time) return 1;
    return 0;
  }

  function create(options = {}){
    const client = options.client;

    if(!client || typeof client.channel !== "function"){
      throw new TypeError("[RealtimeSync] client 必須是 Supabase client。");
    }

    const schema = normalizeText(options.schema) || "public";
    const table = normalizeText(options.table);
    const event = normalizeText(options.event) || "UPDATE";
    const filter = normalizeText(options.filter);
    const versionField = normalizeText(options.versionField) || "updated_at";
    const channelName =
      normalizeText(options.channelName) ||
      `realtime-sync:${schema}:${table}:${Math.random().toString(36).slice(2)}`;

    if(!table){
      throw new Error("[RealtimeSync] table is required");
    }

    const onRemote =
      typeof options.onRemote === "function"
        ? options.onRemote
        : async function(){};

    const onStatus =
      typeof options.onStatus === "function"
        ? options.onStatus
        : function(){};

    const onReconnect =
      typeof options.onReconnect === "function"
        ? options.onReconnect
        : async function(){};

    let channel = null;
    let knownVersion = normalizeVersion(options.knownVersion)?.raw ?? null;
    let destroyed = false;
    let everSubscribed = false;
    let lastStatus = "";

    function getKnownVersion(){
      return knownVersion;
    }

    function setKnownVersion(value){
      knownVersion = normalizeVersion(value)?.raw ?? null;
      return knownVersion;
    }

    function isNewer(value){
      const incoming = normalizeVersion(value);

      if(!incoming){
        return null;
      }

      if(!knownVersion){
        return true;
      }

      const result = compareVersion(incoming.raw, knownVersion);

      return result === null ? null : result > 0;
    }

    async function handlePayload(payload){
      if(destroyed) return;

      const record = payload?.new ?? null;
      const oldRecord = payload?.old ?? null;
      const version =
        record && typeof record === "object"
          ? (record[versionField] ?? null)
          : null;

      const comparison =
        knownVersion === null || version === null
          ? null
          : compareVersion(version, knownVersion);

      // 自己剛存完的事件，或比目前本機已知版本更舊的事件，不重複套用。
      if(comparison !== null && comparison <= 0){
        return;
      }

      try{
        await onRemote({
          eventType: payload?.eventType || event,
          schema,
          table,
          record,
          oldRecord,
          version,
          knownVersion,
          comparison,
          payload
        });

        // 只有 host 成功處理後，才承認這個遠端版本。
        if(version !== null){
          setKnownVersion(version);
        }
      }catch(error){
        console.error("[RealtimeSync] onRemote 執行失敗。", error);
      }
    }

    async function handleStatus(status, error){
      if(destroyed) return;

      const previous = lastStatus;
      lastStatus = status || "";

      try{
        onStatus({
          status,
          error: error || null,
          previousStatus: previous
        });
      }catch(statusError){
        console.error("[RealtimeSync] onStatus 執行失敗。", statusError);
      }

      if(status === "SUBSCRIBED"){
        const isReconnect = everSubscribed && previous !== "SUBSCRIBED";
        everSubscribed = true;

        if(isReconnect){
          try{
            await onReconnect({
              status,
              previousStatus: previous
            });
          }catch(reconnectError){
            console.error("[RealtimeSync] onReconnect 執行失敗。", reconnectError);
          }
        }
      }
    }

    async function unsubscribe(){
      if(!channel){
        return false;
      }

      const target = channel;
      channel = null;

      try{
        if(typeof client.removeChannel === "function"){
          await client.removeChannel(target);
        }else if(typeof target.unsubscribe === "function"){
          await target.unsubscribe();
        }
      }catch(error){
        console.error("[RealtimeSync] 解除訂閱失敗。", error);
        throw error;
      }

      lastStatus = "";
      return true;
    }

    async function subscribe(){
      if(destroyed){
        throw new Error("[RealtimeSync] 此 instance 已 destroy。");
      }

      if(channel){
        return channel;
      }

      const postgresConfig = {
        event,
        schema,
        table
      };

      if(filter){
        postgresConfig.filter = filter;
      }

      channel = client
        .channel(channelName)
        .on(
          "postgres_changes",
          postgresConfig,
          payload => {
            void handlePayload(payload);
          }
        );

      channel.subscribe((status, error) => {
        void handleStatus(status, error);
      });

      return channel;
    }

    async function destroy(){
      if(destroyed) return;
      await unsubscribe();
      destroyed = true;
      knownVersion = null;
    }

    return Object.freeze({
      version: VERSION,
      subscribe,
      unsubscribe,
      destroy,
      setKnownVersion,
      getKnownVersion,
      isNewer,
      compareVersion
    });
  }

  const RealtimeSync = Object.freeze({
    version: VERSION,
    create,
    compareVersion
  });

  Object.defineProperty(global, "RealtimeSync", {
    value: RealtimeSync,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(typeof window !== "undefined" ? window : globalThis);
