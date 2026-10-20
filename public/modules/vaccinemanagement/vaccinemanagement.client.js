
/* =========================================================
   VACCINE MANAGEMENT — STOCK CARD
   File: public/modules/vaccinemanagement/vaccinemanagement.client.js

   API:
   GET /api/vaccine-master
   GET /api/vaccine-master/stock/movements

   TABLE:
   Date | รายการ | รับ | จ่าย | คงเหลือ | หมายเหตุ

   หมายเหตุ:
   - แสดงยอดคงเหลือรวมทุก LOT หลังแต่ละรายการ
   - แสดงยอดแยก LOT / EXP ในหมายเหตุ
   - คำนวณตามลำดับเวลา แล้วแสดงรายการล่าสุดก่อน
   - แก้การอ่านวันที่เฉพาะรหัส 6FLUQU0001B$
   - ไม่เขียนหรือแก้ไขข้อมูลใน Stock Movement
========================================================= */

const API = {
  master: "/api/vaccine-master",
  movements: "/api/vaccine-master/stock/movements"
};

const state = {
  root: null,
  vaccines: [],
  movements: [],
  selectedCode: "",
  loading: false,
  listeners: []
};

/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function firstValue(row, keys, fallback = "") {
  for (const key of keys) {
    if (
      row &&
      row[key] !== undefined &&
      row[key] !== null &&
      row[key] !== ""
    ) {
      return row[key];
    }
  }

  return fallback;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function asNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const number = Number(
    String(value ?? "0").replace(/,/g, "").trim()
  );

  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 3
  }).format(asNumber(value));
}

function listen(target, eventName, handler) {
  if (!target) return;

  target.addEventListener(eventName, handler);

  state.listeners.push(() => {
    target.removeEventListener(eventName, handler);
  });
}

/* =========================================================
   API
========================================================= */

async function apiGet(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    credentials: "same-origin",
    cache: "no-store"
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(`API ${url} ไม่ได้ส่งข้อมูล JSON`);
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message ||
      result?.error ||
      `โหลดข้อมูลไม่สำเร็จ (${response.status})`
    );
  }

  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.rows)) {
    return result.rows;
  }

  return [];
}

/* =========================================================
   NORMALIZE VACCINE MASTER
========================================================= */

function normalizeVaccine(row) {
  return {
    code: clean(firstValue(row, [
      "code",
      "CODE",
      "vaccineCode",
      "VACCINE_CODE"
    ])),

    name: clean(firstValue(row, [
      "name",
      "NAME"
    ])),

    thname: clean(firstValue(row, [
      "THname",
      "thname",
      "THNAME",
      "thaiName",
      "THAI_NAME"
    ])),

    unit: clean(firstValue(row, [
      "unit",
      "UNIT",
      "baseUnit",
      "BASE_UNIT"
    ]))
  };
}

/* =========================================================
   NORMALIZE STOCK MOVEMENT
========================================================= */

function normalizeMovement(row, index) {
  return {
    index,

    id: clean(firstValue(row, [
      "movementId",
      "MOVEMENT_ID"
    ])),

    type: clean(firstValue(row, [
      "type",
      "TYPE"
    ])).toUpperCase(),

    refNo: clean(firstValue(row, [
      "refNo",
      "REF_NO"
    ])),

    date: firstValue(row, [
      "date",
      "DATE"
    ], ""),

    time: clean(firstValue(row, [
      "time",
      "TIME"
    ])),

    code: clean(firstValue(row, [
      "code",
      "CODE",
      "vaccineCode",
      "VACCINE_CODE"
    ])),

    name: clean(firstValue(row, [
      "name",
      "NAME"
    ])),

    qty: Math.abs(asNumber(firstValue(row, [
      "qty",
      "QTY",
      "quantity",
      "QUANTITY"
    ], 0))),

    unit: clean(firstValue(row, [
      "unit",
      "UNIT"
    ])),

    lot: clean(firstValue(row, [
      "lot",
      "LOT",
      "lotNo",
      "LOT_NO"
    ])) || "—",

    exp: firstValue(row, [
      "exp",
      "EXP",
      "expiry",
      "EXPIRY",
      "expiryDate",
      "EXPIRY_DATE"
    ], ""),

    target: clean(firstValue(row, [
      "target",
      "TARGET"
    ])),

    remark: clean(firstValue(row, [
      "remark",
      "REMARK"
    ])),

    user: clean(firstValue(row, [
      "user",
      "USER"
    ]))
  };
}

