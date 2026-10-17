/* =========================================================
   VACCINE MASTER STOCK VIEW

   FILE:
   public/modules/vaccinemaster/vaccinemasterstock.view.js

   RESPONSIBILITY
   ---------------------------------------------------------
   - VACCINE STOCK UI
   - Load VACCINE_MASTER
   - Load STOCK by vaccine CODE
   - Search
   - Summary
   - Add Vaccine Stock
   - Detail Vaccine Stock
   - Success / Error Modal
   - SPA init / destroy

   API
   ---------------------------------------------------------
   GET  /api/vaccine-master
   GET  /api/vaccine-master/:code/stock
   GET  /api/vaccine-master/stock/next-ref-no
   POST /api/vaccine-master/stock

   IMPORTANT
   ---------------------------------------------------------
   - ไม่ทำ Business Logic ฝั่ง Backend
   - ไม่แก้ Controller
   - ไม่แก้ Service
   - ไม่แก้ Repository
   - ไม่สร้าง API ใหม่
   - ใช้ ID ตาม vaccinemasterstock.html เท่านั้น
========================================================= */


/* =========================================================
   MODULE STATE
========================================================= */

let vaccineMasterStockState = {

  vaccines: [],

  stockRows: [],

  filteredRows: [],

  initialized: false,

  loading: false,

  selectedCode: "",

  searchText: ""

};

let currentMovementType = "IN";
let currentDispenseStockRows = [];


/* =========================================================
   EVENT CLEANUP
========================================================= */

const vaccineMasterStockListeners = [];


/* =========================================================
   DOM HELPER
========================================================= */

function qs(id) {

  return document.getElementById(id);

}


/* =========================================================
   CLEAN VALUE
========================================================= */

function clean(value) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";

  }

  return String(value).trim();

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  return clean(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   NUMBER
========================================================= */

function toNumber(value) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;

}


/* =========================================================
   FORMAT NUMBER
========================================================= */

function formatNumber(value) {

  return toNumber(value)
    .toLocaleString(
      "th-TH"
    );

}


/* =========================================================
   NORMALIZE VACCINE
========================================================= */

function normalizeVaccine(row = {}) {

  return {

    code:
      clean(
        row.code ??
        row.CODE
      ),

    name:
      clean(
        row.name ??
        row.NAME
      ),

    THname:
      clean(
        row.THname ??
        row.thname ??
        row.THNAME
      )

  };

}


/* =========================================================
   NORMALIZE STOCK
========================================================= */

function normalizeStock(row = {}) {

  return {

    code:
      clean(
        row.code ??
        row.CODE
      ),

    name:
      clean(
        row.name ??
        row.NAME
      ),

    lot:
      clean(
        row.lot ??
        row.LOT
      ),

    exp:
      clean(
        row.exp ??
        row.EXP
      ),

    quantity:
      toNumber(
        row.quantity ??
        row.QTY ??
        row.qty
      ),

    unit:
      clean(
        row.unit ??
        row.UNIT
      )

  };

}


/* =========================================================
   ADD EVENT LISTENER WITH CLEANUP
========================================================= */

function listen(
  element,
  event,
  handler
) {

  if (!element) {

    return;

  }

  element.addEventListener(
    event,
    handler
  );

  vaccineMasterStockListeners.push({

    element,

    event,

    handler

  });

}


/* =========================================================
   API FETCH
========================================================= */

async function apiFetch(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {

        ...options,

        headers: {

          "Content-Type":
            "application/json",

          ...(options.headers || {})

        }

      }
    );


  let result = null;


  try {

    result =
      await response.json();

  }

  catch {

    result = null;

  }


  if (!response.ok) {

    throw new Error(

      result?.message ||

      `HTTP ${response.status}`

    );

  }


  if (
    result &&
    result.success === false
  ) {

    throw new Error(

      result.message ||
      "เกิดข้อผิดพลาดจาก Server"

    );

  }


  return result;

}


/* =========================================================
   SET TABLE STATUS
========================================================= */

function setTableStatus(
  message
) {

  const status =
    qs(
      "vaccineStockTableStatus"
    );


  if (status) {

    status.textContent =
      message;

  }

}


/* =========================================================
   SET TABLE COUNT
========================================================= */

function setTableCount(
  count
) {

  const element =
    qs(
      "vaccineStockTableCount"
    );


  if (element) {

    element.textContent =
      `${formatNumber(count)} รายการ`;

  }

}


/* =========================================================
   SET TABLE LOADING
========================================================= */

function setTableLoading(
  message = "🔄 กำลังโหลดข้อมูล..."
) {

  const tbody =
    qs(
      "vaccineStockTableBody"
    );


  if (!tbody) {

    return;

  }


  tbody.innerHTML = `

    <tr>

      <td
        colspan="8"
        class="vaccinemasterstock-table-loading"
      >

        ${escapeHtml(message)}

      </td>

    </tr>

  `;

}


/* =========================================================
   SET TABLE EMPTY
========================================================= */

function setTableEmpty(
  message = "ไม่พบข้อมูล Vaccine Stock"
) {

  const tbody =
    qs(
      "vaccineStockTableBody"
    );


  if (!tbody) {

    return;

  }


  tbody.innerHTML = `

    <tr>

      <td
        colspan="8"
        class="vaccinemasterstock-table-loading"
      >

        📦
        ${escapeHtml(message)}

      </td>

    </tr>

  `;

}


/* =========================================================
   LOAD VACCINE MASTER
========================================================= */

async function loadVaccineMaster() {

  const result =
    await apiFetch(
      "/api/vaccine-master"
    );


  const data =
    Array.isArray(
      result?.data
    )
      ? result.data
      : [];


  vaccineMasterStockState.vaccines =
    data
      .map(
        normalizeVaccine
      )
      .filter(
        vaccine =>
          vaccine.code
      );


  populateVaccineSelect();


  return vaccineMasterStockState.vaccines;

}


/* =========================================================
   POPULATE VACCINE SELECT
========================================================= */

