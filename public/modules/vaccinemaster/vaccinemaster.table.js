/* =========================================================
   VACCINE MASTER TABLE
   public/modules/vaccinemaster/vaccinemaster.table.js

   หน้าที่:
   - แสดงตาราง Vaccine Master
   - แสดงจำนวนคงเหลือ
   - สร้าง Vaccine Select ใน Stock Modal
   - เติมชื่อวัคซีนอัตโนมัติ
   - ตั้งวันที่เริ่มต้น
========================================================= */

import VM from "./vaccinemaster.shared.js";


/* =========================================================
   RENDER VACCINE MASTER TABLE
========================================================= */

function renderTable(data) {

  const tbody =
    document.getElementById(
      "vaccinemasterTableBody"
    );


  if (!tbody) {

    console.error(
      "❌ #vaccinemasterTableBody NOT FOUND"
    );

    return;

  }


  /* =======================================================
     CHECK DATA
  ======================================================= */

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="4"
          class="vaccinemaster-empty"
        >
          ไม่พบข้อมูลวัคซีน
        </td>
      </tr>
    `;

    return;

  }


  /* =======================================================
     REAL DATA
     จาก VACCINE_MASTER
  ======================================================= */

  tbody.innerHTML =
    data.map(
      (item) => {

        const code =
          item.code ??
          item.CODE ??
          "";

        const name =
          item.name ??
          item.NAME ??
          "";

        const thname =
          item.THname ??
          item.thname ??
          item.THNAME ??
          "";


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


            <td>

              <div
                class="vaccinemaster-actions"
              >

                <button
                  type="button"
                  class="vaccinemaster-icon-btn"
                  data-vaccinemaster-detail="${VM.escapeHtml(code)}"
                  title="ดูรายละเอียด Stock"
                >
                  👁️
                </button>


                <button
                  type="button"
                  class="vaccinemaster-icon-btn"
                  data-vaccinemaster-edit="${VM.escapeHtml(code)}"
                  title="แก้ไข"
                >
                  ✏️
                </button>


                <button
                  type="button"
                  class="vaccinemaster-icon-btn"
                  data-vaccinemaster-delete="${VM.escapeHtml(code)}"
                  title="ลบ"
                >
                  🗑️
                </button>

              </div>

            </td>

          </tr>
        `;

      }
    ).join("");

}

/* =========================================================
   POPULATE VACCINE STOCK SELECT
========================================================= */

function populateVaccineStockSelect() {

  const select =
    document.getElementById(
      "vaccinemasterStockCode"
    );


if (!select) {

  return;

}


  /*
   * เก็บค่าปัจจุบันไว้
   */
  const currentValue =
    select.value;


  /*
   * Reset
   */
  select.innerHTML = `

    <option value="">
      เลือกวัคซีน
    </option>

  `;


  /*
   * เติม Vaccine Master
   */
  VM.vaccineMasterData.forEach(
    vaccine => {

      const code =
        vaccine.code ??
        vaccine.CODE ??
        "";


      const name =
        vaccine.name ??
        vaccine.NAME ??
        "";


      if (!code) {

        return;

      }


      const option =
        document.createElement(
          "option"
        );


      option.value =
        code;


      option.textContent =
        `${code} - ${name}`;


      select.appendChild(
        option
      );

    }
  );


  /*
   * คืนค่าเดิม
   */
  if (
    currentValue
  ) {

    select.value =
      currentValue;

  }


  /*
   * Bind Change Event
   * เพียงครั้งเดียว
   */
  if (
    select.dataset.vaccineBound !==
    "true"
  ) {

    select.addEventListener(
      "change",
      handleVaccineStockSelect
    );


    select.dataset.vaccineBound =
      "true";

  }

}


/* =========================================================
   HANDLE VACCINE SELECT
========================================================= */

function handleVaccineStockSelect(
  event
) {

  const code =
    event.target.value;


  const nameEl =
    document.getElementById(
      "vaccinemasterStockName"
    );


  const thnameEl =
    document.getElementById(
      "vaccinemasterStockTHname"
    );


  /*
   * ไม่มี Vaccine
   */
  if (
    !code
  ) {

    if (nameEl) {

      nameEl.value =
        "";

    }


    if (thnameEl) {

      thnameEl.value =
        "";

    }


    return;

  }


  /*
   * หา Vaccine
   */
  const vaccine =
    VM.vaccineMasterData.find(
      item =>
        String(
          item.code ??
          item.CODE ??
          ""
        )
          .trim()
          .toUpperCase()
        ===
        String(
          code
        )
          .trim()
          .toUpperCase()
    );


  if (!vaccine) {

    return;

  }


  /*
   * English Name
   */
  if (nameEl) {

    nameEl.value =
      vaccine.name ??
      vaccine.NAME ??
      "";

  }


  /*
   * Thai Name
   */
  if (thnameEl) {

    thnameEl.value =
      vaccine.THname ??
      vaccine.thname ??
      vaccine.THNAME ??
      "";

  }

}


/* =========================================================
   DEFAULT STOCK DATE
========================================================= */

function setDefaultStockDate() {

  const dateEl =
    document.getElementById(
      "vaccinemasterStockDate"
    );


  if (!dateEl) {

    return;

  }


  /*
   * ถ้ามีค่าอยู่แล้ว
   * ไม่ต้องเขียนทับ
   */
  if (
    dateEl.value
  ) {

    return;

  }


  const today =
    new Date();


  const yyyy =
    today.getFullYear();


  const mm =
    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const dd =
    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    );


  dateEl.value =
    `${yyyy}-${mm}-${dd}`;

}


/* =========================================================
   REGISTER TO SHARED CONTEXT
========================================================= */

VM.renderTable =
  renderTable;


VM.populateVaccineStockSelect =
  populateVaccineStockSelect;


VM.handleVaccineStockSelect =
  handleVaccineStockSelect;


VM.setDefaultStockDate =
  setDefaultStockDate;