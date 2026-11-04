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

  const lotSelect = document.getElementById("lotSelect");

  if (lotSelect && !lotSelect.dataset.bound) {
    lotSelect.addEventListener("change", handleLotChange);
    lotSelect.dataset.bound = "true";
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


    // Keep IN and OUT movements so each LOT balance matches Vaccine Stock logic.
    inventoryRows = rows.filter(row => {
      const type = String(getField(row, "TYPE") || "").trim().toUpperCase();
      return type === "IN" || type === "OUT";
    });


    console.log(
      "📦 INVENTORY_MOVEMENT:",
      rows.length
    );


    console.log(
      "📦 BRANCH MOVEMENT ROWS:",
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
   LOT BALANCE — SAME MOVEMENT RULE AS VACCINE STOCK
   IN adds quantity; OUT subtracts quantity.
   API is already restricted to the active branch.
===================================================== */

function calculateLotBalance(code, lot, exp) {
  const wantedCode = String(code || "").trim().toUpperCase();
  const wantedLot = String(lot || "").trim();
  const wantedExp = normalizeDate(exp);

  return inventoryRows.reduce((balance, row) => {
    const rowCode = String(getField(row, "CODE") || "").trim().toUpperCase();
    const rowLot = String(getField(row, "LOT") || "").trim();
    const rowExp = normalizeDate(getField(row, "EXP") || "");
    if (rowCode !== wantedCode || rowLot !== wantedLot || rowExp !== wantedExp) return balance;

    const type = String(getField(row, "TYPE") || "").trim().toUpperCase();
    const quantity = Math.abs(Number(getField(row, "QTY") || 0));
    if (!Number.isFinite(quantity)) return balance;
    if (type === "IN") return balance + quantity;
    if (type === "OUT") return balance - quantity;
    return balance;
  }, 0);
}


/* =====================================================
   POPULATE DRUG SELECT

   ดึงจาก INVENTORY_MOVEMENT
   เฉพาะ TYPE = IN

   ถ้ามีหลาย LOT
   จะแสดงแยกตาม LOT
===================================================== */

function populateDrugSelect() {
  const select = document.getElementById("drugSelect");
  if (!select) return;

  const previousCode = select.value;
  const drugs = new Map();

  inventoryRows.forEach(row => {
    const type = String(getField(row, "TYPE") || "").trim().toUpperCase();
    if (type !== "IN") return;

    const code = String(getField(row, "CODE") || "").trim();
    if (!code) return;

    const name = String(getField(row, "NAME") || "").trim();
    const unit = String(getField(row, "UNIT") || "").trim();
    const key = code.toUpperCase();

    if (!drugs.has(key)) drugs.set(key, { code, name, unit });
  });

  const availableDrugs = [...drugs.values()].filter(drug =>
    getAvailableLots(drug.code).length > 0
  );

  select.innerHTML = '<option value="">-- เลือกรหัสยา / ชื่อยา --</option>';

  availableDrugs
    .sort((a, b) => a.code.localeCompare(b.code, "th", { numeric: true }))
    .forEach(drug => {
      const option = document.createElement("option");
      option.value = drug.code;
      option.textContent = `${drug.code} - ${drug.name}`;
      option.dataset.name = drug.name;
      option.dataset.unit = drug.unit;
      select.appendChild(option);
    });

  select.disabled = availableDrugs.length === 0;

  if (previousCode && availableDrugs.some(item => item.code === previousCode)) {
    select.value = previousCode;
    handleDrugChange();
  } else {
    select.value = "";
    clearDrugFields();
  }

  console.log("💊 AVAILABLE DRUG CODES:", availableDrugs.length);
}

/* คืน LOT ที่มีคงเหลือจริงของ CODE ที่เลือก โดยแยก LOT + EXP */
function getAvailableLots(code) {
  const lots = new Map();
  const wantedCode = String(code || "").trim().toUpperCase();

  inventoryRows.forEach(row => {
    const rowCode = String(getField(row, "CODE") || "").trim().toUpperCase();
    const type = String(getField(row, "TYPE") || "").trim().toUpperCase();
    if (rowCode !== wantedCode || type !== "IN") return;

    const lot = String(getField(row, "LOT") || "").trim();
    const expRaw = getField(row, "EXP") || "";
    const exp = normalizeDate(expRaw);
    const key = `${lot}__${exp}`;
    if (!lots.has(key)) {
      lots.set(key, {
        lot,
        exp,
        unit: String(getField(row, "UNIT") || "").trim(),
        balance: calculateLotBalance(code, lot, exp) + (
          editingRow &&
          String(getField(editingRow, "CODE") || "").trim().toUpperCase() === wantedCode &&
          String(getField(editingRow, "LOT") || "").trim() === lot &&
          normalizeDate(getField(editingRow, "EXP") || "") === exp
            ? Math.abs(Number(getField(editingRow, "QTY") || 0))
            : 0
        )
      });
    }
  });

  return [...lots.values()]
    .filter(item => item.lot && item.balance > 0)
    .sort((a, b) => {
      const expCompare = String(a.exp).localeCompare(String(b.exp));
      return expCompare || a.lot.localeCompare(b.lot, "th", { numeric: true });
    });
}

/* เลือก CODE แล้วแสดงเฉพาะ LOT ที่มีคงเหลือของ CODE นั้น */
function handleDrugChange() {
  const select = document.getElementById("drugSelect");
  const option = select?.selectedOptions?.[0];
  const code = select?.value || "";
  const lotSelect = document.getElementById("lotSelect");

  if (!code || !option) {
    clearDrugFields();
    return;
  }

  setValue("code", code);
  setValue("name", option.dataset.name || "");
  setValue("unit", option.dataset.unit || "");
  setValue("lot", "");
  setValue("exp", "");

  if (lotSelect) {
    lotSelect.innerHTML = '<option value="">-- เลือก LOT --</option>';
    getAvailableLots(code).forEach((item, index) => {
      const lotOption = document.createElement("option");
      lotOption.value = `${index}`;
      lotOption.textContent = `LOT: ${item.lot} | EXP: ${item.exp ? formatDate(item.exp) : "ไม่ระบุ"} | คงเหลือ: ${item.balance} ${item.unit || option.dataset.unit || ""}`;
      lotOption.dataset.lot = item.lot;
      lotOption.dataset.exp = item.exp;
      lotOption.dataset.balance = String(item.balance);
      lotOption.dataset.unit = item.unit || option.dataset.unit || "";
      lotSelect.appendChild(lotOption);
    });
    lotSelect.disabled = lotSelect.options.length <= 1;
    lotSelect.value = "";
  }

  console.log("💊 CODE SELECTED:", { code, availableLots: getAvailableLots(code).length });
}

/* เลือก LOT แล้วจึงเติม LOT / EXP / UNIT ให้ฟอร์ม */
function handleLotChange() {
  const select = document.getElementById("lotSelect");
  const option = select?.selectedOptions?.[0];
  if (!option || option.value === "") {
    setValue("lot", "");
    setValue("exp", "");
    return;
  }

  setValue("lot", option.dataset.lot || "");
  setValue("exp", normalizeDate(option.dataset.exp || ""));
  if (option.dataset.unit) setValue("unit", option.dataset.unit);

  console.log("📦 LOT SELECTED:", {
    code: document.getElementById("drugSelect")?.value || "",
    lot: option.dataset.lot || "",
    exp: option.dataset.exp || "",
    balance: option.dataset.balance || ""
  });
}

function clearDrugFields() {
  setValue("code", "");
  setValue("name", "");
  setValue("unit", "");
  setValue("lot", "");
  setValue("exp", "");

  const lotSelect = document.getElementById("lotSelect");
  if (lotSelect) {
    lotSelect.innerHTML = '<option value="">-- เลือก CODE ก่อน --</option>';
    lotSelect.disabled = true;
  }
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
  clearDrugFields();

  const drugSelect = document.getElementById("drugSelect");
  if (drugSelect) drugSelect.value = "";

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


  // เลือก CODE ก่อน แล้วจึงเลือก LOT ที่ตรงกับรายการเดิม
  const select = document.getElementById("drugSelect");
  const code = String(getField(row, "CODE") || "").trim();
  const lot = String(getField(row, "LOT") || "").trim();
  const exp = normalizeDate(getField(row, "EXP") || "");

  if (select) {
    select.value = code;
    handleDrugChange();

    const lotSelect = document.getElementById("lotSelect");
    if (lotSelect) {
      const lotOption = Array.from(lotSelect.options).find(item =>
        String(item.dataset.lot || "").trim() === lot &&
        normalizeDate(item.dataset.exp || "") === exp
      );
      if (lotOption) {
        lotSelect.value = lotOption.value;
        handleLotChange();
      }
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
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    let year = Number(match[1]);
    if (year > 2400) year -= 543;
    return `${year}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`;
  }

  // Vaccine Stock convention: MM/DD/YYYY.
  match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = Number(match[3]);
    if (year > 2400) year -= 543;
    if (month < 1 || month > 12 || day < 1 || day > 31) return raw;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    let year = parsed.getFullYear();
    if (year > 2400) year -= 543;
    return `${year}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return raw;
}

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