function populateVaccineSelect() {

  const select =
    qs(
      "vaccineStockCode"
    );


  if (!select) {

    return;

  }


  const currentValue =
    clean(
      select.value
    );


  select.innerHTML = `

    <option value="">
      -- เลือกวัคซีน --
    </option>

  `;


  for (
    const vaccine
    of vaccineMasterStockState.vaccines
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      vaccine.code;


    option.textContent =
      vaccine.THname

        ? `${vaccine.code} - ${vaccine.name} (${vaccine.THname})`

        : `${vaccine.code} - ${vaccine.name}`;


    option.dataset.name =
      vaccine.name;


    option.dataset.thname =
      vaccine.THname;


    select.appendChild(
      option
    );

  }


  if (
    currentValue &&
    vaccineMasterStockState.vaccines
      .some(
        vaccine =>
          vaccine.code ===
          currentValue
      )
  ) {

    select.value =
      currentValue;

  }

}


/* =========================================================
   GET VACCINE BY CODE
========================================================= */

function getVaccineByCode(
  code
) {

  const wanted =
    clean(code)
      .toUpperCase();


  return (
    vaccineMasterStockState.vaccines
      .find(
        vaccine =>
          vaccine.code
            .toUpperCase() ===
          wanted
      )
  ) || null;

}


/* =========================================================
   LOAD STOCK FOR ONE VACCINE
========================================================= */

async function loadStockByCode(
  code
) {

  const vaccineCode =
    clean(code);


  if (!vaccineCode) {

    return [];

  }


  const result =
    await apiFetch(

      `/api/vaccine-master/${encodeURIComponent(vaccineCode)}/stock`

    );


  const data =
    Array.isArray(
      result?.data
    )
      ? result.data
      : [];


  return data.map(
    row =>
      normalizeStock({

        ...row,

        code:
          row.code ??
          row.CODE ??
          vaccineCode

      })
  );

}


/* =========================================================
   LOAD ALL STOCK
========================================================= */

async function loadAllStock() {

  vaccineMasterStockState.loading =
    true;


  setTableStatus(
    "กำลังโหลด Stock..."
  );


  setTableLoading();


  try {

    /*
     * โหลด Master ก่อน
     */

    if (
      !Array.isArray(
        vaccineMasterStockState.vaccines
      ) ||
      vaccineMasterStockState.vaccines.length === 0
    ) {

      await loadVaccineMaster();

    }


    /*
     * อ่าน Stock ของแต่ละ Vaccine
     *
     * Backend ปัจจุบันมี endpoint
     * /api/vaccine-master/:code/stock
     *
     * ดังนั้น Frontend ต้องเรียกตาม CODE
     */

    const requests =
      vaccineMasterStockState.vaccines
        .map(
          vaccine =>
            loadStockByCode(
              vaccine.code
            )
        );


    const results =
      await Promise.all(
        requests
      );


    const stockRows = [];


    for (
      let index = 0;
      index < results.length;
      index++
    ) {

      const vaccine =
        vaccineMasterStockState.vaccines[index];


      const rows =
        Array.isArray(
          results[index]
        )
          ? results[index]
          : [];


      for (
        const stock
        of rows
      ) {

        stockRows.push({

          code:
            stock.code ||
            vaccine.code,

          name:
            stock.name ||
            vaccine.name,

          THname:
            vaccine.THname,

          lot:
            stock.lot,

          exp:
            stock.exp,

          quantity:
            stock.quantity,

          unit:
            stock.unit

        });

      }

    }


    vaccineMasterStockState.stockRows =
      stockRows;


    applySearch();


    updateSummary();


    setTableStatus(
      "พร้อมใช้งาน"
    );


    return stockRows;

  }

  catch (error) {

    console.error(
      "❌ Vaccine Stock Load Error:",
      error
    );


    vaccineMasterStockState.stockRows =
      [];


    vaccineMasterStockState.filteredRows =
      [];


    updateSummary();


    setTableStatus(
      "โหลดข้อมูลไม่สำเร็จ"
    );


    setTableEmpty(
      error?.message ||
      "ไม่สามารถโหลด Vaccine Stock ได้"
    );


    throw error;

  }

  finally {

    vaccineMasterStockState.loading =
      false;

  }

}


/* =========================================================
   SEARCH
========================================================= */

function applySearch() {

  const search =
    clean(
      vaccineMasterStockState.searchText
    )
      .toLowerCase();


  let rows =
    vaccineMasterStockState.stockRows
      .slice();


  if (search) {

    rows =
      rows.filter(
        row => {

          const text = [

            row.code,

            row.name,

            row.THname,

            row.lot,

            row.exp,

            row.unit

          ]

            .map(
              value =>
                clean(value)
                  .toLowerCase()
            )

            .join(" ");


          return text.includes(
            search
          );

        }
      );

  }


  vaccineMasterStockState.filteredRows =
    rows;


  renderStockTable(
    rows
  );


  setTableCount(
    rows.length
  );

}


/* =========================================================
   RENDER STOCK TABLE
========================================================= */

function renderStockTable(
  rows = []
) {

  const tbody =
    qs(
      "vaccineStockTableBody"
    );


  if (!tbody) {

    return;

  }


  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {

    setTableEmpty();

    return;

  }


  tbody.innerHTML =
    rows
      .map(
        (
          row,
          index
        ) => {

          return `

            <tr
              data-stock-index="${index}"
            >

              <td>

                <strong>
                  ${escapeHtml(row.code)}
                </strong>

              </td>


              <td>
                ${escapeHtml(row.name)}
              </td>


              <td>
                ${escapeHtml(row.THname)}
              </td>


              <td>

                <span
                  class="vaccinestock-lot"
                >
                  ${escapeHtml(row.lot)}
                </span>

              </td>


              <td>
                ${escapeHtml(formatDateDisplay(row.exp))}
              </td>


              <td>

                <strong
                  class="vaccinestock-stock-qty"
                >
                  ${formatNumber(row.quantity)}
                </strong>

              </td>


              <td>
                ${escapeHtml(row.unit)}
              </td>


<td>

  <div class="vaccinemaster-actions">

    <!-- ดูรายละเอียด Stock -->
    <button
      type="button"
      class="vaccinemaster-icon-btn"
      data-action="detail"
    data-code="${escapeHtml(row.code)}"
      title="ดูรายละเอียด Stock"
    >
      👁️
    </button>

    <!-- แก้ไข -->
    <button
      type="button"
      class="vaccinemaster-icon-btn"
      data-action="edit"
    data-code="${escapeHtml(row.code)}"
      title="แก้ไข"
    >
      ✏️
    </button>

    <!-- ลบ -->
    <button
      type="button"
      class="vaccinemaster-icon-btn"
      data-action="delete"
    data-code="${escapeHtml(row.code)}"
      title="ลบ"
    >
      🗑️
    </button>

  </div>

</td>

            </tr>

          `;

        }
      )
      .join("");

}


