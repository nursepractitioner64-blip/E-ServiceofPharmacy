/* =========================================================
   VACCINE MASTER TABLE
   public/modules/vaccinemaster/vaccinemaster.table.js

   หน้าที่:
   - แสดงตาราง Vaccine Master จำนวน 6 คอลัมน์
   - คำนวณ STOCK จาก VACCINE_MOVEMENT
   - คำนวณยอดคงเหลือแยก CODE + LOT + EXP
   - รวมยอด LOT ที่ยังคงเหลือเป็น STOCK ราย CODE
   - แสดง UNIT
   - ค้นหาด้วย CODE / NAME / THname
   - รองรับปุ่มดูรายละเอียด / แก้ไข / ลบ
   - สร้าง Vaccine Select ใน Stock Modal
   - เติมชื่อวัคซีนอัตโนมัติ
   - ตั้งวันที่เริ่มต้น
========================================================= */

import VM from "./vaccinemaster.shared.js";


/* =========================================================
   LOCAL STATE
========================================================= */

let tableData = [];

let stockSummary = new Map();

let stockLoadError = false;

let renderSequence = 0;


/* =========================================================
   HELPERS
========================================================= */

function getValue(item, ...keys) {
  for (const key of keys) {
    if (
      item &&
      item[key] !== undefined &&
      item[key] !== null &&
      String(item[key]).trim() !== ""
    ) {
      return item[key];
    }
  }

  return "";
}


function normalizeCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}


function getVaccineCode(item) {
  return String(
    getValue(item, "code", "CODE")
  ).trim();
}


function getVaccineName(item) {
  return String(
    getValue(item, "name", "NAME")
  ).trim();
}


function getVaccineTHname(item) {
  return String(
    getValue(item, "THname", "thname", "THNAME")
  ).trim();
}


function getVaccineUnit(item) {
  return String(
    getValue(item, "unit", "UNIT")
  ).trim();
}


function formatNumber(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    maximumFractionDigits: 3
  });
}


/* =========================================================
   LOAD STOCK MOVEMENTS

   ใช้ API เดิม:
   GET /api/vaccine-master/stock/movements

   คำนวณ:
   IN  = เพิ่มจำนวน
   OUT = ลดจำนวน

   ยอดคงเหลือคำนวณแยก CODE + LOT + EXP
========================================================= */

async function loadStockSummary() {

  const response = await fetch(
    "/api/vaccine-master/stock/movements",
    {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `โหลด Stock ไม่สำเร็จ: HTTP ${response.status}`
    );
  }

  const result = await response.json();

  if (result.success === false) {
    throw new Error(
      result.message || "API ไม่สามารถโหลดข้อมูล Stock ได้"
    );
  }

  const movements = Array.isArray(result)
    ? result
    : Array.isArray(result.data)
      ? result.data
      : [];

  const lotBalances = new Map();

  for (const item of movements) {

    const code = normalizeCode(
      getValue(item, "code", "CODE")
    );

    if (!code) continue;

    const type = String(
      getValue(item, "type", "TYPE")
    )
      .trim()
      .toUpperCase();

    if (type !== "IN" && type !== "OUT") {
      continue;
    }

    const qty = Number(
      getValue(item, "qty", "QTY", "quantity", "QUANTITY")
    );

    if (!Number.isFinite(qty) || qty < 0) {
      continue;
    }

    const lot = String(
      getValue(item, "lot", "LOT")
    ).trim();

    const exp = String(
      getValue(item, "exp", "EXP")
    ).trim();

    const unit = String(
      getValue(item, "unit", "UNIT")
    ).trim();

    /*
     * ต้องแยก LOT และ EXP เพื่อไม่ให้
     * นำ Stock คนละ Lot มารวมยอดก่อนคำนวณ
     */
    const key = JSON.stringify([
      code,
      lot,
      exp
    ]);

    let balance = lotBalances.get(key);

    if (!balance) {
      balance = {
        code,
        lot,
        exp,
        balance: 0,
        unit: ""
      };

      lotBalances.set(key, balance);
    }

    if (type === "IN") {
      balance.balance += qty;
    } else {
      balance.balance -= qty;
    }

    /*
     * เก็บหน่วยจากข้อมูล Movement
     */
    if (unit) {
      balance.unit = unit;
    }
  }

  /*
   * รวมเฉพาะ Lot ที่มียอดคงเหลือมากกว่า 0
   */
  const summary = new Map();

  for (const item of lotBalances.values()) {

    if (item.balance <= 0) continue;

    const code = item.code;

    let current = summary.get(code);

    if (!current) {
      current = {
        stock: 0,
        unit: "",
        lots: []
      };

      summary.set(code, current);
    }

    current.stock += item.balance;

    if (!current.unit && item.unit) {
      current.unit = item.unit;
    }

    current.lots.push({
      lot: item.lot,
      exp: item.exp,
      balance: item.balance,
      unit: item.unit
    });
  }

  return summary;
}


