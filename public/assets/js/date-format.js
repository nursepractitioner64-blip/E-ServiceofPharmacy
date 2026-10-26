/* Global date display adapter: MM/DD/YYYY.
 * Keeps the original input[type=date] as the canonical ISO value (YYYY-MM-DD)
 * so existing modules, FormData, APIs and Google Sheets integrations keep working.
 */
(() => {
  'use strict';
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const DISPLAY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const initialized = new WeakMap();

  function isoToDisplay(iso) {
    if (!ISO_DATE.test(String(iso || ''))) return '';
    const [y, m, d] = iso.split('-');
    return `${m}/${d}/${y}`;
  }

  function displayToIso(value) {
    const match = DISPLAY_DATE.exec(String(value || '').trim());
    if (!match) return '';
    const [, mm, dd, yyyy] = match;
    const month = Number(mm), day = Number(dd), year = Number(yyyy);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
    return `${yyyy}-${mm}-${dd}`;
  }

  function installStyles() {
    if (document.getElementById('global-mmddyyyy-style')) return;
    const style = document.createElement('style');
    style.id = 'global-mmddyyyy-style';
    style.textContent = `
      input.global-date-iso-source {
        position: absolute !important; width: 1px !important; height: 1px !important;
        padding: 0 !important; margin: -1px !important; overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important;
        border: 0 !important; opacity: 0 !important; pointer-events: none !important;
      }
      input.global-date-mmddyyyy { min-width: 0; }
      input.global-date-mmddyyyy[aria-invalid="true"] { border-color: var(--bs-danger, #dc3545) !important; }
    `;
    document.head.appendChild(style);
  }

  function enhance(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== 'date' || initialized.has(input)) return;
    if (input.dataset.dateFormatRaw === 'true') return;
    installStyles();

    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (!proto || !proto.get || !proto.set) return;

    const visible = document.createElement('input');
    visible.type = 'text';
    visible.className = `${input.className || ''} global-date-mmddyyyy`.trim();
    visible.placeholder = 'MM/DD/YYYY';
    visible.autocomplete = 'off';
    visible.inputMode = 'numeric';
    visible.setAttribute('pattern', '(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/[0-9]{4}');
    visible.setAttribute('aria-label', input.getAttribute('aria-label') || input.labels?.[0]?.textContent?.trim() || 'Date (MM/DD/YYYY)');
    visible.setAttribute('data-date-format-display', 'MM/DD/YYYY');
    if (input.id) {
      visible.id = `${input.id}__mmddyyyy`;
      document.querySelectorAll(`label[for=\"${CSS.escape(input.id)}\"]`).forEach(label => label.htmlFor = visible.id);
    }
    if (input.title) visible.title = input.title;
    if (input.disabled) visible.disabled = true;
    if (input.readOnly) visible.readOnly = true;
    if (input.required) visible.required = true;
    if (input.getAttribute('min')) visible.dataset.minIso = input.getAttribute('min');
    if (input.getAttribute('max')) visible.dataset.maxIso = input.getAttribute('max');

    // Preserve existing canonical .value reads/writes while the visible field uses MM/DD/YYYY.
    let canonical = proto.get.call(input) || '';
    Object.defineProperty(input, 'value', {
      configurable: true,
      enumerable: true,
      get() { return canonical; },
      set(value) {
        const raw = value == null ? '' : String(value);
        canonical = ISO_DATE.test(raw) ? raw : (displayToIso(raw) || raw);
        proto.set.call(input, ISO_DATE.test(canonical) ? canonical : '');
        if (visible.isConnected) {
          visible.value = isoToDisplay(canonical);
          visible.removeAttribute('aria-invalid');
          visible.setCustomValidity('');
        }
      }
    });

    visible.value = isoToDisplay(canonical);
    input.classList.add('global-date-iso-source');
    input.removeAttribute('required');
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;
    input.insertAdjacentElement('beforebegin', visible);

    visible.addEventListener('input', () => {
      const text = visible.value.trim();
      if (!text) {
        canonical = '';
        proto.set.call(input, '');
        visible.removeAttribute('aria-invalid');
        visible.setCustomValidity('');
      } else {
        const iso = displayToIso(text);
        if (iso) {
          canonical = iso;
          proto.set.call(input, iso);
          visible.removeAttribute('aria-invalid');
          visible.setCustomValidity('');
        } else {
          canonical = '';
          proto.set.call(input, '');
          visible.setAttribute('aria-invalid', 'true');
          visible.setCustomValidity('กรุณากรอกวันที่รูปแบบ MM/DD/YYYY เช่น 12/06/2028');
        }
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    visible.addEventListener('blur', () => {
      if (!visible.value.trim()) {
        visible.value = '';
        return;
      }
      const iso = displayToIso(visible.value);
      if (iso) {
        canonical = iso;
        proto.set.call(input, iso);
        visible.value = isoToDisplay(iso);
        visible.removeAttribute('aria-invalid');
        visible.setCustomValidity('');
      }
    });

    // Keep the visible field aligned when existing code changes constraints/state.
    const observer = new MutationObserver(() => {
      visible.disabled = input.disabled;
      visible.readOnly = input.readOnly;
      if (input.required && !visible.required) visible.required = true;
    });
    observer.observe(input, { attributes: true, attributeFilter: ['disabled', 'readonly', 'required', 'min', 'max'] });
    const form = input.form;
    if (form && !form.dataset.mmddyyyyResetBound) {
      form.dataset.mmddyyyyResetBound = 'true';
      form.addEventListener('reset', () => setTimeout(() => {
        form.querySelectorAll('input[type=\"date\"]').forEach((dateInput) => {
          const state = initialized.get(dateInput);
          if (!state) return;
          const nativeValue = proto.get.call(dateInput) || '';
          state.visible.value = isoToDisplay(nativeValue);
          state.visible.removeAttribute('aria-invalid');
          state.visible.setCustomValidity('');
        });
      }, 0));
    }
    initialized.set(input, { visible, observer });
  }

  function scan(root = document) {
    if (root instanceof HTMLInputElement) enhance(root);
    root.querySelectorAll?.('input[type="date"]').forEach(enhance);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan());
  else scan();
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