/* =========================================================
   UPDATE SUMMARY
========================================================= */

function updateSummary() {

  const rows =
    vaccineMasterStockState.stockRows;


  /*
   * Vaccine Count
   *
   * นับ CODE ที่มี Stock
   */

  const vaccineCodes =
    new Set();


  /*
   * LOT Count
   *
   * แยก CODE + LOT + EXP
   */

  const lots =
    new Set();


  /*
   * Total Quantity
   */

  let totalQty =
    0;


  /*
   * Expiring Count
   */

  let expiringCount =
    0;


  for (
    const row of rows
  ) {

    if (row.code) {

      vaccineCodes.add(
        row.code
      );

    }


    if (
      row.code &&
      row.lot
    ) {

      lots.add(

        `${row.code}__${row.lot}__${row.exp}`

      );

    }


    totalQty +=
      toNumber(
        row.quantity
      );


    if (
      isExpiringSoon(
        row.exp
      )
    ) {

      expiringCount++;

    }

  }


  const vaccineCountElement =
    qs(
      "vaccineStockVaccineCount"
    );


  if (vaccineCountElement) {

    vaccineCountElement.textContent =
      formatNumber(
        vaccineCodes.size
      );

  }


  const lotCountElement =
    qs(
      "vaccineStockLotCount"
    );


  if (lotCountElement) {

    lotCountElement.textContent =
      formatNumber(
        lots.size
      );

  }


  const totalQtyElement =
    qs(
      "vaccineStockTotalQty"
    );


  if (totalQtyElement) {

    totalQtyElement.textContent =
      formatNumber(
        totalQty
      );

  }


  const expiringElement =
    qs(
      "vaccineStockExpiringCount"
    );


  if (expiringElement) {

    expiringElement.textContent =
      formatNumber(
        expiringCount
      );

  }

}


/* =========================================================
   EXPIRY CHECK
   ---------------------------------------------------------
   ใกล้หมดอายุ = ภายใน 90 วัน
========================================================= */

function isExpiringSoon(
  value
) {

  const text =
    clean(value);


  if (!text) {

    return false;

  }


  const expDate =
    parseDateSafe(
      text
    );


  if (!expDate) {

    return false;

  }


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  expDate.setHours(
    0,
    0,
    0,
    0
  );


  const diff =
    expDate.getTime() -
    today.getTime();


  const days =
    Math.ceil(
      diff /
      (
        1000 *
        60 *
        60 *
        24
      )
    );


  return (
    days >= 0 &&
    days <= 90
  );

}


/* =========================================================
   PARSE DATE
========================================================= */

function parseDateSafe(
  value
) {

  const text =
    clean(value);


  if (!text) {

    return null;

  }


  /*
   * YYYY-MM-DD
   */

  const match =
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );


  if (match) {

    const year =
      Number(
        match[1]
      );


    const month =
      Number(
        match[2]
      ) - 1;


    const day =
      Number(
        match[3]
      );


    const date =
      new Date(
        year,
        month,
        day
      );


    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

      return date;

    }

  }


  const parsed =
    new Date(
      text
    );


  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;

}


/* =========================================================
   FORMAT DATE DISPLAY
========================================================= */

function formatDateDisplay(
  value
) {

  const text =
    clean(value);


  if (!text) {

    return "-";

  }


  const date =
    parseDateSafe(
      text
    );


  if (!date) {

    return text;

  }


  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    )
      .padStart(
        2,
        "0"
      );


  const day =
    String(
      date.getDate()
    )
      .padStart(
        2,
        "0"
      );


  return `${day}/${month}/${year}`;

}


/* =========================================================
   TODAY YYYY-MM-DD
========================================================= */

function getTodayISO() {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    )
      .padStart(
        2,
        "0"
      );


  const day =
    String(
      now.getDate()
    )
      .padStart(
        2,
        "0"
      );


  return `${year}-${month}-${day}`;

}


/* =========================================================
   OPEN ADD MODAL
========================================================= */

async function openAddModal(type = "IN") {
  currentMovementType =
    String(type || "IN").trim().toUpperCase() === "OUT"
      ? "OUT"
      : "IN";

  const modal = qs("vaccineStockAddModal");
  if (!modal) return;

  resetAddForm(currentMovementType);
  showModal(modal);

  try {
    if (vaccineMasterStockState.vaccines.length === 0) {
      await loadVaccineMaster();
    }
  } catch (error) {
    console.error("❌ Load Vaccine Master:", error);
    showErrorModal(
      error?.message || "ไม่สามารถโหลดรายการวัคซีนได้"
    );
    return;
  }

  // ไม่เรียก API ตรวจเลข REF NO ตอนเปิด Modal
  // ให้ระบบสร้างเลขอ้างอิงตอนบันทึกตาม Backend เดิม
  setText(
    "vaccineStockAddRefNo",
    "ระบบจะสร้างเลขอัตโนมัติเมื่อบันทึก"
  );
}



/* =========================================================
   SET FORM MODE
========================================================= */

