
/*
 * Vaccination Records - Vaccine Dispense
 * File: public/modules/vaccinationrecord/vaccinationrecord.client.js
 *
 * GET  /api/vaccine-master
 * GET  /api/vaccine-master/:code/stock
 * GET  /api/vaccine-master/stock/next-ref-no?type=OUT
 * POST /api/vaccine-master/stock
 */

const listeners = [];
let vaccines = [];
let stockRows = [];
let selectedStock = null;
let busy = false;

const $ = (id) => document.getElementById(id);

const clean = (value) =>
  value == null ? "" : String(value).trim();

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const esc = (value) =>
  clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatNumber = (value) =>
  num(value).toLocaleString("th-TH");

function listen(element, event, handler) {
  if (!element) return;

  element.addEventListener(event, handler);
  listeners.push({ element, event, handler });
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let result = null;

  try {
    result = await response.json();
  } catch {}

  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || `HTTP ${response.status}`);
  }

  return result;
}

function dataArray(result) {
  return Array.isArray(result?.data) ? result.data : [];
}

function normalizeVaccine(row = {}) {
  return {
    code: clean(row.code ?? row.CODE),
    name: clean(row.name ?? row.NAME),
    thname: clean(row.THname ?? row.thname ?? row.THNAME)
  };
}

function normalizeStock(row = {}, code = "") {
  return {
    code: clean(row.code ?? row.CODE ?? code),
    name: clean(row.name ?? row.NAME),
    lot: clean(row.lot ?? row.LOT),
    exp: clean(row.exp ?? row.EXP),
    quantity: num(row.quantity ?? row.QTY ?? row.qty),
    unit: clean(row.unit ?? row.UNIT)
  };
}

function setMessage(message = "", isError = true) {
  const el = $("vrFormMessage");

  if (!el) return;

  el.textContent = message;
  el.style.color = isError ? "#b42318" : "#087f5b";
}

function todayISO() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function displayDate(value) {
  const s = clean(value);
  const match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (!match) return s || "-";

  return `${match[3].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[1]}`;
}

function showModal() {
  const modal = $("vaccineDispenseModal");

  if (!modal) return;

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = $("vaccineDispenseModal");

  if (!modal) return;

  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  setMessage("");
}

async function loadVaccines() {
  const result = await apiFetch("/api/vaccine-master");

  vaccines = dataArray(result)
    .map(normalizeVaccine)
    .filter((v) => v.code);

  const select = $("vrVaccineCode");

  if (!select) return;

  select.innerHTML =
    '<option value="">-- เลือกวัคซีน --</option>' +
    vaccines.map((v) =>
      `<option value="${esc(v.code)}">${esc(v.code)} - ${esc(v.name)}${v.thname ? ` (${esc(v.thname)})` : ""}</option>`
    ).join("");
}

async function loadStock(code) {
  const result = await apiFetch(
    `/api/vaccine-master/${encodeURIComponent(code)}/stock`
  );

  return dataArray(result)
    .map((row) => normalizeStock(row, code))
    .filter((row) => row.quantity > 0);
}

async function loadNextRefNo() {
  const el = $("vrRefNo");

  if (el) el.textContent = "กำลังตรวจสอบ...";

  try {
    const result = await apiFetch(
      "/api/vaccine-master/stock/next-ref-no?type=OUT"
    );

    const data = result?.data;

    const ref = typeof data === "string"
      ? data
      : (data?.REF_NO ?? data?.refNo ?? data?.REFNO ?? "");

    if (el) {
      el.textContent = ref || "ระบบจะสร้างเมื่อบันทึก";
    }
  } catch (error) {
    console.warn("Next vaccine OUT ref no unavailable:", error);

    if (el) {
      el.textContent = "ระบบจะสร้างเมื่อบันทึก";
    }
  }
}

/* =====================================================
   RESET EXP
   รองรับ HTML ที่ใช้ input type="text" readonly
===================================================== */

function clearExp() {
  const input = $("vrExp");

  if (!input) return;

  input.value = "";
  input.dataset.exp = "";
  input.disabled = true;
}

/* =====================================================
   RESET FORM
===================================================== */