/* =========================================================
   ORIGINAL DATE PARSER
   คงพฤติกรรมเดิมสำหรับวัคซีนรายการอื่น
========================================================= */

function parseDateTime(dateValue, timeValue = "") {
  const raw = clean(dateValue);

  if (!raw) return 0;

  let date = null;

  /*
   * ISO format:
   * YYYY-MM-DD
   * YYYY-MM-DDTHH:mm:ss
   * YYYY-MM-DD HH:mm:ss
   */

  let match = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):?(\d{2})?:?(\d{2})?)?/
  );

  if (match) {
    let year = Number(match[1]);

    if (year > 2400) {
      year -= 543;
    }

    date = new Date(
      year,
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] || 0),
      Number(match[5] || 0),
      Number(match[6] || 0)
    );
  } else {
    /*
     * Slash date is MM/DD/YYYY throughout the application.
     * Example: 10/20/2026 = October 20, 2026.
     * ISO YYYY-MM-DD remains handled by the branch above.
     */

    match = raw.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
    );

    if (match) {
      const month = Number(match[1]);
      const day = Number(match[2]);
      let year = Number(match[3]);

      if (year > 2400) {
        year -= 543;
      }

      date = new Date(year, month - 1, day);

      // Reject invalid dates instead of allowing JavaScript to roll them over.
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        console.warn("[Stock Card] Invalid MM/DD/YYYY date:", raw);
        return 0;
      }
    } else {
      date = new Date(raw);
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    return 0;
  }

  const timeMatch = clean(timeValue).match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?/
  );

  if (
    timeMatch &&
    !/T\d{1,2}:/.test(raw) &&
    !/\s\d{1,2}:\d{2}/.test(raw)
  ) {
    date.setHours(
      Number(timeMatch[1]),
      Number(timeMatch[2]),
      Number(timeMatch[3] || 0),
      0
    );
  }

  return date.getTime();
}

/* =========================================================
   DATE PARSER — SPECIFIC VACCINE ONLY

   รหัส 6FLUQU0001B$:
   - วันที่รูปแบบ MM/DD/YYYY อ่านเป็น เดือน/วัน/ปี
   - วันที่ ISO ยังคงอ่านตามรูปแบบ ISO
   - วัคซีนรหัสอื่นใช้ parseDateTime() เดิม
========================================================= */

function parseStockCardDateTime(row) {
  if (clean(row?.code) === "6FLUQU0001B$") {
    const raw = clean(row.date);

    // ISO format: YYYY-MM-DD หรือ ISO datetime
    const isoMatch = raw.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (isoMatch) {
      let year = Number(isoMatch[1]);

      if (year > 2400) {
        year -= 543;
      }

      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const hour = Number(isoMatch[4] || 0);
      const minute = Number(isoMatch[5] || 0);
      const second = Number(isoMatch[6] || 0);

      const date = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      );

      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        console.warn(
          "[Stock Card] Invalid ISO date:",
          raw
        );

        return 0;
      }

      return date.getTime();
    }

    // Slash date: MM/DD/YYYY
    const match = raw.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
    );

    if (match) {
      const month = Number(match[1]);
      const day = Number(match[2]);
      let year = Number(match[3]);

      if (year > 2400) {
        year -= 543;
      }

      let hour = 0;
      let minute = 0;
      let second = 0;

      const timeMatch = clean(row.time).match(
        /^(\d{1,2}):(\d{2})(?::(\d{2}))?/
      );

      if (timeMatch) {
        hour = Number(timeMatch[1]);
        minute = Number(timeMatch[2]);
        second = Number(timeMatch[3] || 0);
      }

      const date = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      );

      // ตรวจสอบไม่ให้ JavaScript ปรับวันที่ผิดให้อัตโนมัติ
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        console.warn(
          "[Stock Card] Invalid flu vaccine date:",
          raw
        );

        return 0;
      }

      return date.getTime();
    }
  }

  // วัคซีนรายการอื่นใช้ฟังก์ชันเดิมทั้งหมด
  return parseDateTime(row.date, row.time);
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(value) {
  const raw = clean(value);

  if (!raw) return "—";

  let match = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/
  );

  if (match) {
    return `${match[3].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[1]}`;
  }

  match = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (match) {
    return `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}`;
  }

  return raw;
}

