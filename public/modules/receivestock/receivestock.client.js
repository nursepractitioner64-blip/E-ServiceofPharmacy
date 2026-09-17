/* =====================================================
   RECEIVE STOCK CLIENT
   FIX: bind submit + direct save button + duplicate init guard
   ===================================================== */

let receiveStockInitialized = false;
let receiveSubmitBound = false;

/* =========================
   DROPDOWN
   ========================= */
async function loadDrugDropdown() {
  try {
    const res = await fetch("/api/receivestock/master");

    if (!res.ok) {
      throw new Error(`โหลด master ไม่สำเร็จ HTTP ${res.status}`);
    }

    const json = await res.json();
    const rows = Array.isArray(json) ? json : (json.data || []);

    const select = document.getElementById("drugSelectReceive");
    if (!select) {
      console.warn("❌ drugSelectReceive not found");
      return;
    }

    select.innerHTML = `<option value="">เลือกยา</option>`;

    rows.forEach(r => {
      const code = r.code ?? r.CODE ?? "";
      const name = r.name ?? r.NAME ?? "";
      const unit = r.unit ?? r.UNIT ?? "";

      if (!code) return;

      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${code} - ${name}`;
      opt.dataset.name = name;
      opt.dataset.unit = unit;

      select.appendChild(opt);
    });

    console.log("✅ DRUG MASTER LOADED:", rows.length);
  } catch (err) {
    console.error("❌ dropdown:", err);
  }
}

/* =========================
   TABLE
   ========================= */
async function loadReceiveStock() {
  const tbody = document.getElementById("receiveStockTable");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;

  try {
    const res = await fetch("/api/receivestock");

    if (!res.ok) {
      throw new Error(`โหลด receive ไม่สำเร็จ HTTP ${res.status}`);
    }

    const json = await res.json();
    const rows = Array.isArray(json) ? json : (json.data || []);

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8">ไม่พบข้อมูล</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.dateIn ?? r.DATE ?? "-"}</td>
        <td>${r.code ?? r.CODE ?? "-"}</td>
        <td>${r.name ?? r.NAME ?? "-"}</td>
        <td>${r.qty ?? r.QTY ?? 0}</td>
        <td>${r.unit ?? r.UNIT ?? "-"}</td>
        <td>${r.lot ?? r.LOT ?? "-"}</td>
        <td>${r.exp ?? r.EXP ?? "-"}</td>
        <td>${r.qrcode ?? r.QRCODE ? `<img src="${r.qrcode ?? r.QRCODE}" width="60">` : "-"}</td>
      </tr>
    `).join("");

    console.log("📦 RECEIVE STOCK:", rows.length);
  } catch (err) {
    console.error("❌ table:", err);
    tbody.innerHTML = `<tr><td colspan="8">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
  }
}

/* =========================
   REF NO
   ========================= */
async function loadRefNo() {
  try {
    const res = await fetch("/api/receivestock/refno");

    if (!res.ok) {
      throw new Error(`refno HTTP ${res.status}`);
    }

    const json = await res.json();
    const input = document.getElementById("receivestockNo");

    if (input) {
      input.value = json.refNo || "";
    }

    console.log("🔢 REF NO:", json);
  } catch (err) {
    console.error("❌ refno:", err);
  }
}

/* =========================
   SELECT
   ========================= */
function bindDrugSelect() {
  const select = document.getElementById("drugSelectReceive");
  if (!select || select.dataset.bound === "1") return;

  select.dataset.bound = "1";

  select.addEventListener("change", () => {
    const opt = select.selectedOptions[0];

    const code = document.getElementById("code");
    const name = document.getElementById("name");
    const unit = document.getElementById("unit");

    if (code) code.value = opt?.value || "";
    if (name) name.value = opt?.dataset.name || "";
    if (unit) unit.value = opt?.dataset.unit || "";

    console.log("💊 SELECT DRUG:", {
      code: code?.value,
      name: name?.value,
      unit: unit?.value
    });
  });
}

/* =========================
   RESET
   ========================= */
function resetForm() {
  const form = document.getElementById("receivestockForm");
  form?.reset();

  ["code", "name", "unit"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

/* =========================
   MODAL
   ========================= */
function modalClose() {
  document
    .getElementById("ReceiveStockModal")
    ?.classList.remove("active");
}

function bindModal() {
  const modal = document.getElementById("ReceiveStockModal");
  const openBtn = document.getElementById("openReceiveStockModal");

  if (!modal || !openBtn) {
    console.warn("❌ modal/openBtn not found");
    return;
  }

  if (openBtn.dataset.bound !== "1") {
    openBtn.dataset.bound = "1";

    openBtn.onclick = async () => {
      console.log("➕ OPEN RECEIVE MODAL");

      resetForm();
      modal.classList.add("active");

      const dateInput = document.querySelector('input[name="dateIn"]');
      if (dateInput) {
        dateInput.value = new Date().toISOString().slice(0, 10);
      }

      await loadRefNo();
    };
  }

  modal
    .querySelectorAll(".js-close-receive-modal")
    .forEach(btn => {
      if (btn.dataset.bound === "1") return;

      btn.dataset.bound = "1";
      btn.onclick = modalClose;
    });

  if (modal.dataset.bound !== "1") {
    modal.dataset.bound = "1";

    modal.onclick = e => {
      if (e.target === modal) modalClose();
    };
  }
}

/* =========================
   BUILD PAYLOAD
   ========================= */
function getReceivePayload(form) {
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  return {
    dateIn: payload.dateIn || "",
    code: payload.code || "",
    name: payload.name || "",
    qty: payload.qty || "",
    unit: payload.unit || "",
    lot: payload.lot || "",
    exp: payload.exp || "",
    supplier: payload.supplier || "",
    user: payload.user || "",
    receivestockNo: payload.receivestockNo || "",
    remark: payload.remark || "",
    location: payload.location || ""
  };
}

/* =========================
   SAVE
   ========================= */
async function saveReceiveStock(form) {
  const payload = getReceivePayload(form);

  console.log("📤 SAVE RECEIVE PAYLOAD =", payload);

  if (!payload.code || !payload.name || !payload.qty ||
      !payload.lot || !payload.exp || !payload.supplier || !payload.user) {
    await Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบ",
      text: "กรุณาตรวจสอบ รหัสยา ชื่อยา จำนวน LOT EXP Supplier และ User"
    });
    return;
  }

  const loading = Swal.fire({
    title: "กำลังบันทึก...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await fetch("/api/receivestock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();

    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { message: text };
    }

    console.log("📥 SAVE RECEIVE RESPONSE =", res.status, json);

    Swal.close();

    if (!res.ok || json.ok !== true) {
      throw new Error(
        json.message ||
        json.error ||
        `HTTP ${res.status}`
      );
    }

    await Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      text: json.refNo ? `เลขที่รับ: ${json.refNo}` : "",
      timer: 1500,
      showConfirmButton: false
    });

    resetForm();
    modalClose();

    await loadReceiveStock();
    await loadRefNo();

  } catch (err) {
    console.error("❌ SAVE RECEIVE FAILED:", err);

    Swal.close();

    await Swal.fire({
      icon: "error",
      title: "บันทึกไม่สำเร็จ",
      text: err.message || "เกิดข้อผิดพลาดในการบันทึก"
    });
  }
}

/* =========================
   SUBMIT + BUTTON FALLBACK
   ========================= */
function bindFormSubmit() {
  const form = document.getElementById("receivestockForm");

  if (!form) {
    console.warn("❌ receivestockForm not found");
    return;
  }

  if (receiveSubmitBound) return;
  receiveSubmitBound = true;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    e.stopPropagation();

    console.log("🟢 RECEIVE FORM SUBMIT");

    await saveReceiveStock(form);
  });

  /* Direct click fallback:
     works even when the button is not type=submit. */
  const saveBtn =
    form.querySelector('[type="submit"]') ||
    document.getElementById("saveReceiveStock") ||
    document.getElementById("saveReceiveBtn") ||
    document.querySelector("#ReceiveStockModal .btn-save") ||
    document.querySelector("#ReceiveStockModal button.btn-primary");

  if (saveBtn && saveBtn.dataset.saveBound !== "1") {
    saveBtn.dataset.saveBound = "1";

    saveBtn.addEventListener("click", async e => {
      e.preventDefault();
      e.stopPropagation();

      console.log("🟢 RECEIVE SAVE BUTTON CLICK");

      await saveReceiveStock(form);
    });
  } else if (!saveBtn) {
    console.warn("⚠️ SAVE BUTTON NOT FOUND");
  }

  console.log("✅ RECEIVE FORM SUBMIT BOUND");
}

/* =========================
   STICKER
   ========================= */
function bindStickerButton() {
  const btn = document.getElementById("openStickerPrint");

  if (!btn || btn.dataset.bound === "1") return;

  btn.dataset.bound = "1";

  btn.addEventListener("click", () => {
    window.open(
      "/modules/sticker-print/sticker.view.html",
      "_blank"
    );
  });
}

/* =========================
   INIT
   ========================= */
export async function init() {
  console.log("🔥 RSM INIT");

  /* SPA อาจ init module ซ้ำเมื่อเปลี่ยนหน้า */
  if (receiveStockInitialized) {
    console.log("ℹ️ RSM already initialized");
    return;
  }

  receiveStockInitialized = true;

  bindModal();
  bindDrugSelect();
  bindFormSubmit();
  bindStickerButton();

  await loadDrugDropdown();
  await loadReceiveStock();
  await loadRefNo();

  console.log("✅ RSM READY");
}
