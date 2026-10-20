/*!
 * image_resize.js
 * stillness by slowly
 * File / Blob -> Canvas -> Blob
 */
(function(global){
"use strict";
const VERSION="1.0.0";
function loadImage(blob){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob), image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("圖片解碼失敗。"));};
    image.src=url;
  });
}
function canvasToBlob(canvas,type,quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("圖片輸出失敗。")),type,quality);
  });
}
async function resize(blob,options={}){
  if(!(blob instanceof Blob)) throw new TypeError("image must be a File or Blob");
  if(blob.type&&!blob.type.startsWith("image/")) throw new Error("檔案不是圖片。");
  const {maxWidth=600,maxHeight=600,type="image/jpeg",quality=.82,maxInputBytes=12*1024*1024}=options;
  // 尺寸上限必須為正有限數；輸出品質僅接受 Canvas 支援的 0～1 區間。
  // 在圖片解碼前檢查，避免非法輸入被 Canvas 默默夾成其他值。
  if(typeof maxWidth!=="number"||!Number.isFinite(maxWidth)||maxWidth<=0){
    throw new RangeError("maxWidth must be a positive finite number.");
  }
  if(typeof maxHeight!=="number"||!Number.isFinite(maxHeight)||maxHeight<=0){
    throw new RangeError("maxHeight must be a positive finite number.");
  }
  if(typeof quality!=="number"||!Number.isFinite(quality)||quality<0||quality>1){
    throw new RangeError("quality must be within 0 and 1.");
  }
  if(blob.size>maxInputBytes) throw new Error("原始圖片檔案過大。");
  const image=await loadImage(blob);
  const sw=image.naturalWidth, sh=image.naturalHeight;
  if(!sw||!sh) throw new Error("無法取得圖片尺寸。");
  const scale=Math.min(1,maxWidth/sw,maxHeight/sh);
  const width=Math.max(1,Math.round(sw*scale)), height=Math.max(1,Math.round(sh*scale));
  const canvas=document.createElement("canvas"); canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext("2d");
  if(!ctx) throw new Error("瀏覽器不支援 Canvas 2D。");
  if(type==="image/jpeg"){ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height);}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(image,0,0,width,height);
  const output=await canvasToBlob(canvas,type,quality);
  return {blob:output,width,height,sourceWidth:sw,sourceHeight:sh,sourceBytes:blob.size,outputBytes:output.size,type:output.type};
}
global.ImageResize=Object.freeze({version:VERSION,resize});
})(window);
