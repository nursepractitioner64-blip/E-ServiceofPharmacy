/* =====================================================
   INVENTORY MASTER CLIENT
   ===================================================== */

let editMode = false;
let originalEditCode = "";


/* =====================================================
   INIT
===================================================== */

export async function init() {

  console.log("🔥 INVENTORY INIT");

  injectInventoryActionStyle();

  bindBackEmergencyHome();

  hideSummary();

  bindModalEvents();

  bindTableEvents();

  await loadInventoryMaster();

}


/* =====================================================
   STYLE
===================================================== */

function injectInventoryActionStyle() {

  if (document.getElementById("inventoryActionStyle")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "inventoryActionStyle";

  style.textContent = `

    #invPage,
    #invPage button,
    #invPage input,
    #invPage select,
    #invPage textarea {

      font-family:
        "Prompt",
        "Prompt",
        sans-serif;

    }


    /* ===============================================
       HEADER ACTION
    =============================================== */

    .dsc-dispense-action-bar {

      display: flex;

      align-items: center;

      justify-content: flex-end;

      gap: 8px;

      flex-wrap: wrap;

    }


    .dsc-dispense-action-bar > .btn {

      display: inline-flex;

      align-items: center;

      justify-content: center;

      gap: 7px;

      width: 112px;

      height: 36px;

      min-height: 36px;

      padding: 0 12px;

      margin: 0;

      box-sizing: border-box;

      border-radius: 8px;

      font-family:
        "Prompt",
        "Prompt",
        sans-serif;

      font-size: 13px;

      font-weight: 500;

      line-height: 1;

      white-space: nowrap;

      cursor: pointer;

      transition:
        all .15s ease;

    }


    .dsc-dispense-action-bar > .btn i {

      font-size: 13px;

    }


    /* ===============================================
       BACK HOME
    =============================================== */

    .btn-back-home {

      border:
        1px solid #d9dee6;

      background:
        #ffffff;

      color:
        #495057;

    }


    .btn-back-home:hover {

      background:
        #f5f8fb;

      border-color:
        #adb5bd;

      color:
        #212529;

      transform:
        translateY(-1px);

      box-shadow:
        0 3px 8px rgba(0,0,0,.07);

    }


    /* ===============================================
       IMPORT
    =============================================== */

    .btn-import-inventory {

      border:
        1px solid #cfe2ff;

      background:
        #f8fbff;

      color:
        #0d6efd;

    }


    .btn-import-inventory:hover {

      background:
        #e7f1ff;

      border-color:
        #0d6efd;

      color:
        #0a58ca;

      transform:
        translateY(-1px);

      box-shadow:
        0 3px 8px rgba(13,110,253,.10);

    }


    /* ===============================================
       ADD
    =============================================== */

    .btn-add-inventory {

      border:
        1px solid #b8e0cf;

      background:
        #f5fcf8;

      color:
        #198754;

    }


    .btn-add-inventory:hover {

      background:
        #e5f7ed;

      border-color:
        #198754;

      color:
        #146c43;

      transform:
        translateY(-1px);

      box-shadow:
        0 3px 8px rgba(25,135,84,.10);

    }


    /* ===============================================
       ACTION CELL
    =============================================== */

    .action-cell {

      text-align:
        center !important;

      vertical-align:
        middle !important;

      white-space:
        nowrap;

    }


    /* ===============================================
       ACTION BUTTON
    =============================================== */

    .action-btn {

      display:
        inline-flex;

      align-items:
        center;

      justify-content:
        center;

      gap:
        6px;

      width:
        82px;

      min-width:
        82px;

      height:
        34px;

      padding:
        0 10px;

      margin:
        2px;

      box-sizing:
        border-box;

      border-radius:
        7px;

      font-family:
        "Prompt",
        "Prompt",
        sans-serif;

      font-size:
        13px;

      font-weight:
        500;

      line-height:
        1;

      white-space:
        nowrap;

      cursor:
        pointer;

      transition:
        all .15s ease;

    }


    .action-btn i {

      width:
        14px;

      font-size:
        13px;

    }


    /* ===============================================
       EDIT
    =============================================== */

    .edit-btn {

      border:
        1px solid #cfe2ff;

      background:
        #f8fbff;

      color:
        #0d6efd;

    }


    .edit-btn:hover {

      background:
        #e7f1ff;

      border-color:
        #0d6efd;

      color:
        #0a58ca;

      transform:
        translateY(-1px);

      box-shadow:
        0 3px 7px rgba(13,110,253,.12);

    }


    /* ===============================================
       DELETE
    =============================================== */

    .delete-btn {

      border:
        1px solid #f1c7cc;

      background:
        #fff8f8;

      color:
        #dc3545;

    }


    .delete-btn:hover {

      background:
        #fdecec;

      border-color:
        #dc3545;

      color:
        #b02a37;

      transform:
        translateY(-1px);

      box-shadow:
        0 3px 7px rgba(220,53,69,.12);

    }


    .action-btn:active,
    .dsc-dispense-action-bar > .btn:active {

      transform:
        translateY(0);

      box-shadow:
        none;

    }


    /* ===============================================
       MODAL
    =============================================== */

    .inv-modal {

      position:
        fixed;

      inset:
        0;

      z-index:
        9999;

      display:
        none;

      align-items:
        center;

      justify-content:
        center;

      padding:
        20px;

      box-sizing:
        border-box;

    }


    .inv-modal.active {

      display:
        flex;

    }


    .inv-modal-overlay {

      position:
        absolute;

      inset:
        0;

      background:
        rgba(15,23,42,.45);

      backdrop-filter:
        blur(2px);

    }


    .inv-modal-box {

      position:
        relative;

      z-index:
        2;

      width:
        min(520px, 100%);

      max-height:
        calc(100vh - 40px);

      overflow-y:
        auto;

      background:
        #ffffff;

      border:
        1px solid #e5e7eb;

      border-radius:
        16px;

      box-shadow:
        0 20px 60px rgba(15,23,42,.20);

      animation:
        inventoryModalIn .16s ease-out;

    }


    @keyframes inventoryModalIn {

      from {

        opacity:
          0;

        transform:
          translateY(8px) scale(.98);

      }

      to {

        opacity:
          1;

        transform:
          translateY(0) scale(1);

      }

    }


    /* ===============================================
       MODAL HEADER
    =============================================== */

    .inv-modal-header {

      display:
        flex;

      align-items:
        flex-start;

      justify-content:
        space-between;

      gap:
        15px;

      padding:
        20px 22px 17px;

      border-bottom:
        1px solid #edf0f3;

    }


    .inv-modal-header h2 {

      margin:
        0 0 5px;

      font-family:
        "Prompt",
        "Prompt",
        sans-serif;

      font-size:
        20px;

      font-weight:
        600;

      color:
        #1f2937;

    }


    .inv-modal-header p {

      margin:
        0;

      font-family:
        "Prompt",
        "Prompt",
        sans-serif;

      font-size:
        12px;

      color:
        #8a94a3;

    }


    .inv-modal-close {

      flex:
        0 0 auto;

      width:
        34px;

      height:
        34px;

      display:
        inline-flex;

      align-items:
        center;

      justify-content:
        center;

      border:
        0;

      border-radius:
        8px;

      background:
        #f5f7f9;

      color:
        #6b7280;

      cursor:
        pointer;

      transition:
        all .15s ease;

    }


    .inv-modal-close:hover {

      background:
        #feecec;

      color:
        #dc3545;

    }


    /* ===============================================
       FORM
    =============================================== */

    #inventoryForm {

      padding:
        20px 22px 22px;

    }


    .inv-form-grid {

      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        14px;

    }


    .inv-form-group {

      margin-bottom:
        15px;

    }


    .inv-form-group label {

      display:
        block;

      margin-bottom:
        6px;

      font-family:
        "Prompt",
        "Prompt",
        sans-serif;

      font-size:
        13px;

      font-weight:
        500;

      color:
        #374151;

    }


    .inv-form-group input {

      width:
        100%;

      height:
        40px;

      padding:
        0 12px;

      box-sizing:
        border-box;

      border:
        1px solid #d8dee6;

      border-radius:
        8px;

      background:
        #ffffff;

      color:
        #1f2937;

      font-family:
        "Prompt",
        "Prompt",
        sans-serif;

      font-size:
        13px;

      outline:
        none;

      transition:
        border-color .15s ease,
        box-shadow .15s ease,
        background .15s ease;

    }


    .inv-form-group input:focus {

      border-color:
        #86b7fe;

      box-shadow:
        0 0 0 3px rgba(13,110,253,.08);

      background:
        #fff;

    }


    .inv-form-group input:disabled {

      background:
        #f3f4f6;

      color:
        #6b7280;

      cursor:
        not-allowed;

    }


    /* ===============================================
       MODAL FOOTER
    =============================================== */

    .inv-modal-footer {

      display:
        flex;

      justify-content:
        flex-end;

      gap:
        8px;

      padding-top:
        5px;

      border-top:
        1px solid #edf0f3;

    }


    .inv-btn {

      display:
        inline-flex;

      align-items:
        center;

      justify-content:
        center;

      gap:
        7px;

      height:
        38px;

      min-width:
        96px;

      padding:
        0 16px;

      border-radius:
        8px;

      font-family:
        "Prompt",
        "Prompt",
        sans-serif;

      font-size:
        13px;

      font-weight:
        500;

      cursor:
        pointer;

      transition:
        all .15s ease;

    }


    .inv-btn-light {

      border:
        1px solid #d9dee6;

      background:
        #ffffff;

      color:
        #495057;

    }


    .inv-btn-light:hover {

      background:
        #f5f7f9;

    }


    .inv-btn-success {

      border:
        1px solid #198754;

      background:
        #198754;

      color:
        #ffffff;

    }


    .inv-btn-success:hover {

      background:
        #157347;

      border-color:
        #157347;

    }


    .inv-btn:disabled {

      opacity:
        .65;

      cursor:
        wait;

    }


    /* ===============================================
       MOBILE
    =============================================== */

    @media (max-width: 576px) {

      .dsc-dispense-action-bar {

        justify-content:
          flex-end;

      }


      .dsc-dispense-action-bar > .btn {

        width:
          105px;

        height:
          34px;

        min-height:
          34px;

        font-size:
          12px;

      }


      .inv-modal {

        padding:
          12px;

      }


      .inv-modal-box {

        border-radius:
          13px;

      }


      .inv-form-grid {

        grid-template-columns:
          1fr;

        gap:
          0;

      }


      .inv-modal-header {

        padding:
          17px;

      }


      #inventoryForm {

        padding:
          17px;

      }


      .action-btn {

        width:
          72px;

        min-width:
          72px;

        height:
          32px;

        font-size:
          12px;

      }

    }

  `;

  document.head.appendChild(style);

}


/* =====================================================
   HIDE SUMMARY
===================================================== */

function hideSummary() {

  const summary =
    document.querySelector(".summary-grid");

  if (summary) {
    summary.style.display = "none";
  }

}


/* =====================================================
   MODAL EVENTS
===================================================== */

function bindModalEvents() {

  const modal =
    document.getElementById("inventoryModal");

  const openBtn =
    document.getElementById("openAddInventoryModal");

  const closeBtn =
    document.getElementById("closeInventoryModalBtn");

  const cancelBtn =
    document.getElementById("cancelInventoryModal");

  const overlay =
    document.getElementById("closeInventoryModal");


  if (!modal) {

    console.warn(
      "⚠️ inventoryModal not found"
    );

    return;

  }


  /* ===============================================
     OPEN ADD
  =============================================== */

  openBtn?.addEventListener(
    "click",
    (event) => {

      event.preventDefault();
      event.stopPropagation();

      openAddModal();

    }
  );


  /* ===============================================
     SUBMIT
  =============================================== */

  const form =
    document.getElementById("inventoryForm");


  form?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();
      event.stopPropagation();

      await saveInventory();

    }
  );


  /* ===============================================
     CLOSE
  =============================================== */

  const close = () => {

    closeInventoryModal();

  };


  closeBtn?.addEventListener(
    "click",
    (event) => {

      event.preventDefault();
      event.stopPropagation();

      close();

    }
  );


  cancelBtn?.addEventListener(
    "click",
    (event) => {

      event.preventDefault();
      event.stopPropagation();

      close();

    }
  );


  overlay?.addEventListener(
    "click",
    (event) => {

      event.preventDefault();
      event.stopPropagation();

      close();

    }
  );


  /*
   * กด ESC เพื่อปิด Modal
   */

  if (!modal.dataset.keyboardBound) {

    modal.dataset.keyboardBound = "true";

    document.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Escape" &&
          modal.classList.contains("active")
        ) {

          close();

        }

      }
    );

  }

}


