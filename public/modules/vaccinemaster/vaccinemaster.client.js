/*********************************************************
 * VACCINE MASTER CLIENT
 *
 * FILE:
 * public/modules/vaccinemaster/vaccinemaster.client.js
 *
 * FIX VERSION
 *
 * 1. Vaccine Master Modal เปิดจากปุ่ม Vaccine Master
 * 2. Vaccine Stock Modal เปิดจากปุ่ม Vaccine Stock
 * 3. 👁️ เปิด Vaccine Stock Detail Modal
 * 4. Modal ทุกตัว hidden ตอนเริ่มหน้า
 * 5. รองรับปุ่มปิดทุกตัว
 * 6. รองรับ VACCINE_MOVEMENT
 * 7. แสดง LOT / EXP / QTY
 * 8. รวม Stock
 * 9. แจ้งเตือนใกล้หมดอายุ
 * 10. Event binding แบบ delegation
 *********************************************************/


let vaccineMasterData = [];

let initialized = false;


/* =====================================================
   INIT
===================================================== */

export async function init() {

  console.log(
    "💉 Vaccine Master init()"
  );

  /*
   * ปิด Modal ทุกตัวทันที
   */
  forceCloseAllModals();


  /*
   * Bind events เพียงครั้งเดียว
   */
  if (!initialized) {

    bindEvents();

    initialized = true;

  }


  /*
   * ตั้งค่าวันที่ Stock
   */
  setDefaultStockDate();


  /*
   * โหลด Vaccine Master
   */
  await loadVaccineMaster();


  /*
   * เติม Vaccine Select
   */
  populateVaccineStockSelect();


  console.log(
    "✅ Vaccine Master ready"
  );

}


/* =====================================================
   FORCE CLOSE ALL MODALS
===================================================== */

function forceCloseAllModals() {

  const ids = [

    "vaccinemasterModal",

    "vaccineStockDetailModal",

    "vaccinemasterStockModal"

  ];


  ids.forEach(
    id => {

      const modal =
        document.getElementById(id);


      if (!modal) return;


      modal.classList.remove(
        "show"
      );


      modal.hidden = true;


      modal.setAttribute(
        "aria-hidden",
        "true"
      );

    }
  );


  document.body.classList.remove(
    "vaccinemaster-modal-open"
  );


  document.body.classList.remove(
    "vaccinemaster-detail-modal-open"
  );


  document.body.classList.remove(
    "vaccinemaster-stock-modal-open"
  );

}


/* =====================================================
   EVENT BINDING
===================================================== */

function bindEvents() {

  console.log(
    "🔗 Vaccine Master events binding"
  );


  /*
   * ใช้ document delegation
   * เพราะปุ่ม 👁️ ถูกสร้างหลังโหลดข้อมูล
   */
  document.addEventListener(
    "click",
    handleClick,
    false
  );


  document.addEventListener(
    "submit",
    handleSubmit,
    false
  );


  document.addEventListener(
    "keydown",
    handleKeydown,
    false
  );

}


/* =====================================================
   CLICK HANDLER
===================================================== */

