/* =========================================================
   SMART PHARMACY MANAGEMENT SYSTEM
   APP.JS
   ========================================================= */

console.log("🚀 Pharmacy SPA Starting...");


/* =========================================================
   ROUTES
========================================================= */

const routes = {

  /* ===================================================
     SYSTEM ENTRY
  =================================================== */

  dashboard: {
    view: "/views/dashboard.html",
    script: "/modules/dashboard/dashboard.view.js",
    system: "pharmacy"
  },


  /* ===================================================
     VACCINE MANAGEMENT
     
     โหลดเฉพาะ HTML
     ยังไม่มี JavaScript Module
  =================================================== */

  "vaccine-management": {
    view: "/views/vaccinemanagement.html",
    script: null,
    system: "pharmacy"
  },

"vaccine-master": {
  view: "/views/vaccinemaster.html",
  script: "/modules/vaccinemaster/vaccinemaster.client.js",
  system: "pharmacy"
},

"vaccine-record": {
  view: "/views/vaccinationrecord.html",
  script: null,
  system: "pharmacy"
},


  /* ===================================================
     EMERGENCY
  =================================================== */

  "emergency-checklist": {
    view: "/views/emergencycheck.html",
    script: "/modules/emergencycheck/emergencycheck.client.js",
    system: "emergency"
  },


  /* ===================================================
     CONTROLLED DRUG
  =================================================== */

  "controlled-drug": {
    view: "/views/controlleddrug.html",
    script: "/modules/controlleddrug/controlleddrug.client.js",
    system: "controlled"
  },


  /* ===================================================
     EMERGENCY / INVENTORY
  =================================================== */

  "inventory-master": {
    view: "/views/inventory-master.html",
    script: "/modules/inventorymaster/inventorymaster.client.js",
    system: "emergency"
  },


  "receive-stock": {
    view: "/views/receive-stock.html",
    script: "/modules/receivestock/receivestock.client.js",
    system: "emergency"
  },


  "inventorydispense": {
    view: "/views/inventorydispense.html",
    script: "/modules/inventorydispense/inventorydispense.client.js",
    system: "emergency"
  },


  /* ===================================================
     CONTROLLED DRUG
  =================================================== */

  receivedrug: {
    view: "/views/receivedrug.html",
    script: "/modules/receivedrug/receivedrug.client.js",
    system: "controlled"
  },


  dispense: {
    view: "/views/dispense.html",
    script: "/modules/dispense/dispense.client.js",
    system: "controlled"
  },


  stockout: {
    view: "/views/stock-balance.html",
    script: "/modules/drugbalance/stockbalance.client.js",
    system: "controlled"
  },


  /* ===================================================
     DAILY CHECK
  =================================================== */

  dailycheck: {
    view: "/views/dailycheck.html",
    script: "/modules/dailycheck/dailycheck.client.js",
    system: "controlled"
  }

};


/* =========================================================
   ROUTE ALIASES
========================================================= */

const aliases = {

  /* ===================================================
     Inventory
  =================================================== */

  inventory:
    "inventory-master",

  "inventory-master":
    "inventory-master",


  /* ===================================================
     Receive
  =================================================== */

  receive:
    "receive-stock",

  inventorystock:
    "receive-stock",

  "inventory-stock":
    "receive-stock",

  "receive-stock":
    "receive-stock",


  /* ===================================================
     Inventory Dispense
  =================================================== */

  "inventory-dispense":
    "inventorydispense",

  inventorydispense:
    "inventorydispense",

  "inventory-dispense-stock":
    "inventorydispense",


  /* ===================================================
     IMPORTANT

     stockout = Inventory Dispense
     ใน Emergency Inventory
  =================================================== */

  stockout:
    "inventorydispense",


  /* ===================================================
     Daily Check
  =================================================== */

  dailycheck:
    "dailycheck",


  /* ===================================================
     Emergency
  =================================================== */

  emergency:
    "emergency-checklist",

  "emergency-checklist":
    "emergency-checklist",


  /* ===================================================
     Controlled Drug
  =================================================== */

  controlled:
    "controlled-drug",

  controlleddrug:
    "controlled-drug",

  "controlled-drug":
    "controlled-drug"

};


/* =========================================================
   CURRENT MODULE
========================================================= */

let currentModule = null;
let currentRoute = null;


/* =========================================================
   NORMALIZE ROUTE
========================================================= */

