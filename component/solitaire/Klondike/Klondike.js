/* 慢慢軍火庫｜Klondike 共用規則引擎
 * 翻一張 / 翻三張獨立完成品引用同一份核心。
 * 僅隨機發牌、基本玩法、翻牌與棄牌回收、主動結束、勝利、自動收牌。
 * 依賴軍火庫 game/card/deck.js；不依賴資料庫、UID、音效或特效。
 */
(function (global) {
  "use strict";

  const SUITS = ["spade", "heart", "diamond", "club"];
  const MARKS = { spade: "♠", heart: "♥", diamond: "♦", club: "♣" };
  const RED = new Set(["heart", "diamond"]);
  const INSTANCES = new WeakMap();

  function label(card) {
    const rank = card.rank === 1 ? "A" : card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : card.rank;
    return `${rank}${MARKS[card.suit]}`;
  }

  function resolveRoot(target) {
    const element = typeof target === "string" ? document.querySelector(target) : target;
    if (!(element instanceof HTMLElement)) throw new TypeError("Klondike.mount 需要有效容器或 CSS 選擇器。");
    return element;
  }

  function mount(target, options = {}) {
    const root = resolveRoot(target);
    if (INSTANCES.has(root)) throw new Error("此容器已安裝 Klondike，請先 destroy()。");
    const drawCount = Number(options.draw);
    if (drawCount !== 1 && drawCount !== 3) throw new RangeError("Klondike 只能指定翻 1 張或翻 3 張。");

    root.classList.add("slowly-klondike");
    root.innerHTML = `
      <div class="skl-toolbar">
        <button type="button" class="skl-action" data-action="start">開始遊戲</button>
        <button type="button" class="skl-action" data-action="end" disabled>結束遊戲</button>
        <span class="skl-status" data-status role="status" aria-live="polite">翻 ${drawCount} 張｜按「開始遊戲」隨機開局。</span>
      </div>
      <div class="skl-board" data-board hidden>
        <div class="skl-top">
          <button type="button" class="skl-slot skl-stock" data-action="draw" aria-label="翻開牌庫">牌庫</button>
          <button type="button" class="skl-slot skl-waste" data-waste aria-label="棄牌區">棄牌區</button>
          <div class="skl-foundations" data-foundations aria-label="四個回收格"></div>
        </div>
        <div class="skl-tableau" data-tableau aria-label="七欄牌區"></div>
      </div>`;

    const board = root.querySelector("[data-board]");
    const tableau = root.querySelector("[data-tableau]");
    const homeArea = root.querySelector("[data-foundations]");
    const stockButton = root.querySelector('[data-action="draw"]');
    const wasteButton = root.querySelector("[data-waste]");
    const startButton = root.querySelector('[data-action="start"]');
    const endButton = root.querySelector('[data-action="end"]');
    const statusNode = root.querySelector("[data-status]");

    let phase = "idle";
    let columns = Array.from({ length: 7 }, () => []);
    let stock = [];
    let waste = [];
    let homes = { spade: [], heart: [], diamond: [], club: [] };
    let selected = null;
    let moves = 0;
    let destroyed = false;

    function emit(kind, details = {}) {
      root.dispatchEvent(new CustomEvent(`klondike:${kind}`, {
        bubbles: true, detail: Object.freeze({ draw: drawCount, moves, completed: completeCount(), ...details })
      }));
    }
    function note(message) { statusNode.textContent = message; }
    function copyCard(card) { return { rank: card.rank, suit: card.suit, faceUp: card.faceUp }; }
    function getState() {
      return {
        status: phase, draw: drawCount, moves,
        columns: columns.map(pile => pile.map(copyCard)),
        stock: stock.map(copyCard), waste: waste.map(copyCard),
        foundations: Object.fromEntries(SUITS.map(suit => [suit, homes[suit].map(copyCard)]))
      };
    }
    function completeCount() { return SUITS.reduce((sum, suit) => sum + homes[suit].length, 0); }
    function isRed(card) { return RED.has(card.suit); }

    function validRun(pile, at) {
      if (!pile || at < 0 || at >= pile.length || !pile[at].faceUp) return false;
      for (let i = at; i < pile.length - 1; i += 1) {
        if (!pile[i + 1].faceUp || pile[i].rank !== pile[i + 1].rank + 1 || isRed(pile[i]) === isRed(pile[i + 1])) return false;
      }
      return true;
    }
    function chosenCards() {
      if (!selected) return [];
      if (selected.zone === "column") return columns[selected.index].slice(selected.cardIndex);
      if (selected.zone === "waste") return waste.length ? [waste[waste.length - 1]] : [];
      if (selected.zone === "foundation") {
        const pile = homes[selected.suit];
        return pile.length ? [pile[pile.length - 1]] : [];
      }
      return [];
    }
    function removeChosen() {
      if (selected.zone === "column") {
        const pile = columns[selected.index];
        const result = pile.splice(selected.cardIndex);
        if (pile.length) pile[pile.length - 1].faceUp = true;
        return result;
      }
      if (selected.zone === "waste") return [waste.pop()];
      if (selected.zone === "foundation") return [homes[selected.suit].pop()];
      return [];
    }

    function makeCardElement(card, extraClass = "") {
      const element = document.createElement("span");
      element.className = `skl-card ${extraClass} ${isRed(card) ? "skl-red" : "skl-black"}`;
      if (!card.faceUp) {
        element.classList.add("skl-back");
        element.setAttribute("aria-hidden", "true");
      } else {
        element.innerHTML = `<span class="skl-rank"></span><span class="skl-suit"></span>`;
        element.querySelector(".skl-rank").textContent = label(card).slice(0, -1);
        element.querySelector(".skl-suit").textContent = MARKS[card.suit];
        element.setAttribute("aria-label", label(card));
      }
      return element;
    }

    function render() {
      startButton.disabled = phase === "playing" || destroyed;
      endButton.disabled = phase !== "playing" || destroyed;
      board.hidden = phase === "idle" || phase === "ended";

      stockButton.disabled = phase !== "playing" || (stock.length === 0 && waste.length === 0);
      stockButton.textContent = stock.length ? `牌庫 ${stock.length}` : (waste.length ? "↻ 收回" : "牌庫空");
      stockButton.setAttribute("aria-label", stock.length ? `翻 ${drawCount} 張，牌庫剩 ${stock.length} 張` : (waste.length ? "將棄牌收回牌庫" : "牌庫已空"));

      wasteButton.replaceChildren();
      wasteButton.disabled = phase !== "playing" || waste.length === 0;
      if (waste.length) {
        const visible = waste.slice(-drawCount);
        visible.forEach((card, index) => {
          const face = makeCardElement(card, "skl-waste-card");
          face.style.setProperty("--skl-waste-index", String(index));
          face.style.setProperty("--skl-waste-count", String(visible.length));
          wasteButton.append(face);
        });
        if (selected?.zone === "waste") wasteButton.classList.add("is-selected");
        else wasteButton.classList.remove("is-selected");
        wasteButton.setAttribute("aria-label", `棄牌頂牌 ${label(waste[waste.length - 1])}`);
      } else {
        wasteButton.textContent = "棄牌區";
        wasteButton.classList.remove("is-selected");
        wasteButton.setAttribute("aria-label", "棄牌區為空");
      }

      homeArea.replaceChildren();
      SUITS.forEach(suit => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "skl-slot skl-home";
        button.dataset.suit = suit;
        const pile = homes[suit];
        if (pile.length) button.append(makeCardElement(pile[pile.length - 1]));
        else button.textContent = MARKS[suit];
        if (selected?.zone === "foundation" && selected.suit === suit) button.classList.add("is-selected");
        button.setAttribute("aria-label", `回收格 ${MARKS[suit]}${pile.length ? ` ${label(pile[pile.length - 1])}` : " 空"}`);
        homeArea.append(button);
      });

      tableau.replaceChildren();
      columns.forEach((pile, columnIndex) => {
        const column = document.createElement("div");
        column.className = "skl-column";
        column.dataset.column = String(columnIndex);
        column.setAttribute("aria-label", `第 ${columnIndex + 1} 欄`);
        let upCount = 0;
        let downCount = 0;
        pile.forEach((card, cardIndex) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "skl-card-button";
          button.dataset.card = String(cardIndex);
          button.style.top = `calc(${upCount} * var(--skl-step-up, 28px) + ${downCount} * var(--skl-step-down, 12px))`;
          if (card.faceUp) upCount += 1;
          else downCount += 1;
          button.disabled = !card.faceUp || phase !== "playing";
          button.setAttribute("aria-label", card.faceUp ? label(card) : "背面牌");
          if (selected?.zone === "column" && selected.index === columnIndex && cardIndex >= selected.cardIndex) button.classList.add("is-selected");
          button.append(makeCardElement(card));
          column.append(button);
        });
        column.style.minHeight = pile.length
          ? `max(var(--skl-column-min-height, 185px), calc(${upCount - (pile[pile.length - 1]?.faceUp ? 1 : 0)} * var(--skl-step-up, 28px) + ${downCount - (pile[pile.length - 1]?.faceUp ? 0 : 1)} * var(--skl-step-down, 12px) + var(--skl-card-height, 72px)))`
          : "var(--skl-column-min-height, 185px)";
        // 空欄仍需足夠點擊面積；欄內任一面牌都可當作目的欄。
        tableau.append(column);
      });
    }

    function setSelection(next) { selected = next; render(); }
    function afterMove(kind, info = {}) {
      moves += 1;
      selected = null;
      note(`已移動牌張。`);
      // 只在目前所有剩餘牌可依序直接回收時自動收牌，不強迫結束其他牌局。
      const didCollect = collectIfReady();
      render();
      emit("move", { kind, ...info });
      if (!didCollect && completeCount() === 52) win();
    }
    function win() {
      if (phase !== "playing" || completeCount() !== 52) return false;
      phase = "won";
      selected = null;
      note(`破關成功！共 ${moves} 步。`);
      render();
      emit("win");
      return true;
    }

    function moveToColumn(targetIndex) {
      if (phase !== "playing" || !selected) return false;
      const cards = chosenCards();
      if (!cards.length) return false;
      if (selected.zone === "column" && selected.index === targetIndex) return false;
      const destination = columns[targetIndex];
      if (!destination) return false;
      const top = destination[destination.length - 1];
      if (!top) { if (cards[0].rank !== 13) return false; }
      else if (!top.faceUp || top.rank !== cards[0].rank + 1 || isRed(top) === isRed(cards[0])) return false;
      removeChosen();
      destination.push(...cards);
      afterMove("tableau");
      return true;
    }
    function moveToFoundation(suit) {
      if (phase !== "playing" || !selected) return false;
      const cards = chosenCards();
      if (cards.length !== 1 || cards[0].suit !== suit || selected.zone === "foundation") return false;
      if (cards[0].rank !== homes[suit].length + 1) return false;
      removeChosen();
      homes[suit].push(cards[0]);
      afterMove("foundation", { suit });
      return true;
    }

    function selectColumn(index, cardIndex) {
      if (phase !== "playing") return;
      const pile = columns[index];
      const card = pile?.[cardIndex];
      if (!card?.faceUp) return;
      if (selected?.zone === "column" && selected.index === index && selected.cardIndex === cardIndex) {
        setSelection(null); return;
      }
      if (selected && (!((selected.zone === "column") && selected.index === index))) {
        if (moveToColumn(index)) return;
      }
      if (!validRun(pile, cardIndex)) {
        note("只能移動紅黑交錯、由大到小的連續牌串。");
        setSelection(null); return;
      }
      setSelection({ zone: "column", index, cardIndex });
    }
    function selectWaste() {
      if (phase !== "playing" || !waste.length) return;
      if (selected?.zone === "waste") { setSelection(null); return; }
      setSelection({ zone: "waste" });
    }
    function selectFoundation(suit) {
      if (phase !== "playing") return;
      if (selected?.zone === "foundation" && selected.suit === suit) { setSelection(null); return; }
      if (selected && moveToFoundation(suit)) return;
      if (homes[suit].length) setSelection({ zone: "foundation", suit });
    }

    function draw() {
      if (phase !== "playing") return false;
      if (!stock.length && !waste.length) return false;
      selected = null;
      if (stock.length) {
        const amount = Math.min(drawCount, stock.length);
        for (let i = 0; i < amount; i += 1) {
          const card = stock.pop();
          card.faceUp = true;
          waste.push(card);
        }
        note(`翻出 ${amount} 張。`);
      } else {
        stock = waste.slice().reverse();
        stock.forEach(card => { card.faceUp = false; });
        waste = [];
        note("已把棄牌收回牌庫。");
      }
      moves += 1;
      render();
      emit("draw");
      return true;
    }

    function createAutoPlan() {
      if (phase !== "playing" || stock.length || waste.length || completeCount() === 52) return null;
      if (!columns.every(pile => pile.every(card => card.faceUp))) return null;
      const simulated = columns.map(pile => pile.slice());
      const heights = Object.fromEntries(SUITS.map(suit => [suit, homes[suit].length]));
      const plan = [];
      while (true) {
        let candidate = null;
        for (let index = 0; index < 7; index += 1) {
          const card = simulated[index][simulated[index].length - 1];
          if (card && card.rank === heights[card.suit] + 1) {
            if (!candidate || card.rank < candidate.card.rank) candidate = { index, card };
          }
        }
        if (!candidate) break;
        plan.push({ index: candidate.index, suit: candidate.card.suit });
        simulated[candidate.index].pop();
        heights[candidate.card.suit] += 1;
      }
      return simulated.every(pile => pile.length === 0) ? plan : null;
    }
    function collectIfReady() {
      const plan = createAutoPlan();
      if (!plan || !plan.length) return false;
      plan.forEach(step => {
        const card = columns[step.index].pop();
        homes[step.suit].push(card);
        moves += 1;
      });
      note("剩餘牌張已自動收牌。");
      emit("collect", { count: plan.length });
      win();
      return true;
    }

    function start() {
      if (destroyed || phase === "playing") return false;
      if (!global.Deck?.create) throw new Error("請先載入軍火庫 game/card/deck.js。");
      const cards = [];
      SUITS.forEach(suit => {
        for (let rank = 1; rank <= 13; rank += 1) cards.push({ rank, suit, faceUp: false });
      });
      const deck = global.Deck.create({ items: cards, recycleDiscard: false, shuffleOnReset: true, shuffleOnRecycle: false });
      columns = Array.from({ length: 7 }, () => []);
      // 按原版發牌：第 1~7 欄各 1~7 張，只有最上面一張正面。
      for (let row = 0; row < 7; row += 1) {
        for (let col = row; col < 7; col += 1) {
          const [card] = deck.draw(1);
          columns[col].push(card);
        }
      }
      columns.forEach(pile => { pile[pile.length - 1].faceUp = true; });
      stock = [];
      for (let i = 0; i < 24; i += 1) {
        const [card] = deck.draw(1);
        stock.unshift(card);
      }
      waste = [];
      homes = { spade: [], heart: [], diamond: [], club: [] };
      selected = null;
      moves = 0;
      phase = "playing";
      note(`已開始隨機牌局（翻 ${drawCount} 張）。`);
      render();
      emit("start");
      return true;
    }
    function end() {
      if (destroyed || phase !== "playing") return false;
      phase = "ended";
      selected = null;
      render();
      note("遊戲已結束，可以重新開始。");
      emit("end", { reason: "manual" });
      return true;
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      INSTANCES.delete(root);
      root.removeEventListener("click", onRootClick);
      root.replaceChildren();
      root.classList.remove("slowly-klondike");
    }

    function onRootClick(event) {
      if (destroyed) return;
      const action = event.target.closest("[data-action]");
      if (action && root.contains(action)) {
        if (action.dataset.action === "start") start();
        else if (action.dataset.action === "end") end();
        else if (action.dataset.action === "draw") draw();
        return;
      }
      if (phase !== "playing") return;
      const home = event.target.closest("[data-suit]");
      if (home && root.contains(home)) { selectFoundation(home.dataset.suit); return; }
      const wasteTarget = event.target.closest("[data-waste]");
      if (wasteTarget && root.contains(wasteTarget)) { selectWaste(); return; }
      const column = event.target.closest("[data-column]");
      if (!column || !root.contains(column)) return;
      const index = Number(column.dataset.column);
      const card = event.target.closest("[data-card]");
      if (card && column.contains(card)) selectColumn(index, Number(card.dataset.card));
      else if (selected && !moveToColumn(index)) note("此位置不能放牌。");
    }

    root.addEventListener("click", onRootClick);
    render();
    const api = Object.freeze({ start, end, draw, getState, destroy });
    INSTANCES.set(root, api);
    return api;
  }

  global.SlowlyKlondike = Object.freeze({ mount });
})(typeof window !== "undefined" ? window : globalThis);