/* =========================================================
   MAIN MARKUP
========================================================= */

function ensureMarkup() {
  if (!state.root) return;

  state.root.innerHTML = `
<div class="vm-stock-toolbar vm-stock-toolbar-select">

  <label class="vm-vaccine-select-wrap">

    <span class="vm-vaccine-select-heading">
      <span class="vm-vaccine-select-label-group">
        <span class="vm-vaccine-select-label">
          กรุณาเลือกวัคซีนเพื่อดูข้อมูลสต็อก
        </span>
      </span>
    </span>

    <span class="vm-vaccine-select-control">
      <select
        class="vm-vaccine-select"
        data-vm-select
        aria-label=""
        disabled
      >
        <option value="">
          กำลังโหลดรายการวัคซีน...
        </option>
      </select>

      <i
        class="bi bi-chevron-down vm-vaccine-select-chevron"
        aria-hidden="true"
      ></i>
    </span>

  </label>

</div>

<div
  class="vm-stock-count"
  data-vm-count
>
  กำลังโหลดข้อมูล...
</div>

<div class="vm-stock-table-wrap">

  <table class="vm-stock-table vm-stock-card-table">

    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">รายการ</th>
        <th scope="col" class="vm-number">รับ</th>
        <th scope="col" class="vm-number">จ่าย</th>
        <th scope="col" class="vm-number">คงเหลือ</th>
        <th scope="col">หมายเหตุ</th>
      </tr>
    </thead>

    <tbody data-vm-tbody>
      <tr>
        <td colspan="6" class="vm-state-cell">
          กำลังโหลดข้อมูล...
        </td>
      </tr>
    </tbody>

  </table>

</div>

<div class="vm-stock-footnote">
  คงเหลือเป็นยอดรวมทุก LOT หลังแต่ละรายการ
  ส่วนหมายเหตุแสดงยอดแยก LOT/EXP ณ เวลาของรายการ
  โดยคำนวณตามลำดับเวลาและแสดงรายการล่าสุดก่อน
</div>

<div
  class="vm-stock-error"
  data-vm-error
  role="alert"
  hidden
></div>
  `;
}

/* =========================================================
   VACCINE DROPDOWN
========================================================= */

function renderVaccineOptions() {
  const select = state.root?.querySelector(
    "[data-vm-select]"
  );

  if (!select) return;

  const previousCode = state.selectedCode;

  select.innerHTML = `
    <option value="">
      — เลือก CODE หรือชื่อวัคซีน —
    </option>
  ` + state.vaccines.map(vaccine => {
    const label = [
      vaccine.code,
      vaccine.name,
      vaccine.thname
    ].filter(Boolean).join(" — ");

    return `
      <option value="${escapeHtml(vaccine.code)}">
        ${escapeHtml(label)}
      </option>
    `;
  }).join("");

  select.disabled = state.vaccines.length === 0;

  if (
    previousCode &&
    state.vaccines.some(
      vaccine => vaccine.code === previousCode
    )
  ) {
    select.value = previousCode;
  } else {
    select.value = "";
    state.selectedCode = "";
  }
}

function getSelectedVaccine() {
  return state.vaccines.find(
    vaccine => vaccine.code === state.selectedCode
  ) || null;
}

/* =========================================================
   BUILD STOCK CARD LEDGER
========================================================= */