/* =========================================================
   RENDER VACCINE MASTER TABLE
========================================================= */

function renderTable(data) {

  tableData = Array.isArray(data)
    ? data
    : [];

  const tbody = document.getElementById(
    "vaccinemasterTableBody"
  );

  if (!tbody) {
    console.error(
      "❌ #vaccinemasterTableBody NOT FOUND"
    );

    return;
  }

  const searchEl = document.getElementById(
    "vaccinemasterSearch"
  );

  /*
   * กรณีไม่มีข้อมูล Master
   */
  if (tableData.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="vaccinemaster-empty">
          ไม่พบข้อมูลวัคซีน
        </td>
      </tr>
    `;

    updateTableCount(0);

    return;
  }

  /*
   * แสดงข้อมูล Master ก่อน
   * ระหว่างรอโหลด Stock
   */
  renderVisibleRows(
    searchEl?.value || "",
    true
  );

  /*
   * โหลด Stock ใหม่
   * ใช้ sequence ป้องกันผลลัพธ์เก่าทับข้อมูลใหม่
   */
  const currentSequence = ++renderSequence;

  loadStockSummary()
    .then(summary => {

      if (currentSequence !== renderSequence) {
        return;
      }

      stockSummary = summary;
      stockLoadError = false;

      renderVisibleRows(
        document.getElementById(
          "vaccinemasterSearch"
        )?.value || "",
        false
      );

    })
    .catch(error => {

      if (currentSequence !== renderSequence) {
        return;
      }

      console.error(
        "❌ LOAD VACCINE STOCK SUMMARY:",
        error
      );

      stockSummary = new Map();
      stockLoadError = true;

      renderVisibleRows(
        document.getElementById(
          "vaccinemasterSearch"
        )?.value || "",
        false
      );

    });

  bindTableSearch();
}


/* =========================================================
   RENDER VISIBLE ROWS
========================================================= */

function renderVisibleRows(searchText = "", loading = false) {

  const tbody = document.getElementById(
    "vaccinemasterTableBody"
  );

  if (!tbody) return;

  const keyword = String(searchText)
    .trim()
    .toLowerCase();

  const filtered = tableData.filter(item => {

    const code = getVaccineCode(item);
    const name = getVaccineName(item);
    const thname = getVaccineTHname(item);

    return (
      code.toLowerCase().includes(keyword) ||
      name.toLowerCase().includes(keyword) ||
      thname.toLowerCase().includes(keyword)
    );
  });

  if (filtered.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="vaccinemaster-empty">
          ไม่พบข้อมูลที่ค้นหา
        </td>
      </tr>
    `;

    updateTableCount(0);

    return;
  }

  tbody.innerHTML = filtered.map(item => {

    const code = getVaccineCode(item);
    const name = getVaccineName(item);
    const thname = getVaccineTHname(item);
    const unitFromMaster = getVaccineUnit(item);

    const normalizedCode = normalizeCode(code);

    const stock = stockSummary.get(normalizedCode);

    let stockText = "กำลังโหลด...";
    let unitText = unitFromMaster || "-";

    if (!loading) {

      if (stockLoadError) {

        stockText = "โหลดไม่สำเร็จ";

      } else {

        stockText = formatNumber(
          stock?.stock || 0
        );

        unitText =
          stock?.unit ||
          unitFromMaster ||
          "-";
      }
    }

    return `
      <tr>

        <td>
          ${VM.escapeHtml(code)}
        </td>

        <td>
          ${VM.escapeHtml(name)}
        </td>

        <td>
          ${VM.escapeHtml(thname)}
        </td>

        <td class="vm-number">
          <span
            class="vaccinemaster-stock-value"
            title="${
              stockLoadError
                ? "ไม่สามารถโหลดข้อมูล Stock ได้"
                : "ยอดคงเหลือรวมทุก LOT ที่มียอดคงเหลือ"
            }"
          >
            ${VM.escapeHtml(stockText)}
          </span>
        </td>

        <td>
          ${VM.escapeHtml(unitText)}
        </td>

        <td class="vm-action-col">
          <div class="vaccinemaster-actions">

            <button
              type="button"
              class="vaccinemaster-icon-btn"
              data-vaccinemaster-detail="${VM.escapeHtml(code)}"
              title="ดูรายละเอียด Stock"
              aria-label="ดูรายละเอียด Stock ${VM.escapeHtml(code)}"
            >
              👁️
            </button>

            <button
              type="button"
              class="vaccinemaster-icon-btn"
              data-vaccinemaster-edit="${VM.escapeHtml(code)}"
              title="แก้ไข"
              aria-label="แก้ไข ${VM.escapeHtml(code)}"
            >
              ✏️
            </button>

            <button
              type="button"
              class="vaccinemaster-icon-btn"
              data-vaccinemaster-delete="${VM.escapeHtml(code)}"
              title="ลบ"
              aria-label="ลบ ${VM.escapeHtml(code)}"
            >
              🗑️
            </button>

          </div>
        </td>

      </tr>
    `;

  }).join("");

  updateTableCount(filtered.length);
}


