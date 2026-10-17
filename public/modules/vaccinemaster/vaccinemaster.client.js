/* =========================================================
   VACCINE MASTER MAIN CLIENT

   FILE:
   public/modules/vaccinemaster/vaccinemaster.client.js

   หน้าที่:
   - ควบคุมหน้า Vaccine Master
   - เปิด vaccinemasteritem.html
   - เปิด Vaccine Stock
   - เปิด Stock Detail
   - Edit / Delete
   - Refresh
   - Submit Form
   - ใช้ Central SPA Navigation ของ app.js
========================================================= */

import VM from "./vaccinemaster.shared.js";

import "./vaccinemaster.modals.js";
import "./vaccinemaster.api.js";
import "./vaccinemaster.table.js";
import "./vaccinemaster.stock.js";
import "./vaccinemaster.crud.js";
import "./vaccinemaster.utils.js";


/* =========================================================
   CONFIG
========================================================= */

const VACCINE_MASTER_ITEM_VIEW =
  "/views/vaccinemasteritem.html";


/* =========================================================
   INIT
========================================================= */

async function init() {

  console.log("💉 Vaccine Master init()");

  VM.moduleActive = true;

  const page =
    document.getElementById(
      "vaccinemasterPage"
    );

  if (!page) {

    console.error(
      "❌ #vaccinemasterPage NOT FOUND"
    );

    return;

  }

  console.log(
    "✅ #vaccinemasterPage FOUND"
  );


  /* =====================================================
     BIND EVENTS
  ===================================================== */

  if (!VM.initialized) {

    bindEvents();

    VM.initialized = true;

  }


  /* =====================================================
     WAIT DOM
  ===================================================== */

  await new Promise(resolve => {

    requestAnimationFrame(() => {

      requestAnimationFrame(resolve);

    });

  });


  /* =========================================================
     LOAD VACCINE MASTER
  ========================================================= */

  try {

    console.log(
      "📦 START LOAD VACCINE MASTER"
    );


    await VM.loadVaccineMaster();


    console.log(
      "✅ LOAD VACCINE MASTER COMPLETE"
    );


    console.log(
      "📦 DATA:",
      VM.vaccineMasterData
    );


    /* =====================================================
       FORCE RENDER
    ===================================================== */

    if (
      typeof VM.renderTable ===
      "function"
    ) {

      VM.renderTable(
        VM.vaccineMasterData
      );


      console.log(
        "✅ VACCINE MASTER TABLE RENDERED"
      );

    } else {

      console.error(
        "❌ VM.renderTable() NOT FOUND"
      );

    }

  } catch (error) {

    console.error(
      "❌ LOAD VACCINE MASTER:",
      error
    );

  }


  /* =====================================================
     STOCK SELECT
  ===================================================== */

  if (
    typeof VM.populateVaccineStockSelect ===
    "function"
  ) {

    VM.populateVaccineStockSelect();

  }


  console.log(
    "✅ Vaccine Master ready"
  );

  const refreshHistoryBtn = document.getElementById(
  "refreshVaccineDispenseHistoryBtn"
);

if (refreshHistoryBtn && !refreshHistoryBtn.dataset.bound) {
  refreshHistoryBtn.dataset.bound = "true";

  refreshHistoryBtn.addEventListener("click", () => {
    loadVaccineDispenseHistory();
  });
}

// โหลดประวัติเมื่อเปิดหน้า
loadVaccineDispenseHistory();

}


/* =========================================================
   BIND EVENTS
========================================================= */

function bindEvents() {

  console.log(
    "🔗 Vaccine Master events binding"
  );


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


  console.log(
    "✅ Vaccine Master events bound"
  );

}


/* =========================================================
   DESTROY
========================================================= */

function destroy() {

  console.log(
    "🧹 Vaccine Master destroy()"
  );


  VM.moduleActive = false;


  document.removeEventListener(
    "click",
    handleClick,
    false
  );


  document.removeEventListener(
    "submit",
    handleSubmit,
    false
  );


  document.removeEventListener(
    "keydown",
    handleKeydown,
    false
  );


  if (
    typeof VM.forceCloseAllModals ===
    "function"
  ) {

    VM.forceCloseAllModals();

  }


  VM.vaccineMasterData = [];

  VM.initialized = false;

}