/* =====================================================
   OPEN ADD MODAL
===================================================== */

function openAddModal() {

  editMode = false;
  originalEditCode = "";

  resetInventoryForm();

  const modal =
    document.getElementById("inventoryModal");

  if (!modal) return;


  const title =
    document.getElementById("inventoryModalTitle");

  if (title) {

    title.textContent =
      "เพิ่มรายการ Inventory";

  }


  const codeInput =
    document.getElementById("inventoryCode");

  if (codeInput) {

    codeInput.disabled = false;

  }


  const saveBtn =
    document.getElementById("saveInventoryBtn");

  if (saveBtn) {

    saveBtn.disabled = false;

    saveBtn.innerHTML = `
      💾
      บันทึก
    `;

  }


  showModal(modal);

}


/* =====================================================
   OPEN EDIT MODAL
===================================================== */

async function editInventory(code) {

  console.log(
    "✏️ EDIT INVENTORY:",
    code
  );


  if (!code) {

    alert(
      "ไม่พบ CODE ของรายการ"
    );

    return;

  }


  try {

    const res =
      await fetch(
        `/api/inventory-master/${encodeURIComponent(code)}`,
        {
          cache: "no-store"
        }
      );


    const json =
      await res.json().catch(
        () => ({})
      );


    if (!res.ok) {

      throw new Error(
        json.message ||
        json.error ||
        `ไม่สามารถโหลดข้อมูลได้ (${res.status})`
      );

    }


    const item =
      json.data ||
      json;


    console.log(
      "📦 EDIT DATA =",
      item
    );


    const modal =
      document.getElementById("inventoryModal");


    const form =
      document.getElementById("inventoryForm");


    if (!modal || !form) {

      throw new Error(
        "ไม่พบ Inventory Modal"
      );

    }


    editMode = true;

    originalEditCode =
      String(
        item.CODE ??
        item.code ??
        code
      ).trim();


    /* ===============================================
       SET DATA
    =============================================== */

    setValue(
      [
        "inventoryCode",
        "code",
        "inventory_code"
      ],
      originalEditCode
    );


    setValue(
      [
        "inventoryName",
        "name",
        "inventory_name"
      ],
      item.NAME ??
      item.name ??
      ""
    );


    setValue(
      [
        "inventoryUnit",
        "unit",
        "inventory_unit"
      ],
      item.UNIT ??
      item.unit ??
      ""
    );


    setValue(
      [
        "inventoryRequired",
        "required",
        "inventory_required"
      ],
      item.REQUIRED ??
      item.required ??
      0
    );


    /* ===============================================
       EDIT MODE
       CODE ห้ามเปลี่ยน
    =============================================== */

    const codeInput =
      document.getElementById(
        "inventoryCode"
      );

    if (codeInput) {

      codeInput.disabled = true;

    }


    const title =
      document.getElementById(
        "inventoryModalTitle"
      );

    if (title) {

      title.textContent =
        "แก้ไขรายการ Inventory";

    }


    const saveBtn =
      document.getElementById(
        "saveInventoryBtn"
      );

    if (saveBtn) {

      saveBtn.disabled = false;

      saveBtn.innerHTML = `
        💾
        บันทึกการแก้ไข
      `;

    }


    showModal(modal);


  } catch (error) {

    console.error(
      "❌ EDIT INVENTORY ERROR:",
      error
    );


    alert(
      error.message ||
      "ไม่สามารถโหลดข้อมูลเพื่อแก้ไขได้"
    );

  }

}


