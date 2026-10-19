(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let currentMethod = "manual";
  let usernameTouched = false;

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function setScreenTitle(isRegister, subtitle) {
    const title = $("auth-login-title");
    const sub = document.querySelector(".auth-subtitle");
    if (title) title.textContent = isRegister ? "สมัครสมาชิก" : "E-ServiceofPharmacy";
    if (sub) sub.textContent = isRegister ? subtitle : "เข้าสู่ระบบเพื่อใช้งาน Emergency Checklist";
  }

  function showRegistrationChoice(show) {
    const loginForm = $("auth-login-form");
    const openButton = $("auth-register-open");
    const footnote = $("auth-login-footnote");
    const choice = $("auth-register-choice");
    const form = $("auth-register-form");
    if (loginForm) loginForm.hidden = show;
    if (openButton) openButton.hidden = show;
    if (footnote) footnote.hidden = show;
    if (choice) choice.hidden = !show;
    if (form) form.hidden = true;
    setScreenTitle(show, "เลือกวิธีสมัครสมาชิก");
  }

  function showRegistrationForm(method) {
    currentMethod = method === "line" ? "line" : "manual";
    const loginForm = $("auth-login-form");
    const openButton = $("auth-register-open");
    const footnote = $("auth-login-footnote");
    const choice = $("auth-register-choice");
    const form = $("auth-register-form");
    if (loginForm) loginForm.hidden = true;
    if (openButton) openButton.hidden = true;
    if (footnote) footnote.hidden = true;
    if (choice) choice.hidden = true;
    if (form) {
      form.hidden = false;
      form.dataset.method = currentMethod;
    }
    const lineStatus = $("auth-register-line-status");
    const lineButton = $("auth-register-line");
    const tokenField = $("auth-reg-line-token");
    const submit = $("auth-register-submit");
    const token = tokenField?.value || "";
    if (lineStatus) {
      lineStatus.hidden = currentMethod !== "line";
      if (currentMethod === "line" && token) lineStatus.textContent = "ยืนยันตัวตน LINE สำเร็จ — กรุณากรอกรายละเอียดสมัครสมาชิก";
      else if (currentMethod === "line") lineStatus.textContent = "ยังไม่ได้ยืนยันตัวตน LINE";
    }
    if (lineButton) lineButton.hidden = currentMethod !== "line" || Boolean(token);
    if (submit) submit.disabled = currentMethod === "line" && !token;
    setScreenTitle(true, currentMethod === "line" ? "ยืนยันตัวตน LINE แล้วกรอกรายละเอียด" : "กรอกรายละเอียดเพื่อสมัครสมาชิก");
  }

  function setError(message = "") {
    const formNode = $("auth-register-error");
    const choiceNode = $("auth-register-choice-error");
    const choiceVisible = $("auth-register-choice") && !$("auth-register-choice").hidden;
    const node = choiceVisible ? choiceNode : formNode;
    [formNode, choiceNode].filter(Boolean).forEach(item => { item.hidden = true; item.textContent = ""; });
    if (node) { node.textContent = message; node.hidden = !message; }
  }

  function generateUsername(value) {
    const parts = String(value || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return "";
    const first = parts[0].replace(/[^a-z0-9]/g, "");
    const initial = parts[parts.length - 1].charAt(0).replace(/[^a-z]/g, "");
    return first && initial ? `${first}.${initial}` : "";
  }

  function cleanRegistrationQuery() {
    const url = new URL(window.location.href);
    ["register", "registerMethod", "lineRegistrationToken", "registerLineError"].forEach(key => url.searchParams.delete(key));
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  }

  $("auth-register-open")?.addEventListener("click", () => {
    setError("");
    showRegistrationChoice(true);
  });
  $("auth-register-choice-back")?.addEventListener("click", () => {
    showRegistrationChoice(false);
    setError("");
  });
  $("auth-register-manual-choice")?.addEventListener("click", () => {
    setError("");
    if ($("auth-reg-line-token")) $("auth-reg-line-token").value = "";
    showRegistrationForm("manual");
  });
  $("auth-register-line-choice")?.addEventListener("click", () => {
    window.location.href = "/api/auth/line/register-authorize";
  });
  $("auth-register-back")?.addEventListener("click", () => {
    setError("");
    showRegistrationChoice(true);
  });
  $("auth-register-line")?.addEventListener("click", () => {
    window.location.href = "/api/auth/line/register-authorize";
  });

  $("auth-reg-full-en")?.addEventListener("input", event => {
    if (usernameTouched) return;
    const generated = generateUsername(event.target.value);
    if (generated && $("auth-reg-username")) $("auth-reg-username").value = generated;
  });
  $("auth-reg-username")?.addEventListener("input", () => { usernameTouched = true; });

  $("auth-register-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const lineRegistrationToken = currentMethod === "line" ? String($("auth-reg-line-token")?.value || "") : "";
    if (currentMethod === "line" && !lineRegistrationToken) {
      setError("กรุณายืนยันตัวตนผ่าน LINE ก่อนสมัครสมาชิก");
      return;
    }
    const password = $("auth-reg-password").value;
    const confirmPassword = $("auth-reg-confirm").value;
    if (password !== confirmPassword) { setError("Password และ Confirm Password ไม่ตรงกัน"); return; }
    if (password.length < 8) { setError("Password ต้องมีอย่างน้อย 8 ตัวอักษร"); return; }

    const submit = $("auth-register-submit");
    if (submit) { submit.disabled = true; submit.textContent = "กำลังสมัครสมาชิก..."; }
    setError("");
    try {
      const payload = {
        registration_method: currentMethod,
        full_name_th: $("auth-reg-full-th").value.trim(),
        full_name_en: $("auth-reg-full-en").value.trim(),
        position: $("auth-reg-position").value,
        employment_type: $("auth-reg-employment").value,
        username: $("auth-reg-username").value.trim(),
        phone: $("auth-reg-phone").value.trim(),
        email: $("auth-reg-email").value.trim(),
        password,
        confirm_password: confirmPassword
      };
      if (currentMethod === "line") payload.line_registration_token = lineRegistrationToken;
      const result = await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
      const message = result.message || result.user?.message || "สมัครสมาชิกสำเร็จ กรุณารอ Admin อนุมัติ";
      if (window.Swal) await Swal.fire({ icon: "success", title: "สมัครสมาชิกสำเร็จ", text: message, confirmButtonText: "กลับไป Login" });
      else window.alert(message);
      const username = $("auth-reg-username").value.trim();
      form.reset();
      usernameTouched = false;
      showRegistrationChoice(false);
      const loginUsername = $("auth-username");
      if (loginUsername) loginUsername.value = username;
      cleanRegistrationQuery();
    } catch (err) {
      setError(err.message || "สมัครสมาชิกไม่สำเร็จ");
      // Keep the verified LINE registration token available until its expiry if validation fails.
    } finally {
      if (submit) { submit.textContent = "สมัครสมาชิก"; submit.disabled = currentMethod === "line" && !String($("auth-reg-line-token")?.value || ""); }
    }
  });

  (function initializeRegistrationRoute() {
    const query = new URLSearchParams(window.location.search);
    const lineError = query.get("registerLineError");
    if (lineError) {
      showRegistrationChoice(true);
      setError(lineError);
      cleanRegistrationQuery();
      return;
    }
    if (query.get("register") === "1") {
      const method = query.get("registerMethod") === "line" ? "line" : "manual";
      const token = query.get("lineRegistrationToken") || "";
      if (method === "line" && !token) {
        showRegistrationChoice(true);
        setError("ไม่พบข้อมูลยืนยันตัวตน LINE กรุณาเลือกสมัครผ่าน LINE ใหม่อีกครั้ง");
        cleanRegistrationQuery();
        return;
      }
      if ($("auth-reg-line-token")) $("auth-reg-line-token").value = token;
      showRegistrationForm(method);
      cleanRegistrationQuery();
    }
  })();
})();