async function handleClick(event) {

  /*
   * ================================================
   * VACCINE MASTER
   * ================================================
   */

  const masterOpenBtn =
    event.target.closest(
      "#openAddvaccinemasterModal"
    );


  if (masterOpenBtn) {

    event.preventDefault();

    event.stopPropagation();

    console.log(
      "📝 OPEN VACCINE MASTER MODAL"
    );

    openMasterModal();

    return;

  }


  /*
   * ================================================
   * VACCINE STOCK
   *
   * HTML:
   * id="openAddInventoryModal"
   * ================================================
   */

const stockBtn =
  event.target.closest(
    "#openVaccinemasterStockModal"
  );

if (stockBtn) {
  event.preventDefault();
  event.stopPropagation();

  openVaccineStockModal();

  return;
}

  /*
   * ================================================
   * STOCK DETAIL 👁️
   * ================================================
   */

  const detailBtn =
    event.target.closest(
      "[data-vaccinemaster-detail]"
    );


  if (detailBtn) {

    event.preventDefault();

    event.stopPropagation();

    const code =
      detailBtn.getAttribute(
        "data-vaccinemaster-detail"
      );


    console.log(
      "👁️ CLICK VACCINE STOCK DETAIL:",
      code
    );


    if (!code) {

      console.error(
        "❌ Vaccine code is empty"
      );

      return;

    }


    await openStockDetail(
      code
    );

    return;

  }


  /*
   * ================================================
   * EDIT
   * ================================================
   */

  const editBtn =
    event.target.closest(
      "[data-vaccinemaster-edit]"
    );


  if (editBtn) {

    event.preventDefault();

    event.stopPropagation();

    const code =
      editBtn.getAttribute(
        "data-vaccinemaster-edit"
      );


    if (!code) return;


    editVaccine(
      code
    );

    return;

  }


  /*
   * ================================================
   * DELETE
   * ================================================
   */

  const deleteBtn =
    event.target.closest(
      "[data-vaccinemaster-delete]"
    );


  if (deleteBtn) {

    event.preventDefault();

    event.stopPropagation();

    const code =
      deleteBtn.getAttribute(
        "data-vaccinemaster-delete"
      );


    if (!code) return;


    await deleteVaccine(
      code
    );

    return;

  }


  /*
   * ================================================
   * REFRESH
   * ================================================
   */

  const refreshBtn =
    event.target.closest(
      "#refreshVaccinemasterBtn"
    );


  if (refreshBtn) {

    event.preventDefault();

    event.stopPropagation();

    await loadVaccineMaster();

    populateVaccineStockSelect();

    return;

  }


  /*
   * ================================================
   * MASTER MODAL CLOSE
   * ================================================
   */

  if (
    event.target.closest(
      "#closeVaccinemasterModalBtn"
    )
  ) {

    event.preventDefault();

    closeMasterModal();

    return;

  }


  if (
    event.target.closest(
      "#cancelVaccinemasterModal"
    )
  ) {

    event.preventDefault();

    closeMasterModal();

    return;

  }


  if (
    event.target.closest(
      "#closeVaccinemasterModal"
    )
  ) {

    event.preventDefault();

    closeMasterModal();

    return;

  }


  /*
   * ================================================
   * STOCK DETAIL CLOSE
   *
   * รองรับทั้ง 3 ID
   * ================================================
   */

  if (
    event.target.closest(
      "#closeVaccineStockDetailModal"
    )
    ||
    event.target.closest(
      "#closeVaccineStockDetailModalBtn"
    )
    ||
    event.target.closest(
      "#closeVaccineStockDetailOverlay"
    )
  ) {

    event.preventDefault();

    closeStockDetail();

    return;

  }


  /*
   * ================================================
   * VACCINE STOCK MODAL CLOSE
   * ================================================
   */

  if (
    event.target.closest(
      "#closeVaccinemasterStockModal"
    )
    ||
    event.target.closest(
      "#cancelVaccinemasterStockModal"
    )
  ) {

    event.preventDefault();

    closeVaccineStockModal();

    return;

  }

}


