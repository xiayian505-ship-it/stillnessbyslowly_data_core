/* =========================================================
   慢慢軍火庫｜Hand Fan Layout v1.0.0

   用途：依實際卡片數量與容器寬度，排列重疊的扇形卡片。
   - 將角度、上下錯位與重疊間距套用到宿主既有元素。
   - 支援選取視覺狀態、ResizeObserver、手動 refresh。
   - 多個扇形容器彼此獨立，destroy 可清除本零件的修改。

   不負責：
   - 建立卡牌資料、卡面 HTML、卡牌美術或遊戲規則。
   - 點擊、出牌、費用判斷、拖曳、永久保存。
   - 改寫軍火庫既有 effects/hover/card_fan.css。
========================================================= */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const ROOT_CLASS_NAME = "slowly-hand-fan-layout";
  const CARD_SELECTOR = ":scope > [data-hand-fan-card]";
  const instances = new WeakMap();

  const CARD_PROPERTIES = [
    "--slowly-hand-angle",
    "--slowly-hand-rise",
    "--slowly-hand-overlap"
  ];

  function resolveRoot(target) {
    if (typeof target === "string") {
      return document.querySelector(target);
    }
    return target instanceof global.HTMLElement ? target : null;
  }

  function readFiniteNumber(value, fallback, name, minimum, maximum) {
    const number = value === undefined ? fallback : value;
    if (!Number.isFinite(number) || number < minimum || number > maximum) {
      throw new RangeError(`HandFanLayout 的 ${name} 必須介於 ${minimum} 與 ${maximum}。`);
    }
    return number;
  }

  function normalizeOptions(options) {
    return {
      maxFanAngle: readFiniteNumber(options.maxFanAngle, 30, "maxFanAngle", 0, 120),
      edgeDrop: readFiniteNumber(options.edgeDrop, 20, "edgeDrop", 0, 300),
      selectedLift: readFiniteNumber(options.selectedLift, 38, "selectedLift", 0, 300),
      hoverLift: readFiniteNumber(options.hoverLift, 18, "hoverLift", 0, 300),
      minimumSpacing: readFiniteNumber(options.minimumSpacing, 24, "minimumSpacing", 0, 500),
      maximumGap: readFiniteNumber(options.maximumGap, 8, "maximumGap", 0, 500)
    };
  }

  function getCards(root) {
    return Array.from(root.querySelectorAll(CARD_SELECTOR));
  }

  function rememberProperty(element, propertyName) {
    return {
      element,
      propertyName,
      originalValue: element.style.getPropertyValue(propertyName),
      originalPriority: element.style.getPropertyPriority(propertyName)
    };
  }

  function restoreProperty(savedProperty) {
    const { element, propertyName, originalValue, originalPriority } = savedProperty;
    if (originalValue) {
      element.style.setProperty(propertyName, originalValue, originalPriority);
    } else {
      element.style.removeProperty(propertyName);
    }
  }

  function create(target, options = {}) {
    const root = resolveRoot(target);
    if (!root) {
      throw new Error("HandFanLayout 找不到扇形手牌容器。");
    }
    if (instances.has(root)) {
      return instances.get(root);
    }

    let settings = normalizeOptions(options);
    let selectedCard = null;
    let destroyed = false;
    let resizeObserver = null;
    const hadRootClass = root.classList.contains(ROOT_CLASS_NAME);
    const originalCardProperties = new Map();
    const originalSelectionAttributes = new Map();
    const rootProperties = [
      rememberProperty(root, "--slowly-hand-selected-lift"),
      rememberProperty(root, "--slowly-hand-hover-lift")
    ];

    root.classList.add(ROOT_CLASS_NAME);

    function saveCardOriginals(card) {
      if (originalCardProperties.has(card)) {
        return;
      }

      originalCardProperties.set(
        card,
        CARD_PROPERTIES.map(propertyName => rememberProperty(card, propertyName))
      );
      originalSelectionAttributes.set(card, card.getAttribute("data-hand-fan-selected"));
    }

    function assertActive() {
      if (destroyed) {
        throw new Error("HandFanLayout 已 destroy，不能繼續操作。");
      }
    }

    function refresh() {
      assertActive();
      const cards = getCards(root);
      const cardCount = cards.length;

      root.style.setProperty("--slowly-hand-selected-lift", `${settings.selectedLift}px`);
      root.style.setProperty("--slowly-hand-hover-lift", `${settings.hoverLift}px`);

      if (selectedCard && !cards.includes(selectedCard)) {
        selectedCard = null;
      }

      if (!cardCount) {
        return { count: 0, spacing: 0 };
      }

      // 手機、嵌入區塊或整頁都以「容器可用寬度」計算，不綁定 window 寬度。
      // 卡牌可由宿主自由設計，但同一組卡片應採用相近寬度。
      const widestCard = Math.max(...cards.map(card => card.offsetWidth));
      const availableWidth = root.clientWidth;
      const idealSpacing = widestCard + settings.maximumGap;
      const spacePerCard = cardCount > 1
        ? Math.max(settings.minimumSpacing, (availableWidth - widestCard) / (cardCount - 1))
        : 0;
      const spacing = cardCount > 1 ? Math.min(idealSpacing, spacePerCard) : 0;
      const middleIndex = (cardCount - 1) / 2;
      const furthestDistance = Math.max(middleIndex, 1);

      cards.forEach((card, index) => {
        saveCardOriginals(card);

        const relativePosition = cardCount === 1
          ? 0
          : (index - middleIndex) / furthestDistance;
        const angle = relativePosition * (settings.maxFanAngle / 2);
        const verticalOffset = Math.pow(Math.abs(relativePosition), 2) * settings.edgeDrop;
        const overlappingMargin = index === 0 ? 0 : spacing - widestCard;

        card.style.setProperty("--slowly-hand-angle", `${angle.toFixed(3)}deg`);
        card.style.setProperty("--slowly-hand-rise", `${verticalOffset.toFixed(2)}px`);
        card.style.setProperty("--slowly-hand-overlap", `${overlappingMargin.toFixed(2)}px`);
        card.setAttribute("data-hand-fan-selected", String(card === selectedCard));
      });

      return { count: cardCount, spacing };
    }

    const api = {
      root,
      get selectedIndex() {
        return selectedCard ? getCards(root).indexOf(selectedCard) : -1;
      },
      refresh,
      setSelected(index) {
        assertActive();
        const cards = getCards(root);
        if (index === null) {
          selectedCard = null;
        } else if (!Number.isInteger(index) || index < 0 || index >= cards.length) {
          throw new RangeError("HandFanLayout 的選取索引超出目前卡片範圍。");
        } else {
          selectedCard = cards[index];
        }
        refresh();
        return api.selectedIndex;
      },
      updateOptions(nextOptions) {
        assertActive();
        settings = normalizeOptions({ ...settings, ...nextOptions });
        refresh();
      },
      destroy() {
        if (destroyed) {
          return;
        }
        destroyed = true;
        resizeObserver?.disconnect();
        global.removeEventListener("resize", onWindowResize);

        originalCardProperties.forEach(savedProperties => {
          savedProperties.forEach(restoreProperty);
        });
        originalSelectionAttributes.forEach((originalValue, card) => {
          if (originalValue === null) {
            card.removeAttribute("data-hand-fan-selected");
          } else {
            card.setAttribute("data-hand-fan-selected", originalValue);
          }
        });
        rootProperties.forEach(restoreProperty);
        if (!hadRootClass) {
          root.classList.remove(ROOT_CLASS_NAME);
        }
        instances.delete(root);
      }
    };

    function onWindowResize() {
      if (!destroyed) {
        refresh();
      }
    }

    instances.set(root, api);
    try {
      refresh();
      if (typeof global.ResizeObserver === "function") {
        resizeObserver = new global.ResizeObserver(() => {
          if (!destroyed) {
            refresh();
          }
        });
        resizeObserver.observe(root);
      } else {
        global.addEventListener("resize", onWindowResize);
      }
    } catch (error) {
      api.destroy();
      throw error;
    }

    return api;
  }

  global.SlowlyHandFanLayout = Object.freeze({ VERSION, create });
})(window);