function normalizeRoute(route) {

  if (!route) {
    return "dashboard";
  }


  const key =
    String(route)
      .trim()
      .toLowerCase();


  /* ===================================================
     Direct route
  =================================================== */

  if (routes[key]) {
    return key;
  }


  /* ===================================================
     Alias
  =================================================== */

  if (aliases[key]) {
    return aliases[key];
  }


  return null;

}


/* =========================================================
   DESTROY CURRENT MODULE
========================================================= */

async function destroyCurrentModule() {

  if (!currentModule) {
    return;
  }


  try {

    if (
      typeof currentModule.destroy ===
      "function"
    ) {

      console.log(
        "🧹 DESTROY MODULE"
      );


      await currentModule.destroy();

    }

  } catch (err) {

    console.error(
      "❌ MODULE DESTROY ERROR:",
      err
    );

  }


  currentModule = null;

}


/* =========================================================
   LOAD VIEW
========================================================= */

async function loadView(viewUrl) {

  console.log(
    "📄 LOAD VIEW:",
    viewUrl
  );


  const app =
    document.getElementById("app");


  if (!app) {

    throw new Error(
      "#app ไม่พบใน index.html"
    );

  }


  const response =
    await fetch(
      viewUrl,
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `ไม่สามารถโหลด View ได้ (${response.status}) : ${viewUrl}`
    );

  }


  const html =
    await response.text();


  app.innerHTML =
    html;


  return html;

}


/* =========================================================
   LOAD MODULE
========================================================= */

async function loadModule(scriptUrl) {

  console.log(
    "📦 LOAD MODULE:",
    scriptUrl
  );


  /*
     ป้องกันการเรียก import(null)
  */

  if (!scriptUrl) {

    console.log(
      "ℹ️ ไม่มี Module สำหรับ Route นี้"
    );

    return null;

  }


  /*
     =====================================================
     Cache Busting
     
     ป้องกัน Browser ใช้ JS เก่า
  =====================================================
  */

  const separator =
    scriptUrl.includes("?")
      ? "&"
      : "?";


  const moduleUrl =
    `${scriptUrl}${separator}t=${Date.now()}`;


  const module =
    await import(
      moduleUrl
    );


  console.log(
    "📦 MODULE LOADED:",
    module
  );


  return module;

}


/* =========================================================
   INIT MODULE
========================================================= */

async function initModule(module) {

  if (
    !module ||
    typeof module.init !==
    "function"
  ) {

    console.warn(
      "⚠️ MODULE ไม่มี init()"
    );

    return;

  }


  console.log(
    "🚀 INIT RUN"
  );


  await module.init();

}


/* =========================================================
   UPDATE ACTIVE SIDEBAR
========================================================= */

function updateSidebarActive(route) {

  document
    .querySelectorAll(
      "[data-route]"
    )
    .forEach(el => {

      const target =
        normalizeRoute(
          el.dataset.route
        );


      el.classList.toggle(
        "active",
        target === route
      );

    });

}


/* =========================================================
   UPDATE INTERNAL MENU
========================================================= */

function updateInternalMenu(route) {

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(el => {

      const page =
        el.dataset.page;


      let target =
        normalizeRoute(page);


      /* =================================================
         Emergency menu
      ================================================= */

      if (
        page === "inventory"
      ) {

        target =
          "inventory-master";

      }


      if (
        page === "receive"
      ) {

        target =
          "receive-stock";

      }


      if (
        page === "stockout"
      ) {

        target =
          "inventorydispense";

      }


      if (
        page === "check"
      ) {

        target =
          "emergency-checklist";

      }


      if (
        page === "report"
      ) {

        target =
          "dashboard";

      }


      el.classList.toggle(
        "active",
        target === route
      );

    });


  /* =================================================
     รองรับ data-route
     ภายใน View
  ================================================= */

  document
    .querySelectorAll(
      ".ems-check-menu-btn[data-route]"
    )
    .forEach(el => {

      const target =
        normalizeRoute(
          el.dataset.route
        );


      el.classList.toggle(
        "active",
        target === route
      );

    });

}


/* =========================================================
   BIND GLOBAL ROUTE BUTTON
========================================================= */

