/* 慢慢軍火庫｜Spider 共用規則引擎
 * 三款獨立入口：SpiderEasy.js / SpiderMedium.js / SpiderHard.js
 * 只提供隨機開局、合法移牌、發牌、同花色 K-A 自動收牌、結束、勝利。
 * 依賴 https://lib.stillnessbyslowly.com/game/card/deck.js
 * 外觀由宿主 CSS 決定；不含資料庫、儲存、UID、音效或動畫。
 */
(function (global) {
  "use strict";

  const SUITS = ["spade", "heart", "diamond", "club"];
  const SUIT_MARKS = { spade: "♠", heart: "♥", diamond: "♦", club: "♣" };
  const SUIT_RED = new Set(["heart", "diamond"]);
  const INSTANCES = new WeakMap();

  function resolveElement(target) {
    const root = typeof target === "string" ? document.querySelector(target) : target;
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("Spider.mount 需要有效的 HTML 容器或選擇器。");
    }
    return root;
  }

  function cardLabel(card) {
    const rank = card.rank === 1 ? "A" : card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : card.rank;
    return `${rank}${SUIT_MARKS[card.suit]}`;
  }

  function mount(target, options = {}) {
    const root = resolveElement(target);
    if (INSTANCES.has(root)) throw new Error("這個容器已裝載 Spider，請先 destroy()。");
    const suitCount = Number(options.suits);
    if (![1, 2, 4].includes(suitCount)) throw new RangeError("Spider 只支援 1、2 或 4 花色。");
    const validSuits = SUITS.slice(0, suitCount);
    const difficulty = suitCount === 1 ? "easy" : suitCount === 2 ? "medium" : "hard";
    const label = suitCount === 1 ? "初階" : suitCount === 2 ? "中階" : "高階";

    root.classList.add("slowly-spider");
    root.innerHTML = `
      <div class="ssp-toolbar">
        <button type="button" class="ssp-action" data-action="start">開始遊戲</button>
        <button type="button" class="ssp-action" data-action="end" disabled>結束遊戲</button>
        <span class="ssp-status" data-status role="status" aria-live="polite">${label}｜按「開始遊戲」隨機開局。</span>
      </div>
      <div class="ssp-board" data-board hidden>
        <div class="ssp-top">
          <button type="button" class="ssp-action ssp-stock" data-action="deal" disabled>發牌（5）</button>
          <div class="ssp-completed" data-completed aria-label="已收集的八組完整牌串"></div>
        </div>
        <div class="ssp-tableau" data-tableau aria-label="十欄牌區"></div>
      </div>`;

    const boardEl = root.querySelector("[data-board]");
    const statusEl = root.querySelector("[data-status]");
    const tableauEl = root.querySelector("[data-tableau]");
    const completeEl = root.querySelector("[data-completed]");
    const startBtn = root.querySelector('[data-action="start"]');
    const endBtn = root.querySelector('[data-action="end"]');
    const dealBtn = root.querySelector('[data-action="deal"]');

    let phase = "idle";
    let columns = Array.from({ length: 10 }, () => []);
    let stock = null;
    let collected = [];
    let selection = null;
    let moves = 0;
    let destroyed = false;

    function emit(kind, detail = {}) {
      root.dispatchEvent(new CustomEvent(`spider:${kind}`, {
        bubbles: true,
        detail: Object.freeze({ difficulty, suits: suitCount, moves, completed: collected.length, ...detail })
      }));
    }

    function getState() {
      return {
        status: phase,
        difficulty,
        suits: suitCount,
        moves,
        columns: columns.map(pile => pile.map(card => ({ rank: card.rank, suit: card.suit, faceUp: card.faceUp }))),
        stock: stock ? stock.snapshot().drawPile.map(card => ({ rank: card.rank, suit: card.suit })) : [],
        completed: collected.slice(),
        remainingDeals: stock ? stock.snapshot().drawPile.length / 10 : 0
      };
    }

    function setStatus(message) { statusEl.textContent = message; }

    function stockSize() {
      return stock ? stock.snapshot().drawPile.length : 0;
    }

    function makeDeck() {
      if (!global.Deck || typeof global.Deck.create !== "function") {
        throw new Error("請先載入軍火庫 game/card/deck.js。");
      }
      const cards = [];
      const setsPerSuit = 8 / suitCount;
      for (const suit of validSuits) {
        for (let copy = 0; copy < setsPerSuit; copy += 1) {
          for (let rank = 1; rank <= 13; rank += 1) {
            cards.push({ rank, suit, faceUp: false });
          }
        }
      }
      return global.Deck.create({ items: cards, recycleDiscard: false, shuffleOnReset: true, shuffleOnRecycle: false });
    }

    function isMovableRun(pile, startIndex) {
      if (!pile || startIndex < 0 || startIndex >= pile.length || !pile[startIndex].faceUp) return false;
      for (let i = startIndex; i < pile.length - 1; i += 1) {
        const upper = pile[i];
        const lower = pile[i + 1];
        if (!lower.faceUp || upper.rank !== lower.rank + 1 || upper.suit !== lower.suit) return false;
      }
      return true;
    }

    function flipTop(index) {
      const pile = columns[index];
      if (pile.length) pile[pile.length - 1].faceUp = true;
    }

    function collectRuns() {
      let removed = 0;
      let matched = true;
      while (matched) {
        matched = false;
        for (let col = 0; col < columns.length; col += 1) {
          const pile = columns[col];
          if (pile.length < 13) continue;
          const run = pile.slice(-13);
          const suit = run[0].suit;
          const complete = run.every((card, index) => card.faceUp && card.suit === suit && card.rank === 13 - index);
          if (!complete) continue;
          pile.splice(-13);
          collected.push(suit);
          removed += 1;
          flipTop(col);
          matched = true;
          break;
        }
      }
      if (removed) emit("collect", { count: removed });
      if (collected.length === 8) {
        phase = "won";
        selection = null;
        setStatus(`完成！${label} Spider 全部八組牌串已收集。`);
        render();
        emit("win");
        return true;
      }
      return false;
    }

    function start() {
      if (destroyed || phase === "playing") return false;
      const newStock = makeDeck();
      const nextColumns = Array.from({ length: 10 }, () => []);
      for (let col = 0; col < 10; col += 1) {
        const count = col < 4 ? 6 : 5;
        for (let i = 0; i < count; i += 1) {
          const card = newStock.draw(1)[0];
          if (!card) throw new Error("Spider 發牌失敗。");
          nextColumns[col].push(card);
        }
        nextColumns[col][count - 1].faceUp = true;
      }
      columns = nextColumns;
      stock = newStock;
      collected = [];
      selection = null;
      moves = 0;
      phase = "playing";
      setStatus(`${label}｜點牌串，再點目的欄位；空欄可移入牌串。`);
      render();
      emit("start");
      return true;
    }

    function end() {
      if (destroyed || phase !== "playing") return false;
      phase = "ended";
      selection = null;
      setStatus(`已結束${label}牌局，可再開始隨機一局。`);
      render();
      emit("end", { reason: "manual" });
      return true;
    }

    function moveSelected(dest) {
      if (phase !== "playing" || !selection || dest === selection.column || dest < 0 || dest >= 10) return false;
      const from = columns[selection.column];
      const moved = from.slice(selection.index);
      if (!moved.length || !isMovableRun(from, selection.index)) return false;
      const target = columns[dest];
      if (target.length) {
        const last = target[target.length - 1];
        if (!last.faceUp || last.rank !== moved[0].rank + 1) return false;
      }
      from.splice(selection.index);
      target.push(...moved);
      flipTop(selection.column);
      selection = null;
      moves += 1;
      if (!collectRuns()) {
        setStatus(`已移動 ${moved.length} 張牌。`);
        render();
      }
      return true;
    }

    function selectCard(col, index) {
      if (phase !== "playing") return;
      if (selection && selection.column === col && selection.index === index) {
        selection = null;
        setStatus("已取消選取。");
        render();
        return;
      }
      if (selection && selection.column !== col && moveSelected(col)) return;
      if (isMovableRun(columns[col], index)) {
        selection = { column: col, index };
        setStatus(`已選取 ${columns[col].length - index} 張牌。`);
      } else {
        selection = null;
        setStatus("只能一起移動同花色、由大到小的連續牌串。");
      }
      render();
    }

    function deal() {
      if (destroyed || phase !== "playing") return false;
      if (stockSize() < 10) return false;
      if (columns.some(pile => pile.length === 0)) {
        setStatus("有空白欄位時不能發牌，請先移一張牌進去。");
        return false;
      }
      const cards = stock.draw(10);
      if (cards.length !== 10) throw new Error("Spider 補牌失敗。");
      cards.forEach((card, col) => {
        card.faceUp = true;
        columns[col].push(card);
      });
      moves += 1;
      selection = null;
      if (!collectRuns()) {
        setStatus(`已補一排牌，還能發 ${stockSize() / 10} 次。`);
        render();
      }
      return true;
    }

    function render() {
      if (destroyed) return;
      const playing = phase === "playing";
      startBtn.disabled = playing;
      endBtn.disabled = !playing;
      boardEl.hidden = !playing && phase !== "won";
      dealBtn.disabled = !playing || stockSize() < 10 || columns.some(pile => pile.length === 0);
      dealBtn.textContent = `發牌（${stockSize() / 10}）`;

      completeEl.replaceChildren();
      for (let i = 0; i < 8; i += 1) {
        const slot = document.createElement("span");
        slot.className = "ssp-completed-slot";
        slot.textContent = collected[i] ? `K${SUIT_MARKS[collected[i]]}` : "—";
        slot.setAttribute("aria-label", collected[i] ? `已收集第 ${i + 1} 組 ${collected[i]}` : `第 ${i + 1} 組尚未收集`);
        completeEl.appendChild(slot);
      }
      tableauEl.replaceChildren();
      columns.forEach((pile, col) => {
        const column = document.createElement("div");
        column.className = "ssp-column";
        column.dataset.column = String(col);
        column.setAttribute("aria-label", `第 ${col + 1} 欄`);
        const hiddenCount = pile.filter(card => !card.faceUp).length;
        let hidden = 0;
        let face = 0;
        pile.forEach((card, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `ssp-card ${card.faceUp ? "ssp-face-up" : "ssp-face-down"}`;
          button.dataset.card = String(index);
          button.dataset.column = String(col);
          const offset = `calc(${hidden} * var(--ssp-step-down, 13px) + ${face} * var(--ssp-step-up, 30px))`;
          button.style.top = offset;
          if (card.faceUp) {
            button.classList.add(SUIT_RED.has(card.suit) ? "ssp-red" : "ssp-black");
            const rank = document.createElement("span");
            rank.className = "ssp-rank";
            rank.textContent = cardLabel(card).replace(SUIT_MARKS[card.suit], "");
            const suit = document.createElement("span");
            suit.className = "ssp-suit";
            suit.textContent = SUIT_MARKS[card.suit];
            button.append(rank, suit);
            button.setAttribute("aria-label", cardLabel(card));
            button.setAttribute("aria-pressed", String(Boolean(selection && selection.column === col && index >= selection.index)));
            if (selection && selection.column === col && index >= selection.index) button.classList.add("is-selected");
          } else {
            button.tabIndex = -1;
            button.setAttribute("aria-label", "蓋牌");
            button.disabled = true;
          }
          column.appendChild(button);
          if (!card.faceUp) hidden += 1;
          else face += 1;
        });
        column.style.minHeight = `max(var(--ssp-column-min-height, 180px), calc(${hiddenCount} * var(--ssp-step-down, 13px) + ${pile.length - hiddenCount} * var(--ssp-step-up, 30px) + var(--ssp-card-height, 60px)))`;
        tableauEl.appendChild(column);
      });
    }

    function onClick(event) {
      if (destroyed) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest("[data-action]");
      if (action && root.contains(action)) {
        const type = action.dataset.action;
        if (type === "start") start();
        else if (type === "end") end();
        else if (type === "deal") deal();
        return;
      }
      if (phase !== "playing") return;
      const column = target.closest("[data-column]");
      if (!column || !root.contains(column)) return;
      const col = Number(column.dataset.column);
      const card = target.closest("[data-card]");
      if (card) selectCard(col, Number(card.dataset.card));
      else if (selection && !moveSelected(col)) {
        setStatus("這裡不能移入選取的牌串。");
      }
    }

    root.addEventListener("click", onClick);
    render();

    const api = Object.freeze({
      start,
      end,
      deal,
      getState,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        root.removeEventListener("click", onClick);
        root.replaceChildren();
        root.classList.remove("slowly-spider");
        INSTANCES.delete(root);
      }
    });
    INSTANCES.set(root, api);
    return api;
  }

  global.SlowlySpider = Object.freeze({ mount });
})(typeof window !== "undefined" ? window : globalThis);