function buildStockCardRows(code) {
  const movements = state.movements
    .filter(row => row.code === code)
    .map(row => ({
      ...row,

      // ใช้ parser เฉพาะวัคซีนที่มีปัญหา
      _sortTime: parseStockCardDateTime(row)
    }))
    .sort((a, b) => {
      // คำนวณจากวันที่เก่าไปใหม่ก่อน
      const dateDifference =
        a._sortTime - b._sortTime;

      if (dateDifference !== 0) {
        return dateDifference;
      }

      // กรณีวันเวลาเดียวกัน ใช้ MOVEMENT_ID เดิม
      const idDifference = a.id.localeCompare(
        b.id,
        "en",
        { numeric: true }
      );

      return idDifference || a.index - b.index;
    });

  /*
   * Key balances by LOT + EXP so the same LOT number with
   * different expiration dates is not merged together.
   */

  const lotBalances = new Map();
  const calculatedRows = [];

  for (const movement of movements) {
    const lotKey = [
      movement.lot || "—",
      clean(movement.exp) || "—"
    ].join("__");

    if (!lotBalances.has(lotKey)) {
      lotBalances.set(lotKey, {
        lot: movement.lot || "—",
        exp: movement.exp || "",
        quantity: 0
      });
    }

    const lotBalance = lotBalances.get(lotKey);

    const quantity = Math.abs(
      asNumber(movement.qty)
    );

    let receive = 0;
    let dispense = 0;

    if (movement.type === "IN") {
      receive = quantity;
      lotBalance.quantity += quantity;
    } else if (movement.type === "OUT") {
      dispense = quantity;
      lotBalance.quantity -= quantity;
    }

    // ยอดรวมทุก LOT หลังรายการเคลื่อนไหวนี้
    const totalBalance = [
      ...lotBalances.values()
    ].reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // Snapshot ยอดแต่ละ LOT ณ เวลาของรายการ
    const lotSnapshot = [
      ...lotBalances.values()
    ]
      .filter(
        item => Math.abs(item.quantity) > 0.0000001
      )
      .sort((a, b) => {
        const lotCompare = String(a.lot).localeCompare(
          String(b.lot),
          "th",
          { numeric: true }
        );

        return lotCompare ||
          String(a.exp).localeCompare(String(b.exp));
      })
      .map(item => ({
        lot: item.lot,
        exp: item.exp,
        quantity: item.quantity
      }));

    calculatedRows.push({
      ...movement,
      receive,
      dispense,
      balance: totalBalance,
      lotSnapshot
    });
  }

  /*
   * คำนวณเก่าไปใหม่ก่อน
   * แล้วแสดงรายการใหม่ไปเก่า
   */

  return calculatedRows.reverse();
}

/* =========================================================
   RENDER TABLE
========================================================= */

function renderTable() {
  const tbody = state.root?.querySelector(
    "[data-vm-tbody]"
  );

  const count = state.root?.querySelector(
    "[data-vm-count]"
  );

  if (!tbody || !count) return;

  if (state.loading && !state.vaccines.length) {
    count.textContent = "กำลังโหลดข้อมูล...";

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="vm-state-cell">
          กำลังโหลดข้อมูลวัคซีน...
        </td>
      </tr>
    `;

    return;
  }

  const vaccine = getSelectedVaccine();

  if (!vaccine) {
    count.textContent =
      `${state.vaccines.length.toLocaleString("th-TH")} รายการวัคซีน`;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="vm-state-cell">
          กรุณาเลือกวัคซีนจาก Dropdown เพื่อดูประวัติรับ–จ่าย
        </td>
      </tr>
    `;

    return;
  }

  const rows = buildStockCardRows(vaccine.code);

  count.textContent =
    `${rows.length.toLocaleString("th-TH")} รายการเคลื่อนไหว`;

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="vm-state-cell">
          ไม่พบประวัติรับ–จ่ายของ ${escapeHtml(vaccine.code)}
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = rows.map(row => {
    const noteHtml = row.lotSnapshot.length
      ? row.lotSnapshot.map(item => `
          <div class="vm-lot-balance">
            <span>
              ${escapeHtml(item.lot)}
              ${
                item.exp
                  ? `<small>(${escapeHtml(formatDate(item.exp))})</small>`
                  : ""
              }
            </span>

            <strong>
              ${formatNumber(item.quantity)}
            </strong>
          </div>
        `).join("")
      : `
          <span class="vm-no-lot-balance">
            ไม่มีคงเหลือใน LOT
          </span>
        `;

    return `
      <tr>

        <td class="vm-date-cell">
          ${escapeHtml(formatDate(row.date))}
        </td>

        <td class="vm-item-cell">

          <div class="vm-target">
            ${escapeHtml(row.target || "—")}
          </div>

          <div class="vm-lot-exp">
            LOT: ${escapeHtml(row.lot || "—")}
            · EXP: ${escapeHtml(formatDate(row.exp))}
          </div>

        </td>

        <td class="vm-number vm-in-qty">
          ${formatNumber(row.receive)}
        </td>

        <td class="vm-number vm-out-qty">
          ${formatNumber(row.dispense)}
        </td>

        <td class="vm-number">
          <strong class="vm-balance">
            ${formatNumber(row.balance)}
          </strong>
        </td>

        <td class="vm-note-cell">
          ${noteHtml}
        </td>

      </tr>
    `;
  }).join("");
}

