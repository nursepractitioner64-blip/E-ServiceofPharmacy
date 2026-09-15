/* =====================================================
   INVENTORY DISPENSE CLIENT
   FILE:
   /modules/inventorydispense/inventorydispense.client.js

   SOURCE:
   Sheet: INVENTORY_MOVEMENT

   DISPENSE:
   TYPE = OUT

   DRUG SELECT:
   TYPE = IN

   FILL FORM:
   CODE
   NAME
   UNIT
   LOT
   EXP

   REF NO:
   GET /api/dispense/next-refno
   Running Module:
   src/modules/running/*
===================================================== */

console.log("💊 INVENTORY DISPENSE MODULE LOADED");


/* =====================================================
   STATE
===================================================== */

let inventoryRows = [];
let dispenseRows = [];
let editingRow = null;


/* =====================================================
   INIT
===================================================== */

export async function init() {

  console.log("🔥 INVENTORY DISPENSE INIT");

  editingRow = null;

  bindEvents();

  setToday();

  await loadInventoryMovement();

  await loadDispenseData();

  console.log("✅ INVENTORY DISPENSE READY");
}


/* =====================================================
   BIND EVENTS
===================================================== */

function bindEvents() {

  const openBtn =
    document.getElementById("openDispenseBtn");

  if (openBtn && !openBtn.dataset.bound) {

    openBtn.addEventListener(
      "click",
      openDispenseModal
    );

    openBtn.dataset.bound = "true";
  }


  const closeBtn =
    document.getElementById("closeDispenseBtn");

  if (closeBtn && !closeBtn.dataset.bound) {

    closeBtn.addEventListener(
      "click",
      closeDispenseModal
    );

    closeBtn.dataset.bound = "true";
  }


  const cancelBtn =
    document.getElementById("cancelDispenseBtn");

  if (cancelBtn && !cancelBtn.dataset.bound) {

    cancelBtn.addEventListener(
      "click",
      closeDispenseModal
    );

    cancelBtn.dataset.bound = "true";
  }


  const form =
    document.getElementById("dispenseForm");

  if (form && !form.dataset.bound) {

    form.addEventListener(
      "submit",
      handleSubmit
    );

    form.dataset.bound = "true";
  }


  const drugSelect =
    document.getElementById("drugSelect");

  if (drugSelect && !drugSelect.dataset.bound) {

    drugSelect.addEventListener(
      "change",
      handleDrugChange
    );

    drugSelect.dataset.bound = "true";
  }


  const modal =
    document.getElementById("dispenseModal");

  if (modal && !modal.dataset.bound) {

    modal.addEventListener(
      "click",
      event => {

        if (event.target === modal) {

          closeDispenseModal();
        }
      }
    );

    modal.dataset.bound = "true";
  }


  console.log(
    "🔗 INVENTORY DISPENSE EVENTS BOUND"
  );
}


/* =====================================================
   SET TODAY
===================================================== */

function setToday() {

  const input =
    document.getElementById("dateIn");

  if (!input) return;

  if (input.value) return;

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  input.value =
    `${year}-${month}-${day}`;
}


/* =====================================================
   LOAD INVENTORY MOVEMENT
   SOURCE:
   INVENTORY_MOVEMENT

   ใช้เฉพาะ TYPE = IN
===================================================== */

async function loadInventoryMovement() {

  console.log(
    "📦 LOAD INVENTORY_MOVEMENT"
  );


  try {

    const response =
      await fetch(
        "/api/inventory-movement",
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `Inventory Movement API ${response.status}`
      );
    }


    const json =
      await response.json();


    let rows = [];


    if (Array.isArray(json)) {

      rows = json;

    } else {

      rows =
        json.data ||
        json.rows ||
        json.items ||
        [];
    }


    inventoryRows =
      rows.filter(row => {

        const type =
          String(
            getField(
              row,
              "TYPE"
            )
          )
            .trim()
            .toUpperCase();

        return type === "IN";
      });


    console.log(
      "📦 INVENTORY_MOVEMENT:",
      rows.length
    );


    console.log(
      "📥 IN STOCK ROWS:",
      inventoryRows.length
    );


    populateDrugSelect();


  } catch (error) {

    console.error(
      "❌ LOAD INVENTORY_MOVEMENT ERROR:",
      error
    );


    inventoryRows = [];

    populateDrugSelect();
  }
}