/* =====================================================
   LOAD VACCINE MASTER
===================================================== */

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


    if (!response.ok) {

      throw new Error(
        `API HTTP ${response.status}`
      );

    }


    const result =
      await response.json();


    vaccineMasterData =
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
      vaccineMasterData.length
    );


    renderTable(
      vaccineMasterData
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

          ${escapeHtml(
            error.message
          )}

        </td>

      </tr>

    `;

  }

}


/* =====================================================
   RENDER TABLE
===================================================== */

function renderTable(
  data
) {

  const tbody =
    document.getElementById(
      "vaccinemasterTableBody"
    );


  const count =
    document.getElementById(
      "vaccinemasterTableCount"
    );


  if (!tbody) return;


  if (
    !Array.isArray(data)
    ||
    data.length === 0
  ) {

    tbody.innerHTML = `

      <tr>

        <td
          colspan="5"
          class="vaccinemaster-empty"
        >
          ไม่พบข้อมูลวัคซีน
        </td>

      </tr>

    `;


    if (count) {

      count.textContent =
        "0 รายการ";

    }


    return;

  }


  tbody.innerHTML =
    data
      .map(
        (
          item,
          index
        ) => {

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


          const balance =
            Number(
              item.balance ??
              item.BALANCE ??
              0
            );


          return `

            <tr>

              <td
                class="vaccinemaster-col-no"
              >
                ${index + 1}
              </td>


              <td>

                <span
                  class="vaccinemaster-code"
                >
                  ${escapeHtml(
                    code
                  )}
                </span>

              </td>


              <td>

                <div
                  class="vaccinemaster-name"
                >

                  <div
                    class="vaccinemaster-name-en"
                  >
                    ${escapeHtml(
                      name
                    )}
                  </div>


                  ${
                    thname
                      ? `

                        <div
                          class="vaccinemaster-name-th"
                        >
                          ${escapeHtml(
                            thname
                          )}
                        </div>

                      `
                      : ""
                  }

                </div>

              </td>


              <td
                class="vaccinemaster-balance"
              >

                ${formatNumber(
                  balance
                )}

              </td>


              <td>

                <div
                  class="vaccinemaster-actions"
                >

                  <button
                    type="button"
                    class="
                      vaccinemaster-icon-btn
                      vaccinemaster-detail-btn
                    "
                    data-vaccinemaster-detail="${escapeHtml(
                      code
                    )}"
                    title="ดูรายละเอียด Stock"
                    aria-label="ดูรายละเอียด Stock"
                  >
                    👁️
                  </button>


                  <button
                    type="button"
                    class="
                      vaccinemaster-icon-btn
                      vaccinemaster-edit-btn
                    "
                    data-vaccinemaster-edit="${escapeHtml(
                      code
                    )}"
                    title="แก้ไข"
                    aria-label="แก้ไข"
                  >
                    ✏️
                  </button>


                  <button
                    type="button"
                    class="
                      vaccinemaster-icon-btn
                      vaccinemaster-delete-btn
                    "
                    data-vaccinemaster-delete="${escapeHtml(
                      code
                    )}"
                    title="ลบ"
                    aria-label="ลบ"
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


  if (count) {

    count.textContent =
      `${data.length} รายการ`;

  }

}


/* =====================================================
   OPEN VACCINE MASTER MODAL
===================================================== */

function openMasterModal() {

  const modal =
    document.getElementById(
      "vaccinemasterModal"
    );


  if (!modal) {

    console.error(
      "❌ vaccinemasterModal not found"
    );

    return;

  }


  closeStockDetail();

  closeVaccineStockModal();


  modal.hidden = false;

  modal.classList.add(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "vaccinemaster-modal-open"
  );


  setTimeout(
    () => {

      document
        .getElementById(
          "vaccinemasterCode"
        )
        ?.focus();

    },
    50
  );


  console.log(
    "✅ Vaccine Master Modal OPEN"
  );

}


/* =====================================================
   CLOSE VACCINE MASTER MODAL
===================================================== */

function closeMasterModal() {

  const modal =
    document.getElementById(
      "vaccinemasterModal"
    );


  if (!modal) return;


  modal.classList.remove(
    "show"
  );


  modal.hidden = true;


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "vaccinemaster-modal-open"
  );


  console.log(
    "✖️ Vaccine Master Modal CLOSE"
  );

}


/* =====================================================
   AUTO RCIN PREVIEW
   Final RCIN is generated by backend on save.
   ===================================================== */
async function loadVaccineStockRefNo() {

  const refEl =
    document.getElementById(
      "vaccinemasterStockRefNo"
    );

  if (!refEl) return;

  refEl.value =
    "กำลังสร้างเลข...";

  refEl.readOnly = true;

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

    if (
      !response.ok ||
      !result.ok
    ) {
      throw new Error(
        result.message ||
        `HTTP ${response.status}`
      );
    }

    refEl.value =
      result.data?.REF_NO ||
      "";

  } catch (error) {

    console.error(
      "❌ LOAD VACCINE RCIN:",
      error
    );

    refEl.value =
      "AUTO — สร้างเมื่อบันทึก";
  }
}


/* =====================================================
   OPEN VACCINE STOCK MODAL
===================================================== */