function configureMovementMode(type = "IN") {

  currentMovementType =
    String(type || "IN").trim().toUpperCase() === "OUT"
      ? "OUT"
      : "IN";

  const isOut = currentMovementType === "OUT";
  const typeLabel = qs("vaccineStockType");
  const typeInput = qs("vaccineStockTypeInput");
  const title = qs("vaccineStockAddModalTitle");
  const description = qs("vaccineStockAddModalDescription");
  const dateLabel = qs("vaccineStockDateLabel");
  const saveButton = qs("saveVaccineStockBtn");

  if (typeLabel) typeLabel.textContent = currentMovementType;
  if (typeInput) typeInput.value = currentMovementType;
  if (title) title.textContent = isOut ? "💉 จ่ายวัคซีนออก" : "➕ รับเข้าวัคซีน";
  if (description) {
    description.textContent = isOut
      ? "เลือกวัคซีน LOT และวันหมดอายุจาก Stock คงเหลือ"
      : "เพิ่มวัคซีนเข้าคลัง";
  }
  if (dateLabel) dateLabel.textContent = isOut ? "วันที่จ่ายออก" : "วันที่รับเข้า";
  if (saveButton) {
    saveButton.innerHTML = isOut
      ? "💉 ยืนยันจ่ายวัคซีน"
      : "💾 บันทึกรับเข้าวัคซีน";
  }

  const lotInGroup = qs("vaccineStockLotInGroup");
  const lotOutGroup = qs("vaccineStockLotOutGroup");
  const expInGroup = qs("vaccineStockExpInGroup");
  const expOutGroup = qs("vaccineStockExpOutGroup");

  if (lotInGroup) {
    lotInGroup.hidden = isOut;
    lotInGroup.style.display = isOut ? "none" : "";
  }
  if (lotOutGroup) {
    lotOutGroup.hidden = !isOut;
    lotOutGroup.style.display = isOut ? "" : "none";
  }
  if (expInGroup) {
    expInGroup.hidden = isOut;
    expInGroup.style.display = isOut ? "none" : "";
  }
  if (expOutGroup) {
    expOutGroup.hidden = !isOut;
    expOutGroup.style.display = isOut ? "" : "none";
  }

  const lotIn = qs("vaccineStockLot");
  const expIn = qs("vaccineStockExp");
  const lotOut = qs("vaccineStockOutLot");
  const expOut = qs("vaccineStockOutExp");

  if (lotIn) {
    lotIn.disabled = isOut;
    lotIn.required = !isOut;
  }
  if (expIn) {
    expIn.disabled = isOut;
    expIn.required = !isOut;
  }
  if (lotOut) {
    lotOut.disabled = !isOut;
    lotOut.required = isOut;
  }
  if (expOut) {
    expOut.disabled = !isOut;
    expOut.required = isOut;
  }

  const unit = qs("vaccineStockUnit");
  if (unit) unit.readOnly = isOut;
}


/* =========================================================
   RESET ADD FORM
========================================================= */

function resetAddForm(type = "IN") {

  const form = qs("vaccineStockAddForm");
  if (form) form.reset();

  currentDispenseStockRows = [];
  configureMovementMode(type);

  const date = qs("vaccineStockDate");
  if (date) date.value = getTodayISO();

  const unit = qs("vaccineStockUnit");
  if (unit) unit.value = "dose";

  const name = qs("vaccineStockName");
  if (name) name.value = "";

  const outLot = qs("vaccineStockOutLot");
  if (outLot) outLot.innerHTML = '<option value="">-- เลือก LOT --</option>';

  const outExp = qs("vaccineStockOutExp");
  if (outExp) outExp.innerHTML = '<option value="">-- เลือก LOT ก่อน --</option>';

  const available = qs("vaccineStockAvailableQty");
  if (available) available.textContent = "คงเหลือ: -";

  const qty = qs("vaccineStockQty");
  if (qty) {
    qty.value = "";
    qty.removeAttribute("max");
  }

  const ref = qs("vaccineStockNextRefNo");
  if (ref) ref.textContent = "กำลังตรวจสอบ...";

  const saveButton = qs("saveVaccineStockBtn");
  if (saveButton) saveButton.disabled = false;
}


/* =========================================================
   LOAD NEXT REF NO
========================================================= */

async function loadNextRefNo(type = currentMovementType) {

  const element = qs("vaccineStockNextRefNo");
  if (element) element.textContent = "กำลังตรวจสอบ...";

  try {
    const result = await apiFetch(
      `/api/vaccine-master/stock/next-ref-no?type=${encodeURIComponent(type)}`
    );

    const data = result?.data;
    const refNo =
      typeof data === "string"
        ? data
        : (data?.REF_NO ?? data?.refNo ?? data?.REFNO ?? "");

    if (element) {
      element.textContent = refNo || "ระบบจะสร้างเมื่อบันทึก";
    }
    return refNo;
  } catch (error) {
    console.error("❌ Next REF NO Error:", error);
    if (element) element.textContent = "ระบบจะสร้างเมื่อบันทึก";
    return "";
  }
}


/* =========================================================
   LOAD DISPENSE LOT / EXP OPTIONS
========================================================= */

async function loadDispenseStockOptions(code) {

  const lotSelect = qs("vaccineStockOutLot");
  const expSelect = qs("vaccineStockOutExp");
  const available = qs("vaccineStockAvailableQty");
  const qty = qs("vaccineStockQty");
  const unit = qs("vaccineStockUnit");

  currentDispenseStockRows = [];

  if (lotSelect) lotSelect.innerHTML = '<option value="">-- กำลังโหลด LOT --</option>';
  if (expSelect) expSelect.innerHTML = '<option value="">-- เลือก LOT ก่อน --</option>';
  if (available) available.textContent = "คงเหลือ: -";
  if (qty) qty.removeAttribute("max");

  if (!code) {
    if (lotSelect) lotSelect.innerHTML = '<option value="">-- เลือกวัคซีนก่อน --</option>';
    return;
  }

  const rows = await loadStockByCode(code);
  currentDispenseStockRows = rows.filter(row => Number(row.quantity || 0) > 0);

  if (lotSelect) {
    const lots = [...new Set(currentDispenseStockRows.map(row => clean(row.lot)).filter(Boolean))];
    lotSelect.innerHTML = '<option value="">-- เลือก LOT --</option>' +
      lots.map(lot => {
        const total = currentDispenseStockRows
          .filter(row => clean(row.lot) === lot)
          .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        return `<option value="${escapeHtml(lot)}">${escapeHtml(lot)} · คงเหลือ ${formatNumber(total)}</option>`;
      }).join("");
  }

  if (expSelect) expSelect.innerHTML = '<option value="">-- เลือก LOT ก่อน --</option>';
  if (!currentDispenseStockRows.length && lotSelect) {
    lotSelect.innerHTML = '<option value="">ไม่มี Stock คงเหลือ</option>';
  }

  if (unit) unit.value = currentDispenseStockRows[0]?.unit || "dose";
}