/* =====================================================
   POPULATE DRUG SELECT

   ดึงจาก INVENTORY_MOVEMENT
   เฉพาะ TYPE = IN

   ถ้ามีหลาย LOT
   จะแสดงแยกตาม LOT
===================================================== */

function populateDrugSelect() {

  const select =
    document.getElementById(
      "drugSelect"
    );


  if (!select) return;


  select.innerHTML = `
    <option value="">
      -- เลือกยา --
    </option>
  `;


  const uniqueRows = [];

  const seen = new Set();


  inventoryRows.forEach(row => {

    const code =
      String(
        getField(
          row,
          "CODE"
        )
      ).trim();


    const name =
      String(
        getField(
          row,
          "NAME"
        )
      ).trim();


    const unit =
      String(
        getField(
          row,
          "UNIT"
        )
      ).trim();


    const lot =
      String(
        getField(
          row,
          "LOT"
        )
      ).trim();


    const exp =
      String(
        getField(
          row,
          "EXP"
        )
      ).trim();


    if (!code) return;


    const key =
      [
        code,
        lot,
        exp
      ].join("|");


    if (seen.has(key)) return;


    seen.add(key);


    uniqueRows.push({
      code,
      name,
      unit,
      lot,
      exp,
      row
    });

  });


  uniqueRows.forEach(item => {

    const option =
      document.createElement(
        "option"
      );


    /*
     * IMPORTANT
     * ใช้ CODE|LOT|EXP เป็น value
     * เพื่อรองรับยา CODE เดียวกันหลาย LOT
     */
    option.value =
      [
        item.code,
        item.lot,
        item.exp
      ].join("|");


    let label =
      `${item.code} - ${item.name}`;


    if (item.lot) {

      label +=
        ` | LOT: ${item.lot}`;
    }


    if (item.exp) {

      label +=
        ` | EXP: ${formatDate(item.exp)}`;
    }


    option.textContent =
      label;


    option.dataset.code =
      item.code;


    option.dataset.name =
      item.name;


    option.dataset.unit =
      item.unit;


    option.dataset.lot =
      item.lot;


    option.dataset.exp =
      item.exp;


    select.appendChild(
      option
    );

  });


  console.log(
    "💊 DRUG OPTIONS:",
    uniqueRows.length
  );
}


/* =====================================================
   DRUG CHANGE

   เมื่อเลือกยา
   Fill:
   CODE
   NAME
   UNIT
   LOT
   EXP
===================================================== */

function handleDrugChange() {

  const select =
    document.getElementById(
      "drugSelect"
    );


  if (!select) return;


  const option =
    select.options[
      select.selectedIndex
    ];


  if (!option || !option.value) {

    clearDrugFields();

    setValue(
      "code",
      ""
    );

    return;
  }


  const code =
    option.dataset.code ||
    "";


  const name =
    option.dataset.name ||
    "";


  const unit =
    option.dataset.unit ||
    "";


  const lot =
    option.dataset.lot ||
    "";


  const exp =
    option.dataset.exp ||
    "";


  setValue(
    "code",
    code
  );


  setValue(
    "name",
    name
  );


  setValue(
    "unit",
    unit
  );


  setValue(
    "lot",
    lot
  );


  setValue(
    "exp",
    normalizeDate(exp)
  );


  console.log(
    "💊 DRUG SELECTED:",
    {
      code,
      name,
      unit,
      lot,
      exp
    }
  );
}


/* =====================================================
   CLEAR DRUG FIELDS
===================================================== */

function clearDrugFields() {

  setValue(
    "code",
    ""
  );


  setValue(
    "name",
    ""
  );


  setValue(
    "unit",
    ""
  );


  setValue(
    "lot",
    ""
  );


  setValue(
    "exp",
    ""
  );
}


/* =====================================================
   OPEN MODAL
===================================================== */

async function openDispenseModal() {

  console.log(
    "💊 OPEN INVENTORY DISPENSE"
  );


  const modal =
    document.getElementById(
      "dispenseModal"
    );


  if (!modal) {

    console.error(
      "❌ dispenseModal NOT FOUND"
    );

    return;
  }


  editingRow = null;


  resetForm();


  setToday();


  /*
   * REF NO ต้องสร้างจาก SERVER
   * ใช้ Running Module กลาง
   *
   * /api/dispense/next-refno
   */
  await generateRefNo();


  modal.classList.add(
    "active"
  );


  modal.style.display =
    "flex";


  modal.setAttribute(
    "aria-hidden",
    "false"
  );
}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeDispenseModal() {

  const modal =
    document.getElementById(
      "dispenseModal"
    );


  if (!modal) return;


  const activeElement =
    document.activeElement;


  if (
    activeElement &&
    modal.contains(activeElement)
  ) {

    activeElement.blur();
  }


  modal.classList.remove(
    "active"
  );


  modal.style.display =
    "none";


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  editingRow = null;
}