/* =====================================================
   SAVE INVENTORY
   ADD  = POST
   EDIT = PUT
===================================================== */

async function saveInventory() {

  const form =
    document.getElementById(
      "inventoryForm"
    );


  if (!form) {

    console.error(
      "❌ inventoryForm not found"
    );

    return;

  }


  const code =
    String(
      form.elements.code?.value ||
      document.getElementById("inventoryCode")?.value ||
      ""
    ).trim();


  const name =
    String(
      form.elements.name?.value ||
      document.getElementById("inventoryName")?.value ||
      ""
    ).trim();


  const unit =
    String(
      form.elements.unit?.value ||
      document.getElementById("inventoryUnit")?.value ||
      ""
    ).trim();


  const required =
    Number(
      form.elements.required?.value ||
      document.getElementById("inventoryRequired")?.value ||
      0
    );


  /* ===============================================
     VALIDATION
  =============================================== */

  if (!code) {

    alert(
      "กรุณากรอก CODE"
    );

    return;

  }


  if (!name) {

    alert(
      "กรุณากรอก NAME"
    );

    return;

  }


  if (!unit) {

    alert(
      "กรุณากรอก UNIT"
    );

    return;

  }


  if (
    Number.isNaN(required) ||
    required < 0
  ) {

    alert(
      "กรุณาระบุ REQUIRED ให้ถูกต้อง"
    );

    return;

  }


  /* ===============================================
     EDIT ต้องมี CODE เดิม
  =============================================== */

  const targetCode =
    editMode &&
    originalEditCode
      ? originalEditCode
      : code;


  const saveBtn =
    document.getElementById(
      "saveInventoryBtn"
    );


  if (saveBtn) {

    saveBtn.disabled = true;

    saveBtn.innerHTML = `
      ⏳
      กำลังบันทึก...
    `;

  }


  try {

    const url =
      editMode
        ? `/api/inventory-master/${encodeURIComponent(targetCode)}`
        : "/api/inventory-master";


    const method =
      editMode
        ? "PUT"
        : "POST";


    console.log(
      "💾 SAVE INVENTORY:",
      {
        mode:
          editMode
            ? "UPDATE"
            : "INSERT",

        method,

        url,

        code:
          targetCode,

        name,

        unit,

        required

      }
    );


    const res =
      await fetch(
        url,
        {
          method,

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          body:
            JSON.stringify({

              CODE:
                targetCode,

              NAME:
                name,

              UNIT:
                unit,

              REQUIRED:
                required

            })

        }
      );


    const json =
      await res.json().catch(
        () => ({})
      );


    console.log(
      "💾 SAVE RESPONSE:",
      {
        status:
          res.status,

        ok:
          res.ok,

        json

      }
    );


    if (!res.ok) {

      throw new Error(
        json.message ||
        json.error ||
        (
          editMode
            ? `แก้ไขข้อมูลไม่สำเร็จ (${res.status})`
            : `บันทึกข้อมูลไม่สำเร็จ (${res.status})`
        )
      );

    }


    /* ===============================================
       SUCCESS
    =============================================== */

    if (editMode) {

      console.log(
        "✅ INVENTORY UPDATED:",
        json
      );

      alert(
        "แก้ไขข้อมูลสำเร็จ"
      );

    } else {

      console.log(
        "✅ INVENTORY CREATED:",
        json
      );

      alert(
        "เพิ่มรายการสำเร็จ"
      );

    }


    closeInventoryModal();

    await loadInventoryMaster();


  } catch (error) {

    console.error(
      "❌ SAVE INVENTORY ERROR:",
      error
    );


    alert(
      error.message ||
      "ไม่สามารถบันทึกข้อมูลได้"
    );


  } finally {

    if (saveBtn) {

      saveBtn.disabled = false;

      saveBtn.innerHTML =
        editMode
          ? `
            💾
            บันทึกการแก้ไข
          `
          : `
            💾
            บันทึก
          `;

    }

  }

}


