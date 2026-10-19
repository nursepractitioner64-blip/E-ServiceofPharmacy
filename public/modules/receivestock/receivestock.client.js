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
/* =========================
   TABLE
   ========================= */
async function loadReceiveStock() {
  const tbody = document.getElementById("receiveStockTable");

  if (!tbody) {
    console.warn("❌ receiveStockTable not found");
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="8">Loading...</td>
    </tr>
  `;

  try {
    const res = await fetch("/api/receivestock", {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(
        `โหลด receive ไม่สำเร็จ HTTP ${res.status}`
      );
    }

    const json = await res.json();

    const rows = Array.isArray(json)
      ? json
      : (Array.isArray(json.data) ? json.data : []);

    console.log("📦 RECEIVE API DATA:", rows);

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            ไม่พบข้อมูล
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(r => {

      /* =========================
         NORMALIZE DATA
         ========================= */

      const dateIn =
        r.dateIn ??
        r.DATE_IN ??
        r.DATE ??
        "-";

      const code =
        r.code ??
        r.CODE ??
        "-";

      const name =
        r.name ??
        r.NAME ??
        "-";

      const qty =
        r.qty ??
        r.QTY ??
        0;

      const unit =
        r.unit ??
        r.UNIT ??
        "-";

      const lot =
        r.lot ??
        r.LOT ??
        "-";

      const exp =
        r.exp ??
        r.EXP ??
        "-";

      const qr =
        r.qrcode ??
        r.QRCODE ??
        "";

      /* =========================
         QR HTML
         ========================= */

      const qrHtml = qr
        ? `
          <img
            src="${qr}"
            width="60"
            height="60"
            alt="QR Code"
            loading="lazy"
            style="
              display:block;
              width:60px;
              height:60px;
              object-fit:contain;
              margin:auto;
            "
          >
        `
        : "-";

      /* =========================
         ROW
         ========================= */

      return `
        <tr>

          <td>
            ${dateIn}
          </td>

          <td>
            ${code}
          </td>

          <td>
            ${name}
          </td>

          <td>
            ${qty}
          </td>

          <td>
            ${unit}
          </td>

          <td>
            ${lot}
          </td>

          <td>
            ${exp}
          </td>

          <td class="rsm-qrcode-cell">
            ${qrHtml}
          </td>

        </tr>
      `;

    }).join("");

    console.log(
      "✅ RECEIVE STOCK TABLE LOADED:",
      rows.length
    );

  } catch (err) {

    console.error(
      "❌ RECEIVE STOCK TABLE ERROR:",
      err
    );

    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          โหลดข้อมูลไม่สำเร็จ
        </td>
      </tr>
    `;
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
   AUTHENTICATED BRANCH CONTEXT
   BRANCH_ID and LOCATION are filled from the server session.
   ========================= */
async function loadReceiveBranchContext() {
  const branchInput = document.getElementById("rsmBranchId");
  const locationInput = document.getElementById("rsmLocation");
  const userInput = document.getElementById("rsmUser");

  try {
    const res = await fetch("/api/receivestock/context", {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "same-origin"
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok !== true || !json.data) {
      throw new Error(json.message || "ไม่พบสาขาที่ปฏิบัติงาน กรุณาเลือกสาขาก่อนรับสินค้า");
    }

    if (branchInput) branchInput.value = String(json.data.branchId || "");
    if (locationInput) locationInput.value = String(json.data.location || "");
    if (userInput && json.data.user) userInput.value = String(json.data.user);

    return true;
  } catch (err) {
    console.error("❌ RECEIVE BRANCH CONTEXT:", err);
    if (branchInput) branchInput.value = "";
    if (locationInput) locationInput.value = "";
    return false;
  }
}

/* =========================
   DRUG SELECT
   ========================= */
function bindDrugSelect() {

  const select =
    document.getElementById(
      "drugSelectReceive"
    );

  if (!select) {

    console.warn(
      "❌ RSM #drugSelectReceive not found"
    );

    return;
  }

  if (
    select.dataset.bound === "1"
  ) {
    return;
  }

  select.dataset.bound = "1";

  select.addEventListener(
    "change",
    event => {

      const selected =
        event.target.selectedOptions?.[0];

      const code =
        document.getElementById("code");

      const name =
        document.getElementById("name");

      const unit =
        document.getElementById("unit");

      if (!selected || !selected.value) {

        if (code) code.value = "";
        if (name) name.value = "";
        if (unit) unit.value = "";

        return;
      }

      const selectedCode =
        selected.value || "";

      const selectedName =
        selected.dataset.name || "";

      const selectedUnit =
        selected.dataset.unit || "";

      if (code) {
        code.value = selectedCode;
      }

      if (name) {
        name.value = selectedName;
      }

      if (unit) {
        unit.value = selectedUnit;
      }

      console.log(
        "💊 RSM DRUG SELECT:",
        {
          code: selectedCode,
          name: selectedName,
          unit: selectedUnit
        }
      );
    }
  );

  console.log(
    "✅ RSM DRUG SELECT BOUND"
  );
}

/* =========================
   RESET
   ========================= */
/* =========================
   RESET FORM
   ========================= */
function resetForm() {

  const form =
    document.getElementById(
      "receivestockForm"
    );

  if (!form) {
    return;
  }

  form.reset();

  const code =
    document.getElementById("code");

  const name =
    document.getElementById("name");

  const unit =
    document.getElementById("unit");

  if (code) {
    code.value = "";
  }

  if (name) {
    name.value = "";
  }

  if (unit) {
    unit.value = "";
  }

  const select =
    document.getElementById(
      "drugSelectReceive"
    );

  if (select) {
    select.value = "";
  }

  console.log(
    "♻️ RSM FORM RESET"
  );
}

/* =========================
   MODAL
   ========================= */
function modalClose() {

  const modal =
    document.getElementById(
      "ReceiveStockModal"
    );

  if (!modal) {
    return;
  }

  /* Return focus before hiding the modal from assistive technology. */
  const activeElement =
    document.activeElement;

  if (
    activeElement &&
    modal.contains(activeElement) &&
    typeof activeElement.blur === "function"
  ) {
    activeElement.blur();
  }

  modal.classList.remove("active");
  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  const openBtn =
    document.getElementById(
      "openReceiveStockModal"
    );

  if (
    openBtn &&
    typeof openBtn.focus === "function"
  ) {
    requestAnimationFrame(() => {
      openBtn.focus();
    });
  }

  console.log(
    "🔴 RSM MODAL CLOSED"
  );
}

/* =========================
   MODAL — RECEIVE STOCK
   ========================= */
function bindModal() {

  const modal =
    document.getElementById("ReceiveStockModal");

  const openBtn =
    document.getElementById("openReceiveStockModal");

  if (!modal) {
    console.warn(
      "❌ RSM modal #ReceiveStockModal not found"
    );
    return;
  }

  if (!openBtn) {
    console.warn(
      "❌ RSM open button #openReceiveStockModal not found"
    );
    return;
  }

  /* =========================
     OPEN BUTTON
     ========================= */

  if (openBtn.dataset.bound !== "1") {

    openBtn.dataset.bound = "1";

    openBtn.addEventListener("click", async event => {

      event.preventDefault();
      event.stopPropagation();

      console.log(
        "🟢 RSM OPEN RECEIVE MODAL"
      );

      /* Reset form */
      resetForm();

      /* Open */
      modal.classList.add("active");
      modal.setAttribute(
        "aria-hidden",
        "false"
      );

      /* Move focus into the dialog after it is visible. */
      requestAnimationFrame(() => {
        const firstField =
          modal.querySelector(
            "input, select, textarea, button"
          );

        if (
          firstField &&
          typeof firstField.focus === "function"
        ) {
          firstField.focus();
        }
      });

      /* Resolve branch/location from authenticated server session. */
      const branchReady = await loadReceiveBranchContext();
      if (!branchReady) {
        modalClose();
        await Swal.fire({
          icon: "warning",
          title: "ยังไม่ได้เลือกสาขาปฏิบัติงาน",
          text: "กรุณาเลือกสาขาที่คุณได้รับอนุญาตก่อนรับสินค้าเข้า"
        });
        return;
      }

      /* Current date */
      const dateInput =
        document.getElementById("rsmDateIn");

      if (dateInput) {

        const today =
          new Date()
            .toISOString()
            .slice(0, 10);

        dateInput.value = today;
      }

      /* Load next reference number */
      await loadRefNo();

      /* Ensure drug master exists */
      const select =
        document.getElementById(
          "drugSelectReceive"
        );

      if (
        select &&
        select.options.length <= 1
      ) {
        await loadDrugDropdown();
      }

      console.log(
        "✅ RSM RECEIVE MODAL OPENED"
      );
    });
  }

  /* =========================
     CLOSE BUTTONS
     ========================= */

  modal
    .querySelectorAll(
      ".js-close-receive-modal"
    )
    .forEach(button => {

      if (
        button.dataset.bound === "1"
      ) {
        return;
      }

      button.dataset.bound = "1";

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();

          console.log(
            "🔴 RSM CLOSE RECEIVE MODAL"
          );

          modalClose();
        }
      );

    });

  /* =========================
     CLICK BACKDROP
     ========================= */

  if (modal.dataset.backdropBound !== "1") {

    modal.dataset.backdropBound = "1";

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target === modal
        ) {

          console.log(
            "🔴 RSM CLOSE BY BACKDROP"
          );

          modalClose();
        }

      }
    );
  }

  /* =========================
     ESC KEY
     ========================= */

  if (modal.dataset.escBound !== "1") {

    modal.dataset.escBound = "1";

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key !== "Escape"
        ) {
          return;
        }

        if (
          modal.classList.contains("active")
        ) {

          console.log(
            "🔴 RSM CLOSE BY ESC"
          );

          modalClose();
        }

      }
    );
  }

  console.log(
    "✅ RSM MODAL BOUND"
  );
}
/* =========================
   BUILD PAYLOAD
   ========================= */
function getReceivePayload(form) {
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  return {
    // Required warehouse identity fields; these must reach the API.
    branchId: String(payload.branchId || "").trim(),
    location: String(payload.location || "").trim(),
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
    remark: payload.remark || ""
  };
}

/* =========================
   SAVE
   ========================= */
async function saveReceiveStock(form) {
  const payload = getReceivePayload(form);

  console.log("📤 SAVE RECEIVE PAYLOAD =", payload);

  if (!payload.branchId || !payload.location ||
      !payload.code || !payload.name || !payload.qty ||
      !payload.lot || !payload.exp || !payload.supplier || !payload.user) {
    await Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบ",
      text: "กรุณาตรวจสอบ BRANCH_ID, LOCATION, รหัสยา ชื่อยา จำนวน LOT EXP Supplier และ User"
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
  await loadReceiveBranchContext();
  await loadReceiveStock();
  await loadRefNo();

  console.log("✅ RSM READY");
}