/* =========================================================
   TABLE COUNT
========================================================= */

function updateTableCount(count) {

  const countEl = document.getElementById(
    "vaccinemasterTableCount"
  );

  if (countEl) {
    countEl.textContent =
      `${Number(count || 0).toLocaleString("th-TH")} รายการ`;
  }
}


/* =========================================================
   SEARCH
========================================================= */

function bindTableSearch() {

  const searchEl = document.getElementById(
    "vaccinemasterSearch"
  );

  if (!searchEl) return;

  if (searchEl.dataset.vaccineSearchBound === "true") {
    return;
  }

  searchEl.addEventListener("input", () => {

    renderVisibleRows(
      searchEl.value,
      false
    );

  });

  searchEl.dataset.vaccineSearchBound = "true";
}


/* =========================================================
   POPULATE VACCINE STOCK SELECT
========================================================= */

function populateVaccineStockSelect() {

  const select = document.getElementById(
    "vaccinemasterStockCode"
  );

  if (!select) return;

  const currentValue = select.value;

  select.innerHTML = `
    <option value="">
      เลือกวัคซีน
    </option>
  `;

  VM.vaccineMasterData.forEach(vaccine => {

    const code = getVaccineCode(vaccine);
    const name = getVaccineName(vaccine);

    if (!code) return;

    const option = document.createElement("option");

    option.value = code;
    option.textContent = `${code} - ${name}`;

    select.appendChild(option);

  });

  if (currentValue) {
    select.value = currentValue;
  }

  if (select.dataset.vaccineBound !== "true") {

    select.addEventListener(
      "change",
      handleVaccineStockSelect
    );

    select.dataset.vaccineBound = "true";
  }
}


/* =========================================================
   HANDLE VACCINE SELECT
========================================================= */

function handleVaccineStockSelect(event) {

  const code = event.target.value;

  const nameEl = document.getElementById(
    "vaccinemasterStockName"
  );

  const thnameEl = document.getElementById(
    "vaccinemasterStockTHname"
  );

  if (!code) {

    if (nameEl) nameEl.value = "";
    if (thnameEl) thnameEl.value = "";

    return;
  }

  const vaccine = VM.vaccineMasterData.find(item =>
    normalizeCode(getVaccineCode(item)) ===
    normalizeCode(code)
  );

  if (!vaccine) return;

  if (nameEl) {
    nameEl.value = getVaccineName(vaccine);
  }

  if (thnameEl) {
    thnameEl.value = getVaccineTHname(vaccine);
  }
}


/* =========================================================
   DEFAULT STOCK DATE
========================================================= */

function setDefaultStockDate() {

  const dateEl = document.getElementById(
    "vaccinemasterStockDate"
  );

  if (!dateEl || dateEl.value) return;

  const today = new Date();

  const yyyy = today.getFullYear();

  const mm = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const dd = String(
    today.getDate()
  ).padStart(2, "0");

  dateEl.value = `${yyyy}-${mm}-${dd}`;
}


/* =========================================================
   REGISTER TO SHARED CONTEXT
========================================================= */

VM.renderTable = renderTable;

VM.populateVaccineStockSelect =
  populateVaccineStockSelect;

VM.handleVaccineStockSelect =
  handleVaccineStockSelect;

VM.setDefaultStockDate =
  setDefaultStockDate;
