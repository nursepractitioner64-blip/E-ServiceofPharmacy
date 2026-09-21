/* =====================================================
   DAILY CHECK CLIENT
   =====================================================

   ตาราง:
   CODE | NAME | UNIT | REQ | 1 | 2 | ... | 31

   ด้านล่างตาราง:
   ผู้ตรวจ/ผู้บันทึก | ... ปุ่มผู้ตรวจแต่ละวัน ...

   เมื่อกดปุ่ม 👤
   → แสดง Modal รายละเอียดผู้ตรวจ

===================================================== */

let currentData = [];

let currentRecorders = {};


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =====================================================
   DAILY CHECK UI STYLE
===================================================== */

function injectDailyCheckStyle() {

  if (
    document.getElementById(
      "dailyCheckRecorderStyle"
    )
  ) {

    return;

  }


  const style =
    document.createElement("style");


  style.id =
    "dailyCheckRecorderStyle";


  style.textContent = `

    /* ===============================================
       DAILY CHECK TABLE
    =============================================== */

    #tbody td {

      vertical-align: middle;

    }


    /* ===============================================
       ช่องวันที่ 1 - 31
    =============================================== */

    #tbody td:nth-child(n + 5) {

      width: 42px;
      min-width: 42px;
      max-width: 42px;

      padding-left: 3px;
      padding-right: 3px;

      text-align: center;

      white-space: nowrap;

    }


    /* ===============================================
       แถวผู้ตรวจ
    =============================================== */

    .dc-recorder-row td {

      background: #f8f9fa;

      border-top:
        2px solid #adb5bd;

      vertical-align: middle;

    }


    .dc-recorder-label {

      text-align: right;

      font-weight: 600;

      white-space: nowrap;

    }


    .dc-recorder-cell {

      width: 42px;
      min-width: 42px;
      max-width: 42px;

      padding: 3px !important;

      text-align: center;

    }


    /* ===============================================
       ปุ่มผู้ตรวจ
    =============================================== */

    .dc-recorder-btn {

      width: 24px;
      height: 24px;

      min-width: 24px;
      max-width: 24px;

      padding: 0;

      margin: 0 auto;

      display: inline-flex;

      align-items: center;
      justify-content: center;

      border: 1px solid #ced4da;

      border-radius: 5px;

      background: #ffffff;

      color: #0d6efd;

      cursor: pointer;

      font-size: 12px;

      line-height: 1;

      vertical-align: middle;

      box-sizing: border-box;

      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease;

    }


    .dc-recorder-btn:hover {

      background: #e7f1ff;

      border-color: #0d6efd;

      transform:
        translateY(-1px);

    }


    .dc-recorder-btn:active {

      transform:
        translateY(0);

    }


    .dc-recorder-empty {

      color: #adb5bd;

      font-size: 12px;

      line-height: 1;

    }


    /* ===============================================
       CUSTOM RECORDER MODAL
       ไม่ใช้ Bootstrap Modal
    =============================================== */

    .dc-modal-backdrop {

      position: fixed;

      inset: 0;

      z-index: 99999;

      display: none;

      align-items: center;

      justify-content: center;

      padding: 20px;

      background:
        rgba(0, 0, 0, 0.45);

      box-sizing: border-box;

    }


    .dc-modal-backdrop.show {

      display: flex;

    }


    .dc-modal-dialog {

      width: 100%;

      max-width: 480px;

      max-height:
        calc(100vh - 40px);

      overflow: hidden;

      background: #ffffff;

      border-radius: 12px;

      box-shadow:
        0 10px 35px
        rgba(0, 0, 0, 0.20);

      animation:
        dcModalIn 0.15s ease-out;

    }


    @keyframes dcModalIn {

      from {

        opacity: 0;

        transform:
          translateY(-10px)
          scale(0.98);

      }

      to {

        opacity: 1;

        transform:
          translateY(0)
          scale(1);

      }

    }


    .dc-modal-header {

      display: flex;

      align-items: center;

      justify-content: space-between;

      padding:
        14px 18px;

      border-bottom:
        1px solid #e9ecef;

    }


    .dc-modal-title {

      margin: 0;

      font-size: 17px;

      font-weight: 600;

      color: #212529;

    }


    .dc-modal-close {

      width: 32px;
      height: 32px;

      padding: 0;

      border: none;

      border-radius: 6px;

      background: transparent;

      color: #6c757d;

      font-size: 22px;

      line-height: 1;

      cursor: pointer;

      display: flex;

      align-items: center;

      justify-content: center;

    }


    .dc-modal-close:hover {

      background: #f1f3f5;

      color: #212529;

    }


    .dc-modal-body {

      padding: 18px;

    }


    .dc-recorder-info {

      border:
        1px solid #e9ecef;

      border-radius: 10px;

      overflow: hidden;

      background: #ffffff;

    }


    .dc-recorder-info-row {

      display: flex;

      align-items: stretch;

      min-height: 48px;

      border-bottom:
        1px solid #f1f3f5;

    }


    .dc-recorder-info-row:last-child {

      border-bottom: none;

    }


    .dc-recorder-info-label {

      width: 125px;

      min-width: 125px;

      display: flex;

      align-items: center;

      padding:
        10px 14px;

      background: #f8f9fa;

      color: #6c757d;

      font-weight: 500;

      box-sizing: border-box;

    }


    .dc-recorder-info-value {

      flex: 1;

      display: flex;

      align-items: center;

      padding:
        10px 14px;

      color: #212529;

      font-weight: 500;

      word-break: break-word;

    }


    .dc-modal-footer {

      display: flex;

      justify-content: flex-end;

      padding:
        12px 18px;

      border-top:
        1px solid #e9ecef;

    }


    .dc-modal-close-btn {

      min-width: 70px;

      padding:
        7px 14px;

      border: 1px solid #6c757d;

      border-radius: 6px;

      background: #6c757d;

      color: #ffffff;

      cursor: pointer;

      font-size: 14px;

    }


    .dc-modal-close-btn:hover {

      background: #5c636a;

      border-color: #5c636a;

    }


    /* ===============================================
       MOBILE
    =============================================== */

    @media (max-width: 768px) {

      #tbody td:nth-child(n + 5) {

        width: 40px;
        min-width: 40px;
        max-width: 40px;

      }


      .dc-recorder-cell {

        width: 40px;
        min-width: 40px;
        max-width: 40px;

      }


      .dc-recorder-btn {

        width: 23px;
        height: 23px;

        min-width: 23px;
        max-width: 23px;

        font-size: 11px;

      }


      .dc-recorder-info-label {

        width: 105px;

        min-width: 105px;

      }


      .dc-modal-backdrop {

        padding: 12px;

      }


      .dc-modal-dialog {

        max-height:
          calc(100vh - 24px);

      }

    }

  `;


  document.head.appendChild(style);

}