/* =====================================================
   RESET FORM
===================================================== */

function resetForm() {

  const form =
    document.getElementById(
      "dispenseForm"
    );


  if (!form) return;


  form.reset();


  const type =
    form.querySelector(
      '[name="type"]'
    );


  if (type) {

    type.value =
      "OUT";
  }


  setToday();
}


/* =====================================================
   GENERATE REF NO
   SERVER:
   GET /api/dispense/next-refno

   SERVER:
   dispense.controller.js
   -> running.getRefNo()

   NOTE:
   Client MUST NOT create fallback number
   because Running must be controlled centrally.
===================================================== */

async function generateRefNo() {

  const input =
    document.getElementById(
      "refNo"
    );


  if (!input) return false;


  input.value =
    "กำลังสร้าง...";


  try {

    console.log(
      "🔢 GET /api/dispense/next-refno"
    );


    const response =
      await fetch(
        "/api/dispense/next-refno",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Accept":
              "application/json"
          }
        }
      );


    const result =
      await response
        .json()
        .catch(
          () => ({})
        );


    console.log(
      "🔢 REFNO RESPONSE:",
      response.status,
      result
    );


    if (!response.ok) {

      throw new Error(
        result.message ||
        result.error ||
        `สร้างเลขที่รายการไม่สำเร็จ (${response.status})`
      );
    }


    const refNo =
      result.refNo ||
      result.ref ||
      (
        result.data &&
        (
          result.data.refNo ||
          result.data.ref ||
          result.data
        )
      );


    if (!refNo) {

      throw new Error(
        "Server ไม่ได้ส่งเลขที่รายการกลับมา"
      );
    }


    input.value =
      String(refNo);


    console.log(
      "✅ REFNO GENERATED:",
      input.value
    );


    return true;


  } catch (error) {

    console.error(
      "❌ GENERATE REFNO ERROR:",
      error
    );


    input.value =
      "";


    alert(
      error.message ||
      "ไม่สามารถสร้างเลขที่รายการได้"
    );


    return false;
  }
}


/* =====================================================
   SUBMIT
===================================================== */

