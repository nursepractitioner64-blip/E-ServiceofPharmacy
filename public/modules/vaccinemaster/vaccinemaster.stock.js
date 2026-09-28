/* =========================================================
   VACCINE MASTER STOCK
   public/modules/vaccinemaster/vaccinemaster.stock.js
========================================================= */

import VM from "./vaccinemaster.shared.js";


/* =========================================================
   OPEN STOCK DETAIL
========================================================= */

async function openStockDetail(
  code
) {

  console.log(
    "🔎 OPEN STOCK DETAIL:",
    code
  );


  const vaccine =
    VM.vaccineMasterData.find(
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
    !codeEl ||
    !nameEl ||
    !bodyEl ||
    !totalEl ||
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


  /* =====================================================
     HEADER
  ===================================================== */

  codeEl.textContent =
    vaccineCode;


  nameEl.innerHTML = `

    <div
      class="vaccinemaster-detail-name-en"
    >
      ${VM.escapeHtml(
        vaccineName
      )}
    </div>

    ${
      vaccineTHname
        ? `

          <div
            class="vaccinemaster-detail-thname"
          >
            ${VM.escapeHtml(
              vaccineTHname
            )}
          </div>

        `
        : ""
    }

  `;


  /* =====================================================
     RESET
  ===================================================== */

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


  /* =====================================================
     CLOSE OTHER MODALS
  ===================================================== */

  VM.closeMasterModal();

  VM.closeVaccineStockModal();


  /* =====================================================
     OPEN DETAIL MODAL
  ===================================================== */

  modal.hidden =
    false;


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


  /* =====================================================
     LOAD STOCK
  ===================================================== */

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

        ${VM.escapeHtml(
          error.message
        )}

      </div>

    `;

  }

}


/* =========================================================
   RENDER STOCK DETAIL
========================================================= */

function renderStockDetail(
  stock,
  totalEl,
  noteEl,
  bodyEl
) {

  if (
    !Array.isArray(stock) ||
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


  let total =
    0;


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


  const nearExpiry =
    [];


  const rows =
    [];


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
      VM.parseDate(
        exp
      );


    if (
      expDate &&
      expDate >= today &&
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


  /* =====================================================
     NO BALANCE
  ===================================================== */

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


  /* =====================================================
     STOCK ROWS
  ===================================================== */

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
                LOT ${VM.escapeHtml(
                  item.lot
                )}
              </span>


              <span
                class="vaccinemaster-stock-exp"
              >
                EXP ${VM.escapeHtml(
                  VM.formatDate(
                    item.exp
                  )
                )}
              </span>


              <strong
                class="vaccinemaster-stock-qty"
              >
                จำนวน ${VM.formatNumber(
                  item.qty
                )}
              </strong>

            </div>

          `
        )
        .join("");

  }


  /* =====================================================
     TOTAL
  ===================================================== */

  totalEl.textContent =
    VM.formatNumber(
      total
    );


  /* =====================================================
     NEAR EXPIRY WARNING
  ===================================================== */

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
            `LOT ${VM.escapeHtml(
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
            ${VM.formatNumber(
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


/* =========================================================
   SAVE VACCINE STOCK
========================================================= */

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


  /* =====================================================
     VALIDATION
  ===================================================== */

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
    !qty ||
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

    /* ===================================================
       SAVE STOCK
    =================================================== */

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


    /* ===================================================
       CLOSE MODAL
    =================================================== */

    VM.closeVaccineStockModal();


    /* ===================================================
       RESET FORM
    =================================================== */

    form.reset();


    VM.setDefaultStockDate();


    /* ===================================================
       RELOAD MASTER
    =================================================== */

    await VM.loadVaccineMaster();


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


/* =========================================================
   REGISTER TO SHARED CONTEXT
========================================================= */

VM.openStockDetail =
  openStockDetail;


VM.renderStockDetail =
  renderStockDetail;


VM.saveVaccineStock =
  saveVaccineStock;