/* =====================================================
   SHOW MODAL
===================================================== */

function showModal(modal) {

  if (!modal) return;

  modal.classList.add("active");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "inventory-modal-open"
  );


  /*
   * Focus หลังเปิด Modal
   */

  requestAnimationFrame(
    () => {

      const firstInput =
        modal.querySelector(
          "input:not([disabled])"
        );

      firstInput?.focus();

    }
  );

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeInventoryModal() {

  const modal =
    document.getElementById(
      "inventoryModal"
    );


  if (!modal) return;


  /*
   * ย้าย focus ออกจาก Modal ก่อน
   * ป้องกัน warning aria-hidden
   */

  const active =
    document.activeElement;


  if (
    active &&
    modal.contains(active)
  ) {

    active.blur();

  }


  modal.classList.remove(
    "active"
  );


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "inventory-modal-open"
  );


  editMode = false;

  originalEditCode = "";


  /*
   * คืนสถานะ CODE
   */

  const codeInput =
    document.getElementById(
      "inventoryCode"
    );

  if (codeInput) {

    codeInput.disabled = false;

  }

}


/* =====================================================
   RESET FORM
===================================================== */

function resetInventoryForm() {

  const form =
    document.getElementById(
      "inventoryForm"
    );


  if (form) {

    form.reset();

  }


  const codeInput =
    document.getElementById(
      "inventoryCode"
    );

  if (codeInput) {

    codeInput.disabled = false;

  }


  const title =
    document.getElementById(
      "inventoryModalTitle"
    );

  if (title) {

    title.textContent =
      "เพิ่มรายการ Inventory";

  }


  const saveBtn =
    document.getElementById(
      "saveInventoryBtn"
    );

  if (saveBtn) {

    saveBtn.disabled = false;

    saveBtn.innerHTML = `
      💾
      บันทึก
    `;

  }

}