function handleDispenseLotChange() {

  const lotSelect = qs("vaccineStockOutLot");
  const expSelect = qs("vaccineStockOutExp");
  const available = qs("vaccineStockAvailableQty");
  const qty = qs("vaccineStockQty");
  const selectedLot = clean(lotSelect?.value);

  if (expSelect) {
    const rows = currentDispenseStockRows.filter(
      row => clean(row.lot) === selectedLot && Number(row.quantity || 0) > 0
    );
    expSelect.innerHTML = '<option value="">-- เลือก EXP --</option>' +
      rows.map(row =>
        `<option value="${escapeHtml(row.exp)}">${escapeHtml(formatDateDisplay(row.exp))} · คงเหลือ ${formatNumber(row.quantity)}</option>`
      ).join("");
  }

  if (available) available.textContent = "คงเหลือ: -";
  if (qty) {
    qty.value = "";
    qty.removeAttribute("max");
  }
}


function handleDispenseExpChange() {

  const lot = clean(qs("vaccineStockOutLot")?.value);
  const exp = clean(qs("vaccineStockOutExp")?.value);
  const row = currentDispenseStockRows.find(
    item => clean(item.lot) === lot && clean(item.exp) === exp
  );

  const available = qs("vaccineStockAvailableQty");
  const qty = qs("vaccineStockQty");
  const unit = qs("vaccineStockUnit");

  if (available) {
    available.textContent = row
      ? `คงเหลือ: ${formatNumber(row.quantity)} ${row.unit || "dose"}`
      : "คงเหลือ: -";
  }

  if (qty) {
    qty.value = "";
    if (row) qty.max = String(row.quantity);
    else qty.removeAttribute("max");
  }

  if (unit && row?.unit) unit.value = row.unit;
}


/* =========================================================
   CLOSE ADD MODAL
========================================================= */

/* =========================================================
   CLOSE ADD MODAL
========================================================= */

function closeAddModal() {

  const modal =
    qs(
      "vaccineStockAddModal"
    );


  if (!modal) {

    return;

  }


  hideModal(
    modal
  );

}


/* =========================================================
   VACCINE SELECT CHANGE
========================================================= */

async function handleVaccineSelectChange() {

  const select = qs("vaccineStockCode");
  const nameInput = qs("vaccineStockName");
  if (!select) return;

  const vaccine = getVaccineByCode(select.value);
  if (nameInput) nameInput.value = vaccine?.name || "";

  if (currentMovementType === "OUT") {
    try {
      await loadDispenseStockOptions(select.value);
    } catch (error) {
      console.error("❌ Load dispense stock options:", error);
      showErrorModal(error?.message || "ไม่สามารถโหลด Stock คงเหลือได้");
    }
  }
}


/* =========================================================
   SUBMIT ADD STOCK
========================================================= */

/* =========================================================
   SUBMIT ADD STOCK
========================================================= */

async function handleAddStockSubmit(
  event
) {

  event.preventDefault();


  const form =
    qs(
      "vaccineStockAddForm"
    );


  if (!form) {

    return;

  }


  const formData =
    new FormData(
      form
    );


  const payload = {

    type:
      clean(
        formData.get(
          "type"
        )
      )
        .toUpperCase() ||
      "IN",

    date:
      clean(
        formData.get(
          "date"
        )
      ),

    code:
      clean(
        formData.get(
          "code"
        )
      ),

    name:
      clean(
        formData.get(
          "name"
        )
      ),

    qty:
      Number(
        formData.get(
          "qty"
        )
      ),

    unit:
      clean(
        formData.get(
          "unit"
        )
      ),

    lot:
      clean(
        formData.get(
          "lot"
        )
      ),

    exp:
      clean(
        formData.get(
          "exp"
        )
      ),

    user:
      clean(
        formData.get(
          "user"
        )
      ),

    location:
      clean(
        formData.get(
          "location"
        )
      ),

    target:
      clean(
        formData.get(
          "target"
        )
      ),

    remark:
      clean(
        formData.get(
          "remark"
        )
      )

  };


  /*
   * Frontend validation
   */

  const validationError =
    validateStockPayload(
      payload
    );


  if (validationError) {

    showErrorModal(
      validationError
    );

    return;

  }


  const saveButton =
    qs(
      "saveVaccineStockBtn"
    );


  setSaveButtonLoading(
    saveButton
  );


  try {

    const result =
      await apiFetch(

        "/api/vaccine-master/stock",

        {

          method:
            "POST",

          body:
            JSON.stringify(
              payload
            )

        }

      );


    const data =
      result?.data ||
      {};


    /*
     * ปิด Add Modal
     */

    closeAddModal();


    /*
     * Success Modal
     */

    showSuccessModal(
      data,
      currentMovementType === "OUT"
        ? "จ่ายวัคซีนออกสำเร็จ"
        : (result?.message || "บันทึกรับเข้าวัคซีนสำเร็จ")
    );


    /*
     * Refresh Stock
     */

    await loadAllStock();


  }

  catch (error) {

    console.error(
      "❌ Create Vaccine Stock Error:",
      error
    );


    showErrorModal(
      error?.message ||
      "ไม่สามารถบันทึก Vaccine Stock ได้"
    );

  }

  finally {

    resetSaveButton(
      saveButton
    );

  }

}