function openVaccineStockModal() {

  const modal =
    document.getElementById(
      "vaccinemasterStockModal"
    );


  if (!modal) {

    console.error(
      "❌ vaccinemasterStockModal NOT FOUND"
    );

    return;

  }


  console.log(
    "💉 OPEN VACCINE STOCK MODAL"
  );


  /*
   * ปิด Modal อื่นก่อน
   */
  closeMasterModal();

  closeStockDetail();


  /*
   * เติม Select ใหม่
   */
  populateVaccineStockSelect();


  /*
   * ตั้งวันที่
   */
  setDefaultStockDate();


  loadVaccineStockRefNo();


  /*
   * เปิด Modal
   */
  modal.hidden = false;

  modal.classList.add(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "vaccinemaster-stock-modal-open"
  );


  setTimeout(
    () => {

      document
        .getElementById(
          "vaccinemasterStockCode"
        )
        ?.focus();

    },
    50
  );


  console.log(
    "✅ Vaccine Stock Modal OPEN"
  );

}


/* =====================================================
   CLOSE VACCINE STOCK MODAL
===================================================== */

function closeVaccineStockModal() {

  const modal =
    document.getElementById(
      "vaccinemasterStockModal"
    );


  if (!modal) return;


  modal.classList.remove(
    "show"
  );


  modal.hidden = true;


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "vaccinemaster-stock-modal-open"
  );


  console.log(
    "✖️ Vaccine Stock Modal CLOSE"
  );

}


/* =====================================================
   OPEN STOCK DETAIL
===================================================== */

async function openStockDetail(
  code
) {

  console.log(
    "🔎 OPEN STOCK DETAIL:",
    code
  );


  const vaccine =
    vaccineMasterData.find(
      item => {

        const itemCode =
          String(
            item.code ??
            item.CODE ??
            ""
          )
            .trim()
            .toUpperCase();


        return (
          itemCode ===
          String(
            code
          )
            .trim()
            .toUpperCase()
        );

      }
    );


  if (!vaccine) {

    console.error(
      "❌ Vaccine not found:",
      code
    );


    alert(
      "ไม่พบข้อมูลวัคซีน"
    );


    return;

  }


  const modal =
    document.getElementById(
      "vaccineStockDetailModal"
    );


  if (!modal) {

    console.error(
      "❌ vaccineStockDetailModal NOT FOUND"
    );

    return;

  }


  const codeEl =
    document.getElementById(
      "vaccineStockDetailCode"
    );


  const nameEl =
    document.getElementById(
      "vaccineStockDetailName"
    );


  const bodyEl =
    document.getElementById(
      "vaccineStockDetailBody"
    );


  const totalEl =
    document.getElementById(
      "vaccineStockDetailTotal"
    );


  const noteEl =
    document.getElementById(
      "vaccineStockDetailNote"
    );


  if (
    !codeEl
    ||
    !nameEl
    ||
    !bodyEl
    ||
    !totalEl
    ||
    !noteEl
  ) {

    console.error(
      "❌ Stock Detail Modal elements missing",
      {
        codeEl: !!codeEl,
        nameEl: !!nameEl,
        bodyEl: !!bodyEl,
        totalEl: !!totalEl,
        noteEl: !!noteEl
      }
    );


    return;

  }


  const vaccineCode =
    vaccine.code ??
    vaccine.CODE ??
    code;


  const vaccineName =
    vaccine.name ??
    vaccine.NAME ??
    "";


  const vaccineTHname =
    vaccine.THname ??
    vaccine.thname ??
    vaccine.THNAME ??
    "";


  /*
   * HEADER
   */

  codeEl.textContent =
    vaccineCode;


  nameEl.innerHTML = `

    <div
      class="vaccinemaster-detail-name-en"
    >
      ${escapeHtml(
        vaccineName
      )}
    </div>

    ${
      vaccineTHname
        ? `

          <div
            class="vaccinemaster-detail-thname"
          >
            ${escapeHtml(
              vaccineTHname
            )}
          </div>

        `
        : ""
    }

  `;


  /*
   * RESET
   */

  bodyEl.innerHTML = `

    <div
      class="vaccinemaster-detail-loading"
    >
      🔄 กำลังโหลด Stock...
    </div>

  `;


  totalEl.textContent =
    "0";


  noteEl.innerHTML =
    "";


  /*
   * ปิด Modal อื่น
   */
  closeMasterModal();

  closeVaccineStockModal();


  /*
   * เปิด Stock Detail
   */
  modal.hidden = false;

  modal.classList.add(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "vaccinemaster-detail-modal-open"
  );


  console.log(
    "✅ Stock Detail Modal OPEN"
  );


  /*
   * LOAD STOCK
   */

  try {

    const url =
      `/api/vaccine-master/${encodeURIComponent(
        vaccineCode
      )}/stock`;


    console.log(
      "📦 LOAD STOCK:",
      url
    );


    const response =
      await fetch(
        url,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `API HTTP ${response.status}`
      );

    }


    const result =
      await response.json();


    const stock =
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
      "✅ STOCK ROWS =",
      stock.length
    );


    renderStockDetail(
      stock,
      totalEl,
      noteEl,
      bodyEl
    );


  } catch (error) {

    console.error(
      "❌ LOAD VACCINE STOCK:",
      error
    );


    bodyEl.innerHTML = `

      <div
        class="vaccinemaster-detail-error"
      >

        ❌ ไม่สามารถโหลด Stock ได้

        <br>

        ${escapeHtml(
          error.message
        )}

      </div>

    `;

  }

}