/* =====================================================
   CREATE RECORDER MODAL
===================================================== */

function createRecorderModal() {

  if (
    document.getElementById(
      "dailyCheckRecorderModal"
    )
  ) {

    return;

  }


  const modal =
    document.createElement("div");


  modal.id =
    "dailyCheckRecorderModal";


  modal.className =
    "dc-modal-backdrop";


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  modal.innerHTML = `

    <div
      class="dc-modal-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dailyCheckRecorderModalTitle"
    >

      <div class="dc-modal-header">

        <h5
          class="dc-modal-title"
          id="dailyCheckRecorderModalTitle"
        >

          รายละเอียดผู้ตรวจ/ผู้บันทึก

        </h5>


        <button
          type="button"
          class="dc-modal-close"
          id="dcRecorderModalClose"
          aria-label="ปิด"
          title="ปิด"
        >

          ×

        </button>

      </div>


      <div class="dc-modal-body">

        <div
          class="dc-recorder-info"
        >

          <div
            class="dc-recorder-info-row"
          >

            <div
              class="dc-recorder-info-label"
            >

              วันที่ตรวจ

            </div>


            <div
              class="dc-recorder-info-value"
              id="dcRecorderDate"
            >

              -

            </div>

          </div>


          <div
            class="dc-recorder-info-row"
          >

            <div
              class="dc-recorder-info-label"
            >

              ผู้ตรวจ/ผู้บันทึก

            </div>


            <div
              class="dc-recorder-info-value"
              id="dcRecorderName"
            >

              -

            </div>

          </div>

        </div>

      </div>


      <div class="dc-modal-footer">

        <button
          type="button"
          class="dc-modal-close-btn"
          id="dcRecorderModalCloseBtn"
        >

          ปิด

        </button>

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  /* ===============================================
     ปุ่ม X
  =============================================== */

  const closeBtn =
    document.getElementById(
      "dcRecorderModalClose"
    );


  closeBtn?.addEventListener(
    "click",
    closeRecorderModal
  );


  /* ===============================================
     ปุ่ม ปิด
  =============================================== */

  const closeBtn2 =
    document.getElementById(
      "dcRecorderModalCloseBtn"
    );


  closeBtn2?.addEventListener(
    "click",
    closeRecorderModal
  );


  /* ===============================================
     คลิกพื้นหลังเพื่อปิด
  =============================================== */

  modal.addEventListener(
    "click",
    (event) => {

      if (
        event.target === modal
      ) {

        closeRecorderModal();

      }

    }
  );


  /* ===============================================
     ESC เพื่อปิด
  =============================================== */

  document.addEventListener(
    "keydown",
    handleRecorderModalKeydown
  );

}


/* =====================================================
   CLOSE RECORDER MODAL
===================================================== */

function closeRecorderModal() {

  const modal =
    document.getElementById(
      "dailyCheckRecorderModal"
    );


  if (!modal) {

    return;

  }


  modal.classList.remove(
    "show"
  );


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.style.overflow = "";

}


/* =====================================================
   KEYBOARD CLOSE
===================================================== */

function handleRecorderModalKeydown(
  event
) {

  if (
    event.key !== "Escape"
  ) {

    return;

  }


  const modal =
    document.getElementById(
      "dailyCheckRecorderModal"
    );


  if (
    modal &&
    modal.classList.contains("show")
  ) {

    closeRecorderModal();

  }

}


/* =====================================================
   SHOW RECORDER MODAL
===================================================== */

function showRecorderModal(
  day,
  recorder
) {

  createRecorderModal();


  const dateEl =
    document.getElementById(
      "dcRecorderDate"
    );


  const nameEl =
    document.getElementById(
      "dcRecorderName"
    );


  const monthSelect =
    document.getElementById(
      "monthSelect"
    );


  const yearSelect =
    document.getElementById(
      "yearSelect"
    );


  const month =
    Number(
      monthSelect?.value ||
      (
        new Date().getMonth() + 1
      )
    );


  const year =
    Number(
      yearSelect?.value ||
      new Date().getFullYear()
    );


  const monthNames = [

    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม"

  ];


  const monthName =
    monthNames[month - 1] ||
    "";


  if (dateEl) {

    dateEl.textContent =
      `${day} ${monthName} ${year + 543}`;

  }


  if (nameEl) {

    nameEl.textContent =
      recorder || "-";

  }


  const modal =
    document.getElementById(
      "dailyCheckRecorderModal"
    );


  if (!modal) {

    return;

  }


  /* ===============================================
     เปิด Custom Modal
  =============================================== */

  modal.classList.add(
    "show"
  );


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  /* ป้องกันหน้าหลัก scroll */

  document.body.style.overflow =
    "hidden";


  /* Focus ไปที่ปุ่มปิด */

  setTimeout(
    () => {

      document
        .getElementById(
          "dcRecorderModalClose"
        )
        ?.focus();

    },
    50
  );

}


/* =====================================================
   LOAD DATA
===================================================== */

async function loadData() {

  const monthSelect =
    document.getElementById(
      "monthSelect"
    );


  const yearSelect =
    document.getElementById(
      "yearSelect"
    );


  const tbody =
    document.getElementById(
      "tbody"
    );


  if (!tbody) {

    console.error(
      "❌ ไม่พบ #tbody"
    );

    return;

  }


  const month =
    Number(
      monthSelect?.value ||
      (
        new Date().getMonth() + 1
      )
    );


  const year =
    Number(
      yearSelect?.value ||
      new Date().getFullYear()
    );


  console.log(
    "📅 LOAD DAILY CHECK:",
    {
      month,
      year
    }
  );


  // ===================================================
  // LOADING
  // ===================================================

  tbody.innerHTML = `

    <tr>

      <td
        colspan="35"
        style="
          padding:20px;
          text-align:center;
        "
      >

        กำลังโหลดข้อมูล...

      </td>

    </tr>

  `;


  try {

    const url =
      `/api/dailycheck` +
      `?month=${encodeURIComponent(month)}` +
      `&year=${encodeURIComponent(year)}` +
      `&t=${Date.now()}`;


    console.log(
      "🌐 DAILY CHECK API:",
      url
    );


    const res =
      await fetch(
        url,
        {

          method: "GET",

          cache: "no-store",

          headers: {
            "Accept":
              "application/json"
          }

        }
      );


    console.log(
      "📡 RESPONSE:",
      res.status
    );


    if (!res.ok) {

      const text =
        await res.text();


      console.error(
        "❌ API ERROR:",
        text
      );


      throw new Error(
        `โหลดข้อมูลไม่สำเร็จ HTTP ${res.status}`
      );

    }


    const json =
      await res.json();


    console.log(
      "📦 DAILY CHECK JSON:",
      json
    );


    if (
      json.success === false ||
      json.ok === false
    ) {

      throw new Error(
        json.message ||
        json.error ||
        "โหลด Daily Check ไม่สำเร็จ"
      );

    }


    // =================================================
    // DATA
    // =================================================

    currentData =
      Array.isArray(json.data)
        ? json.data
        : [];


    // =================================================
    // RECORDER
    // =================================================

    currentRecorders =
      json.recorders || {};


    console.log(
      "✅ DAILY CHECK ROWS:",
      currentData.length
    );


    console.log(
      "👤 RECORDERS:",
      currentRecorders
    );


    renderTable();


  } catch (err) {

    console.error(
      "❌ DAILY CHECK LOAD ERROR:",
      err
    );


    tbody.innerHTML = `

      <tr>

        <td
          colspan="35"
          style="
            padding:20px;
            text-align:center;
            color:#dc3545;
          "
        >

          ❌
          ${escapeHtml(
            err.message ||
            "โหลดข้อมูลไม่สำเร็จ"
          )}

        </td>

      </tr>

    `;

  }

}


/* =====================================================
   RENDER TABLE
===================================================== */

function renderTable() {

  const tbody =
    document.getElementById(
      "tbody"
    );


  if (!tbody) {

    return;

  }


  tbody.innerHTML = "";


  // ===================================================
  // NO DATA
  // ===================================================

  if (!currentData.length) {

    tbody.innerHTML = `

      <tr>

        <td
          colspan="35"
          style="
            padding:20px;
            text-align:center;
            color:#666;
          "
        >

          ไม่พบข้อมูล

        </td>

      </tr>

    `;


    renderRecorderRow();


    return;

  }


  // ===================================================
  // DATA ROWS
  // ===================================================

  currentData.forEach(
    (item) => {

      const required =
        Number(
          item.REQUIRED || 0
        );


      let row =
        "<tr>";


      // =================================================
      // CODE
      // =================================================

      row += `

        <td>

          ${escapeHtml(
            item.CODE || ""
          )}

        </td>

      `;


      // =================================================
      // NAME
      // =================================================

      row += `

        <td
          style="
            text-align:left;
            white-space:normal;
            word-break:break-word;
          "
        >

          ${escapeHtml(
            item.NAME || ""
          )}

        </td>

      `;


      // =================================================
      // UNIT
      // =================================================

      row += `

        <td>

          ${escapeHtml(
            item.UNIT || ""
          )}

        </td>

      `;


      // =================================================
      // REQUIRED
      // =================================================

      row += `

        <td>

          ${required}

        </td>

      `;


      // =================================================
      // DAYS 1 - 31
      // =================================================

      for (
        let day = 1;
        day <= 31;
        day++
      ) {

        const value =
          item[day];


        let cls =
          "";


        // -----------------------------------------------
        // มีข้อมูล
        // -----------------------------------------------

        if (
          value !== "" &&
          value !== null &&
          value !== undefined
        ) {

          const actual =
            Number(value);


          // =============================================
          // เท่ากับ REQ
          // =============================================

          if (
            actual === required
          ) {

            cls =
              "bg-success";

          }


          // =============================================
          // น้อยกว่า REQ
          // =============================================

          else if (
            actual < required
          ) {

            cls =
              "bg-danger";

          }


          // =============================================
          // มากกว่า REQ
          // =============================================

          else if (
            actual > required
          ) {

            cls =
              "bg-warning";

          }

        }


        row += `

          <td
            class="${cls}"
          >

            ${
              value !== "" &&
              value !== null &&
              value !== undefined
                ? escapeHtml(value)
                : ""
            }

          </td>

        `;

      }


      // =================================================
      // END ROW
      // =================================================

      row +=
        "</tr>";


      tbody.insertAdjacentHTML(
        "beforeend",
        row
      );

    }
  );


  // ===================================================
  // RECORDER ROW
  // ===================================================

  renderRecorderRow();

}


/* =====================================================
   RENDER RECORDER ROW
===================================================== */

function renderRecorderRow() {

  const tbody =
    document.getElementById(
      "tbody"
    );


  if (!tbody) {

    return;

  }


  const row =
    document.createElement(
      "tr"
    );


  row.className =
    "dc-recorder-row";


  // ===================================================
  // LABEL
  // ===================================================

  const labelCell =
    document.createElement(
      "td"
    );


  labelCell.colSpan =
    4;


  labelCell.className =
    "dc-recorder-label";


  labelCell.textContent =
    "ผู้ตรวจ/ผู้บันทึก";


  row.appendChild(
    labelCell
  );


  // ===================================================
  // DAYS 1 - 31
  // ===================================================

  for (
    let day = 1;
    day <= 31;
    day++
  ) {

    const cell =
      document.createElement(
        "td"
      );


    cell.className =
      "dc-recorder-cell";


    const recorder =
      currentRecorders[day] || "";


    // =================================================
    // มีผู้ตรวจ
    // =================================================

    if (recorder) {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "dc-recorder-btn";


      button.textContent =
        "👤";


      button.title =
        `ดูรายละเอียดผู้ตรวจวันที่ ${day}`;


      button.setAttribute(
        "aria-label",
        `ดูรายละเอียดผู้ตรวจวันที่ ${day}`
      );


      button.addEventListener(
        "click",
        () => {

          showRecorderModal(
            day,
            recorder
          );

        }
      );


      cell.appendChild(
        button
      );

    }


    // =================================================
    // ไม่มีผู้ตรวจ
    // =================================================

    else {

      const empty =
        document.createElement(
          "span"
        );


      empty.className =
        "dc-recorder-empty";


      empty.textContent =
        "—";


      cell.appendChild(
        empty
      );

    }


    row.appendChild(
      cell
    );

  }


  // ===================================================
  // APPEND
  // ===================================================

  tbody.appendChild(
    row
  );

}


/* =====================================================
   INIT
===================================================== */

export async function init() {

  console.log(
    "🚀 DAILY CHECK INIT"
  );


  // ===================================================
  // UI STYLE
  // ===================================================

  injectDailyCheckStyle();


  // ===================================================
  // MODAL
  // ===================================================

  createRecorderModal();


  // ===================================================
  // MONTH
  // ===================================================

  const monthSelect =
    document.getElementById(
      "monthSelect"
    );


  if (
    monthSelect &&
    monthSelect.options.length === 0
  ) {

    const monthNames = [

      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม"

    ];


    const currentMonth =
      new Date().getMonth() + 1;


    monthNames.forEach(
      (name, index) => {

        const month =
          index + 1;


        const option =
          document.createElement(
            "option"
          );


        option.value =
          month;


        option.textContent =
          name;


        if (
          month === currentMonth
        ) {

          option.selected =
            true;

        }


        monthSelect.appendChild(
          option
        );

      }
    );

  }


  // ===================================================
  // YEAR
  // ===================================================

  const yearSelect =
    document.getElementById(
      "yearSelect"
    );


  if (
    yearSelect &&
    yearSelect.options.length === 0
  ) {

    const currentYear =
      new Date().getFullYear();


    for (
      let year = 2025;
      year <= 2035;
      year++
    ) {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        year;


      option.textContent =
        year;


      if (
        year === currentYear
      ) {

        option.selected =
          true;

      }


      yearSelect.appendChild(
        option
      );

    }

  }


  // ===================================================
  // FIRST LOAD
  // ===================================================

  await loadData();


  // ===================================================
  // FILTER MONTH
  // ===================================================

  monthSelect?.addEventListener(
    "change",
    loadData
  );


  // ===================================================
  // FILTER YEAR
  // ===================================================

  yearSelect?.addEventListener(
    "change",
    loadData
  );


  console.log(
    "✅ DAILY CHECK READY"
  );

}


/* =====================================================
   DESTROY
===================================================== */

export function destroy() {

  closeRecorderModal();


  console.log(
    "🧹 DAILY CHECK DESTROY"
  );

}