/* =====================================================
   TABLE EVENTS
===================================================== */

function bindTableEvents() {

  const tbody =
    document.getElementById(
      "inventoryMasterTable"
    );


  if (!tbody) {

    console.warn(
      "⚠️ inventoryMasterTable not found"
    );

    return;

  }


  if (
    tbody.dataset.eventsBound ===
    "true"
  ) {

    return;

  }


  tbody.dataset.eventsBound =
    "true";


  tbody.addEventListener(
    "click",
    async (event) => {

      /*
       * สำคัญ:
       * หยุดไม่ให้ click bubble ไป SPA router
       */

      const editBtn =
        event.target.closest(
          ".edit-btn"
        );


      const deleteBtn =
        event.target.closest(
          ".delete-btn"
        );


      if (editBtn) {

        event.preventDefault();

        event.stopPropagation();

        const code =
          editBtn.dataset.code;


        if (!code) {

          console.error(
            "❌ Inventory CODE not found"
          );

          return;

        }


        await editInventory(
          code
        );

        return;

      }


      if (deleteBtn) {

        event.preventDefault();

        event.stopPropagation();

        const code =
          deleteBtn.dataset.code;


        if (!code) {

          console.error(
            "❌ Inventory CODE not found"
          );

          return;

        }


        await deleteInventory(
          code
        );

      }

    }
  );

}