/* =====================================================
   RENDER STOCK DETAIL
===================================================== */

function renderStockDetail(
  stock,
  totalEl,
  noteEl,
  bodyEl
) {

  if (
    !Array.isArray(stock)
    ||
    stock.length === 0
  ) {

    bodyEl.innerHTML = `

      <div
        class="vaccinemaster-no-stock"
      >
        📦 ยังไม่มีข้อมูล Stock
      </div>

    `;


    totalEl.textContent =
      "0";


    noteEl.innerHTML =
      "";


    return;

  }


  let total = 0;


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  const warningDate =
    new Date(
      today.getTime()
      +
      (
        90 *
        24 *
        60 *
        60 *
        1000
      )
    );


  const nearExpiry = [];


  const rows = [];


  for (
    const item of stock
  ) {

    const lot =
      item.lot ??
      item.LOT ??
      "-";


    const exp =
      item.exp ??
      item.EXP ??
      "";


    const qty =
      Number(
        item.quantity ??
        item.qty ??
        item.QTY ??
        item.balance ??
        item.BALANCE ??
        0
      );


    if (
      qty <= 0
    ) {

      continue;

    }


    total +=
      qty;


    const expDate =
      parseDate(
        exp
      );


    if (
      expDate
      &&
      expDate >= today
      &&
      expDate <= warningDate
    ) {

      nearExpiry.push({

        lot,

        qty

      });

    }


    rows.push({

      lot,

      exp,

      qty

    });

  }


  if (
    rows.length === 0
  ) {

    bodyEl.innerHTML = `

      <div
        class="vaccinemaster-no-stock"
      >
        📦 ยังไม่มี Stock คงเหลือ
      </div>

    `;

  }

  else {

    bodyEl.innerHTML =
      rows
        .map(
          item => `

            <div
              class="vaccinemaster-stock-line"
            >

              <span
                class="vaccinemaster-stock-lot"
              >
                LOT ${escapeHtml(
                  item.lot
                )}
              </span>


              <span
                class="vaccinemaster-stock-exp"
              >
                EXP ${escapeHtml(
                  formatDate(
                    item.exp
                  )
                )}
              </span>


              <strong
                class="vaccinemaster-stock-qty"
              >
                จำนวน ${formatNumber(
                  item.qty
                )}
              </strong>

            </div>

          `
        )
        .join("");

  }


  totalEl.textContent =
    formatNumber(
      total
    );


  if (
    nearExpiry.length > 0
  ) {

    const nearTotal =
      nearExpiry.reduce(
        (
          sum,
          item
        ) =>
          sum + item.qty,
        0
      );


    const lots =
      nearExpiry
        .map(
          item =>
            `LOT ${escapeHtml(
              item.lot
            )}`
        )
        .join(
          ", "
        );


    noteEl.innerHTML = `

      <div
        class="vaccinemaster-warning"
      >

        <div
          class="vaccinemaster-warning-title"
        >
          ⚠️ หมายเหตุ
        </div>


        <div>

          ใกล้หมดอายุ

          จำนวน

          <strong>
            ${formatNumber(
              nearTotal
            )}
          </strong>

        </div>


        <div
          class="vaccinemaster-warning-lots"
        >
          (${lots})
        </div>

      </div>

    `;

  }

  else {

    noteEl.innerHTML =
      "";

  }

}