function resetForm() {
  $("vaccineDispenseForm")?.reset();

  if ($("vrDate")) {
    $("vrDate").value = todayISO();
  }

  if ($("vrVaccineName")) {
    $("vrVaccineName").value = "";
  }

  if ($("vrUnit")) {
    $("vrUnit").value = "";
  }

  if ($("vrLot")) {
    $("vrLot").innerHTML =
      '<option value="">-- เลือกวัคซีนก่อน --</option>';

    $("vrLot").value = "";
    $("vrLot").disabled = true;
  }

  clearExp();

  if ($("vrQty")) {
    $("vrQty").value = "";
    $("vrQty").removeAttribute("max");
  }

  if ($("vrAvailableQty")) {
    $("vrAvailableQty").textContent = "คงเหลือ: -";
  }

  selectedStock = null;
  stockRows = [];

  setMessage("");
}

/* =====================================================
   OPEN MODAL
===================================================== */

async function openDispenseModal() {
  resetForm();
  showModal();

  try {
    if (!vaccines.length) {
      await loadVaccines();
    }

    await loadNextRefNo();
  } catch (error) {
    setMessage(
      `โหลดรายการวัคซีนไม่สำเร็จ: ${error.message}`
    );
  }
}

/* =====================================================
   CHANGE VACCINE
===================================================== */

async function onVaccineChange() {
  const code = $("vrVaccineCode")?.value || "";

  const vaccine = vaccines.find(
    (v) => v.code === code
  );

  if ($("vrVaccineName")) {
    $("vrVaccineName").value = vaccine?.name || "";
  }

  if ($("vrLot")) {
    $("vrLot").disabled = true;
    $("vrLot").innerHTML =
      '<option value="">กำลังโหลด LOT...</option>';
  }

  clearExp();

  if ($("vrAvailableQty")) {
    $("vrAvailableQty").textContent = "คงเหลือ: -";
  }

  if ($("vrQty")) {
    $("vrQty").value = "";
    $("vrQty").removeAttribute("max");
  }

  if ($("vrUnit")) {
    $("vrUnit").value = "";
  }

  selectedStock = null;
  stockRows = [];

  setMessage("");

  if (!code) {
    if ($("vrLot")) {
      $("vrLot").innerHTML =
        '<option value="">-- เลือกวัคซีนก่อน --</option>';
    }

    return;
  }

  try {
    stockRows = await loadStock(code);

    const lots = [
      ...new Set(
        stockRows.map((row) => row.lot).filter(Boolean)
      )
    ];

    if (!$("vrLot")) return;

    $("vrLot").innerHTML =
      '<option value="">-- เลือก LOT --</option>' +
      lots.map((lot) => {
        const total = stockRows
          .filter((row) => row.lot === lot)
          .reduce((sum, row) => sum + row.quantity, 0);

        return `<option value="${esc(lot)}">${esc(lot)} · คงเหลือ ${formatNumber(total)}</option>`;
      }).join("");

    $("vrLot").disabled = lots.length === 0;

    if (!lots.length) {
      $("vrLot").innerHTML =
        '<option value="">ไม่มี Stock คงเหลือ</option>';

      setMessage("วัคซีนนี้ไม่มี Stock คงเหลือ");
    }
  } catch (error) {
    if ($("vrLot")) {
      $("vrLot").innerHTML =
        '<option value="">โหลด Stock ไม่สำเร็จ</option>';
    }

    setMessage(
      `โหลด Stock คงเหลือไม่สำเร็จ: ${error.message}`
    );
  }
}

/* =====================================================
   CHANGE LOT
   เลือก LOT แล้วเติม EXP อัตโนมัติ
===================================================== */

function onLotChange() {
  const lot = $("vrLot")?.value || "";

  clearExp();

  if ($("vrAvailableQty")) {
    $("vrAvailableQty").textContent = "คงเหลือ: -";
  }

  if ($("vrQty")) {
    $("vrQty").value = "";
    $("vrQty").removeAttribute("max");
  }

  if ($("vrUnit")) {
    $("vrUnit").value = "";
  }

  selectedStock = null;
  setMessage("");

  const rows = stockRows.filter(
    (row) => row.lot === lot && row.quantity > 0
  );

  if (!lot || !rows.length) return;

  const exps = [
    ...new Set(
      rows.map((row) => row.exp).filter(Boolean)
    )
  ];

  /*
   * หาก LOT เดียวมีหลาย EXP หรือไม่มี EXP
   * จะไม่เลือกข้อมูลแบบสุ่ม เพราะอาจจ่ายผิด Stock
   */
  if (exps.length !== 1) {
    setMessage(
      exps.length === 0
        ? "LOT นี้ไม่มีข้อมูล EXP ใน Stock กรุณาตรวจสอบข้อมูล"
        : "LOT นี้มีหลายวันหมดอายุ กรุณาตรวจสอบข้อมูล Stock ก่อนจ่าย",
      true
    );

    return;
  }

  const exp = exps[0];
  const input = $("vrExp");

  if (input) {
    input.value = displayDate(exp);
    input.dataset.exp = exp;
    input.disabled = false;
  }

  selectStockByLotExp(lot, exp);
}

