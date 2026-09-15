/* =====================================================
INIT
===================================================== */
export async function init() {
  console.log("🔥 INVENTORY INIT");

  hideSummary();
  bindModalEvents();
  bindTableEvents();

  await loadInventoryMaster();
}

/* =====================================================
HIDE SUMMARY
===================================================== */
function hideSummary() {
  const summary = document.querySelector(".summary-grid");

  if (summary) {
    summary.style.display = "none";
  }
}

/* =====================================================
MODAL
===================================================== */
function bindModalEvents() {

  const modal = document.getElementById("inventoryModal");
  const openBtn = document.getElementById("openAddInventoryModal");
  const closeBtn = document.getElementById("closeInventoryModalBtn");
  const cancelBtn = document.getElementById("cancelInventoryModal");

  if (!modal) {
    console.warn("⚠️ inventoryModal not found");
    return;
  }

  /* OPEN */
  openBtn?.addEventListener("click", () => {
    modal.classList.add("active");
  });

    /* =====================================================
     FORM SUBMIT
  ===================================================== */

  const form = document.getElementById("inventoryForm");

  form?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const code = form.elements.code?.value.trim();
    const name = form.elements.name?.value.trim();
    const unit = form.elements.unit?.value.trim();
    const required = Number(form.elements.required?.value || 0);

    if (!code || !name || !unit) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    const saveBtn = document.getElementById("saveInventoryBtn");

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        กำลังบันทึก...
      `;
    }

    try {

      const res = await fetch("/api/inventory-master", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          CODE: code,
          NAME: name,
          UNIT: unit,
          REQUIRED: required
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.message ||
          json.error ||
          "บันทึกข้อมูลไม่สำเร็จ"
        );
      }

      console.log("✅ INVENTORY SAVED:", json);

      alert("เพิ่มรายการสำเร็จ");

      form.reset();

      closeModal();

      await loadInventoryMaster();

    } catch (err) {

      console.error(
        "❌ SAVE INVENTORY ERROR:",
        err
      );

      alert(
        err.message ||
        "ไม่สามารถบันทึกข้อมูลได้"
      );

    } finally {

      if (saveBtn) {

        saveBtn.disabled = false;

        saveBtn.innerHTML = `
          <i class="fa-solid fa-floppy-disk"></i>
          บันทึก
        `;
      }
    }

  });

  /* CLOSE */
  function closeModal() {
    modal.classList.remove("active");
  }

  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

/* =====================================================
TABLE EVENTS
ใช้ Event Delegation แทน onclick
===================================================== */
function bindTableEvents() {

  const tbody = document.getElementById("inventoryMasterTable");

  if (!tbody) {
    console.warn("⚠️ inventoryMasterTable not found");
    return;
  }

  tbody.addEventListener("click", async (e) => {

    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");

    /* =========================
       EDIT
    ========================= */
    if (editBtn) {

      const code = editBtn.dataset.code;

      if (!code) {
        console.error("❌ Inventory CODE not found");
        return;
      }

      await editInventory(code);
      return;
    }

    /* =========================
       DELETE
    ========================= */
    if (deleteBtn) {

      const code = deleteBtn.dataset.code;

      if (!code) {
        console.error("❌ Inventory CODE not found");
        return;
      }

      await deleteInventory(code);
    }
  });
}

/* =====================================================
LOAD INVENTORY MASTER
===================================================== */
async function loadInventoryMaster() {

  const tbody = document.getElementById("inventoryMasterTable");

  if (!tbody) {
    console.warn("⚠️ inventoryMasterTable not found");
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4">
        <div class="spinner-border spinner-border-sm me-2"></div>
        กำลังโหลดข้อมูล...
      </td>
    </tr>
  `;

  try {

    const res = await fetch("/api/inventory-master");

    if (!res.ok) {
      throw new Error(`API ERROR ${res.status}`);
    }

    const json = await res.json();

    const rows = Array.isArray(json)
      ? json
      : json.data || json.rows || [];

    console.log("INVENTORY =", rows);

    if (!rows.length) {

      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">
            ไม่พบข้อมูล
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = rows.map((r) => {

      const code = r.CODE ?? r.code ?? "";
      const name = r.NAME ?? r.name ?? "-";
      const unit = r.UNIT ?? r.unit ?? "-";
      const required = r.REQUIRED ?? r.required ?? 0;

      return `
        <tr>

          <td>
            ${escapeHtml(code || "-")}
          </td>

          <td>
            ${escapeHtml(name)}
          </td>

          <td>
            ${escapeHtml(unit)}
          </td>

          <td>
            ${escapeHtml(String(required))}
          </td>

          <td class="action-cell">

            <button
              type="button"
              class="action-btn edit-btn"
              data-code="${escapeHtml(code)}"
              title="แก้ไขข้อมูล"
            >
              <i class="fa-solid fa-pen-to-square"></i>
              <span>แก้ไข</span>
            </button>

            <button
              type="button"
              class="action-btn delete-btn"
              data-code="${escapeHtml(code)}"
              title="ลบข้อมูล"
            >
              <i class="fa-solid fa-trash-can"></i>
              <span>ลบ</span>
            </button>

          </td>

        </tr>
      `;

    }).join("");

  } catch (err) {

    console.error("โหลด inventory error:", err);

    tbody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="text-center text-danger py-4"
        >
          <i class="fa-solid fa-triangle-exclamation me-2"></i>
          โหลดข้อมูลไม่สำเร็จ
        </td>
      </tr>
    `;
  }
}

/* =====================================================
EDIT INVENTORY
===================================================== */
async function editInventory(code) {

  console.log("✏️ EDIT INVENTORY:", code);

  try {

    const res = await fetch(
      `/api/inventory-master/${encodeURIComponent(code)}`
    );

    if (!res.ok) {
      throw new Error(`ไม่สามารถโหลดข้อมูลได้ (${res.status})`);
    }

    const json = await res.json();

    const item = json.data || json;

    console.log("EDIT DATA =", item);

    const modal = document.getElementById("inventoryModal");

    if (!modal) {
      console.warn("⚠️ inventoryModal not found");
      return;
    }

    /* ==========================================
       รองรับชื่อ field หลายรูปแบบ
    ========================================== */

    setValue(
      ["inventoryCode", "code", "inventory_code"],
      item.CODE ?? item.code ?? ""
    );

    setValue(
      ["inventoryName", "name", "inventory_name"],
      item.NAME ?? item.name ?? ""
    );

    setValue(
      ["inventoryUnit", "unit", "inventory_unit"],
      item.UNIT ?? item.unit ?? ""
    );

    setValue(
      ["inventoryRequired", "required", "inventory_required"],
      item.REQUIRED ?? item.required ?? 0
    );

    /* เปิด Modal */
    modal.classList.add("active");

  } catch (err) {

    console.error("EDIT INVENTORY ERROR:", err);

    alert(
      err.message || "ไม่สามารถโหลดข้อมูลเพื่อแก้ไขได้"
    );
  }
}

/* =====================================================
DELETE INVENTORY
===================================================== */
async function deleteInventory(code) {

  console.log("🗑 DELETE INVENTORY:", code);

  const confirmed = confirm(
    `ต้องการลบรายการยา/เวชภัณฑ์รหัส ${code} ใช่หรือไม่?`
  );

  if (!confirmed) {
    return;
  }

  try {

    const res = await fetch(
      `/api/inventory-master/${encodeURIComponent(code)}`,
      {
        method: "DELETE"
      }
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {

      throw new Error(
        json.message ||
        json.error ||
        `ลบข้อมูลไม่สำเร็จ (${res.status})`
      );
    }

    console.log("✅ DELETE SUCCESS:", json);

    await loadInventoryMaster();

  } catch (err) {

    console.error("DELETE INVENTORY ERROR:", err);

    alert(
      err.message || "ไม่สามารถลบข้อมูลได้"
    );
  }
}

/* =====================================================
SET INPUT VALUE
===================================================== */
function setValue(ids, value) {

  for (const id of ids) {

    const el = document.getElementById(id);

    if (el) {

      el.value = value ?? "";

      return;
    }
  }
}

/* =====================================================
ESCAPE HTML
ป้องกัน CODE / NAME ที่มีอักขระพิเศษ
===================================================== */
function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}