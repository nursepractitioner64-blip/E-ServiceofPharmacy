/* =====================================================
   PHARMACY SPA MAIN ROUTER
   Single navigation owner for the whole application.
===================================================== */

const routes = {
  // System entry points
  dashboard: {
    view: "/views/dashboard.html",
    script: "/modules/dashboard/dashboard.view.js",
    system: "pharmacy"
  },

  "emergency-checklist": {
    view: "/views/emergencycheck.html",
    script: "/modules/emergencycheck/emergencycheck.client.js",
    system: "emergency"
  },

  "controlled-drug": {
    view: "/views/controlleddrug.html",
    script: "/modules/controlleddrug/controlleddrug.client.js",
    system: "controlled"
  },

  // Pharmacy / Emergency inventory
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
  },

  stockout: {
    view: "/views/stock-balance.html",
    script: "/modules/drugbalance/stockbalance.client.js",
    system: "controlled"
  },

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
  }

  try {
    await destroyCurrentModule();

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
      await module.init();
    }

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
  }
}

function nextFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

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
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

  if (routeName) {
    return navigate(routeName, { force: true });
  }

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

// =====================================================
// INIT
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  if (window.__PHARMACY_SPA_READY) return;

  window.__PHARMACY_SPA_READY = true;

  console.log("🚀 Pharmacy SPA Ready");

  navigate("dashboard");
});

// V8 unified dashboard alias
window.PHARMACY_UNIFIED_DASHBOARD = "dashboard-unified";

window.openUnifiedDashboard = () => window.navigate?.("dashboard");
