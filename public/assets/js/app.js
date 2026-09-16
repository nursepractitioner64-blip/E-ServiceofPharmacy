/* =====================================================
   PHARMACY SPA MAIN ROUTER
<<<<<<< HEAD
   Single navigation owner for the whole application.
===================================================== */

const routes = {
  // System entry points
  dashboard: {
    view: "/views/dashboard.html",
    script: "/modules/dashboard/dashboard.view.js",
    system: "pharmacy"
=======
   FINAL VERSION
===================================================== */

const routes = {

  // =========================
  // DASHBOARD
  // =========================
  dashboard: {
    view: "/views/dashboard.html",
    script: "/modules/dashboard/dashboard.view.js"
  },

  // =========================
  // RECEIVE DRUG
  // =========================
  receivedrug: {
    view: "/views/receivedrug.html",
    script: "/modules/receivedrug/receivedrug.client.js"
  },

  // =========================
  // DISPENSE
  // =========================
  dispense: {
    view: "/views/dispense.html",
    script: "/modules/dispense/dispense.client.js"
>>>>>>> 4f05e1a (Fix)
  },

  // =========================
  // EMERGENCY CHECKLIST
  // =========================
  "emergency-checklist": {
    view: "/views/emergencycheck.html",
    script: "/modules/emergencycheck/emergencycheck.client.js",
    system: "emergency"
  },

  // =========================
  // CONTROLLED DRUG
  // =========================
  "controlled-drug": {
    view: "/views/controlleddrug.html",
    script: "/modules/controlleddrug/controlleddrug.client.js",
    system: "controlled"
  },

<<<<<<< HEAD
  // Pharmacy / Emergency inventory
=======
  // =========================
  // INVENTORY MASTER
  // =========================
>>>>>>> 4f05e1a (Fix)
  "inventory-master": {
    view: "/views/inventory-master.html",
    script: "/modules/inventorymaster/inventorymaster.client.js",
    system: "emergency"
  },

  // =========================
  // INVENTORY STOCK
  // =========================
  "receive-stock": {
    view: "/views/receive-stock.html",
    script: "/modules/receivestock/receivestock.client.js",
    system: "emergency"
  },

<<<<<<< HEAD
  inventorydispense: {
    view: "/views/inventorydispense.html",
    script: "/modules/inventorydispense/inventorydispense.client.js",
    system: "emergency"
  },

  // Controlled drug / pharmacy
  receivedrug: {
    view: "/views/receivedrug.html",
    script: "/modules/receivedrug/receivedrug.client.js",
    system: "controlled"
  },

  dispense: {
    view: "/views/dispense.html",
    script: "/modules/dispense/dispense.client.js",
    system: "controlled"
=======
  // =========================
  // INVENTORY DISPENSE
  // =========================
  "inventorydispense": {
    view: "/views/inventorydispense.html",
    script: "/modules/inventorydispense/inventorydispense.client.js"
>>>>>>> 4f05e1a (Fix)
  },

  // =========================
  // STOCK BALANCE
  // =========================
  stockout: {
    view: "/views/stock-balance.html",
<<<<<<< HEAD
    script: "/modules/drugbalance/stockbalance.client.js",
    system: "controlled"
  },
=======
    script: "/modules/drugbalance/stockbalance.client.js"
  },

  // =========================
  // DAILY CHECK
  // =========================
  dailycheck: {
    view: "/views/dailycheck.html",
    script: "/modules/dailycheck/dailycheck.client.js"
  }
>>>>>>> 4f05e1a (Fix)

  dailycheck: {
    view: "/views/dailycheck.html",
    script: "/modules/dailycheck/dailycheck.client.js",
    system: "controlled"
  }
};

const aliases = {
  inventory: "inventory-master",
  receive: "receive-stock",
  inventorystock: "receive-stock",
  "inventory-stock": "receive-stock",
  "inventory-dispense": "inventorydispense",
  "inventorydispense": "inventorydispense",
  stockout: "stockout",
  dailycheck: "dailycheck",
  "emergency": "emergency-checklist",
  "controlled": "controlled-drug",
  "controlleddrug": "controlled-drug"
};

<<<<<<< HEAD
let currentModule = null;
let currentRoute = null;
let navigationToken = 0;
let navigationPromise = null;

function normalizeRoute(page) {
  if (typeof page !== "string") {
    if (page?.dataset?.route) page = page.dataset.route;
    else if (page?.currentTarget?.dataset?.route) {
      page = page.currentTarget.dataset.route;
    } else if (page?.dataset?.page) {
      page = page.dataset.page;
    } else if (page?.currentTarget?.dataset?.page) {
      page = page.currentTarget.dataset.page;
    } else if (page?.page) {
      page = page.page;
    } else {
      return null;
    }
  }

  const value = String(page).trim();
  return aliases[value] || value;
}

async function navigate(page, options = {}) {
  const routeName = normalizeRoute(page);

  if (!routeName) {
    console.error("❌ Invalid navigate target:", page);
    return false;
  }

  const route = routes[routeName];

  if (!route) {
    console.error("❌ Route not found:", routeName);
    console.log("Available routes:", Object.keys(routes));
    return false;
  }

  // Do not reload the same route unless explicitly requested.
  if (
    !options.force &&
    currentRoute === routeName &&
    document.getElementById("app")?.dataset.route === routeName
  ) {
    updateNavigationState(routeName);
    return true;
  }

  console.log("🧭 NAVIGATE:", routeName);

  // If a previous navigation is still loading, let it finish instead
  // of creating competing DOM/module lifecycles.
  if (navigationPromise) {
    await navigationPromise;
  }

  const token = ++navigationToken;

  navigationPromise = loadView(routeName, route, token);

  try {
    return await navigationPromise;
  } finally {
    navigationPromise = null;
  }
}

async function destroyCurrentModule() {
  if (
    currentModule &&
    typeof currentModule.destroy === "function"
  ) {
    try {
      await currentModule.destroy();
    } catch (error) {
      console.warn("⚠️ Module destroy error:", error);
    }
  }

  currentModule = null;
}

async function loadView(routeName, route, token) {
  const app = document.getElementById("app");

  if (!app) {
    console.error("❌ #app not found");
    return false;
=======
// =====================================================
// CURRENT MODULE
// =====================================================

let currentModule = null;
let isNavigating = false;


// =====================================================
// NAVIGATE
// =====================================================

async function navigate(page) {

  console.log("🧭 NAVIGATE:", page);

  /*
   * ป้องกันกรณีมีการส่ง object/event เข้ามา
   * เช่น navigate(event) หรือ navigate({ page: "inventorydispense" })
   */

  if (typeof page !== "string") {

    if (page?.dataset?.route) {
      page = page.dataset.route;
    }

    else if (page?.currentTarget?.dataset?.route) {
      page = page.currentTarget.dataset.route;
    }

    else if (page?.page) {
      page = page.page;
    }

    else {
      console.error("❌ Invalid navigate target:", page);
      return;
    }
  }


  page = String(page).trim();


  // ===================================================
  // ROUTE ALIASES
  // ===================================================

  const aliases = {

    inventory: "inventory-master",

    receive: "receive-stock",

    inventorystock: "receive-stock",

    "inventory-stock": "receive-stock",

    dispense: "dispense",

    "inventory-dispense": "inventorydispense",

    inventorydispense: "inventorydispense",

    stockout: "stockout",

    dailycheck: "dailycheck"

  };


  if (aliases[page]) {
    page = aliases[page];
  }


  // ===================================================
  // FIND ROUTE
  // ===================================================

  const route = routes[page];


  if (!route) {

    console.error(
      "❌ Route not found:",
      page
    );

    console.log(
      "Available routes:",
      Object.keys(routes)
    );

    return;
  }


  console.log(
    "✅ ROUTE FOUND:",
    page,
    route
  );


  await loadView(
    route.view,
    route.script
  );
}


// =====================================================
// LOAD VIEW
// =====================================================

async function loadView(
  viewPath,
  scriptPath
) {

  const app =
    document.getElementById("app");


  if (!app) {

    console.error(
      "❌ #app not found"
    );

    return;
>>>>>>> 4f05e1a (Fix)
  }


  if (isNavigating) {

    console.warn(
      "⚠️ Navigation already running"
    );

    return;
  }


  isNavigating = true;


  try {
    await destroyCurrentModule();

<<<<<<< HEAD
    console.log("📄 LOAD VIEW:", route.view);

    const response = await fetch(
      `${route.view}?t=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        `View HTTP ${response.status}: ${route.view}`
      );
    }

    const html = await response.text();

    // A newer navigation may have been requested while the fetch ran.
    if (token !== navigationToken) {
      return false;
    }

    app.innerHTML = html;
    app.dataset.route = routeName;
    app.dataset.system = route.system || "";

    await nextFrame();
    await nextFrame();

    console.log("📦 LOAD MODULE:", route.script);

    const module = await import(
      `${route.script}?t=${Date.now()}`
    );

    if (token !== navigationToken) {
      if (typeof module.destroy === "function") {
        await module.destroy();
      }
      return false;
    }

    currentModule = module;

    if (typeof module.init === "function") {
      console.log("🚀 INIT RUN:", routeName);
=======
    // =================================================
    // DESTROY CURRENT MODULE
    // =================================================

    if (
      currentModule &&
      typeof currentModule.destroy === "function"
    ) {

      try {

        await currentModule.destroy();

      } catch (destroyError) {

        console.warn(
          "⚠️ Module destroy error:",
          destroyError
        );

      }
    }


    currentModule = null;


    // =================================================
    // LOAD HTML
    // =================================================

    console.log(
      "📄 LOAD VIEW:",
      viewPath
    );


    const res =
      await fetch(
        `${viewPath}?t=${Date.now()}`,
        {
          cache: "no-store"
        }
      );


    if (!res.ok) {

      throw new Error(
        `View HTTP ${res.status}: ${viewPath}`
      );
    }


    const html =
      await res.text();


    app.innerHTML = html;


    // =================================================
    // WAIT DOM
    // =================================================

    await new Promise(
      requestAnimationFrame
    );


    await new Promise(
      requestAnimationFrame
    );


    // =================================================
    // LOAD MODULE
    // =================================================

    console.log(
      "📦 LOAD MODULE:",
      scriptPath
    );


    const module =
      await import(
        `${scriptPath}?t=${Date.now()}`
      );


    console.log(
      "📦 MODULE LOADED:",
      module
    );


    currentModule =
      module;


    // =================================================
    // INIT MODULE
    // =================================================

    if (
      module &&
      typeof module.init === "function"
    ) {

      console.log(
        "🚀 INIT RUN"
      );

>>>>>>> 4f05e1a (Fix)
      await module.init();

    }

<<<<<<< HEAD
    currentRoute = routeName;
    updateNavigationState(routeName);

    console.log("✅ ROUTE READY:", routeName);
    return true;

  } catch (error) {
    console.error("❌ loadView error:", error);

    app.innerHTML = `
      <div class="spa-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>ไม่สามารถโหลดหน้าได้</h3>
        <p>${escapeHtml(error.message)}</p>
        <button
          type="button"
          class="btn btn-primary"
          data-route="dashboard"
        >
          กลับ Dashboard
        </button>
      </div>
    `;

    app.dataset.route = "";
    currentRoute = null;
    return false;
=======

  } catch (err) {

    console.error(
      "❌ loadView error:",
      err
    );


    app.innerHTML = `
      <div
        style="
          padding:40px;
          text-align:center;
          color:#dc3545;
        "
      >

        <i
          class="fa-solid fa-triangle-exclamation"
          style="
            font-size:40px;
            margin-bottom:15px;
          "
        ></i>

        <h3>
          ไม่สามารถโหลดหน้าได้
        </h3>

        <p>
          ${escapeHtml(err.message)}
        </p>

      </div>
    `;

  } finally {

    isNavigating = false;

>>>>>>> 4f05e1a (Fix)
  }
}

function nextFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

<<<<<<< HEAD
function updateNavigationState(routeName) {
  document
    .querySelectorAll("[data-route]")
    .forEach(el => {
      const target = normalizeRoute(el.dataset.route);
      el.classList.toggle("active", target === routeName);
      el.setAttribute(
        "aria-current",
        target === routeName ? "page" : "false"
      );
    });
}

function escapeHtml(value) {
=======
// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {

>>>>>>> 4f05e1a (Fix)
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
<<<<<<< HEAD

// =====================================================
// GLOBAL API
// =====================================================

window.routes = routes;
window.navigate = navigate;
window.loadView = async (viewPath, scriptPath) => {
  const routeName = Object.keys(routes).find(
    key =>
      routes[key].view === viewPath &&
      routes[key].script === scriptPath
  );
=======
>>>>>>> 4f05e1a (Fix)

  if (routeName) {
    return navigate(routeName, { force: true });
  }

<<<<<<< HEAD
  // Compatibility for legacy callers that pass raw paths.
  return loadView(
    "__legacy__",
    {
      view: viewPath,
      script: scriptPath,
      system: ""
    },
    ++navigationToken
  );
};

// =====================================================
// ONE AND ONLY ONE CLICK DELEGATION
// Supports current data-route markup and legacy data-page.
// =====================================================

document.addEventListener("click", event => {
  const element = event.target.closest("[data-route], [data-page]");

  if (!element) return;

  // Ignore modified clicks so normal browser behavior remains possible
  // for links/buttons intentionally opened by the user.
  if (
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const route = normalizeRoute(
    element.dataset.route || element.dataset.page
  );

  if (!route || !routes[route] && !aliases[route]) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  navigate(route);
});
=======
// =====================================================
// GLOBAL
// =====================================================

window.routes =
  routes;

window.navigate =
  navigate;

window.loadView =
  loadView;
>>>>>>> 4f05e1a (Fix)

// =====================================================
// INIT
// =====================================================

<<<<<<< HEAD
document.addEventListener("DOMContentLoaded", () => {
  if (window.__PHARMACY_SPA_READY) return;

  window.__PHARMACY_SPA_READY = true;
=======
// =====================================================
// DATA-ROUTE CLICK HANDLER
// =====================================================

document.addEventListener(
  "click",
  (e) => {

    const el =
      e.target.closest(
        "[data-route]"
      );


    if (!el) return;


    e.preventDefault();


    const page =
      el.dataset.route;


    console.log(
      "🖱️ DATA ROUTE:",
      page
    );


    navigate(page);

  }
);


// =====================================================
// DATA-PAGE CLICK HANDLER
// =====================================================

/*
 * Emergency Checklist ใช้ data-page
 * เช่น:
 *
 * data-page="inventorydispense"
 *
 * รองรับโดยตรง
 */

document.addEventListener(
  "click",
  (e) => {

    const el =
      e.target.closest(
        "[data-page]"
      );


    if (!el) return;


    /*
     * ถ้ามี data-route อยู่แล้ว
     * ให้ data-route handler จัดการ
     */
    if (el.hasAttribute("data-route")) {
      return;
    }


    e.preventDefault();


    const page =
      el.dataset.page;


    console.log(
      "📂 OPEN PAGE:",
      page
    );


    navigate(page);

  }
);


// =====================================================
// INIT APP
// =====================================================
>>>>>>> 4f05e1a (Fix)

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "🚀 Pharmacy SPA Ready"
    );


    /*
     * ป้องกัน init ซ้ำ
     */
    if (
      window.__PHARMACY_SPA_READY
    ) {

      return;

    }


    window.__PHARMACY_SPA_READY =
      true;


    navigate(
      "dashboard"
    );

  }
);

<<<<<<< HEAD
  navigate("dashboard");
});

// V8 unified dashboard alias
window.PHARMACY_UNIFIED_DASHBOARD = "dashboard-unified";

window.openUnifiedDashboard = () => window.navigate?.("dashboard");
=======
>>>>>>> 4f05e1a (Fix)