function bindRouteButtons() {

  /*
     ใช้ Event Delegation

     สำคัญมากสำหรับ SPA

     เพราะ View ถูกเปลี่ยนด้วย innerHTML
  */

  document.addEventListener(
    "click",
    async event => {

      const button =
        event.target.closest(
          "[data-route]"
        );


      if (!button) {
        return;
      }


      /*
         ถ้าเป็น link
      */

      if (
        button.tagName ===
        "A"
      ) {

        event.preventDefault();

      }


      const route =
        button.dataset.route;


      if (!route) {
        return;
      }


      console.log(
        "🖱️ DATA ROUTE:",
        route
      );


      await navigate(
        route
      );

    }
  );

}


/* =========================================================
   BIND INTERNAL EMERGENCY MENU
========================================================= */

function bindPageButtons() {

  document.addEventListener(
    "click",
    async event => {

      const button =
        event.target.closest(
          ".ems-check-menu-btn[data-page]"
        );


      if (!button) {
        return;
      }


      event.preventDefault();


      const page =
        button.dataset.page;


      console.log(
        "📂 OPEN PAGE:",
        page
      );


      let route =
        null;


      /* =================================================
         EMERGENCY MENU MAP
      ================================================= */
const map = {

  inventory:
    "inventory-master",

  receive:
    "receive-stock",

  stockout:
    "inventorydispense",

  check:
    "emergency-checklist",

  report:
    "dashboard",

  dailycheck:
    "dailycheck",

  inventorydispense:
    "inventorydispense",

  "inventory-dispense":
    "inventorydispense",

  "vaccine-master":
    "vaccine-master",
  "vaccine-master":
    "vaccine-master",
  "vaccine-record":
    "vaccine-record"

};


      route =
        map[page] ||
        normalizeRoute(page);


      if (!route) {

        console.error(
          "❌ ROUTE NOT FOUND:",
          page
        );

        return;

      }


      console.log(
        `🧭 ROUTE: ${page} → ${route}`
      );


      /* =================================================
         Active button
      ================================================= */

      document
        .querySelectorAll(
          ".ems-check-menu-btn"
        )
        .forEach(btn => {

          btn.classList.remove(
            "active"
          );

        });


      button.classList.add(
        "active"
      );


      console.log(
        "🚀 NAVIGATE:",
        route
      );


      await navigate(
        route
      );

    }
  );

}


/* =========================================================
   NAVIGATE
========================================================= */

async function navigate(route) {

  console.log(
    "🧭 NAVIGATE:",
    route
  );


  const normalized =
    normalizeRoute(route);


  if (!normalized) {

    console.error(
      "❌ ROUTE NOT FOUND:",
      route
    );


    /*
       แจ้งเฉพาะ Console
       ไม่ทำให้ระบบล่ม
    */

    return;

  }


  const config =
    routes[normalized];


  if (!config) {

    console.error(
      "❌ ROUTE CONFIG NOT FOUND:",
      normalized
    );

    return;

  }


  console.log(
    "✅ ROUTE FOUND:",
    normalized,
    config
  );


  /* =====================================================
     1. DESTROY MODULE เดิม
  ===================================================== */

  await destroyCurrentModule();


  /* =====================================================
     2. LOAD VIEW
  ===================================================== */

  try {

    await loadView(
      config.view
    );

  } catch (err) {

    console.error(
      "❌ VIEW LOAD ERROR:",
      err
    );


    const app =
      document.getElementById(
        "app"
      );


    if (app) {

      app.innerHTML = `

        <div
          style="
            padding:40px;
            text-align:center;
            font-family:Prompt,sans-serif;
          "
        >

          <h2>
            ไม่สามารถเปิดหน้านี้ได้
          </h2>

          <p>
            ${config.view}
          </p>

        </div>

      `;

    }


    return;

  }


  /* =====================================================
     3. UPDATE ACTIVE MENU
  ===================================================== */

  updateSidebarActive(
    normalized
  );


  updateInternalMenu(
    normalized
  );


  /* =====================================================
     4. LOAD MODULE
     
     ถ้า route มี script → โหลด module
     ถ้า script เป็น null → ข้าม
  ===================================================== */

  if (config.script) {

    try {

      const module =
        await loadModule(
          config.script
        );


      currentModule =
        module;


      /* =================================================
         5. INIT MODULE
      ================================================= */

      await initModule(
        module
      );


    } catch (err) {

      console.error(
        "❌ MODULE ERROR:",
        err
      );


      const app =
        document.getElementById(
          "app"
        );


      if (app) {

        app.insertAdjacentHTML(
          "beforeend",
          `

            <div
              style="
                margin:20px;
                padding:16px;
                border-radius:12px;
                background:#fee2e2;
                color:#991b1b;
                font-family:Prompt,sans-serif;
              "
            >

              <strong>
                ไม่สามารถโหลด Module ได้
              </strong>

              <br>

              ${config.script}

            </div>

          `
        );

      }


      return;

    }

  } else {

    console.log(
      "ℹ️ ROUTE นี้ไม่มี Module:",
      normalized
    );


    currentModule =
      null;

  }


  /* =====================================================
     6. CURRENT ROUTE
  ===================================================== */

  currentRoute =
    normalized;


  /* =====================================================
     7. HISTORY
  ===================================================== */

  try {

    history.pushState(
      {
        route:
          normalized
      },
      "",
      `#${normalized}`
    );

  } catch (err) {

    console.warn(
      "⚠️ History error:",
      err
    );

  }

}