/* =====================================================
   BACK EMERGENCY HOME
===================================================== */

function bindBackEmergencyHome() {

  const btn =
    document.getElementById(
      "backEmergencyHomeBtn"
    );


  if (!btn) {

    console.warn(
      "⚠️ ไม่พบ #backEmergencyHomeBtn"
    );

    return;

  }


  if (
    btn.dataset.bound ===
    "true"
  ) {

    return;

  }


  btn.dataset.bound =
    "true";


  btn.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      event.stopPropagation();


      console.log(
        "🏠 BACK TO EMERGENCY CHECKLIST"
      );


      if (
        typeof window.navigate ===
        "function"
      ) {

        window.navigate(
          "emergency-checklist"
        );

      } else {

        window.location.hash =
          "#emergency-checklist";

      }

    }
  );

}


/* =====================================================
   LOAD INVENTORY MASTER
===================================================== */

async function loadInventoryMaster() {

  const tbody =
    document.getElementById(
      "inventoryMasterTable"
    );


  if (!tbody) {

    console.warn(
      "⚠️ inventoryMasterTable not found"
    );

    return;

  }


  tbody.innerHTML = `

    <tr>

      <td
        colspan="5"
        class="text-center py-4"
      >

        <div
          class="
            spinner-border
            spinner-border-sm
            me-2
          "
        ></div>

        กำลังโหลดข้อมูล...

      </td>

    </tr>

  `;


  try {

    const res =
      await fetch(
        "/api/inventory-master",
        {
          cache:
            "no-store"
        }
      );


    const json =
      await res.json().catch(
        () => ({})
      );


    if (!res.ok) {

      throw new Error(
        json.message ||
        json.error ||
        `API ERROR ${res.status}`
      );

    }


    const rows =
      Array.isArray(json)
        ? json
        : json.data ||
          json.rows ||
          [];


    console.log(
      "📦 INVENTORY =",
      rows
    );


    if (!rows.length) {

      tbody.innerHTML = `

        <tr>

          <td
            colspan="5"
            class="
              text-center
              text-muted
              py-4
            "
          >

            ❌

            ไม่พบข้อมูล Inventory

          </td>

        </tr>

      `;

      return;

    }


    tbody.innerHTML =
      rows
        .map(
          (row) => {

            const code =
              row.CODE ??
              row.code ??
              "";


            const name =
              row.NAME ??
              row.name ??
              "-";


            const unit =
              row.UNIT ??
              row.unit ??
              "-";


            const required =
              row.REQUIRED ??
              row.required ??
              0;


            return `

              <tr>

                <td>
                  ${escapeHtml(
                    code || "-"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    name
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    unit
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    String(
                      required
                    )
                  )}
                </td>

                <td
                  class="action-cell"
                >

                  <button
                    type="button"
                    class="
                      action-btn
                      edit-btn
                    "
                    data-code="${escapeHtml(
                      code
                    )}"
                    title="แก้ไขข้อมูล"
                    aria-label="แก้ไขข้อมูล"
                  >

                    ✏️

                    <span>
                      แก้ไข
                    </span>

                  </button>


                  <button
                    type="button"
                    class="
                      action-btn
                      delete-btn
                    "
                    data-code="${escapeHtml(
                      code
                    )}"
                    title="ลบข้อมูล"
                    aria-label="ลบข้อมูล"
                  >

                    🗑️

                    <span>
                      ลบ
                    </span>

                  </button>

                </td>

              </tr>

            `;

          }
        )
        .join("");


  } catch (error) {

    console.error(
      "❌ LOAD INVENTORY ERROR:",
      error
    );


    tbody.innerHTML = `

      <tr>

        <td
          colspan="5"
          class="
            text-center
            text-danger
            py-4
          "
        >

          ❌

          ${escapeHtml(
            error.message ||
            "โหลดข้อมูลไม่สำเร็จ"
          )}

        </td>

      </tr>

    `;

  }

}


