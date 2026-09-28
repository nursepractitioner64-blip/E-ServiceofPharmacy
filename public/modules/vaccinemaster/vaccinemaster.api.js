/* =========================================================
   VACCINE MASTER API
   public/modules/vaccinemaster/vaccinemaster.api.js

   หน้าที่:
   - โหลด Vaccine Master
   - โหลดเลข REF_NO สำหรับรับวัคซีน
========================================================= */

import VM from "./vaccinemaster.shared.js";


/* =========================================================
   LOAD VACCINE MASTER
========================================================= */

async function loadVaccineMaster() {

  const tbody =
    document.getElementById(
      "vaccinemasterTableBody"
    );


  if (!tbody) {

    console.warn(
      "⚠️ vaccinemasterTableBody not found"
    );

    return;

  }


  /*
   * Loading State
   */
  tbody.innerHTML = `

    <tr>

      <td
        colspan="5"
        class="vaccinemaster-loading"
      >
        🔄 กำลังโหลดข้อมูลวัคซีน...
      </td>

    </tr>

  `;


  try {

    console.log(
      "📦 LOAD VACCINE MASTER"
    );


    const response =
      await fetch(
        "/api/vaccine-master",
        {
          cache: "no-store"
        }
      );


    /*
     * HTTP Error
     */
    if (!response.ok) {

      throw new Error(
        `API HTTP ${response.status}`
      );

    }


    /*
     * Parse JSON
     */
    const result =
      await response.json();


    /*
     * รองรับทั้ง:
     *
     * [
     *   {...}
     * ]
     *
     * และ:
     *
     * {
     *   data: [...]
     * }
     */
    VM.vaccineMasterData =
      Array.isArray(result)
        ? result
        : (
          Array.isArray(
            result.data
          )
            ? result.data
            : []
        );


    console.log(
      "✅ VACCINE MASTER ROWS =",
      VM.vaccineMasterData.length
    );


    /*
     * Render Table
     */
    VM.renderTable(
      VM.vaccineMasterData
    );


  } catch (error) {

    console.error(
      "❌ LOAD VACCINE MASTER:",
      error
    );


    tbody.innerHTML = `

      <tr>

        <td
          colspan="5"
          class="vaccinemaster-error"
        >

          ❌ ไม่สามารถโหลดข้อมูลวัคซีนได้

          <br>

          ${VM.escapeHtml(
            error.message
          )}

        </td>

      </tr>

    `;

  }

}


/* =========================================================
   LOAD NEXT VACCINE STOCK REF NO
========================================================= */

async function loadVaccineStockRefNo() {

  const refEl =
    document.getElementById(
      "vaccinemasterStockRefNo"
    );


  if (!refEl) {

    return;

  }


  /*
   * Loading State
   */
  refEl.value =
    "กำลังสร้างเลข...";


  refEl.readOnly =
    true;


  try {

    const response =
      await fetch(
        "/api/vaccine-master/stock/next-ref-no",
        {
          cache: "no-store"
        }
      );


    const result =
      await response.json();


    /*
     * Validate API
     */
    if (
      !response.ok ||
      !result.ok
    ) {

      throw new Error(
        result.message ||
        `HTTP ${response.status}`
      );

    }


    /*
     * Set REF_NO
     */
    refEl.value =
      result.data?.REF_NO ||
      "";


  } catch (error) {

    console.error(
      "❌ LOAD VACCINE RCIN:",
      error
    );


    /*
     * ไม่ให้ User เข้าใจผิดว่า
     * REF_NO นี้เป็นเลขที่บันทึกแล้ว
     */
    refEl.value =
      "AUTO — สร้างเมื่อบันทึก";

  }

}


/* =========================================================
   REGISTER FUNCTIONS TO SHARED CONTEXT
========================================================= */

VM.loadVaccineMaster =
  loadVaccineMaster;


VM.loadVaccineStockRefNo =
  loadVaccineStockRefNo;