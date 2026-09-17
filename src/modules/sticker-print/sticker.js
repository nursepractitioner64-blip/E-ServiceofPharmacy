/*
 * Sticker Print
 * Single source of truth:
 *   GET /sticker-print/api/movement
 */

const STICKER_API = "/sticker-print/api/movement";

let stickerData = [];
let filteredData = [];


function $(id) {
  return document.getElementById(id);
}


function text(value) {
  return value == null || value === "" ? "-" : String(value);
}


function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function makeQrUrl(item) {
  if (item.QRCODE) {
    return item.QRCODE;
  }

  const payload = [
    item.CODE || "",
    item.LOT || "",
    item.EXP || ""
  ].join("|");

  return (
    "https://api.qrserver.com/v1/create-qr-code/" +
    "?size=500x500&data=" +
    encodeURIComponent(payload)
  );
}


async function loadStickerData() {

  const res =
    await fetch(
      STICKER_API,
      {
        headers: {
          "Accept": "application/json"
        }
      }
    );

  const contentType =
    res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const body = await res.text();

    throw new Error(
      `Sticker API ไม่ได้ส่ง JSON ` +
      `(HTTP ${res.status}) ` +
      `ตอบกลับ: ${body.slice(0, 120)}`
    );
  }

  const json = await res.json();

  if (!res.ok || json?.ok === false) {
    throw new Error(
      json?.message ||
      `โหลดข้อมูลไม่สำเร็จ (${res.status})`
    );
  }

  stickerData =
    Array.isArray(json?.data)
      ? json.data.filter(
          item =>
            String(item.TYPE || "")
              .trim()
              .toUpperCase() === "IN"
            || !item.TYPE
        )
      : [];

  filteredData = [...stickerData];

  renderTable();
}


function renderTable() {

  const tbody = $("drugTable");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (!filteredData.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty">
          ไม่พบรายการยา
        </td>
      </tr>
    `;

    return;
  }

  filteredData.forEach(item => {

    const index =
      stickerData.indexOf(item);

    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td class="check-cell">
        <input
          type="checkbox"
          class="chk"
          value="${index}"
        >
      </td>

      <td>${escapeHtml(item.CODE)}</td>
      <td>${escapeHtml(item.NAME)}</td>
      <td>${escapeHtml(item.LOT)}</td>
      <td>${escapeHtml(item.EXP)}</td>
    `;

    tbody.appendChild(tr);
  });

  updateMasterCheck();
}


function updateMasterCheck() {

  const master = $("masterCheck");

  if (!master) return;

  const checks =
    Array.from(
      document.querySelectorAll(".chk")
    );

  const checked =
    checks.filter(
      checkbox => checkbox.checked
    ).length;

  master.checked =
    checks.length > 0 &&
    checked === checks.length;

  master.indeterminate =
    checked > 0 &&
    checked < checks.length;
}


function selectedItems() {

  return Array.from(
    document.querySelectorAll(".chk:checked")
  )
    .map(
      checkbox =>
        stickerData[
          Number(checkbox.value)
        ]
    )
    .filter(Boolean);
}


function buildSticker(item) {

  const label =
    document.createElement("div");

  label.className = "label";

  label.innerHTML = `
    <div class="left">
      <div class="code">
        ${escapeHtml(item.CODE)}
      </div>

      <div class="name">
        ${escapeHtml(item.NAME)}
      </div>

      <div class="lot">
        LOT: ${escapeHtml(item.LOT)}
      </div>

      <div class="exp">
        EXP: ${escapeHtml(item.EXP)}
      </div>
    </div>

    <div class="right">
      <img
        class="qr"
        src="${escapeHtml(makeQrUrl(item))}"
        alt="QR"
      >

      <div class="user">
        ${escapeHtml(item.USER)}
      </div>
    </div>
  `;

  return label;
}


function buildPrintArea(items) {

  const printArea = $("printArea");

  if (!printArea) return;

  printArea.innerHTML = "";

  for (
    let i = 0;
    i < items.length;
    i += 2
  ) {

    const sheet =
      document.createElement("div");

    sheet.className = "sheet";

    items
      .slice(i, i + 2)
      .forEach(item => {
        sheet.appendChild(
          buildSticker(item)
        );
      });

    printArea.appendChild(sheet);
  }
}


function printSelected() {

  const items =
    selectedItems();

  if (!items.length) {
    alert(
      "กรุณาเลือกรายการยาที่ต้องการพิมพ์"
    );

    return;
  }

  buildPrintArea(items);

  /*
   * รอ QR image โหลดก่อนสั่งพิมพ์
   * เพื่อป้องกันหน้าพิมพ์ออกมาเป็นช่องว่าง
   */
  const images =
    Array.from(
      document.querySelectorAll(
        "#printArea img.qr"
      )
    );

  const pending =
    images
      .filter(img => !img.complete)
      .map(
        img =>
          new Promise(resolve => {
            img.addEventListener(
              "load",
              resolve,
              { once: true }
            );

            img.addEventListener(
              "error",
              resolve,
              { once: true }
            );
          })
      );

  Promise
    .all(pending)
    .then(() => window.print());
}


function bindStickerEvents() {

  const searchBox = $("searchBox");

  if (searchBox) {
    searchBox.addEventListener(
      "input",
      event => {

        const keyword =
          event.target.value
            .trim()
            .toLowerCase();

        filteredData =
          stickerData.filter(item =>
            [
              item.CODE,
              item.NAME,
              item.LOT,
              item.EXP
            ]
              .map(value =>
                String(value || "")
                  .toLowerCase()
              )
              .some(value =>
                value.includes(keyword)
              )
          );

        renderTable();
      }
    );
  }


  const masterCheck =
    $("masterCheck");

  if (masterCheck) {
    masterCheck.addEventListener(
      "change",
      event => {

        document
          .querySelectorAll(".chk")
          .forEach(
            checkbox => {
              checkbox.checked =
                event.target.checked;
            }
          );

        updateMasterCheck();
      }
    );
  }


  const drugTable =
    $("drugTable");

  if (drugTable) {
    drugTable.addEventListener(
      "change",
      event => {

        if (
          event.target.classList.contains("chk")
        ) {
          updateMasterCheck();
        }

      }
    );
  }


  const printBtn =
    $("printBtn");

  if (printBtn) {
    printBtn.addEventListener(
      "click",
      printSelected
    );
  }
}


async function initStickerPrint() {

  bindStickerEvents();

  try {
    await loadStickerData();
  } catch (err) {

    console.error(
      "Sticker Print Error:",
      err
    );

    const tbody =
      $("drugTable");

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="error">
            ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }

  }
}


if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initStickerPrint,
    { once: true }
  );
} else {
  initStickerPrint();
}


window.initStickerPrint =
  initStickerPrint;