/* =====================================================
   SELECT STOCK BY LOT + EXP
===================================================== */

function selectStockByLotExp(lot, exp) {
  selectedStock = stockRows.find(
    (row) =>
      row.lot === lot &&
      row.exp === exp &&
      row.quantity > 0
  ) || null;

  if ($("vrAvailableQty")) {
    $("vrAvailableQty").textContent = selectedStock
      ? `คงเหลือ: ${formatNumber(selectedStock.quantity)} ${selectedStock.unit || "dose"}`
      : "คงเหลือ: -";
  }

  if ($("vrQty")) {
    $("vrQty").value = "";

    if (selectedStock) {
      $("vrQty").max = String(selectedStock.quantity);
    } else {
      $("vrQty").removeAttribute("max");
    }
  }

  if ($("vrUnit")) {
    $("vrUnit").value = selectedStock?.unit || "";
  }
}

/* =====================================================
   SUBMIT DISPENSE
===================================================== */

async function onSubmit(event) {
  event.preventDefault();

  if (busy) return;

  const form = $("vaccineDispenseForm");

  if (!form || !form.reportValidity()) return;

  const payload = {
    type: "OUT",
    date: clean($("vrDate")?.value),
    code: clean($("vrVaccineCode")?.value),
    name: clean($("vrVaccineName")?.value),
    qty: num($("vrQty")?.value),
    unit: clean($("vrUnit")?.value),
    lot: clean($("vrLot")?.value),

    // ส่ง EXP ต้นฉบับจาก Stock
    // ไม่ส่งวันที่รูปแบบ DD/MM/YYYY ที่ใช้แสดงผล
    exp: clean($("vrExp")?.dataset?.exp),

    user: clean($("vrUser")?.value),
    location: clean($("vrLocation")?.value),
    target: clean($("vrTarget")?.value),
    remark: clean($("vrRemark")?.value)
  };

  if (
    !selectedStock ||
    selectedStock.lot !== payload.lot ||
    selectedStock.exp !== payload.exp
  ) {
    setMessage(
      "กรุณาเลือกวัคซีนและ LOT ที่มี Stock คงเหลือ และตรวจสอบ EXP"
    );

    return;
  }

  if (
    payload.qty <= 0 ||
    !Number.isInteger(payload.qty)
  ) {
    setMessage(
      "จำนวนจ่ายต้องเป็นจำนวนเต็มที่มากกว่า 0"
    );

    return;
  }

  if (payload.qty > selectedStock.quantity) {
    setMessage(
      `จำนวนจ่ายมากกว่าคงเหลือ (${formatNumber(selectedStock.quantity)} ${selectedStock.unit || "dose"})`
    );

    return;
  }

  if (!payload.user || !payload.location) {
    setMessage("กรุณาระบุผู้บันทึกและ Location");
    return;
  }

  const button = $("saveVaccineDispenseBtn");

  busy = true;

  if (button) {
    button.disabled = true;
    button.textContent = "⏳ กำลังบันทึก...";
  }

  setMessage("");

  try {
    const result = await apiFetch(
      "/api/vaccine-master/stock",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    const data = result?.data || {};
    const ref = data.refNo ?? data.REF_NO ?? "-";

   closeModal();

// โหลดประวัติใหม่หลังบันทึกจ่ายสำเร็จ
await loadVaccineDispenseHistory();

window.alert(
  `จ่ายวัคซีนออกสำเร็จ\nเลขที่เอกสาร: ${ref}`
);
  } catch (error) {
    setMessage(
      `บันทึกไม่สำเร็จ: ${error.message}`
    );
  } finally {
    busy = false;

    if (button) {
      button.disabled = false;
      button.textContent = "💉 ยืนยันจ่ายวัคซีน";
    }
  }
}


/* =====================================================
   VACCINE DISPENSE HISTORY
   อ่านเฉพาะรายการ TYPE = OUT
   API: GET /api/vaccine-master/stock/movements
===================================================== */

async function loadVaccineDispenseHistory() {
  const tbody = $("vrDispenseHistoryBody");
  const countEl = $("vrHistoryCount");

  if (!tbody) {
    console.warn(
      "Vaccine dispense history table not found: #vrDispenseHistoryBody"
    );
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="11" class="text-center">
        กำลังโหลดประวัติการจ่ายวัคซีน...
      </td>
    </tr>
  `;

  try {
    const result = await apiFetch(
      "/api/vaccine-master/stock/movements"
    );

    // กรองซ้ำฝั่ง Client เพื่อแสดงเฉพาะ TYPE = OUT
    const rows = dataArray(result).filter((row) => {
      const type = clean(row.type ?? row.TYPE).toUpperCase();
      return type === "OUT";
    });

    if (countEl) {
      countEl.textContent = formatNumber(rows.length);
    }

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center">
            ยังไม่มีประวัติการจ่ายวัคซีน
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map((row) => {
      const date = row.date ?? row.DATE;
      const refNo = row.refNo ?? row.REF_NO ?? row.REFNO;
      const code = row.code ?? row.CODE;
      const name = row.name ?? row.NAME;
      const lot = row.lot ?? row.LOT;
      const exp = row.exp ?? row.EXP;
      const qty = row.qty ?? row.QTY;
      const unit = row.unit ?? row.UNIT;
      const target = row.target ?? row.TARGET;
      const user = row.user ?? row.USER;
      const location = row.location ?? row.Location ?? row.LOCATION;

      return `
        <tr>
          <td>${esc(displayDate(date))}</td>
          <td>${esc(refNo || "-")}</td>
          <td>${esc(code || "-")}</td>
          <td>${esc(name || "-")}</td>
          <td>${esc(lot || "-")}</td>
          <td>${esc(displayDate(exp))}</td>
          <td class="text-end">${esc(formatNumber(qty))}</td>
          <td>${esc(unit || "-")}</td>
          <td>${esc(target || "-")}</td>
          <td>${esc(user || "-")}</td>
          <td>${esc(location || "-")}</td>
        </tr>
      `;
    }).join("");

  } catch (error) {
    console.error(
      "Load vaccine dispense history failed:",
      error
    );

    if (countEl) {
      countEl.textContent = "0";
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center text-danger">
          โหลดประวัติไม่สำเร็จ: ${esc(error.message)}
        </td>
      </tr>
    `;
  }
}


/* =====================================================
   KEYBOARD
===================================================== */

function onKeydown(event) {
  if (
    event.key === "Escape" &&
    !$("vaccineDispenseModal")?.hidden
  ) {
    closeModal();
  }
}

/* =====================================================
   BACK HOME
===================================================== */

function backHome() {
  if (typeof window.navigate === "function") {
    window.navigate("emergency-checklist");
  } else {
    window.location.hash = "#emergency-checklist";
  }
}

/* =====================================================
   INIT
===================================================== */

export async function init() {
  if (!$("invPage")) {
    console.warn("Vaccination Records view not found");
    return;
  }

  listen(
    $("openVaccineDispenseBtn"),
    "click",
    openDispenseModal
  );

  listen(
    $("backEmergencyHomeBtn"),
    "click",
    backHome
  );

  listen(
    $("closeVaccineDispenseBtn"),
    "click",
    closeModal
  );

  listen(
    $("cancelVaccineDispenseBtn"),
    "click",
    closeModal
  );

  listen(
    $("closeVaccineDispenseOverlay"),
    "click",
    closeModal
  );

  listen(
    $("vrVaccineCode"),
    "change",
    onVaccineChange
  );

  listen(
    $("vrLot"),
    "change",
    onLotChange
  );

  listen(
    $("vaccineDispenseForm"),
    "submit",
    onSubmit
  );

  listen(
    document,
    "keydown",
    onKeydown
  );

  
  // รีเฟรชประวัติการจ่ายวัคซีน
  listen(
    $("refreshVaccineDispenseHistoryBtn"),
    "click",
    loadVaccineDispenseHistory
  );

  // โหลดประวัติอัตโนมัติเมื่อเปิดหน้า
  void loadVaccineDispenseHistory();

}

/* =====================================================
   DESTROY
===================================================== */

export function destroy() {
  for (const { element, event, handler } of listeners) {
    element.removeEventListener(event, handler);
  }

  listeners.length = 0;

  if (!$("vaccineDispenseModal")?.hidden) {
    closeModal();
  }

  busy = false;
}
