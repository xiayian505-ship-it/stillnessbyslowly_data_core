/*
 * Slowly Favorite
 * UI-only favorite / pin state helper.
 * Host owns data persistence and business logic.
 */
(function (global) {
  'use strict';

  const VERSION = '1.0.0';
  const DEFAULT_SELECTOR = '[data-slowly-favorite]';

  function resolveElement(target) {
    if (target instanceof Element) return target;
    if (typeof target === 'string') return document.querySelector(target);
    return null;
  }

  function readId(el) {
    return el.dataset.favoriteId || el.dataset.slowlyFavorite || el.getAttribute('data-id') || '';
  }

  function isActive(el) {
    return el.getAttribute('aria-pressed') === 'true' || el.dataset.favoriteActive === 'true';
  }

  function applyState(el, active, options) {
    const state = !!active;
    el.setAttribute('aria-pressed', String(state));
    el.dataset.favoriteActive = String(state);
    el.classList.toggle(options.activeClass, state);

    if (options.activeLabel != null && options.inactiveLabel != null) {
      const labelTarget = el.querySelector('[data-favorite-label]') || el;
      labelTarget.textContent = state ? options.activeLabel : options.inactiveLabel;
    }

    if (options.activeTitle != null || options.inactiveTitle != null) {
      const title = state ? options.activeTitle : options.inactiveTitle;
      if (title != null) el.setAttribute('title', title);
    }

    if (typeof options.render === 'function') {
      options.render({ element: el, active: state, id: readId(el) });
    }
  }

  function create(target, userOptions) {
    const el = resolveElement(target);
    if (!el) throw new Error('SlowlyFavorite: target not found.');

    if (el.__slowlyFavoriteInstance) return el.__slowlyFavoriteInstance;

    const options = Object.assign({
      activeClass: 'is-favorite',
      initial: null,
      activeLabel: null,
      inactiveLabel: null,
      activeTitle: '取消最愛',
      inactiveTitle: '加入最愛',
      render: null,
      onChange: null
    }, userOptions || {});

    if (!el.hasAttribute('role') && el.tagName !== 'BUTTON') {
      el.setAttribute('role', 'button');
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    }

    if (el.tagName === 'BUTTON' && !el.hasAttribute('type')) {
      el.setAttribute('type', 'button');
    }

    const initial = options.initial == null ? isActive(el) : !!options.initial;
    applyState(el, initial, options);

    function emit(active, sourceEvent) {
      const detail = {
        id: readId(el),
        active,
        element: el,
        sourceEvent: sourceEvent || null
      };

      el.dispatchEvent(new CustomEvent('slowlyfavoritechange', {
        bubbles: true,
        detail
      }));

      if (typeof options.onChange === 'function') {
        options.onChange(detail);
      }
    }

    function set(active, config) {
      const cfg = config || {};
      const next = !!active;
      const prev = isActive(el);
      applyState(el, next, options);
      if (!cfg.silent && next !== prev) emit(next, cfg.sourceEvent);
      return next;
    }

    function toggle(sourceEvent) {
      return set(!isActive(el), { sourceEvent });
    }

    function clickHandler(event) {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;
      toggle(event);
    }

    function keyHandler(event) {
      if (el.tagName === 'BUTTON') return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clickHandler(event);
      }
    }

    el.addEventListener('click', clickHandler);
    el.addEventListener('keydown', keyHandler);

    const api = {
      element: el,
      get id() { return readId(el); },
      get active() { return isActive(el); },
      set,
      toggle,
      destroy() {
        el.removeEventListener('click', clickHandler);
        el.removeEventListener('keydown', keyHandler);
        delete el.__slowlyFavoriteInstance;
      }
    };

    el.__slowlyFavoriteInstance = api;
    return api;
  }

  function createAll(selector, options) {
    const query = selector || DEFAULT_SELECTOR;
    return Array.from(document.querySelectorAll(query)).map(el => create(el, options));
  }

  global.SlowlyFavorite = {
    version: VERSION,
    create,
    createAll
  };
})(window);