/* =========================================================
   VALIDATE STOCK PAYLOAD
========================================================= */

function validateStockPayload(
  payload
) {

  if (!["IN", "OUT"].includes(payload.type)) {
    return "ประเภทการเคลื่อนไหวไม่ถูกต้อง";
  }

  if (payload.type === "OUT") {
    const lot = clean(payload.lot);
    const exp = clean(payload.exp);
    const matched = currentDispenseStockRows.find(
      row => clean(row.lot) === lot && clean(row.exp) === exp
    );

    if (!matched) {
      return "กรุณาเลือก LOT และ EXP จาก Stock คงเหลือ";
    }

    if (payload.qty > Number(matched.quantity || 0)) {
      return `จำนวนจ่ายมากกว่าคงเหลือ (${formatNumber(matched.quantity)} ${matched.unit || "dose"})`;
    }
  }


  if (!payload.date) {

    return "กรุณาระบุวันที่รับเข้า";

  }


  if (!payload.code) {

    return "กรุณาเลือก Vaccine";

  }


  if (
    !Number.isFinite(
      payload.qty
    ) ||
    payload.qty <= 0
  ) {

    return "จำนวนต้องมากกว่า 0";

  }


  if (!payload.unit) {

    return "กรุณาระบุหน่วย";

  }


  if (!payload.lot) {

    return "กรุณาระบุ LOT";

  }


  if (!payload.exp) {

    return "กรุณาระบุวันหมดอายุ";

  }


  if (!payload.user) {

    return "กรุณาระบุผู้บันทึก";

  }


  if (!payload.location) {

    return "กรุณาระบุ Location";

  }


  /*
   * ตรวจ EXP ไม่ให้เป็นวันที่ผ่านมาแล้ว
   */

  const expDate =
    payload.type === "IN"
      ? parseDateSafe(payload.exp)
      : null;


  if (expDate) {

    const today =
      parseDateSafe(
        getTodayISO()
      );


    if (
      expDate <
      today
    ) {

      return (
        "วันหมดอายุต้องไม่เป็นวันที่ผ่านมาแล้ว"
      );

    }

  }


  return "";

}


/* =========================================================
   SAVE BUTTON LOADING
========================================================= */

function setSaveButtonLoading(
  button
) {

  if (!button) {

    return;

  }


  button.disabled =
    true;


  button.dataset.originalText =
    button.innerHTML;


  button.innerHTML =
    "⏳ กำลังบันทึก...";

}


/* =========================================================
   RESET SAVE BUTTON
========================================================= */

function resetSaveButton(
  button
) {

  if (!button) {

    return;

  }


  button.disabled =
    false;


  button.innerHTML =
    button.dataset.originalText ||
    "💾 บันทึก Stock";

}


/* =========================================================
   OPEN DETAIL MODAL
========================================================= */

async function openDetailModal(
  code
) {

  const vaccine =
    getVaccineByCode(
      code
    );


  vaccineMasterStockState.selectedCode =
    code;


  const modal =
    qs(
      "vaccineStockDetailModal"
    );


  if (!modal) {

    return;

  }


  /*
   * Header
   */

  setText(
    "vaccineStockDetailCode",
    vaccine?.code ||
    code
  );


  setText(
    "vaccineStockDetailName",
    vaccine?.name ||
    "-"
  );


  setText(
    "vaccineStockDetailTHname",
    vaccine?.THname ||
    "-"
  );


  setText(
    "vaccineStockDetailTotal",
    "0"
  );


  const note =
    qs(
      "vaccineStockDetailNote"
    );


  if (note) {

    note.textContent =
      "";

  }


  const body =
    qs(
      "vaccineStockDetailBody"
    );


  if (body) {

    body.innerHTML = `

      <tr>

        <td
          colspan="4"
          class="vaccinestock-detail-loading"
        >
          🔄 กำลังโหลดข้อมูล...
        </td>

      </tr>

    `;

  }


  showModal(
    modal
  );


  try {

    const rows =
      await loadStockByCode(
        code
      );


    renderDetailStock(
      rows
    );

  }

  catch (error) {

    console.error(
      "❌ Vaccine Stock Detail Error:",
      error
    );


    if (body) {

      body.innerHTML = `

        <tr>

          <td
            colspan="4"
            class="vaccinestock-detail-loading"
          >

            ⚠️
            ${escapeHtml(
              error?.message ||
              "ไม่สามารถโหลดข้อมูลได้"
            )}

          </td>

        </tr>

      `;

    }


    if (note) {

      note.textContent =
        error?.message ||
        "ไม่สามารถโหลดข้อมูล Vaccine Stock ได้";

    }

  }

}


/* =========================================================
   RENDER DETAIL STOCK
========================================================= */

function renderDetailStock(
  rows = []
) {

  const body =
    qs(
      "vaccineStockDetailBody"
    );


  if (!body) {

    return;

  }


  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {

    body.innerHTML = `

      <tr>

        <td
          colspan="4"
          class="vaccinestock-detail-loading"
        >
          📦 ไม่มี Stock
        </td>

      </tr>

    `;


    setText(
      "vaccineStockDetailTotal",
      "0"
    );


    return;

  }


  let total =
    0;


  body.innerHTML =
    rows
      .map(
        row => {

          total +=
            toNumber(
              row.quantity
            );


          return `

            <tr>

              <td>
                ${escapeHtml(row.lot)}
              </td>

              <td>
                ${escapeHtml(
                  formatDateDisplay(
                    row.exp
                  )
                )}
              </td>

              <td>

                <strong>
                  ${formatNumber(
                    row.quantity
                  )}
                </strong>

              </td>

              <td>
                ${escapeHtml(row.unit)}
              </td>

            </tr>

          `;

        }
      )
      .join("");


  setText(
    "vaccineStockDetailTotal",
    formatNumber(total)
  );


  const note =
    qs(
      "vaccineStockDetailNote"
    );


  if (note) {

    const expiring =
      rows.filter(
        row =>
          isExpiringSoon(
            row.exp
          )
      ).length;


    if (expiring > 0) {

      note.textContent =
        `⚠️ มี ${expiring} LOT ใกล้หมดอายุภายใน 90 วัน`;

    }

    else {

      note.textContent =
        "Stock ปัจจุบันแสดงแยกตาม LOT / EXP";

    }

  }

}


