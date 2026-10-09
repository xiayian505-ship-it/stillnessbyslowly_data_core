/* 慢慢軍火庫｜完成品｜FreeCell
 * 標準新接龍：隨機開局、合法移牌、主動結束、破關與末盤自動收牌。
 * 依賴軍火庫 game/card/deck.js；不含資料庫、UID、儲存、音效或特效。
 * window.SlowlyFreeCell.mount(container) → { start, end, destroy, getState }
 */
(function (global) {
  "use strict";

  const SUITS = ["spade", "heart", "diamond", "club"];
  const SYMBOLS = { spade: "♠", heart: "♥", diamond: "♦", club: "♣" };
  const RED = new Set(["heart", "diamond"]);
  const INSTANCES = new WeakMap();

  function label(card) {
    return `${card.rank === 1 ? "A" : card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : card.rank}${SYMBOLS[card.suit]}`;
  }

  function resolveRoot(target) {
    const root = typeof target === "string" ? document.querySelector(target) : target;
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("FreeCell.mount 需要有效的容器元素或 CSS 選擇器。");
    }
    return root;
  }

  function mount(target) {
    const root = resolveRoot(target);
    if (INSTANCES.has(root)) throw new Error("這個容器已安裝 FreeCell；請先 destroy()。");

    root.classList.add("slowly-freecell");
    root.innerHTML = `
      <div class="sfc-toolbar">
        <button type="button" class="sfc-action sfc-start" data-action="start">開始遊戲</button>
        <button type="button" class="sfc-action sfc-end" data-action="end" disabled>結束遊戲</button>
        <span class="sfc-status" data-status role="status" aria-live="polite">按「開始遊戲」隨機開局。</span>
      </div>
      <div class="sfc-board" data-board hidden>
        <div class="sfc-top-row">
          <section class="sfc-zone" aria-label="四個自由格"><div class="sfc-slots" data-freecells></div><span class="sfc-zone-title">自由格</span></section>
          <section class="sfc-zone" aria-label="四個回收格"><div class="sfc-slots" data-foundations></div><span class="sfc-zone-title">回收格</span></section>
        </div>
        <div class="sfc-tableau" data-tableau aria-label="八欄牌區"></div>
      </div>
    `;

    const board = root.querySelector("[data-board]");
    const tableau = root.querySelector("[data-tableau]");
    const freeArea = root.querySelector("[data-freecells]");
    const homeArea = root.querySelector("[data-foundations]");
    const statusEl = root.querySelector("[data-status]");
    const startButton = root.querySelector("[data-action=start]");
    const endButton = root.querySelector("[data-action=end]");

    let phase = "idle";
    let columns = Array.from({ length: 8 }, () => []);
    let cells = Array(4).fill(null);
    let homes = { spade: [], heart: [], diamond: [], club: [] };
    let selection = null;
    let moves = 0;
    let destroyed = false;

    function emit(type, detail = {}) {
      root.dispatchEvent(new CustomEvent(`freecell:${type}`, {
        bubbles: true,
        detail: Object.freeze({ moves, ...detail })
      }));
    }

    function getState() {
      return {
        status: phase,
        moves,
        columns: columns.map(pile => pile.map(card => ({ ...card }))),
        freeCells: cells.map(card => card ? { ...card } : null),
        foundations: Object.fromEntries(SUITS.map(suit => [suit, homes[suit].map(card => ({ ...card }))]))
      };
    }

    function status(message) {
      statusEl.textContent = message;
    }

    function color(card) { return RED.has(card.suit) ? "red" : "black"; }

    function validRun(pile, at) {
      if (!pile || at < 0 || at >= pile.length) return false;
      for (let i = at; i < pile.length - 1; i++) {
        if (pile[i].rank !== pile[i + 1].rank + 1 || color(pile[i]) === color(pile[i + 1])) return false;
      }
      return true;
    }

    function selectedCards() {
      if (!selection) return [];
      if (selection.zone === "column") return columns[selection.index].slice(selection.cardIndex);
      if (selection.zone === "free") return cells[selection.index] ? [cells[selection.index]] : [];
      // 基本 FreeCell 的回收牌不取回牌桌。
      return [];
    }

    function takeSelection() {
      if (selection.zone === "column") return columns[selection.index].splice(selection.cardIndex);
      if (selection.zone === "free") {
        const card = cells[selection.index];
        cells[selection.index] = null;
        return card ? [card] : [];
      }
      return [];
    }

    function maxRunFor(destinationIndex) {
      const emptyCells = cells.filter(card => !card).length;
      let emptyColumns = columns.filter(pile => !pile.length).length;
      if (columns[destinationIndex].length === 0) emptyColumns--;
      return (emptyCells + 1) * (2 ** Math.max(0, emptyColumns));
    }

    // 在真正移牌前，以複製的牌局模擬「所有剩餘牌都能直接依序回收」。
    // 只有能清空全部八欄和自由格，才自動收牌，避免搶收會影響解局的牌。
    function autoCollectPlan() {
      const tempColumns = columns.map(pile => pile.slice());
      const tempCells = cells.slice();
      const tops = Object.fromEntries(SUITS.map(suit => [suit, homes[suit].length]));
      const plan = [];
      for (let limit = 0; limit < 52; limit++) {
        let found = null;
        for (let i = 0; i < tempCells.length; i++) {
          const card = tempCells[i];
          if (card && card.rank === tops[card.suit] + 1) {
            found = { zone: "free", index: i, card };
            tempCells[i] = null;
            break;
          }
        }
        if (!found) {
          for (let i = 0; i < tempColumns.length; i++) {
            const pile = tempColumns[i];
            const card = pile[pile.length - 1];
            if (card && card.rank === tops[card.suit] + 1) {
              found = { zone: "column", index: i, card };
              pile.pop();
              break;
            }
          }
        }
        if (!found) break;
        tops[found.card.suit]++;
        plan.push(found);
      }
      const remaining = tempColumns.reduce((n, pile) => n + pile.length, 0)
        + tempCells.filter(Boolean).length;
      return remaining === 0 && plan.length ? plan : null;
    }

    function winIfComplete() {
      if (phase !== "playing" || SUITS.reduce((n, suit) => n + homes[suit].length, 0) !== 52) return false;
      phase = "won";
      selection = null;
      render();
      status("破關成功！全部 52 張牌已回收。");
      emit("win");
      return true;
    }

    function afterMove() {
      moves++;
      selection = null;
      const plan = autoCollectPlan();
      if (plan) {
        for (const step of plan) {
          let card;
          if (step.zone === "free") {
            card = cells[step.index];
            cells[step.index] = null;
          } else {
            card = columns[step.index].pop();
          }
          if (!card || card.rank !== step.card.rank || card.suit !== step.card.suit) {
            throw new Error("FreeCell 自動收牌狀態不一致。");
          }
          homes[card.suit].push(card);
          moves++;
        }
      }
      if (!winIfComplete()) {
        render();
        status("選擇牌，再點選要移動到的位置。");
      }
    }

    function moveToColumn(index) {
      const moving = selectedCards();
      if (!moving.length || (selection.zone === "column" && selection.index === index)) return false;
      const dest = columns[index];
      const top = dest[dest.length - 1];
      if (top && (top.rank !== moving[0].rank + 1 || color(top) === color(moving[0]))) return false;
      if (moving.length > maxRunFor(index)) return false;
      dest.push(...takeSelection());
      afterMove();
      return true;
    }

    function moveToFree(index) {
      const moving = selectedCards();
      if (cells[index] || moving.length !== 1) return false;
      cells[index] = takeSelection()[0];
      afterMove();
      return true;
    }

    function moveToHome(suit) {
      const moving = selectedCards();
      if (moving.length !== 1) return false;
      const card = moving[0];
      if (card.suit !== suit || card.rank !== homes[suit].length + 1) return false;
      homes[suit].push(takeSelection()[0]);
      afterMove();
      return true;
    }

    function cardButton(card, selected, extraAttrs = "") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `sfc-card sfc-${color(card)}${selected ? " is-selected" : ""}`;
      button.setAttribute("aria-label", label(card));
      if (selected) button.setAttribute("aria-pressed", "true");
      const rank = document.createElement("span");
      rank.className = "sfc-rank";
      rank.textContent = card.rank === 1 ? "A" : card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : String(card.rank);
      const suit = document.createElement("span");
      suit.className = "sfc-suit";
      suit.textContent = SYMBOLS[card.suit];
      button.append(rank, suit);
      return button;
    }

    function render() {
      if (destroyed) return;
      startButton.disabled = phase === "playing";
      startButton.textContent = phase === "idle" ? "開始遊戲" : "再玩一局";
      endButton.disabled = phase !== "playing";
      board.hidden = phase === "idle" || phase === "ended";
      if (board.hidden) return;

      freeArea.replaceChildren();
      cells.forEach((card, index) => {
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = `sfc-slot sfc-free-slot${card ? " occupied" : ""}${selection?.zone === "free" && selection.index === index ? " is-selected" : ""}`;
        slot.dataset.zone = "free";
        slot.dataset.index = index;
        slot.setAttribute("aria-label", card ? `自由格 ${index + 1}：${label(card)}` : `空自由格 ${index + 1}`);
        if (card) {
          const face = cardButton(card, selection?.zone === "free" && selection.index === index);
          face.tabIndex = -1;
          slot.append(...face.childNodes);
          slot.classList.add(`sfc-${color(card)}`);
        } else {
          slot.textContent = "+";
        }
        freeArea.append(slot);
      });

      homeArea.replaceChildren();
      SUITS.forEach(suit => {
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = "sfc-slot sfc-home-slot";
        slot.dataset.zone = "home";
        slot.dataset.suit = suit;
        const pile = homes[suit];
        const card = pile[pile.length - 1];
        slot.setAttribute("aria-label", `${SYMBOLS[suit]} 回收格：${card ? label(card) : "空"}`);
        if (card) {
          slot.classList.add(`sfc-${color(card)}`);
          const rank = document.createElement("span");
          rank.className = "sfc-rank";
          rank.textContent = card.rank === 1 ? "A" : card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : String(card.rank);
          const icon = document.createElement("span");
          icon.className = "sfc-suit";
          icon.textContent = SYMBOLS[suit];
          slot.append(rank, icon);
        } else {
          slot.textContent = SYMBOLS[suit];
        }
        homeArea.append(slot);
      });

      tableau.replaceChildren();
      columns.forEach((pile, index) => {
        const col = document.createElement("div");
        col.className = "sfc-column";
        col.dataset.zone = "column";
        col.dataset.index = index;
        col.setAttribute("aria-label", `第 ${index + 1} 欄${pile.length ? `，${pile.length} 張` : "，空欄"}`);
        col.style.setProperty("--sfc-pile-count", Math.max(1, pile.length));
        pile.forEach((card, cardIndex) => {
          const selected = selection?.zone === "column" && selection.index === index && cardIndex >= selection.cardIndex;
          const button = cardButton(card, selected);
          button.dataset.cardIndex = cardIndex;
          button.style.setProperty("--sfc-position", cardIndex);
          col.append(button);
        });
        tableau.append(col);
      });
    }

    function start() {
      if (destroyed || phase === "playing") return false;
      if (!global.Deck?.create) {
        status("無法開始：軍火庫 Deck 尚未載入。");
        return false;
      }
      const cards = SUITS.flatMap(suit => Array.from({ length: 13 }, (_, index) => ({ rank: index + 1, suit })));
      const deck = global.Deck.create({ items: cards, recycleDiscard: false, shuffleOnReset: true });
      const dealt = deck.draw(52);
      if (!Array.isArray(dealt) || dealt.length !== 52) {
        status("無法開始：發牌失敗。");
        return false;
      }
      columns = Array.from({ length: 8 }, () => []);
      dealt.forEach((card, index) => columns[index % 8].push(card));
      cells = Array(4).fill(null);
      homes = { spade: [], heart: [], diamond: [], club: [] };
      selection = null;
      moves = 0;
      phase = "playing";
      render();
      status("選擇牌，再點選要移動到的位置。");
      emit("start");
      return true;
    }

    function end() {
      if (destroyed || phase !== "playing") return false;
      phase = "ended";
      selection = null;
      render();
      status("這一局已結束。可以再隨機開始一局。");
      emit("end", { reason: "manual" });
      return true;
    }

    function onClick(event) {
      const startTarget = event.target.closest("[data-action=start]");
      if (startTarget && root.contains(startTarget)) return void start();
      const endTarget = event.target.closest("[data-action=end]");
      if (endTarget && root.contains(endTarget)) return void end();
      if (phase !== "playing") return;
      const zone = event.target.closest("[data-zone]");
      if (!zone || !root.contains(zone)) return;

      if (zone.dataset.zone === "column") {
        const index = Number(zone.dataset.index);
        const cardEl = event.target.closest(".sfc-card");
        const cardIndex = cardEl ? Number(cardEl.dataset.cardIndex) : -1;
        if (selection && moveToColumn(index)) return;
        if (cardIndex >= 0 && validRun(columns[index], cardIndex)) {
          // 再按一下相同的牌取消選取。
          const same = selection?.zone === "column" && selection.index === index && selection.cardIndex === cardIndex;
          selection = same ? null : { zone: "column", index, cardIndex };
          render();
        } else if (selection) {
          status("這裡無法移動；請選擇合法的牌串或空欄。");
        }
        return;
      }
      if (zone.dataset.zone === "free") {
        const index = Number(zone.dataset.index);
        if (selection && moveToFree(index)) return;
        if (cells[index]) {
          const same = selection?.zone === "free" && selection.index === index;
          selection = same ? null : { zone: "free", index };
          render();
        }
        return;
      }
      if (zone.dataset.zone === "home" && selection) {
        if (!moveToHome(zone.dataset.suit)) status("這張牌目前不能進回收格。");
      }
    }

    root.addEventListener("click", onClick);
    const api = Object.freeze({
      start,
      end,
      getState,
      destroy() {
        if (destroyed) return;
        root.removeEventListener("click", onClick);
        INSTANCES.delete(root);
        root.classList.remove("slowly-freecell");
        root.replaceChildren();
        destroyed = true;
      }
    });
    INSTANCES.set(root, api);
    return api;
  }

  global.SlowlyFreeCell = Object.freeze({ mount });
})(typeof window !== "undefined" ? window : globalThis);
