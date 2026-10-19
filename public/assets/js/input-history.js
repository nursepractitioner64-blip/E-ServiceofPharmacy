/* =========================================================
   GLOBAL INPUT HISTORY / AUTOCOMPLETE
   - Works with static and dynamically-rendered SPA inputs.
   - History is stored locally per signed-in user and field.
   - Never stores passwords or authentication secrets.
========================================================= */
(() => {
  'use strict';

  const STORAGE_PREFIX = 'esp:input-history:v1';
  const MAX_ITEMS = 20;
  const MAX_VALUE_LENGTH = 200;
  const inputListIds = new WeakMap();
  let textareaMenu = null;
  let textareaTarget = null;
  let hideMenuTimer = null;

  function activeUserKey() {
    try {
      return localStorage.getItem('esp:input-history-user') || 'anonymous';
    } catch (_) {
      return 'anonymous';
    }
  }

  function isExcluded(el) {
    if (!el || el.disabled || el.readOnly || el.hasAttribute('data-no-history')) return true;
    if (el.closest('#auth-screen, #auth-login-form')) return true;
    if (el.matches('input[type="password"], input[type="hidden"], input[type="file"], input[type="number"], input[type="date"], input[type="datetime-local"], input[type="time"], input[type="month"], input[type="week"], input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"], input[type="reset"], input[type="image"], input[type="range"], input[type="color"]')) return true;
    const identity = `${el.name || ''} ${el.id || ''} ${el.autocomplete || ''} ${fieldLabel(el)}`.toLowerCase();
    if (/(password|passwd|secret|token|csrf|otp|one.?time.?code|verification.?code|pin)/i.test(identity)) return true;
    // Do not persist patient identifiers or clinical details in browser history.
    if (/(patient|\bcid\b|\bhn\b|diagnos|symptom|clinical|medical.?history|ผู้ป่วย|ผู้รับบริการ|เลขบัตร|เบอร์โทร|โทรศัพท์|อาการ|วินิจฉัย|ประวัติการรักษา)/i.test(identity)) return true;
    if (el.type && !['text', 'search', 'email', 'tel', 'url'].includes(el.type) && el.tagName !== 'TEXTAREA') return true;
    return false;
  }

  function fieldLabel(el) {
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label && label.textContent.trim()) return label.textContent.trim();
    }
    const wrappingLabel = el.closest('label');
    if (wrappingLabel && wrappingLabel.textContent.trim()) return wrappingLabel.textContent.trim();
    return String(el.getAttribute('aria-label') || el.placeholder || el.name || el.id || el.tagName.toLowerCase()).trim();
  }

  function pageContext(el) {
    const modal = el.closest('.modal, [role="dialog"], dialog');
    if (modal) {
      const title = modal.querySelector('.modal-title, h1, h2, h3, [data-modal-title]');
      if (title && title.textContent.trim()) return title.textContent.trim().slice(0, 100);
    }
    const form = el.closest('form');
    if (form) {
      const title = form.querySelector('h1, h2, h3, legend, [data-form-title]');
      if (title && title.textContent.trim()) return title.textContent.trim().slice(0, 100);
    }
    const app = document.getElementById('app');
    const heading = app && app.querySelector('h1, h2, h3, [data-page-title]');
    return heading && heading.textContent.trim() ? heading.textContent.trim().slice(0, 100) : (location.hash || 'app');
  }

  function historyKey(el) {
    const field = fieldLabel(el).replace(/\s+/g, ' ').slice(0, 100);
    const context = pageContext(el).replace(/\s+/g, ' ').slice(0, 100);
    const identity = `${el.tagName.toLowerCase()}|${el.name || ''}|${el.id || ''}|${field}|${context}`;
    return `${STORAGE_PREFIX}:${encodeURIComponent(activeUserKey())}:${encodeURIComponent(identity)}`;
  }

  function readHistory(el) {
    try {
      const value = JSON.parse(localStorage.getItem(historyKey(el)) || '[]');
      return Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim()).slice(0, MAX_ITEMS) : [];
    } catch (_) {
      return [];
    }
  }

  function saveValue(el) {
    if (isExcluded(el)) return;
    const value = String(el.value || '').trim();
    if (!value || value.length > MAX_VALUE_LENGTH) return;
    const values = [value, ...readHistory(el).filter(v => v.toLocaleLowerCase() !== value.toLocaleLowerCase())].slice(0, MAX_ITEMS);
    try { localStorage.setItem(historyKey(el), JSON.stringify(values)); } catch (_) { /* local storage may be disabled/full */ }
  }

  function ensureDatalist(el) {
    if (isExcluded(el) || el.tagName === 'TEXTAREA') return;
    let id = inputListIds.get(el);
    if (!id && el.hasAttribute('list')) return;
    if (!id) {
      id = `esp-history-${Math.random().toString(36).slice(2, 11)}`;
      inputListIds.set(el, id);
      const list = document.createElement('datalist');
      list.id = id;
      document.body.appendChild(list);
      el.setAttribute('list', id);
      el.setAttribute('autocomplete', 'on');
    }
    const list = document.getElementById(id);
    if (!list) return;
    const values = readHistory(el);
    list.replaceChildren(...values.map(value => {
      const option = document.createElement('option');
      option.value = value;
      return option;
    }));
  }

  function ensureTextareaMenu() {
    if (textareaMenu) return textareaMenu;
    textareaMenu = document.createElement('div');
    textareaMenu.className = 'esp-input-history-menu';
    textareaMenu.hidden = true;
    textareaMenu.setAttribute('role', 'listbox');
    document.body.appendChild(textareaMenu);
    textareaMenu.addEventListener('pointerdown', event => {
      const option = event.target.closest('[data-history-value]');
      if (!option || !textareaTarget) return;
      event.preventDefault();
      textareaTarget.value = option.dataset.historyValue || '';
      textareaTarget.dispatchEvent(new Event('input', { bubbles: true }));
      textareaTarget.dispatchEvent(new Event('change', { bubbles: true }));
      hideTextareaMenu();
      textareaTarget.focus();
    });
    return textareaMenu;
  }

  function hideTextareaMenu() {
    if (textareaMenu) textareaMenu.hidden = true;
    textareaTarget = null;
  }

  function showTextareaSuggestions(el) {
    if (isExcluded(el) || el.tagName !== 'TEXTAREA') return;
    const all = readHistory(el);
    const query = String(el.value || '').trim().toLocaleLowerCase();
    const matches = all.filter(value => !query || value.toLocaleLowerCase().includes(query)).slice(0, 8);
    const menu = ensureTextareaMenu();
    if (!matches.length) { menu.hidden = true; return; }
    textareaTarget = el;
    menu.replaceChildren(...matches.map(value => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'esp-input-history-option';
      button.dataset.historyValue = value;
      button.textContent = value;
      button.setAttribute('role', 'option');
      return button;
    }));
    const rect = el.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 328))}px`;
    menu.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 220)}px`;
    menu.style.width = `${Math.max(220, Math.min(rect.width, 320))}px`;
    menu.hidden = false;
  }

  function enhance(el) {
    if (!el || isExcluded(el)) return;
    if (el.tagName === 'TEXTAREA') {
      el.addEventListener('focus', () => showTextareaSuggestions(el));
      el.addEventListener('input', () => showTextareaSuggestions(el));
      el.addEventListener('blur', () => {
        saveValue(el);
        hideMenuTimer = setTimeout(hideTextareaMenu, 150);
      });
      el.addEventListener('keydown', event => { if (event.key === 'Escape') hideTextareaMenu(); });
      return;
    }
    ensureDatalist(el);
    el.addEventListener('focus', () => ensureDatalist(el));
    el.addEventListener('input', () => ensureDatalist(el));
    el.addEventListener('change', () => saveValue(el));
    el.addEventListener('blur', () => saveValue(el));
  }

  function scan(root = document) {
    if (root.matches && root.matches('input, textarea')) enhance(root);
    root.querySelectorAll?.('input, textarea').forEach(enhance);
  }

  document.addEventListener('submit', event => {
    event.target.querySelectorAll?.('input, textarea').forEach(saveValue);
  }, true);

  document.addEventListener('focusin', event => {
    const el = event.target;
    if (el && el.matches && el.matches('input, textarea')) {
      clearTimeout(hideMenuTimer);
      enhanceOnce(el);
    }
  }, true);

  const enhanced = new WeakSet();
  const originalEnhance = enhance;
  function enhanceOnce(el) {
    if (enhanced.has(el)) {
      if (el.tagName !== 'TEXTAREA') ensureDatalist(el);
      else showTextareaSuggestions(el);
      return;
    }
    enhanced.add(el);
    originalEnhance(el);
  }

  const originalScan = scan;
  function scanOnce(root = document) {
    if (root.matches && root.matches('input, textarea')) enhanceOnce(root);
    root.querySelectorAll?.('input, textarea').forEach(enhanceOnce);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scanOnce(), { once: true });
  else scanOnce();

  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) scanOnce(node);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const style = document.createElement('style');
  style.textContent = `
    .esp-input-history-menu{position:fixed;z-index:100000;max-height:210px;overflow:auto;background:#fff;color:#1f2937;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.16);padding:4px}
    .esp-input-history-menu[hidden]{display:none!important}
    .esp-input-history-option{display:block;width:100%;border:0;background:transparent;text-align:left;padding:8px 10px;border-radius:5px;white-space:normal;overflow-wrap:anywhere;cursor:pointer;font:inherit}
    .esp-input-history-option:hover,.esp-input-history-option:focus{background:#eff6ff;outline:none}
  `;
  document.head.appendChild(style);
})();