/* =========================================================
   CLOSE DETAIL
========================================================= */

function closeDetailModal() {

  const modal =
    qs(
      "vaccineStockDetailModal"
    );


  if (!modal) {

    return;

  }


  hideModal(
    modal
  );

}


/* =========================================================
   SUCCESS MODAL
========================================================= */

function showSuccessModal(
  data = {},
  message = ""
) {

  setText(
    "vaccineStockSuccessMessage",
    message ||
    "บันทึก Vaccine Stock สำเร็จ"
  );


  setText(
    "vaccineStockSuccessRefNo",
    data.refNo ??
    data.REF_NO ??
    "-"
  );


  setText(
    "vaccineStockSuccessMovementId",
    data.movementId ??
    data.MOVEMENT_ID ??
    "-"
  );


  const modal =
    qs(
      "vaccineStockSuccessModal"
    );


  if (modal) {

    showModal(
      modal
    );

  }

}


function setDefaultVaccineStockDate() {

  const input =
    document.getElementById(
      "vaccineStockDate"
    );

  if (!input) {
    return;
  }

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  input.value =
    `${year}-${month}-${day}`;

}


/* =========================================================
   CLOSE SUCCESS
========================================================= */

function closeSuccessModal() {

  const modal =
    qs(
      "vaccineStockSuccessModal"
    );


  if (modal) {

    hideModal(
      modal
    );

  }

}


/* =========================================================
   ERROR MODAL
========================================================= */

function showErrorModal(
  message
) {

  setText(
    "vaccineStockErrorMessage",
    message ||
    "เกิดข้อผิดพลาด"
  );


  const modal =
    qs(
      "vaccineStockErrorModal"
    );


  if (modal) {

    showModal(
      modal
    );

  }

}


/* =========================================================
   CLOSE ERROR
========================================================= */

function closeErrorModal() {

  const modal =
    qs(
      "vaccineStockErrorModal"
    );


  if (modal) {

    hideModal(
      modal
    );

  }

}


/* =========================================================
   SHOW MODAL
========================================================= */

function showModal(
  modal
) {

  if (!modal) {

    return;

  }


  modal.hidden =
    false;


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  /*
   * ใช้ class เพื่อรองรับ CSS
   */

  modal.classList.add(
    "is-open"
  );


  document.body.classList.add(
    "vaccinestock-modal-open"
  );

}


/* =========================================================
   HIDE MODAL
========================================================= */

function hideModal(
  modal
) {

  if (!modal) {

    return;

  }


  modal.classList.remove(
    "is-open"
  );


  modal.hidden =
    true;


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  /*
   * ตรวจว่ามี Modal ตัวอื่นเปิดอยู่หรือไม่
   */

  const openModal =
    document.querySelector(
      [
        "#vaccineStockAddModal",
        "#vaccineStockDetailModal",
        "#vaccineStockMovementModal",
        "#vaccineStockSuccessModal",
        "#vaccineStockErrorModal"
      ]
        .join(",")
    );


  if (
    !openModal ||
    openModal.hidden
  ) {

    document.body.classList.remove(
      "vaccinestock-modal-open"
    );

  }

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
  id,
  value
) {

  const element =
    qs(id);


  if (!element) {

    return;

  }


  element.textContent =
    clean(value) ||
    "-";

}


/* =========================================================
   TABLE CLICK
========================================================= */

function handleTableClick(
  event
) {

  const button =
    event.target.closest(
      "[data-action]"
    );


  if (!button) {

    return;

  }


  const action =
    button.dataset.action;


  const code =
    clean(
      button.dataset.code
    );


  if (
    action ===
    "detail"
  ) {

    openDetailModal(
      code
    );

  }

}


/* =========================================================
   SEARCH INPUT
========================================================= */

function handleSearchInput(
  event
) {

  vaccineMasterStockState.searchText =
    event.target.value ||
    "";


  applySearch();

}


/* =========================================================
   REFRESH
========================================================= */

async function handleRefresh() {

  if (
    vaccineMasterStockState.loading
  ) {

    return;

  }


  try {

    await loadVaccineMaster();

    await loadAllStock();

  }

  catch (error) {

    showErrorModal(
      error?.message ||
      "ไม่สามารถรีเฟรชข้อมูลได้"
    );

  }

}


/* =========================================================
   REPORT BUTTON
   ---------------------------------------------------------
   Backend ที่ให้มายังไม่มี Report API
   ดังนั้นไม่สร้าง endpoint ปลอม
========================================================= */

function handleReportClick() {

  showErrorModal(
    "ขณะนี้ยังไม่มี Report API สำหรับ Vaccine Stock"
  );

}


/* =========================================================
   BACK HOME
========================================================= */

function handleBackHome() {

  /*
   * ให้ SPA Router เป็นผู้จัดการ route
   *
   * พยายามใช้ route ที่ระบบหลักรองรับ
   */

  try {

    if (
      typeof window.navigateTo ===
      "function"
    ) {

      window.navigateTo(
        "dashboard"
      );

      return;

    }


    if (
      typeof window.navigateToRoute ===
      "function"
    ) {

      window.navigateToRoute(
        "dashboard"
      );

      return;

    }


    if (
      window.appRouter &&
      typeof window.appRouter.navigate ===
      "function"
    ) {

      window.appRouter.navigate(
        "dashboard"
      );

      return;

    }


    /*
     * Fallback
     */

    window.location.hash =
      "#dashboard";

  }

  catch (error) {

    console.error(
      "❌ Back Home Error:",
      error
    );

    window.location.hash =
      "#dashboard";

  }

}


/* =========================================================
   CLOSE ALL MODALS
========================================================= */