/* =====================================================
   DELETE INVENTORY
===================================================== */

async function deleteInventory(code) {

  console.log(
    "🗑 DELETE INVENTORY:",
    code
  );


  const confirmed =
    confirm(
      `ต้องการลบรายการรหัส ${code} ใช่หรือไม่?`
    );


  if (!confirmed) {

    return;

  }


  try {

    const res =
      await fetch(
        `/api/inventory-master/${encodeURIComponent(
          code
        )}`,
        {
          method:
            "DELETE",

          headers: {
            "Accept":
              "application/json"
          }
        }
      );


    const json =
      await res.json().catch(
        () => ({})
      );


    if (!res.ok) {

      throw new Error(
        json.message ||
        json.error ||
        `ลบข้อมูลไม่สำเร็จ (${res.status})`
      );

    }


    console.log(
      "✅ DELETE SUCCESS:",
      json
    );


    alert(
      "ลบข้อมูลสำเร็จ"
    );


    await loadInventoryMaster();


  } catch (error) {

    console.error(
      "❌ DELETE INVENTORY ERROR:",
      error
    );


    alert(
      error.message ||
      "ไม่สามารถลบข้อมูลได้"
    );

  }

}


/* =====================================================
   SET VALUE
===================================================== */

function setValue(
  ids,
  value
) {

  for (
    const id of ids
  ) {

    const element =
      document.getElementById(
        id
      );


    if (element) {

      element.value =
        value ?? "";

      return;

    }

  }

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


/* =====================================================
   DESTROY
===================================================== */

export function destroy() {

  console.log(
    "🧹 INVENTORY MASTER DESTROY"
  );

  editMode = false;

  originalEditCode = "";

}