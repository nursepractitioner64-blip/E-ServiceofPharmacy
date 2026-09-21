/*********************************************************
FILE:
modules/emergencycheck/emergencycheck.client.js
*********************************************************/

export async function init() {

  console.log("🚨 Emergency Checklist Module Loaded");

  bindEvents();

  loadChecklist();

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

      // TODO:
      // await api save

      await fakeDelay(1000);

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


  /* ================= MENU ================= */

  document
    .querySelectorAll(".ems-check-menu-btn")
    .forEach(btn => {

      btn.addEventListener("click", async () => {

        const page =
          btn.dataset.page;

        console.log(
          "📂 OPEN PAGE:",
          page
        );


        /* ACTIVE MENU */

        document
          .querySelectorAll(".ems-check-menu-btn")
          .forEach(b =>
            b.classList.remove("active")
          );

        btn.classList.add("active");


        /* LOAD VIEW */

        if (window.loadView) {

          const map = {

            inventory:
              "inventory-master",

            receive:
              "receive-stock",

            stockout:
              "dispense",

            check:
              "emergency-checklist",

            report:
              "dashboard",

            dailycheck:
              "dailycheck"

          };


          const route =
            map[page];


          if (!route) {

            console.warn(
              "⚠️ UNKNOWN MENU PAGE:",
              page
            );

            return;

          }


          await window.navigate(
            route
          );

        }

      });

    });

}


/*********************************************************
LOAD CHECKLIST
*********************************************************/

async function loadChecklist() {

  try {

    console.log(
      "📦 LOAD EMERGENCY CHECKLIST"
    );


    // TODO:
    // const res = await api.getChecklist();

    await fakeDelay(500);


    updateSummary({

      total: 124,

      ready: 118,

      missing: 4,

      expire: 2

    });


  } catch (err) {

    console.error(
      "❌ LOAD EMERGENCY CHECKLIST ERROR:",
      err
    );

  }

}


/*********************************************************
UPDATE SUMMARY
*********************************************************/

function updateSummary(data) {

  /*
   * สำคัญ
   *
   * หน้า Emergency Checklist บางเวอร์ชัน
   * อาจไม่มี Summary Card แล้ว
   *
   * ดังนั้นห้ามใช้
   *
   * document.querySelector(...).textContent
   *
   * โดยไม่ตรวจสอบ null
   */


  const totalEl =
    document.querySelector("#totalItems");


  const readyEl =
    document.querySelector("#readyItems");


  const missingEl =
    document.querySelector("#missingItems");


  const expireEl =
    document.querySelector("#expireItems");


  if (!totalEl) {

    console.warn(
      "⚠️ ไม่พบ #totalItems"
    );

  } else {

    totalEl.textContent =
      data.total ?? 0;

  }


  if (!readyEl) {

    console.warn(
      "⚠️ ไม่พบ #readyItems"
    );

  } else {

    readyEl.textContent =
      data.ready ?? 0;

  }


  if (!missingEl) {

    console.warn(
      "⚠️ ไม่พบ #missingItems"
    );

  } else {

    missingEl.textContent =
      data.missing ?? 0;

  }


  if (!expireEl) {

    console.warn(
      "⚠️ ไม่พบ #expireItems"
    );

  } else {

    expireEl.textContent =
      data.expire ?? 0;

  }


  console.log(
    "📊 EMERGENCY SUMMARY:",
    {
      total:
        data.total ?? 0,

      ready:
        data.ready ?? 0,

      missing:
        data.missing ?? 0,

      expire:
        data.expire ?? 0
    }
  );

}


/*********************************************************
UTIL
*********************************************************/

function fakeDelay(ms) {

  return new Promise(resolve => {

    setTimeout(
      resolve,
      ms
    );

  });

}