function closeAllModals() {

  const ids = [

    "vaccineStockAddModal",

    "vaccineStockDetailModal",

    "vaccineStockMovementModal",

    "vaccineStockSuccessModal",

    "vaccineStockErrorModal"

  ];


  for (
    const id of ids
  ) {

    const modal =
      qs(id);


    if (modal) {

      hideModal(
        modal
      );

    }

  }

}


/* =========================================================
   ESCAPE KEY
========================================================= */

function handleKeydown(
  event
) {

  if (
    event.key !==
    "Escape"
  ) {

    return;

  }


  closeAllModals();

}


/* =========================================================
   BIND EVENTS
========================================================= */

function bindEvents() {

  /*
   * ADD STOCK
   */

  listen(

    qs(
      "openVaccineStockAddBtn"
    ),

    "click",

    () => openAddModal("IN")

  );

  listen(

    qs(
      "openVaccineStockDispenseBtn"
    ),

    "click",

    () => openAddModal("OUT")

  );

  listen(
    qs("vaccineStockOutLot"),
    "change",
    handleDispenseLotChange
  );

  listen(
    qs("vaccineStockOutExp"),
    "change",
    handleDispenseExpChange
  );


  /*
   * REFRESH
   */

  listen(

    qs(
      "refreshVaccineStockBtn"
    ),

    "click",

    handleRefresh

  );


  /*
   * SEARCH
   */

  listen(

    qs(
      "vaccineStockSearch"
    ),

    "input",

    handleSearchInput

  );


  /*
   * TABLE
   */

  listen(

    qs(
      "vaccineStockTableBody"
    ),

    "click",

    handleTableClick

  );


  /*
   * VACCINE SELECT
   */

  listen(

    qs(
      "vaccineStockCode"
    ),

    "change",

    handleVaccineSelectChange

  );


  /*
   * FORM
   */

  listen(

    qs(
      "vaccineStockAddForm"
    ),

    "submit",

    handleAddStockSubmit

  );


  /*
   * CLOSE ADD
   */

  listen(

    qs(
      "closeVaccineStockAddBtn"
    ),

    "click",

    closeAddModal

  );


  listen(

    qs(
      "cancelVaccineStockAddBtn"
    ),

    "click",

    closeAddModal

  );


  listen(

    qs(
      "closeVaccineStockAddOverlay"
    ),

    "click",

    closeAddModal

  );


  /*
   * CLOSE DETAIL
   */

  listen(

    qs(
      "closeVaccineStockDetailBtn"
    ),

    "click",

    closeDetailModal

  );


  listen(

    qs(
      "closeVaccineStockDetailModalBtn"
    ),

    "click",

    closeDetailModal

  );


  listen(

    qs(
      "closeVaccineStockDetailOverlay"
    ),

    "click",

    closeDetailModal

  );


  /*
   * SUCCESS
   */

  listen(

    qs(
      "closeVaccineStockSuccessBtn"
    ),

    "click",

    closeSuccessModal

  );


  /*
   * ERROR
   */

  listen(

    qs(
      "closeVaccineStockErrorBtn"
    ),

    "click",

    closeErrorModal

  );


  /*
   * REPORT
   */

  listen(

    qs(
      "openVaccineStockReportBtn"
    ),

    "click",

    handleReportClick

  );


  /*
   * HOME
   */

  listen(

    qs(
      "backVaccineStockHomeBtn"
    ),

    "click",

    handleBackHome

  );


  /*
   * ESC
   */

  listen(

    document,

    "keydown",

    handleKeydown

  );

}


/* =========================================================
   INITIAL LOAD
========================================================= */

async function initialLoad() {

  setTableLoading(
    "🔄 กำลังโหลด Vaccine Master และ Stock..."
  );


  try {

    /*
     * โหลด Master
     */

    await loadVaccineMaster();


    /*
     * โหลด Stock
     */

    await loadAllStock();


  }

  catch (error) {

    console.error(
      "❌ Vaccine Master Stock Initial Load:",
      error
    );


    setTableStatus(
      "โหลดข้อมูลไม่สำเร็จ"
    );


    setTableEmpty(
      error?.message ||
      "ไม่สามารถโหลดข้อมูล Vaccine Stock ได้"
    );

  }

}


/* =========================================================
   INIT
========================================================= */

async function init() {

  /*
   * ป้องกัน init ซ้ำ
   */

  if (
    vaccineMasterStockState.initialized
  ) {

    return;

  }


  /*
   * ตรวจว่า HTML ถูกโหลดแล้วจริง
   */

  if (
    !qs(
      "vaccinemasterstockPage"
    )
  ) {

    console.warn(
      "⚠️ vaccinemasterstockPage not found"
    );

    return;

  }


  console.log(
    "💉 Vaccine Master Stock View Initializing..."
  );


  vaccineMasterStockState = {

    vaccines: [],

    stockRows: [],

    filteredRows: [],

    initialized: true,

    loading: false,

    selectedCode: "",

    searchText: ""

  };


  bindEvents();


  await initialLoad();


  console.log(
    "✅ Vaccine Master Stock View Ready"
  );

}


/* =========================================================
   DESTROY
========================================================= */

function destroy() {

  console.log(
    "🧹 Destroy Vaccine Master Stock View"
  );


  /*
   * Remove listeners
   */

  for (
    const item
    of vaccineMasterStockListeners
  ) {

    try {

      item.element.removeEventListener(
        item.event,
        item.handler
      );

    }

    catch (error) {

      console.warn(
        "⚠️ Remove listener failed:",
        error
      );

    }

  }


  vaccineMasterStockListeners.length =
    0;


  /*
   * Close Modal
   */

  closeAllModals();


  /*
   * Reset State
   */

  vaccineMasterStockState = {

    vaccines: [],

    stockRows: [],

    filteredRows: [],

    initialized: false,

    loading: false,

    selectedCode: "",

    searchText: ""

  };

}


/* =========================================================
   PUBLIC API
========================================================= */

export {

  init,

  destroy

};