/* =====================================================
   POPULATE VACCINE STOCK SELECT
===================================================== */

function populateVaccineStockSelect() {

  const select =
    document.getElementById(
      "vaccinemasterStockCode"
    );


  if (!select) {

    console.warn(
      "⚠️ vaccinemasterStockCode not found"
    );

    return;

  }


  const currentValue =
    select.value;


  select.innerHTML = `

    <option value="">
      เลือกวัคซีน
    </option>

  `;


  vaccineMasterData.forEach(
    vaccine => {

      const code =
        vaccine.code ??
        vaccine.CODE ??
        "";


      const name =
        vaccine.name ??
        vaccine.NAME ??
        "";


      if (!code) return;


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
   * ถ้ามี value เดิม
   */
  if (
    currentValue
  ) {

    select.value =
      currentValue;

  }


  /*
   * Event select
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


/* =====================================================
   VACCINE SELECT CHANGE
===================================================== */

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


  const vaccine =
    vaccineMasterData.find(
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


  if (!vaccine) return;


  if (nameEl) {

    nameEl.value =
      vaccine.name ??
      vaccine.NAME ??
      "";

  }


  if (thnameEl) {

    thnameEl.value =
      vaccine.THname ??
      vaccine.thname ??
      vaccine.THNAME ??
      "";

  }

}


/* =====================================================
   DEFAULT STOCK DATE
===================================================== */

function setDefaultStockDate() {

  const dateEl =
    document.getElementById(
      "vaccinemasterStockDate"
    );


  if (!dateEl) return;


  if (
    dateEl.value
  ) return;


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


/* =====================================================
   FORM SUBMIT
===================================================== */

async function handleSubmit(
  event
) {

  /*
   * ================================================
   * VACCINE MASTER FORM
   * ================================================
   */

  const masterForm =
    event.target.closest(
      "#vaccinemasterForm"
    );


  if (masterForm) {

    event.preventDefault();

    await saveVaccineMaster(
      masterForm
    );

    return;

  }


  /*
   * ================================================
   * VACCINE STOCK FORM
   * ================================================
   */

  const stockForm =
    event.target.closest(
      "#vaccinemasterStockForm"
    );


  if (stockForm) {

    event.preventDefault();

    await saveVaccineStock(
      stockForm
    );

    return;

  }

}


/* =====================================================
   SAVE VACCINE MASTER
===================================================== */

async function saveVaccineMaster(
  form
) {

  const code =
    document
      .getElementById(
        "vaccinemasterCode"
      )
      ?.value
      .trim();


  const name =
    document
      .getElementById(
        "vaccinemasterName"
      )
      ?.value
      .trim();


  const THname =
    document
      .getElementById(
        "vaccinemasterTHname"
      )
      ?.value
      .trim();


  if (!code) {

    alert(
      "กรุณาระบุ CODE"
    );

    return;

  }


  if (!name) {

    alert(
      "กรุณาระบุ NAME"
    );

    return;

  }


  if (!THname) {

    alert(
      "กรุณาระบุ THname"
    );

    return;

  }


  try {

    const editingCode =
      form.dataset.editingCode;


    let response;


    if (
      editingCode
    ) {

      response =
        await fetch(
          `/api/vaccine-master/${encodeURIComponent(
            editingCode
          )}`,
          {

            method:
              "PUT",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify({

                name,

                THname

              })

          }
        );

    }

    else {

      response =
        await fetch(
          "/api/vaccine-master",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify({

                code,

                name,

                THname

              })

          }
        );

    }


    const result =
      await response.json();


    if (
      !response.ok
    ) {

      throw new Error(
        result.message ||
        `HTTP ${response.status}`
      );

    }


    alert(
      editingCode
        ? "แก้ไขข้อมูลสำเร็จ"
        : "เพิ่มข้อมูล Vaccine Master สำเร็จ"
    );


    closeMasterModal();


    form.reset();


    delete form.dataset.editingCode;


    await loadVaccineMaster();


    populateVaccineStockSelect();


  } catch (
    error
  ) {

    console.error(
      "❌ SAVE VACCINE MASTER:",
      error
    );


    alert(
      error.message
    );

  }

}


/* =====================================================
   SAVE VACCINE STOCK
===================================================== */

async function saveVaccineStock(
  form
) {

  const code =
    document
      .getElementById(
        "vaccinemasterStockCode"
      )
      ?.value
      .trim();


  const name =
    document
      .getElementById(
        "vaccinemasterStockName"
      )
      ?.value
      .trim();


  const date =
    document
      .getElementById(
        "vaccinemasterStockDate"
      )
      ?.value
      .trim();


  const user =
    document
      .getElementById(
        "vaccinemasterStockUser"
      )
      ?.value
      .trim();


  const location =
    document
      .getElementById(
        "vaccinemasterStockLocation"
      )
      ?.value
      .trim();


  const qty =
    Number(
      document
        .getElementById(
          "vaccinemasterStockQty"
        )
        ?.value
    );


  const unit =
    document
      .getElementById(
        "vaccinemasterStockUnit"
      )
      ?.value
      .trim();


  const lot =
    document
      .getElementById(
        "vaccinemasterStockLot"
      )
      ?.value
      .trim();


  const exp =
    document
      .getElementById(
        "vaccinemasterStockExp"
      )
      ?.value
      .trim();


  const remark =
    document
      .getElementById(
        "vaccinemasterStockRemark"
      )
      ?.value
      .trim();


  if (!code) {

    alert(
      "กรุณาเลือกวัคซีน"
    );

    return;

  }


  if (!date) {

    alert(
      "กรุณาระบุวันที่รับเข้า"
    );

    return;

  }


  if (!user) {

    alert(
      "กรุณาระบุผู้รับเข้า"
    );

    return;

  }


  if (
    !qty
    ||
    qty <= 0
  ) {

    alert(
      "กรุณาระบุจำนวน"
    );

    return;

  }


  if (!lot) {

    alert(
      "กรุณาระบุ LOT"
    );

    return;

  }


  if (!exp) {

    alert(
      "กรุณาระบุวันหมดอายุ"
    );

    return;

  }


  try {

    /*
     * Endpoint สำหรับบันทึก Stock
     *
     * ถ้า backend ของคุณใช้ endpoint อื่น
     * เปลี่ยนเฉพาะ URL ตรงนี้
     */

    const response =
      await fetch(
        "/api/vaccine-master/stock",
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              type:
                "IN",

              date,

              code,

              name,

              qty,

              unit,

              lot,

              exp,

              user,

              location,

              remark

            })

        }
      );


    const result =
      await response.json();


    if (
      !response.ok
    ) {

      throw new Error(
        result.message ||
        `HTTP ${response.status}`
      );

    }


    alert(
      "บันทึก Vaccine Stock สำเร็จ"
    );


    closeVaccineStockModal();


    form.reset();


    setDefaultStockDate();


    await loadVaccineMaster();


  } catch (
    error
  ) {

    console.error(
      "❌ SAVE VACCINE STOCK:",
      error
    );


    alert(
      error.message
    );

  }

}


