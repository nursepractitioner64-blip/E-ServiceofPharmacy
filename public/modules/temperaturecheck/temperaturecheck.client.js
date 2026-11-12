const API = "/api/temperature-check/records";
const TYPES = {
  freezer: { unit: "°C" },
  fridge: { unit: "°C" },
  room: { unit: "°C" },
  humidity: { unit: "%" }
};
const $ = (id) => document.getElementById(id);

export async function init() {
  const today = new Date();
  if ($("tcDate")) $("tcDate").value = localDate(today);
  $("tcType")?.addEventListener("change", updateUnit);
  $("temperatureForm")?.addEventListener("submit", saveForm);
  $("temperatureForm")?.addEventListener("reset", () => setTimeout(updateUnit, 0));
  updateUnit();
}

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function updateUnit() {
  const type = $("tcType")?.value || "fridge";
  if ($("tcUnit")) $("tcUnit").textContent = TYPES[type]?.unit || "°C";
}

function showMessage(message, isError = false) {
  const element = $("tcFormMessage");
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", isError);
  element.classList.add("is-visible");
}

async function saveForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.type = String(data.type || "");
  data.value = Number(data.value);
  data.source = "FORM";

  if (!Number.isFinite(data.value)) {
    showMessage("กรุณากรอกค่าที่วัดได้เป็นตัวเลข", true);
    return;
  }

  const button = $("tcSaveBtn");
  try {
    if (button) {
      button.disabled = true;
      button.textContent = "กำลังบันทึก...";
    }

    const response = await fetch(API, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    showMessage(`บันทึกข้อมูลสำเร็จ${result.data?.status === "OUT_OF_RANGE" ? " — ค่าที่บันทึกเกินเกณฑ์ โปรดแจ้งผู้รับผิดชอบ" : ""}`);
    form.reset();
    if ($("tcDate")) $("tcDate").value = localDate(new Date());
    updateUnit();
  } catch (error) {
    showMessage(error.message || "บันทึกข้อมูลไม่สำเร็จ", true);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "บันทึกข้อมูล";
    }
  }
}