async function handleSubmit(event) {

  event.preventDefault();

  event.stopPropagation();


  const form =
    event.currentTarget;


  const submitBtn =
    document.getElementById(
      "saveDispenseBtn"
    );


  if (
    submitBtn &&
    submitBtn.disabled
  ) {

    return;
  }


  const formData =
    new FormData(form);


  const data =
    Object.fromEntries(
      formData.entries()
    );


  console.log(
    "💾 INVENTORY DISPENSE DATA:",
    data
  );


  if (!data.date) {

    alert(
      "กรุณาระบุวันที่"
    );

    return;
  }


  if (!data.code) {

    alert(
      "กรุณาเลือกยา"
    );

    return;
  }


  if (
    !data.qty ||
    Number(data.qty) <= 0
  ) {

    alert(
      "กรุณาระบุจำนวนที่ถูกต้อง"
    );

    return;
  }


  if (!data.lot) {

    alert(
      "กรุณาระบุ Lot"
    );

    return;
  }


  if (!data.exp) {

    alert(
      "กรุณาระบุวันหมดอายุ"
    );

    return;
  }


  if (!data.supplier) {

    alert(
      "กรุณาระบุปลายทางการจ่าย"
    );

    return;
  }


  if (!data.user) {

    alert(
      "กรุณาระบุผู้บันทึก"
    );

    return;
  }


  /*
   * ถ้าเป็นรายการใหม่
   * ต้องมี REF NO จาก Server
   */
  if (!editingRow && !data.refNo) {

    const generated =
      await generateRefNo();


    if (!generated) {

      return;
    }


    data.refNo =
      document.getElementById(
        "refNo"
      )?.value || "";
  }


  if (!data.refNo) {

    alert(
      "ไม่พบเลขที่รายการ"
    );

    return;
  }


  if (submitBtn) {

    submitBtn.disabled =
      true;


    submitBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      กำลังบันทึก...
    `;
  }


  try {

    const payload = {

      type:
        "OUT",

      refNo:
        data.refNo,

      date:
        data.date,

      code:
        data.code,

      name:
        data.name,

      qty:
        Number(
          data.qty
        ),

      unit:
        data.unit,

      lot:
        data.lot,

      exp:
        data.exp,

      supplier:
        data.supplier,

      target:
        data.supplier,

      user:
        data.user
    };


    console.log(
      "📤 POST /api/dispense",
      payload
    );


    let response;


    /*
     * CREATE
     */
    if (!editingRow) {

      response =
        await fetch(
          "/api/dispense",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              "Accept":
                "application/json"
            },

            body:
              JSON.stringify(
                payload
              )
          }
        );

    }


    /*
     * UPDATE
     */
    else {

      const originalRefNo =
        getField(
          editingRow,
          "REF_NO"
        );


      if (!originalRefNo) {

        throw new Error(
          "ไม่พบ REF_NO ของรายการเดิม"
        );
      }


      response =
        await fetch(
          `/api/dispense/${encodeURIComponent(originalRefNo)}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
              "Accept":
                "application/json"
            },

            body:
              JSON.stringify(
                payload
              )
          }
        );
    }


    const result =
      await response
        .json()
        .catch(
          () => ({})
        );


    console.log(
      "📥 DISPENSE RESPONSE:",
      response.status,
      result
    );


    if (!response.ok) {

      throw new Error(
        result.message ||
        result.error ||
        `บันทึกไม่สำเร็จ (${response.status})`
      );
    }


    alert(
      editingRow
        ? "แก้ไขรายการสำเร็จ"
        : "บันทึกการจำหน่ายสำเร็จ"
    );


    closeDispenseModal();


    await loadDispenseData();


  } catch (error) {

    console.error(
      "❌ SAVE INVENTORY DISPENSE ERROR:",
      error
    );


    alert(
      error.message ||
      "ไม่สามารถบันทึกการจำหน่ายได้"
    );


  } finally {

    if (submitBtn) {

      submitBtn.disabled =
        false;


      submitBtn.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        บันทึกข้อมูล
      `;
    }
  }
}


/* =====================================================
   LOAD DISPENSE DATA
===================================================== */

async function loadDispenseData() {

  const tbody =
    document.getElementById(
      "dispenseTable"
    );


  if (!tbody) return;


  tbody.innerHTML = `
    <tr>
      <td
        colspan="8"
        style="text-align:center;"
      >
        กำลังโหลดข้อมูล...
      </td>
    </tr>
  `;


  try {

    console.log(
      "📋 LOAD INVENTORY DISPENSE"
    );


    const response =
      await fetch(
        "/api/dispense",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Accept":
              "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        `API ${response.status}`
      );
    }


    const json =
      await response.json();


    if (Array.isArray(json)) {

      dispenseRows =
        json;

    } else {

      dispenseRows =
        json.data ||
        json.rows ||
        json.items ||
        [];
    }


    dispenseRows =
      dispenseRows.filter(
        row => {

          const type =
            String(
              getField(
                row,
                "TYPE"
              )
            )
              .trim()
              .toUpperCase();


          return (
            type === "OUT"
          );
        }
      );


    console.log(
      "📋 DISPENSE ROWS:",
      dispenseRows.length
    );


    renderDispenseTable(
      dispenseRows
    );


  } catch (error) {

    console.error(
      "❌ LOAD DISPENSE ERROR:",
      error
    );


    tbody.innerHTML = `
      <tr>
        <td
          colspan="8"
          style="text-align:center;"
        >
          ไม่พบข้อมูลการจำหน่าย
        </td>
      </tr>
    `;
  }
}


/* =====================================================
   RENDER TABLE
===================================================== */

function renderDispenseTable(rows) {

  const tbody =
    document.getElementById(
      "dispenseTable"
    );


  if (!tbody) return;


  if (!rows.length) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="8"
          style="text-align:center;"
        >
          ยังไม่มีรายการจำหน่าย
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    rows.map(
      (row, index) => {

        const date =
          getField(
            row,
            "DATE"
          ) || "-";


        const code =
          getField(
            row,
            "CODE"
          ) || "-";


        const name =
          getField(
            row,
            "NAME"
          ) || "-";


        const qty =
          getField(
            row,
            "QTY"
          ) || "0";


        const unit =
          getField(
            row,
            "UNIT"
          ) || "-";


        const lot =
          getField(
            row,
            "LOT"
          ) || "-";


        const exp =
          getField(
            row,
            "EXP"
          ) || "-";


        return `
          <tr>

            <td>
              ${escapeHtml(
                formatDate(date)
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(code)}
              </strong>
            </td>

            <td>
              ${escapeHtml(name)}
            </td>

            <td>
              ${escapeHtml(
                String(qty)
              )}
            </td>

            <td>
              ${escapeHtml(unit)}
            </td>

            <td>
              ${escapeHtml(lot)}
            </td>

            <td>
              ${escapeHtml(
                formatDate(exp)
              )}
            </td>

            <td class="action-cell">

              <button
                type="button"
                class="action-btn edit-btn"
                data-index="${index}"
              >
                <i class="fa-solid fa-pen-to-square"></i>
                แก้ไข
              </button>

              <button
                type="button"
                class="action-btn delete-btn"
                data-index="${index}"
              >
                <i class="fa-solid fa-trash-can"></i>
                ลบ
              </button>

            </td>

          </tr>
        `;
      }
    )
    .join("");


  bindTableActions();
}


/* =====================================================
   TABLE ACTIONS
===================================================== */

function bindTableActions() {

  const tbody =
    document.getElementById(
      "dispenseTable"
    );


  if (!tbody) return;


  tbody
    .querySelectorAll(
      ".edit-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const index =
              Number(
                button.dataset.index
              );


            editDispense(
              dispenseRows[index]
            );
          }
        );
      }
    );


  tbody
    .querySelectorAll(
      ".delete-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const index =
              Number(
                button.dataset.index
              );


            deleteDispense(
              dispenseRows[index]
            );
          }
        );
      }
    );
}


/* =====================================================
   EDIT
===================================================== */

function editDispense(row) {

  if (!row) return;


  console.log(
    "✏️ EDIT INVENTORY DISPENSE:",
    row
  );


  editingRow =
    row;


  const modal =
    document.getElementById(
      "dispenseModal"
    );


  if (!modal) return;


  setValue(
    "refNo",
    getField(
      row,
      "REF_NO"
    )
  );


  setValue(
    "dateIn",
    normalizeDate(
      getField(
        row,
        "DATE"
      )
    )
  );


  /*
   * หา option จาก CODE + LOT + EXP
   */
  const select =
    document.getElementById(
      "drugSelect"
    );


  if (select) {

    const code =
      String(
        getField(
          row,
          "CODE"
        )
      ).trim();


    const lot =
      String(
        getField(
          row,
          "LOT"
        )
      ).trim();


    const exp =
      String(
        getField(
          row,
          "EXP"
        )
      ).trim();


    const option =
      Array.from(
        select.options
      ).find(
        item => {

          return (
            String(
              item.dataset.code || ""
            ).trim() === code &&

            String(
              item.dataset.lot || ""
            ).trim() === lot &&

            normalizeDate(
              item.dataset.exp || ""
            ) === normalizeDate(exp)
          );
        }
      );


    if (option) {

      select.value =
        option.value;

      handleDrugChange();

    } else {

      select.value = "";

    }
  }


  setValue(
    "name",
    getField(
      row,
      "NAME"
    )
  );


  setValue(
    "code",
    getField(
      row,
      "CODE"
    )
  );


  setValue(
    "qty",
    getField(
      row,
      "QTY"
    )
  );


  setValue(
    "unit",
    getField(
      row,
      "UNIT"
    )
  );


  setValue(
    "lot",
    getField(
      row,
      "LOT"
    )
  );


  setValue(
    "exp",
    normalizeDate(
      getField(
        row,
        "EXP"
      )
    )
  );


  setValue(
    "supplier",
    getField(
      row,
      "TARGET"
    ) ||
    getField(
      row,
      "SUPPLIER"
    )
  );


  setValue(
    "user",
    getField(
      row,
      "USER"
    )
  );


  const type =
    document.querySelector(
      '#dispenseForm [name="type"]'
    );


  if (type) {

    type.value =
      "OUT";
  }


  modal.classList.add(
    "active"
  );


  modal.style.display =
    "flex";


  modal.setAttribute(
    "aria-hidden",
    "false"
  );
}


/* =====================================================
   DELETE
===================================================== */

async function deleteDispense(row) {

  if (!row) return;


  const movementId =
    getField(
      row,
      "MOVEMENT_ID"
    );


  const refNo =
    getField(
      row,
      "REF_NO"
    );


  const target =
    movementId ||
    refNo;


  if (!target) {

    alert(
      "ไม่พบรหัสรายการสำหรับลบ"
    );

    return;
  }


  const confirmed =
    window.confirm(
      `ต้องการลบรายการ ${refNo || target} หรือไม่?`
    );


  if (!confirmed) return;


  try {

    const response =
      await fetch(
        `/api/dispense/${encodeURIComponent(target)}`,
        {
          method: "DELETE",
          headers: {
            "Accept":
              "application/json"
          }
        }
      );


    const result =
      await response
        .json()
        .catch(
          () => ({})
        );


    if (!response.ok) {

      throw new Error(
        result.message ||
        result.error ||
        `ลบไม่สำเร็จ (${response.status})`
      );
    }


    alert(
      "ลบรายการสำเร็จ"
    );


    await loadDispenseData();


  } catch (error) {

    console.error(
      "❌ DELETE DISPENSE ERROR:",
      error
    );


    alert(
      error.message ||
      "ไม่สามารถลบรายการได้"
    );
  }
}


/* =====================================================
   GET FIELD
===================================================== */

function getField(
  row,
  field
) {

  if (!row) return "";


  const target =
    String(field)
      .trim();


  const upper =
    target.toUpperCase();


  const lower =
    target.toLowerCase();


  if (
    Object.prototype.hasOwnProperty.call(
      row,
      target
    )
  ) {

    return row[target] ?? "";
  }


  if (
    Object.prototype.hasOwnProperty.call(
      row,
      upper
    )
  ) {

    return row[upper] ?? "";
  }


  if (
    Object.prototype.hasOwnProperty.call(
      row,
      lower
    )
  ) {

    return row[lower] ?? "";
  }


  const key =
    Object.keys(row)
      .find(
        item =>
          String(item)
            .trim()
            .toUpperCase() ===
          upper
      );


  return key
    ? row[key] ?? ""
    : "";
}


/* =====================================================
   SET VALUE
===================================================== */

function setValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (!element) return;


  element.value =
    value ?? "";
}


/* =====================================================
   NORMALIZE DATE
===================================================== */

function normalizeDate(value) {

  if (!value) return "";


  const text =
    String(value)
      .trim();


  if (
    /^\d{4}-\d{2}-\d{2}$/
      .test(text)
  ) {

    return text;
  }


  let match =
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );


  if (match) {

    let day =
      Number(
        match[1]
      );


    let month =
      Number(
        match[2]
      );


    let year =
      Number(
        match[3]
      );


    if (year > 2400) {

      year -= 543;
    }


    return [
      year,
      String(month)
        .padStart(
          2,
          "0"
        ),
      String(day)
        .padStart(
          2,
          "0"
        )
    ].join("-");
  }


  const isoMatch =
    text.match(
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/
    );


  if (isoMatch) {

    let year =
      Number(
        isoMatch[1]
      );


    const month =
      Number(
        isoMatch[2]
      );


    const day =
      Number(
        isoMatch[3]
      );


    if (year > 2400) {

      year -= 543;
    }


    return [
      year,
      String(month)
        .padStart(
          2,
          "0"
        ),
      String(day)
        .padStart(
          2,
          "0"
        ),
      ].join("-");
  }


  const date =
    new Date(text);


  if (
    !Number.isNaN(
      date.getTime()
    )
  ) {

    let year =
      date.getFullYear();


    if (year > 2400) {

      year -= 543;
    }


    return [
      year,
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      ),
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      )
    ].join("-");
  }


  return "";
}


/* =====================================================
   FORMAT DATE
===================================================== */

function formatDate(value) {

  if (!value) return "-";


  const normalized =
    normalizeDate(value);


  if (!normalized) {

    return String(value);
  }


  return normalized;
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


/* =====================================================
   DESTROY
===================================================== */

export function destroy() {

  console.log(
    "🧹 INVENTORY DISPENSE DESTROY"
  );


  const modal =
    document.getElementById(
      "dispenseModal"
    );


  if (modal) {

    const activeElement =
      document.activeElement;


    if (
      activeElement &&
      modal.contains(activeElement)
    ) {

      activeElement.blur();
    }


    modal.classList.remove(
      "active"
    );


    modal.style.display =
      "none";


    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }


  inventoryRows = [];

  dispenseRows = [];

  editingRow = null;
}