/* =========================================================
   ERROR MESSAGE
========================================================= */

function showError(message) {
  const error = state.root?.querySelector(
    "[data-vm-error]"
  );

  if (!error) return;

  error.textContent = message || "";
  error.hidden = !message;
}

/* =========================================================
   LOAD DATA
========================================================= */

async function loadData() {
  if (state.loading) return;

  state.loading = true;
  showError("");

  const tbody = state.root?.querySelector(
    "[data-vm-tbody]"
  );

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="vm-state-cell">
          กำลังโหลดข้อมูล...
        </td>
      </tr>
    `;
  }

  try {
    /*
     * Load both datasets once.
     * This avoids making a separate stock API request
     * for every vaccine code.
     */

    const [masterRows, movementRows] = await Promise.all([
      apiGet(API.master),
      apiGet(API.movements)
    ]);

    state.vaccines = masterRows
      .map(normalizeVaccine)
      .filter(vaccine => vaccine.code);

    state.movements = movementRows.map(
      normalizeMovement
    );

    console.log(
      "[Vaccine Management] Master rows:",
      masterRows.length
    );

    console.log(
      "[Vaccine Management] Movement rows:",
      movementRows.length
    );

    console.table(
      state.vaccines
        .filter(v => v.code.includes("6FLUQU"))
        .map(v => ({
          code: JSON.stringify(v.code),
          name: v.name
        }))
    );

    console.table(
      state.movements
        .filter(m => m.code.includes("6FLUQU"))
        .map(m => ({
          code: JSON.stringify(m.code),
          type: m.type,
          date: m.date,
          qty: m.qty,
          lot: m.lot,
          refNo: m.refNo
        }))
    );

    renderVaccineOptions();
    renderTable();

  } catch (error) {
    console.error(
      "[Vaccine Management] Load failed",
      error
    );

    state.vaccines = [];
    state.movements = [];

    renderVaccineOptions();
    renderTable();

    showError(
      error.message ||
      "โหลดข้อมูลวัคซีนหรือประวัติรับ–จ่ายไม่สำเร็จ"
    );

  } finally {
    state.loading = false;
    renderTable();
  }
}

/* =========================================================
   EVENTS
========================================================= */

function onClick(event) {
  const button = event.target.closest(
    "[data-vm-action='refresh']"
  );

  if (!button || !state.root?.contains(button)) {
    return;
  }

  loadData();
}

function onChange(event) {
  if (!event.target.matches("[data-vm-select]")) {
    return;
  }

  state.selectedCode = event.target.value || "";

  renderTable();
}

/* =========================================================
   INIT / DESTROY
========================================================= */

function init() {
  state.root = document.querySelector(
    "#vaccineStockSummaryRoot"
  );

  if (!state.root) {
    console.warn(
      "[Vaccine Management] Missing #vaccineStockSummaryRoot"
    );

    return;
  }

  ensureMarkup();

  listen(state.root, "click", onClick);
  listen(state.root, "change", onChange);

  loadData();
}

function destroy() {
  state.listeners.forEach(remove => {
    try {
      remove();
    } catch (error) {
      console.warn(
        "[Vaccine Management] Listener cleanup failed",
        error
      );
    }
  });

  state.listeners = [];

  state.root = null;
  state.vaccines = [];
  state.movements = [];
  state.selectedCode = "";
  state.loading = false;
}

export { init, destroy };
