"use strict";

/*
 * 慢慢軍火庫｜ICO Encoder v1.0.0
 *
 * 將已編碼完成的正方形 PNG Uint8Array，依輸入順序封裝成 ICO Blob。
 * 不負責圖片解碼、Canvas 繪製、下載、預覽或 Object URL 管理。
 *
 * PNG 僅進行必要的容器結構檢查：不驗 CRC、不解壓 IDAT，
 * 因此通過檢查不等同於圖片通過完整解碼或安全掃描。
 */

(function (global) {
  const VERSION = "1.0.0";
  const ICO_HEADER_BYTES = 6;
  const ICO_DIRECTORY_ENTRY_BYTES = 16;
  const MAX_UINT16 = 0xFFFF;
  const MAX_UINT32 = 0xFFFFFFFF;

  // 編碼時必須配置一份完整的 ICO 位元組；限制記憶體用量，尤其顧及手機。
  // 此為 v1 的明確容量政策，不是 ICO 格式本身的上限。
  const MAX_OUTPUT_BYTES = 128 * 1024 * 1024;

  const PNG_SIGNATURE = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10
  ]);

  function failIfNotPngSignature(pngBytes) {
    if (pngBytes.byteLength < PNG_SIGNATURE.length) {
      throw new TypeError("PNG 資料不足以包含完整簽章。");
    }

    for (let byteIndex = 0; byteIndex < PNG_SIGNATURE.length; byteIndex += 1) {
      if (pngBytes[byteIndex] !== PNG_SIGNATURE[byteIndex]) {
        throw new TypeError("輸入不是 PNG：簽章不正確。");
      }
    }
  }

  function readChunkType(pngBytes, typeOffset) {
    let chunkType = "";

    for (let characterIndex = 0; characterIndex < 4; characterIndex += 1) {
      const characterCode = pngBytes[typeOffset + characterIndex];
      const isUppercaseLetter = characterCode >= 65 && characterCode <= 90;
      const isLowercaseLetter = characterCode >= 97 && characterCode <= 122;

      if (!isUppercaseLetter && !isLowercaseLetter) {
        throw new TypeError("PNG chunk 類型含有非法字元。");
      }

      chunkType += String.fromCharCode(characterCode);
    }

    return chunkType;
  }

  function validatePngStructure(pngBytes, expectedSize) {
    failIfNotPngSignature(pngBytes);

    const pngView = new DataView(
      pngBytes.buffer,
      pngBytes.byteOffset,
      pngBytes.byteLength
    );

    let nextChunkOffset = PNG_SIGNATURE.length;
    let hasImageHeader = false;
    let hasImageData = false;
    let hasImageEnd = false;

    while (nextChunkOffset < pngBytes.byteLength) {
      // 每個 chunk 至少需要長度(4)、類型(4)以及 CRC(4)。
      if (pngBytes.byteLength - nextChunkOffset < 12) {
        throw new TypeError("PNG chunk 標頭或 CRC 已截斷。");
      }

      const chunkDataLength = pngView.getUint32(nextChunkOffset, false);
      const chunkTypeOffset = nextChunkOffset + 4;
      const chunkDataOffset = nextChunkOffset + 8;
      const nextOffset = chunkDataOffset + chunkDataLength + 4;
      const chunkType = readChunkType(pngBytes, chunkTypeOffset);

      if (nextOffset > pngBytes.byteLength) {
        throw new TypeError("PNG chunk 資料長度超出檔案邊界。");
      }

      if (!hasImageHeader && chunkType !== "IHDR") {
        throw new TypeError("PNG 第一個 chunk 必須是 IHDR。");
      }

      if (chunkType === "IHDR") {
        if (hasImageHeader || nextChunkOffset !== PNG_SIGNATURE.length) {
          throw new TypeError("PNG IHDR 必須且只能出現一次。");
        }

        if (chunkDataLength !== 13) {
          throw new TypeError("PNG IHDR 資料長度必須為 13 bytes。");
        }

        const actualWidth = pngView.getUint32(chunkDataOffset, false);
        const actualHeight = pngView.getUint32(chunkDataOffset + 4, false);

        if (actualWidth !== expectedSize || actualHeight !== expectedSize) {
          throw new RangeError(
            `PNG 實際尺寸 ${actualWidth}×${actualHeight} 與宣告的 ` +
            `${expectedSize}×${expectedSize} 不一致。`
          );
        }

        hasImageHeader = true;
      } else if (chunkType === "IDAT") {
        if (hasImageEnd) {
          throw new TypeError("PNG IDAT 不得出現在 IEND 之後。");
        }

        hasImageData = true;
      } else if (chunkType === "IEND") {
        if (chunkDataLength !== 0 || !hasImageData) {
          throw new TypeError("PNG IEND 不合法，或缺少 IDAT。");
        }

        if (nextOffset !== pngBytes.byteLength) {
          throw new TypeError("PNG IEND 後不得有額外資料。");
        }

        hasImageEnd = true;
        break;
      }

      nextChunkOffset = nextOffset;
    }

    if (!hasImageHeader || !hasImageData || !hasImageEnd) {
      throw new TypeError("PNG 缺少 IHDR、IDAT 或完整 IEND。");
    }
  }

  function prepareEntries(pngEntries) {
    if (!Array.isArray(pngEntries) || pngEntries.length === 0) {
      throw new TypeError("pngEntries 必須是非空陣列。");
    }

    if (pngEntries.length > MAX_UINT16) {
      throw new RangeError("ICO 目錄筆數超過 uint16 的表示範圍。");
    }

    const directoryBytes = ICO_DIRECTORY_ENTRY_BYTES * pngEntries.length;
    const firstImageOffset = ICO_HEADER_BYTES + directoryBytes;
    const uniqueSizes = new Set();
    const preparedEntries = [];
    let nextImageOffset = firstImageOffset;

    // 第一輪先檢查所有型別、容量與位移；通過後才解析 PNG 或配置 ICO。
    for (const entry of pngEntries) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new TypeError("每筆 PNG entry 必須是有效物件。");
      }

      if (typeof entry.size !== "number" || !Number.isInteger(entry.size)) {
        throw new TypeError("entry.size 必須是整數數字。");
      }

      if (entry.size < 1 || entry.size > 256) {
        throw new RangeError("entry.size 必須介於 1 與 256 之間。");
      }

      if (uniqueSizes.has(entry.size)) {
        throw new RangeError(`ICO 不可包含重複尺寸：${entry.size}。`);
      }

      uniqueSizes.add(entry.size);

      if (!(entry.data instanceof Uint8Array)) {
        throw new TypeError("entry.data 必須是 PNG Uint8Array。");
      }

      const imageByteLength = entry.data.byteLength;

      if (imageByteLength === 0) {
        throw new RangeError("PNG Uint8Array 不可為空。");
      }

      if (!Number.isSafeInteger(imageByteLength) || imageByteLength < 0) {
        throw new RangeError("PNG 位元組長度無法以安全整數表示。");
      }

      if (imageByteLength > MAX_UINT32) {
        throw new RangeError("PNG 位元組長度超過 ICO uint32 上限。");
      }

      if (nextImageOffset > Number.MAX_SAFE_INTEGER - imageByteLength) {
        throw new RangeError("ICO 總長度超過 JavaScript 安全整數範圍。");
      }

      const endOffset = nextImageOffset + imageByteLength;

      if (nextImageOffset > MAX_UINT32 || endOffset > MAX_UINT32) {
        throw new RangeError("ICO 的位移或總長度超過 uint32 上限。");
      }

      if (endOffset > MAX_OUTPUT_BYTES) {
        throw new RangeError(
          `ICO 超過此編碼器的 ${MAX_OUTPUT_BYTES} bytes 記憶體容量上限。`
        );
      }

      preparedEntries.push({
        size: entry.size,
        pngBytes: entry.data,
        imageByteLength,
        imageOffset: nextImageOffset
      });

      nextImageOffset = endOffset;
    }

    for (const entry of preparedEntries) {
      validatePngStructure(entry.pngBytes, entry.size);
    }

    return {
      entries: preparedEntries,
      totalBytes: nextImageOffset
    };
  }

  function encode(pngEntries) {
    const prepared = prepareEntries(pngEntries);
    const icoBuffer = new ArrayBuffer(prepared.totalBytes);
    const icoView = new DataView(icoBuffer);
    const icoBytes = new Uint8Array(icoBuffer);

    // ICONDIR：reserved、type、count，均為 little-endian uint16。
    icoView.setUint16(0, 0, true);
    icoView.setUint16(2, 1, true);
    icoView.setUint16(4, prepared.entries.length, true);

    prepared.entries.forEach(function (entry, entryIndex) {
      const directoryOffset = ICO_HEADER_BYTES +
        ICO_DIRECTORY_ENTRY_BYTES * entryIndex;

      // ICO 目錄中，寬高欄位的 0 代表 256 px，而非 0 px。
      const encodedDimension = entry.size === 256 ? 0 : entry.size;

      icoView.setUint8(directoryOffset, encodedDimension);
      icoView.setUint8(directoryOffset + 1, encodedDimension);
      icoView.setUint8(directoryOffset + 2, 0);
      icoView.setUint8(directoryOffset + 3, 0);
      icoView.setUint16(directoryOffset + 4, 1, true);
      icoView.setUint16(directoryOffset + 6, 32, true);
      icoView.setUint32(directoryOffset + 8, entry.imageByteLength, true);
      icoView.setUint32(directoryOffset + 12, entry.imageOffset, true);

      icoBytes.set(entry.pngBytes, entry.imageOffset);
    });

    return new Blob([icoBuffer], { type: "image/x-icon" });
  }

  global.SlowlyICOEncoder = Object.freeze({
    version: VERSION,
    encode
  });
})(typeof window !== "undefined" ? window : globalThis);
