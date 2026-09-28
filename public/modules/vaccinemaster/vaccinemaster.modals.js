/* =========================================================
   VACCINE MASTER MODALS
   public/modules/vaccinemaster/vaccinemaster.modals.js
========================================================= */

import VM from "./vaccinemaster.shared.js";


/* =========================================================
   BLUR ACTIVE ELEMENT
========================================================= */

function blurIfInside(element) {

  const active =
    document.activeElement;


  if (
    active &&
    element &&
    element.contains(active) &&
    typeof active.blur === "function"
  ) {

    active.blur();

  }

}


/* =========================================================
   FORCE CLOSE ALL MODALS
========================================================= */

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


      if (!modal) {

        return;

      }


      /*
       * สำคัญ:
       * เอา focus ออกจาก element ภายใน Modal
       * ก่อนตั้ง aria-hidden
       */
      blurIfInside(modal);


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


  /*
   * ล้าง class ที่ใช้ล็อกหน้า
   */
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


/* =========================================================
   OPEN VACCINE MASTER MODAL
========================================================= */

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


  /*
   * ปิด Modal อื่นก่อน
   */
  closeStockDetail();

  closeVaccineStockModal();


  /*
   * Reset Form
   */
  const form =
    document.getElementById(
      "vaccinemasterForm"
    );


  if (form) {

    form.reset();


    delete form.dataset.editingCode;

  }


  /*
   * Code สามารถกรอกได้
   */
  const codeEl =
    document.getElementById(
      "vaccinemasterCode"
    );


  if (codeEl) {

    codeEl.readOnly =
      false;

  }


  /*
   * เปิด Modal
   */
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
    "vaccinemaster-modal-open"
  );


  /*
   * Focus Code
   */
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


/* =========================================================
   CLOSE VACCINE MASTER MODAL
========================================================= */

function closeMasterModal() {

  const modal =
    document.getElementById(
      "vaccinemasterModal"
    );


  if (!modal) {

    return;

  }


  /*
   * ต้อง blur ก่อน aria-hidden
   * ป้องกัน Browser warning:
   *
   * Blocked aria-hidden...
   */
  blurIfInside(modal);


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
    "✖️ Vaccine Master Modal CLOSE"
  );

}


/* =========================================================
   OPEN VACCINE STOCK MODAL
========================================================= */

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
   * โหลด Vaccine Select
   */
  VM.populateVaccineStockSelect();


  /*
   * ตั้งวันที่
   */
  VM.setDefaultStockDate();


  /*
   * ขอเลข REF NO
   */
  VM.loadVaccineStockRefNo();


  /*
   * เปิด Modal
   */
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
    "vaccinemaster-stock-modal-open"
  );


  /*
   * Focus Vaccine Code
   */
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


/* =========================================================
   CLOSE VACCINE STOCK MODAL
========================================================= */

function closeVaccineStockModal() {

  const modal =
    document.getElementById(
      "vaccinemasterStockModal"
    );


  if (!modal) {

    return;

  }


  /*
   * Blur ก่อนซ่อน
   */
  blurIfInside(modal);


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
    "vaccinemaster-stock-modal-open"
  );


  console.log(
    "✖️ Vaccine Stock Modal CLOSE"
  );

}


/* =========================================================
   CLOSE STOCK DETAIL MODAL
========================================================= */

function closeStockDetail() {

  const modal =
    document.getElementById(
      "vaccineStockDetailModal"
    );


  if (!modal) {

    return;

  }


  /*
   * Blur ก่อนซ่อน
   */
  blurIfInside(modal);


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
    "vaccinemaster-detail-modal-open"
  );


  console.log(
    "✖️ Vaccine Stock Detail CLOSE"
  );

}


/* =========================================================
   REGISTER TO SHARED CONTEXT
========================================================= */

VM.blurIfInside =
  blurIfInside;


VM.forceCloseAllModals =
  forceCloseAllModals;


VM.openMasterModal =
  openMasterModal;


VM.closeMasterModal =
  closeMasterModal;


VM.openVaccineStockModal =
  openVaccineStockModal;


VM.closeVaccineStockModal =
  closeVaccineStockModal;


VM.closeStockDetail =
  closeStockDetail;