/* =========================================================
   WINDOW NAVIGATION
========================================================= */

window.navigate =
  navigate;


/* =========================================================
   BACKWARD COMPATIBILITY
========================================================= */

window.loadView =
  navigate;


/* =========================================================
   BROWSER BACK / FORWARD
========================================================= */

window.addEventListener(
  "popstate",
  async event => {

    const route =
      event.state?.route ||
      location.hash
        .replace(
          /^#/,
          ""
        );


    const target =
      normalizeRoute(
        route
      ) ||
      "dashboard";


    /*
       ป้องกัน pushState ซ้ำ
    */

    await navigateWithoutHistory(
      target
    );

  }
);


/* =========================================================
   NAVIGATE WITHOUT HISTORY
========================================================= */

async function navigateWithoutHistory(
  route
) {

  const normalized =
    normalizeRoute(route);


  if (!normalized) {
    return;
  }


  const config =
    routes[normalized];


  if (!config) {
    return;
  }


  /* =====================================================
     1. DESTROY MODULE เดิม
  ===================================================== */

  await destroyCurrentModule();


  /* =====================================================
     2. LOAD VIEW
  ===================================================== */

  try {

    await loadView(
      config.view
    );

  } catch (err) {

    console.error(
      "❌ VIEW LOAD ERROR:",
      err
    );

    return;

  }


  /* =====================================================
     3. UPDATE MENU
  ===================================================== */

  updateSidebarActive(
    normalized
  );


  updateInternalMenu(
    normalized
  );


  /* =====================================================
     4. LOAD MODULE
     
     ถ้ามี script → โหลด
     ถ้าไม่มี script → ข้าม
  ===================================================== */

  if (config.script) {

    try {

      const module =
        await loadModule(
          config.script
        );


      currentModule =
        module;


      await initModule(
        module
      );


    } catch (err) {

      console.error(
        "❌ MODULE ERROR:",
        err
      );

    }

  } else {

    console.log(
      "ℹ️ ROUTE นี้ไม่มี Module:",
      normalized
    );


    currentModule =
      null;

  }


  /* =====================================================
     5. CURRENT ROUTE
  ===================================================== */

  currentRoute =
    normalized;

}


/* =========================================================
   INITIAL ROUTE
========================================================= */

async function boot() {

  console.log(
    "🚀 Pharmacy SPA Ready"
  );


  /* =====================================================
     Bind ครั้งเดียว
  ===================================================== */

  bindRouteButtons();

  bindPageButtons();


  /* =====================================================
     อ่าน hash
  ===================================================== */

  let initialRoute =
    location.hash
      .replace(
        /^#/,
        ""
      )
      .trim();


  /* =====================================================
     ถ้าไม่มี route
     ใช้ dashboard
  ===================================================== */

  initialRoute =
    normalizeRoute(
      initialRoute
    ) ||
    "dashboard";


  console.log(
    "🏁 INITIAL ROUTE:",
    initialRoute
  );


  /* =====================================================
     โหลดหน้าแรก
  ===================================================== */

  await navigateWithoutHistory(
    initialRoute
  );


  /* =====================================================
     ถ้าไม่มี hash
     สร้าง hash โดยไม่ reload
  ===================================================== */

  if (
    !location.hash
  ) {

    history.replaceState(
      {
        route:
          initialRoute
      },
      "",
      `#${initialRoute}`
    );

  }

}


/* =========================================================
   DOM READY
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    boot,
    {
      once: true
    }
  );

} else {

  boot();

}

