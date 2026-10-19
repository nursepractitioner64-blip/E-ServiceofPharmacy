(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let busy = false;

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  }

  function cleanQuery() {
    const url = new URL(window.location.href);
    ["lineLink", "lineName", "lineLinkError", "lineLogin", "lineLoginError", "linkLine"].forEach(k => url.searchParams.delete(k));
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  }

  function setStatus(message, linked = false) {
    const status = $("auth-line-link-status");
    const button = $("auth-link-line-button");
    if (status) status.textContent = message;
    if (button) {
      button.disabled = linked;
      button.innerHTML = linked
        ? '<i class="fa-brands fa-line"></i> ผูกบัญชี LINE แล้ว'
        : '<i class="fa-brands fa-line"></i> ผูกบัญชี LINE กับบัญชีเดิม';
    }
  }

  async function refreshStatus() {
    try {
      const data = await api("/api/auth/line/status", { cache: "no-store" });
      setStatus(data.linked ? `ผูกบัญชี LINE แล้ว${data.display_name ? `: ${data.display_name}` : ""}` : "สถานะ: บัญชีนี้ยังไม่ได้ผูก LINE", !!data.linked);
    } catch (err) {
      setStatus(err.message || "กรุณาเข้าสู่ระบบก่อนผูกบัญชี LINE", false);
    }
  }

  function showMessage(kind, title, message) {
    if (window.Swal) return window.Swal.fire({ icon: kind, title, text: message });
    window.alert(`${title}\n${message}`);
  }

  async function linkCurrentLine() {
    if (busy) return;
    busy = true;
    const button = $("auth-link-line-button");
    if (button) button.disabled = true;
    setStatus("กำลังเปิด LINE Login เพื่อสแกน QR Code...");
    try {
      // Use LINE's hosted OAuth login screen rather than LIFF auto-login.
      // On desktop this screen offers QR login when enabled for the LINE Login channel.
      window.location.assign("/api/auth/line/link-authorize");
    } catch (err) {
      setStatus(err.message || "เปิด LINE Login ไม่สำเร็จ", false);
      await showMessage("error", "เปิด LINE Login ไม่สำเร็จ", err.message || "กรุณาลองใหม่");
      if (button) button.disabled = false;
      busy = false;
    }
  }

  async function handleCallbackResult() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("lineLink")) {
      const name = params.get("lineName") || "";
      cleanQuery();
      await refreshStatus();
      await showMessage("success", "ผูกบัญชี LINE สำเร็จ", name ? `ผูกกับ LINE: ${name}` : "บันทึก LINE ลงในบัญชีเดิมแล้ว");
    } else if (params.has("lineLinkError")) {
      const message = params.get("lineLinkError") || "ผูกบัญชี LINE ไม่สำเร็จ";
      cleanQuery();
      await refreshStatus();
      await showMessage("error", "ผูกบัญชี LINE ไม่สำเร็จ", message);
    } else if (params.has("lineLoginError")) {
      const message = params.get("lineLoginError") || "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ";
      cleanQuery();
      const error = $("auth-login-error");
      if (error) { error.textContent = message; error.hidden = false; }
    } else if (params.get("lineLogin") === "success") {
      cleanQuery();
      // The main application bootstraps the authenticated session from the HttpOnly cookie.
    }
  }

  window.addEventListener("esp:authenticated", () => { refreshStatus(); });
  document.addEventListener("DOMContentLoaded", async () => {
    $("auth-link-line-button")?.addEventListener("click", linkCurrentLine);
    await refreshStatus();
    await handleCallbackResult();
  });
})();
