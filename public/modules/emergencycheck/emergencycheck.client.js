
/*********************************************************
FILE:
modules/emergencycheck/emergencycheck.client.js
*********************************************************/

export async function init() {
  await loadSystemSummary();

  console.log("🚨 Emergency Checklist Module Loaded");

  bindEvents();


  const dailyModule = await import(
    "/modules/dailycheck/dailycheck.client.js?t=" + Date.now()
  );

  await dailyModule.init();

}


/*********************************************************
BIND EVENTS
*********************************************************/

function bindEvents() {

  /* ================= SCAN QR ================= */

  const scanBtn =
    document.querySelector("#scanQrBtn");

  scanBtn?.addEventListener("click", () => {

    console.log("📷 OPEN QR SCANNER");

    alert("เปิดระบบสแกน QR");

  });


  /* ================= SAVE ================= */

  const saveBtn =
    document.querySelector("#saveChecklistBtn");

  saveBtn?.addEventListener("click", async () => {

    try {

      console.log("💾 SAVE CHECKLIST");

      saveBtn.disabled = true;

      saveBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        กำลังบันทึก...
      `;

      const response = await fetch("/api/emergencycheck/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      alert("บันทึกข้อมูลสำเร็จ");

    } catch (err) {

      console.error(err);

      alert("เกิดข้อผิดพลาด");

    } finally {

      saveBtn.disabled = false;

      saveBtn.innerHTML = `
        <i class="fa-solid fa-check"></i>
        บันทึก
      `;

    }

  });

}

/* =========================================================
   LIVE SYSTEM SUMMARY
========================================================= */

async function loadSystemSummary() {
  try {
    const response = await fetch("/api/dashboard/system");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const summary = data?.data || data?.summary || data || {};

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el && value !== undefined && value !== null) {
        el.textContent = value;
      }
    };

    set("totalItems", summary.total);
    set("readyItems", summary.ready);
    set("missingItems", summary.missing);
    set("expireItems", summary.expire);
  } catch (error) {
    console.error("❌ Emergency dashboard load failed:", error);
  }
}