/* =========================================================
   CENTRAL SPA NAVIGATION
========================================================= */

function navigateByRoute(
  route
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const targetRoute =
        String(
          route || ""
        ).trim();


      if (!targetRoute) {

        reject(
          new Error(
            "Route is required"
          )
        );

        return;

      }


      console.log(
        `🧭 VACCINE MASTER NAVIGATE: ${targetRoute}`
      );


      /* =====================================================
         EXISTING DATA ROUTE
      ===================================================== */

      const existing =
        document.querySelector(
          `[data-route="${CSS.escape(targetRoute)}"]`
        );


      if (existing) {

        existing.click();

        resolve();

        return;

      }


      /* =====================================================
         CREATE TEMP NAVIGATION BUTTON
      ===================================================== */

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.setAttribute(
        "data-route",
        targetRoute
      );


      button.style.display =
        "none";


      document.body.appendChild(
        button
      );


      button.click();


      setTimeout(
        () => {

          if (
            button.parentNode
          ) {

            button.parentNode.removeChild(
              button
            );

          }

        },
        100
      );


      resolve();

    }
  );

}


/* =========================================================
   OPEN VACCINE MASTER ITEM PAGE
========================================================= */

async function openVaccineMasterItem() {

  console.log(
    "🧾 OPEN VACCINE MASTER ITEM"
  );


  try {

    /* =====================================================
       LOAD VIEW HTML
    ===================================================== */

    const response =
      await fetch(
        VACCINE_MASTER_ITEM_VIEW,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status} - ${VACCINE_MASTER_ITEM_VIEW}`
      );

    }


    const html =
      await response.text();


    if (!html.trim()) {

      throw new Error(
        "vaccinemasteritem.html ไม่มีเนื้อหา"
      );

    }


    /* =====================================================
       FIND SPA CONTENT CONTAINER
    ===================================================== */

    const container =
      document.querySelector(
        "#app"
      ) ||
      document.querySelector(
        "#appContent"
      ) ||
      document.querySelector(
        "#pageContent"
      ) ||
      document.querySelector(
        ".app-content"
      );


    if (!container) {

      throw new Error(
        "ไม่พบ SPA content container"
      );

    }


    /* =====================================================
       HIDE OLD VACCINE MASTER PAGE
    ===================================================== */

    const vaccineMasterPage =
      document.getElementById(
        "vaccinemasterPage"
      );


    if (vaccineMasterPage) {

      vaccineMasterPage.style.display =
        "none";

    }


    /* =====================================================
       LOAD ITEM VIEW
    ===================================================== */

    container.innerHTML =
      html;


    console.log(
      "✅ VACCINE MASTER ITEM VIEW LOADED"
    );


    /* =====================================================
       WAIT DOM READY
    ===================================================== */

    await new Promise(resolve => {

      requestAnimationFrame(() => {

        requestAnimationFrame(resolve);

      });

    });


    /* =====================================================
       LOAD VACCINE MASTER DATA
    ===================================================== */

    console.log(
      "📦 AUTO LOAD VACCINE MASTER ITEM TABLE"
    );


    if (
      typeof VM.loadVaccineMaster ===
      "function"
    ) {

      await VM.loadVaccineMaster();


      console.log(
        "✅ VACCINE MASTER ITEM TABLE LOADED"
      );

    } else {

      console.error(
        "❌ VM.loadVaccineMaster() NOT FOUND"
      );

    }


    /* =====================================================
       POPULATE STOCK SELECT
    ===================================================== */

    if (
      typeof VM.populateVaccineStockSelect ===
      "function"
    ) {

      VM.populateVaccineStockSelect();

    }


    /* =====================================================
       SET DEFAULT STOCK DATE
    ===================================================== */

    if (
      typeof VM.setDefaultStockDate ===
      "function"
    ) {

      VM.setDefaultStockDate();

    }


    /* =====================================================
       DISPATCH ITEM VIEW LOADED
    ===================================================== */

    document.dispatchEvent(
      new CustomEvent(
        "vaccinemasteritem:loaded"
      )
    );


    console.log(
      "🎉 VACCINE MASTER ITEM READY"
    );

  } catch (error) {

    console.error(
      "❌ OPEN VACCINE MASTER ITEM:",
      error
    );


    alert(
      "ไม่สามารถเปิดหน้า Vaccine Master Item ได้\n\n" +
      error.message
    );

  }

}


/* =========================================================
   DIRECT OPEN MASTER MODAL
========================================================= */

function openMasterModalDirect() {

  const modal =
    document.getElementById(
      "vaccinemasterModal"
    );


  if (!modal) {

    console.error(
      "❌ #vaccinemasterModal NOT FOUND"
    );

    return;

  }


  console.log(
    "➕💉 OPEN ADD VACCINE MASTER MODAL"
  );


  /* =====================================================
     CLOSE STOCK MODAL
  ===================================================== */

  const stockModal =
    document.getElementById(
      "vaccinemasterStockModal"
    );


  if (stockModal) {

    stockModal.classList.remove(
      "show"
    );

    stockModal.hidden =
      true;

    stockModal.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  /* =====================================================
     CLOSE DETAIL MODAL
  ===================================================== */

  const detailModal =
    document.getElementById(
      "vaccineStockDetailModal"
    );


  if (detailModal) {

    detailModal.classList.remove(
      "show"
    );

    detailModal.hidden =
      true;

    detailModal.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  /* =====================================================
     RESET FORM
  ===================================================== */

  const form =
    document.getElementById(
      "vaccinemasterForm"
    );


  if (form) {

    form.reset();

    delete form.dataset.editingCode;

  }


  /* =====================================================
     CODE EDITABLE
  ===================================================== */

  const code =
    document.getElementById(
      "vaccinemasterCode"
    );


  if (code) {

    code.readOnly =
      false;

  }


  /* =====================================================
     OPEN
  ===================================================== */

  modal.hidden =
    false;


  modal.removeAttribute(
    "hidden"
  );


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


  /* =====================================================
     FOCUS
  ===================================================== */

  setTimeout(
    () => {

      const input =
        document.getElementById(
          "vaccinemasterCode"
        );


      if (input) {

        input.focus();

      }

    },
    50
  );


  console.log(
    "✅ ADD VACCINE MASTER MODAL OPENED"
  );

}


/* =========================================================
   DIRECT CLOSE MASTER MODAL
========================================================= */

function closeMasterModalDirect() {

  const modal =
    document.getElementById(
      "vaccinemasterModal"
    );


  if (!modal) {

    return;

  }


  const active =
    document.activeElement;


  if (
    active &&
    modal.contains(active) &&
    typeof active.blur ===
      "function"
  ) {

    active.blur();

  }


  modal.classList.remove(
    "show"
  );


  modal.hidden =
    true;


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "vaccinemaster-modal-open"
  );


  console.log(
    "✖️ Vaccine Master Modal CLOSED"
  );

}


/* =========================================================
   HANDLE CLICK
========================================================= */

async function handleClick(
  event
) {



  /* =======================================================
     VACCINE MASTER ITEM
  ======================================================= */

  const vaccineMasterItemBtn =
    event.target.closest(
      "#openVaccineMasterItem"
    );


  if (
    vaccineMasterItemBtn
  ) {

    event.preventDefault();

    event.stopImmediatePropagation();


    console.log(
      "🖱️ CLICK: VACCINE MASTER ITEM"
    );


    await openVaccineMasterItem();


    return;

  }


  /* =======================================================
     LEGACY ADD VACCINE MASTER MODAL
  ======================================================= */

  const masterOpenBtn =
    event.target.closest(
      "#openAddvaccinemasterModal"
    );


  if (
    masterOpenBtn
  ) {

    event.preventDefault();

    event.stopImmediatePropagation();


    console.log(
      "🖱️ CLICK: ADD VACCINE MASTER MODAL"
    );


    openMasterModalDirect();


    return;

  }


  /* =======================================================
     REPORT
  ======================================================= */

  const reportBtn =
    event.target.closest(
      "#openVaccineReportBtn"
    );


  if (
    reportBtn
  ) {

    event.preventDefault();

    event.stopImmediatePropagation();


    console.log(
      "📊 CLICK: VACCINE REPORT"
    );


    return;

  }


  /* =======================================================
     VACCINE STOCK
  ======================================================= */

  const stockBtn =
    event.target.closest(
      "#openVaccinemasterStockModal"
    );


  if (
    stockBtn
  ) {

    event.preventDefault();

    event.stopImmediatePropagation();


    if (
      typeof VM.openVaccineStockModal ===
      "function"
    ) {

      VM.openVaccineStockModal();

    } else {

      console.error(
        "❌ VM.openVaccineStockModal() NOT FOUND"
      );

    }


    return;

  }


  /* =======================================================
     STOCK DETAIL
  ======================================================= */

  const detailBtn =
    event.target.closest(
      "[data-vaccinemaster-detail]"
    );


  if (
    detailBtn
  ) {

    event.preventDefault();

    event.stopImmediatePropagation();


    const code =
      detailBtn.getAttribute(
        "data-vaccinemaster-detail"
      );


    if (!code) {

      console.error(
        "❌ Vaccine code is empty"
      );

      return;

    }


    if (
      typeof VM.openStockDetail ===
      "function"
    ) {

      await VM.openStockDetail(
        code
      );

    } else {

      console.error(
        "❌ VM.openStockDetail() NOT FOUND"
      );

    }


    return;

  }


  /* =======================================================
     VACCINE MASTER EDIT / DELETE
     
     รองรับทั้งรูปแบบใหม่:

       data-action="edit"
       data-code="..."

       data-action="delete"
       data-code="..."

     และรูปแบบเดิม:

       data-vaccinemaster-edit="..."
       data-vaccinemaster-delete="..."
  ======================================================= */

  const vaccineMasterActionBtn =
    event.target.closest(
      [
        ".vaccinemaster-icon-btn[data-action][data-code]",
        "[data-vaccinemaster-edit]",
        "[data-vaccinemaster-delete]"
      ].join(",")
    );


  if (
    vaccineMasterActionBtn
  ) {

    event.preventDefault();

    event.stopImmediatePropagation();


    let action =
      String(
        vaccineMasterActionBtn.getAttribute(
          "data-action"
        ) || ""
      )
        .trim()
        .toLowerCase();


    let code =
      String(
        vaccineMasterActionBtn.getAttribute(
          "data-code"
        ) || ""
      )
        .trim();


    /* =====================================================
       LEGACY EDIT
    ===================================================== */

    if (
      !action &&
      vaccineMasterActionBtn.hasAttribute(
        "data-vaccinemaster-edit"
      )
    ) {

      action =
        "edit";


      code =
        String(
          vaccineMasterActionBtn.getAttribute(
            "data-vaccinemaster-edit"
          ) || ""
        )
          .trim();

    }


    /* =====================================================
       LEGACY DELETE
    ===================================================== */

    if (
      !action &&
      vaccineMasterActionBtn.hasAttribute(
        "data-vaccinemaster-delete"
      )
    ) {

      action =
        "delete";


      code =
        String(
          vaccineMasterActionBtn.getAttribute(
            "data-vaccinemaster-delete"
          ) || ""
        )
          .trim();

    }


    console.log(
      "🖱️ VACCINE MASTER ACTION:",
      {
        action,
        code
      }
    );


    /* =====================================================
       CHECK CODE
    ===================================================== */

    if (!code) {

      console.error(
        "❌ Vaccine Master CODE is empty"
      );

      return;

    }


    /* =====================================================
       EDIT
    ===================================================== */

    if (
      action === "edit"
    ) {

      console.log(
        "✏️ EDIT VACCINE MASTER:",
        code
      );


      if (
        typeof VM.editVaccine !==
        "function"
      ) {

        console.error(
          "❌ VM.editVaccine() NOT FOUND"
        );

        return;

      }


      try {

        await VM.editVaccine(
          code
        );


        console.log(
          "✅ EDIT VACCINE MASTER COMPLETE:",
          code
        );

      } catch (error) {

        console.error(
          "❌ EDIT VACCINE MASTER:",
          error
        );


        alert(
          "ไม่สามารถแก้ไข Vaccine Master ได้\n\n" +
          error.message
        );

      }


      return;

    }


    /* =====================================================
       DELETE
    ===================================================== */

    if (
      action === "delete"
    ) {

      console.log(
        "🗑️ DELETE VACCINE MASTER:",
        code
      );


      if (
        typeof VM.deleteVaccine !==
        "function"
      ) {

        console.error(
          "❌ VM.deleteVaccine() NOT FOUND"
        );

        return;

      }


      try {

        await VM.deleteVaccine(
          code
        );


        console.log(
          "✅ DELETE VACCINE MASTER COMPLETE:",
          code
        );

      } catch (error) {

        console.error(
          "❌ DELETE VACCINE MASTER:",
          error
        );


        alert(
          "ไม่สามารถลบ Vaccine Master ได้\n\n" +
          error.message
        );

      }


      return;

    }


    console.warn(
      "⚠️ Unknown Vaccine Master action:",
      action
    );


    return;

  }


  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshBtn =
    event.target.closest(
      "#refreshVaccinemasterBtn"
    );


  if (
    refreshBtn
  ) {

    event.preventDefault();

    event.stopImmediatePropagation();


    if (
      typeof VM.loadVaccineMaster ===
      "function"
    ) {

      await VM.loadVaccineMaster();

    }


    const stockCodeSelect =
      document.getElementById(
        "vaccinemasterStockCode"
      );


    if (
      stockCodeSelect &&
      typeof VM.populateVaccineStockSelect ===
        "function"
    ) {

      VM.populateVaccineStockSelect();

    }


    return;

  }


  /* =======================================================
     MASTER MODAL CLOSE
  ======================================================= */

  if (
    event.target.closest(
      "#closeVaccinemasterModalBtn"
    ) ||
    event.target.closest(
      "#cancelVaccinemasterModal"
    ) ||
    event.target.closest(
      "#closeVaccinemasterModal"
    )
  ) {

    event.preventDefault();


    closeMasterModalDirect();


    return;

  }


  /* =======================================================
     STOCK DETAIL CLOSE
  ======================================================= */

  if (
    event.target.closest(
      "#closeVaccineStockDetailModal"
    ) ||
    event.target.closest(
      "#closeVaccineStockDetailModalBtn"
    ) ||
    event.target.closest(
      "#closeVaccineStockDetailOverlay"
    )
  ) {

    event.preventDefault();


    if (
      typeof VM.closeStockDetail ===
      "function"
    ) {

      VM.closeStockDetail();

    }


    return;

  }


  /* =======================================================
     VACCINE STOCK CLOSE
  ======================================================= */

  if (
    event.target.closest(
      "#closeVaccinemasterStockModal"
    ) ||
    event.target.closest(
      "#cancelVaccinemasterStockModal"
    )
  ) {

    event.preventDefault();


    if (
      typeof VM.closeVaccineStockModal ===
      "function"
    ) {

      VM.closeVaccineStockModal();

    }


    return;

  }


  /* =======================================================
     BACK HOME
  ======================================================= */

  const backHomeBtn =
    event.target.closest(
      "#backEmergencyHomeBtn"
    );


  if (
    backHomeBtn
  ) {

    event.preventDefault();

    event.stopImmediatePropagation();


    console.log(
      "🏠 CLICK: BACK HOME"
    );


    try {

      await navigateByRoute(
        "dashboard"
      );


      console.log(
        "✅ BACK HOME → dashboard"
      );

    } catch (error) {

      console.error(
        "❌ BACK HOME:",
        error
      );

    }


    return;

  }

}


/* =========================================================
   HANDLE SUBMIT
========================================================= */

async function handleSubmit(
  event
) {

  if (!VM.moduleActive) {

    return;

  }


  /* =======================================================
     VACCINE MASTER FORM
  ======================================================= */

  const masterForm =
    event.target.closest(
      "#vaccinemasterForm"
    );


  if (
    masterForm
  ) {

    event.preventDefault();


    console.log(
      "💾 SUBMIT VACCINE MASTER"
    );


    if (
      typeof VM.saveVaccineMaster ===
      "function"
    ) {

      await VM.saveVaccineMaster(
        masterForm
      );

    } else {

      console.error(
        "❌ VM.saveVaccineMaster() NOT FOUND"
      );

    }


    return;

  }


  /* =======================================================
     VACCINE STOCK FORM
  ======================================================= */

  const stockForm =
    event.target.closest(
      "#vaccinemasterStockForm"
    );


  if (
    stockForm
  ) {

    event.preventDefault();


    console.log(
      "💾 SUBMIT VACCINE STOCK"
    );


    if (
      typeof VM.saveVaccineStock ===
      "function"
    ) {

      await VM.saveVaccineStock(
        stockForm
      );

    } else {

      console.error(
        "❌ VM.saveVaccineStock() NOT FOUND"
      );

    }


    return;

  }

}


/* =========================================================
   ESC KEY
========================================================= */

function handleKeydown(
  event
) {

  if (!VM.moduleActive) {

    return;

  }


  if (
    event.key !==
    "Escape"
  ) {

    return;

  }


  closeMasterModalDirect();


  if (
    typeof VM.closeStockDetail ===
    "function"
  ) {

    VM.closeStockDetail();

  }


  if (
    typeof VM.closeVaccineStockModal ===
    "function"
  ) {

    VM.closeVaccineStockModal();

  }

}

/* =========================================================
   VACCINE DISPENSE HISTORY
   Source: VACCINE_MOVEMENT
   Filter: TYPE = OUT
========================================================= */

async function loadVaccineDispenseHistory() {
  const tbody = document.getElementById("vrDispenseHistoryBody");
  const countEl = document.getElementById("vrHistoryCount");

  if (!tbody) {
    console.warn("ไม่พบ vrDispenseHistoryBody");
    return;
  }

  const escapeHistoryHtml = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const displayDate = value => {
    if (!value) return "-";

    const text = String(value).trim();
    const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (match) {
      return `${match[3].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[1]}`;
    }

    return text;
  };

  tbody.innerHTML = `
    <tr>
      <td colspan="11" class="text-center py-4">
        กำลังโหลดประวัติการจ่ายวัคซีน...
      </td>
    </tr>
  `;

  try {
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
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.message || "ไม่สามารถโหลดข้อมูลได้"
      );
    }

    // กรองซ้ำที่หน้าเว็บเพื่อแสดงเฉพาะ TYPE = OUT
    const rows = (Array.isArray(result.data) ? result.data : [])
      .filter(row =>
        String(row.type ?? row.TYPE ?? "")
          .trim()
          .toUpperCase() === "OUT"
      );

    if (countEl) {
      countEl.textContent = rows.length.toLocaleString("th-TH");
    }

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center py-4 text-muted">
            ยังไม่มีประวัติการจ่ายวัคซีน
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(row => {
      const date = row.date ?? row.DATE;
      const refNo = row.refNo ?? row.REF_NO;
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
          <td>${escapeHistoryHtml(displayDate(date))}</td>
          <td>${escapeHistoryHtml(refNo || "-")}</td>
          <td>${escapeHistoryHtml(code || "-")}</td>
          <td>${escapeHistoryHtml(name || "-")}</td>
          <td>${escapeHistoryHtml(lot || "-")}</td>
          <td>${escapeHistoryHtml(displayDate(exp))}</td>
          <td class="text-end">${escapeHistoryHtml(qty ?? 0)}</td>
          <td>${escapeHistoryHtml(unit || "-")}</td>
          <td>${escapeHistoryHtml(target || "-")}</td>
          <td>${escapeHistoryHtml(user || "-")}</td>
          <td>${escapeHistoryHtml(location || "-")}</td>
        </tr>
      `;
    }).join("");

  } catch (error) {
    console.error(
      "❌ Load Vaccine Dispense History:",
      error
    );

    if (countEl) {
      countEl.textContent = "0";
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center text-danger py-4">
          โหลดประวัติการจ่ายวัคซีนไม่สำเร็จ
          <br>
          <small>${escapeHistoryHtml(error.message)}</small>
        </td>
      </tr>
    `;
  }
}


/* =========================================================
   EXPORT
========================================================= */

export {
  init,
  destroy
};