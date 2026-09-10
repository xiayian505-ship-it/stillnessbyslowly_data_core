/*!
 * image_storage.js
 * stillness by slowly
 * IndexedDB Blob storage
 */
(function(global){
"use strict";
const VERSION="1.0.0";
function create({dbName="slowly_image_storage",storeName="images",dbVersion=1}={}){
 let dbPromise=null;
 function open(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
   const req=indexedDB.open(dbName,dbVersion);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(storeName))req.result.createObjectStore(storeName,{keyPath:"id"});};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||new Error("IndexedDB 開啟失敗。"));
  });
  return dbPromise;
 }
 function request(mode,fn){
  return open().then(db=>new Promise((resolve,reject)=>{
   const tx=db.transaction(storeName,mode),store=tx.objectStore(storeName),req=fn(store);
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||new Error("IndexedDB 操作失敗。"));
  }));
 }
 function makeId(){return global.crypto?.randomUUID?.()||`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;}
 async function save(blob,meta={}){
  if(!(blob instanceof Blob))throw new TypeError("blob must be a Blob");
  const id=meta.id||makeId();
  await request("readwrite",s=>s.put({id,blob,type:blob.type,size:blob.size,createdAt:new Date().toISOString(),...meta}));
  return id;
 }
 async function get(id){return id?request("readonly",s=>s.get(id)):null;}
 async function getBlob(id){const r=await get(id);return r?.blob||null;}
 async function remove(id){if(!id)return false;await request("readwrite",s=>s.delete(id));return true;}
 async function clear(){await request("readwrite",s=>s.clear());}
 async function count(){return request("readonly",s=>s.count());}
 function close(){if(dbPromise){dbPromise.then(db=>db.close()).catch(()=>{});dbPromise=null;}}
 return Object.freeze({save,get,getBlob,remove,clear,count,close});
}
global.ImageStorage=Object.freeze({version:VERSION,create});
})(window);