/* =====================================================
   EDIT VACCINE
===================================================== */

function editVaccine(
  code
) {

  const vaccine =
    vaccineMasterData.find(
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

    alert(
      "ไม่พบข้อมูลวัคซีน"
    );

    return;

  }


  openMasterModal();


  const codeEl =
    document.getElementById(
      "vaccinemasterCode"
    );


  const nameEl =
    document.getElementById(
      "vaccinemasterName"
    );


  const thnameEl =
    document.getElementById(
      "vaccinemasterTHname"
    );


  const form =
    document.getElementById(
      "vaccinemasterForm"
    );


  if (codeEl) {

    codeEl.value =
      vaccine.code ??
      vaccine.CODE ??
      "";

  }


  if (nameEl) {

    nameEl.value =
      vaccine.name ??
      vaccine.NAME ??
      "";

  }


  if (thnameEl) {

    thnameEl.value =
      vaccine.THname ??
      vaccine.thname ??
      vaccine.THNAME ??
      "";

  }


  /*
   * CODE ไม่ควรแก้ตอน Edit
   */
  if (codeEl) {

    codeEl.readOnly =
      true;

  }


  if (form) {

    form.dataset.editingCode =
      code;

  }

}


/* =====================================================
   DELETE VACCINE
===================================================== */

async function deleteVaccine(
  code
) {

  const vaccine =
    vaccineMasterData.find(
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


  const name =
    vaccine?.name ??
    vaccine?.NAME ??
    code;


  const confirmed =
    confirm(
      `ต้องการลบวัคซีน\n\n${name}\nCODE: ${code}\n\nหรือไม่?`
    );


  if (!confirmed) {

    return;

  }


  try {

    const response =
      await fetch(
        `/api/vaccine-master/${encodeURIComponent(
          code
        )}`,
        {

          method:
            "DELETE"

        }
      );


    const result =
      await response.json();


    if (
      !response.ok
    ) {

      throw new Error(
        result.message ||
        `HTTP ${response.status}`
      );

    }


    alert(
      "ลบข้อมูลสำเร็จ"
    );


    await loadVaccineMaster();


    populateVaccineStockSelect();


  } catch (
    error
  ) {

    console.error(
      "❌ DELETE VACCINE:",
      error
    );


    alert(
      error.message
    );

  }

}


/* =====================================================
   CLOSE STOCK DETAIL
===================================================== */

function closeStockDetail() {

  const modal =
    document.getElementById(
      "vaccineStockDetailModal"
    );


  if (!modal) return;


  modal.classList.remove(
    "show"
  );


  modal.hidden = true;


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "vaccinemaster-detail-modal-open"
  );


  console.log(
    "✖️ Vaccine Stock Detail CLOSE"
  );

}


/* =====================================================
   KEYBOARD
===================================================== */

function handleKeydown(
  event
) {

  if (
    event.key !==
    "Escape"
  ) {

    return;

  }


  closeMasterModal();

  closeStockDetail();

  closeVaccineStockModal();

}


/* =====================================================
   FORMAT NUMBER
===================================================== */

function formatNumber(
  value
) {

  const number =
    Number(
      value || 0
    );


  return number.toLocaleString(
    "th-TH"
  );

}


/* =====================================================
   FORMAT DATE
===================================================== */

function formatDate(
  value
) {

  if (!value) {

    return "-";

  }


  const date =
    parseDate(
      value
    );


  if (!date) {

    return String(
      value
    );

  }


  return date.toLocaleDateString(
    "th-TH",
    {

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric"

    }
  );

}


/* =====================================================
   PARSE DATE
===================================================== */

function parseDate(
  value
) {

  if (!value) {

    return null;

  }


  if (
    value instanceof Date
  ) {

    return value;

  }


  const text =
    String(
      value
    ).trim();


  /*
   * YYYY-MM-DD
   */
  const isoMatch =
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );


  if (isoMatch) {

    let year =
      Number(
        isoMatch[1]
      );


    const month =
      Number(
        isoMatch[2]
      ) - 1;


    const day =
      Number(
        isoMatch[3]
      );


    if (
      year > 2400
    ) {

      year -= 543;

    }


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


  /*
   * DD/MM/YYYY
   * DD-MM-YYYY
   */
  const parts =
    text.split(
      /[\/\-]/
    );


  if (
    parts.length === 3
  ) {

    let day =
      Number(
        parts[0]
      );


    let month =
      Number(
        parts[1]
      ) - 1;


    let year =
      Number(
        parts[2]
      );


    if (
      year > 2400
    ) {

      year -= 543;

    }


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
      &&
      date.getDate() ===
        day
      &&
      date.getMonth() ===
        month
    ) {

      return date;

    }

  }


  const date =
    new Date(
      text
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;

  }


  return date;

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
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