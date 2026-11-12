
function formatDateMDY(value) {
  if (value === null || value === undefined || value === "") return "";
  const text=String(value).trim(); let m=text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/); let year,month,day;
  if(m){year=+m[1];month=+m[2];day=+m[3];} else {m=text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(!m)return text;const a=+m[1],b=+m[2];year=+m[3];if(a>12&&b<=12){day=a;month=b;}else if(b>12&&a<=12){month=a;day=b;}else{month=a;day=b;}}
  const d=new Date(Date.UTC(year,month-1,day));if(month<1||month>12||day<1||day>31||d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return text;
  return `${String(month).padStart(2,"0")}/${String(day).padStart(2,"0")}/${year}`;
}


import { getDispenseLots, submitDispense } from "./estockscan.api.js";



const $ = id => document.getElementById(id);

let stream = null;

let item = null;

let lots = [];

let selectedLot = null;

let worker = null;

let ocrBusy = false;



$("backBtn").onclick = () => { location.hash = "#dashboard"; };

$("startCamera").onclick = startCamera;

$("captureSticker").onclick = captureSticker;

$("stopCamera").onclick = stopCamera;



async function startCamera() {

if (stream) return;

try {

if (!window.isSecureContext) {

throw new Error("ต้องเปิดระบบผ่าน HTTPS เพื่อใช้งานกล้องบนโทรศัพท์");

}

if (!navigator.mediaDevices?.getUserMedia) {

throw new Error("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง กรุณาใช้ Chrome ผ่าน HTTPS");

}

stream = await navigator.mediaDevices.getUserMedia({

video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },

audio: false

});

const video = $("camera");

video.srcObject = stream;

await video.play();

$("cameraPlaceholder").classList.add("hidden");

$("scanLine").style.display = "block";

$("startCamera").disabled = true;

$("captureSticker").disabled = false;

$("stopCamera").disabled = false;

$("ocrStatus").textContent = "กล้องพร้อม — จัด Sticker ให้อยู่เต็มภาพ ให้ตัวหนังสือชัด แล้วกด “อ่าน Sticker”";

} catch (e) {

if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }

Swal.fire({ icon: "error", title: "เปิดกล้องไม่ได้", text: e?.message || "กรุณาอนุญาต Camera ใน Browser" });

}

}



function stopCamera() {

if (stream) {

stream.getTracks().forEach(track => track.stop());

stream = null;

}

$("camera").srcObject = null;

$("cameraPlaceholder").classList.remove("hidden");

$("scanLine").style.display = "none";

$("startCamera").disabled = false;

$("captureSticker").disabled = true;

$("stopCamera").disabled = true;

}



function captureFrame() {

const video = $("camera");

if (!video.videoWidth || !video.videoHeight) throw new Error("กล้องยังไม่พร้อม กรุณารอสักครู่แล้วลองใหม่");

const canvas = $("captureCanvas");

const maxWidth = 2200;

const scale = Math.min(1, maxWidth / video.videoWidth);

canvas.width = Math.round(video.videoWidth * scale);

canvas.height = Math.round(video.videoHeight * scale);

const ctx = canvas.getContext("2d", { willReadFrequently: true });

ctx.drawImage(video, 0, 0, canvas.width, canvas.height);



// เพิ่มความคมชัด/คอนทราสต์เล็กน้อย โดยไม่แปลงเป็นภาพขาวดำจัดเกินไป

const image = ctx.getImageData(0, 0, canvas.width, canvas.height);

for (let i = 0; i < image.data.length; i += 4) {

const gray = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];

const value = Math.max(0, Math.min(255, (gray - 128) * 1.25 + 128));

image.data[i] = value;

image.data[i + 1] = value;

image.data[i + 2] = value;

}

ctx.putImageData(image, 0, 0);

return canvas;

}



async function ensureOcrWorker() {

if (worker) return worker;

if (!window.Tesseract) throw new Error("โหลดระบบ OCR ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีโหลดหน้า");

$("ocrStatus").textContent = "กำลังดาวน์โหลดข้อมูลภาษาไทย/อังกฤษสำหรับ OCR...";

worker = await Tesseract.createWorker("tha+eng", 1, {

logger: message => {

if (message.status) {

const pct = typeof message.progress === "number" ? ` ${Math.round(message.progress * 100)}%` : "";

$("ocrStatus").textContent = `กำลังอ่าน Sticker: ${message.status}${pct}`;

}

if (typeof message.progress === "number") {

$("ocrBar").style.width = `${Math.max(2, Math.round(message.progress * 100))}%`;

}

}

});

// Sticker มีข้อความไทยและอังกฤษ ไม่ใช้ HN เป็นเงื่อนไขบังคับ

await worker.setParameters({ preserve_interword_spaces: "1" });

return worker;

}



async function captureSticker() {

if (ocrBusy) return;

try {

ocrBusy = true;

$("captureSticker").disabled = true;

$("ocrProgress").style.display = "block";

$("ocrBar").style.width = "2%";

$("ocrDebugWrap").classList.add("hidden");

$("ocrStatus").textContent = "กำลังถ่ายภาพ Sticker...";



const canvas = captureFrame();

const ocr = await ensureOcrWorker();

const result = await ocr.recognize(canvas);

const text = result?.data?.text || "";

const data = parseStickerText(text);



console.log("OCR RAW TEXT:", text);

console.log("PARSED STICKER DATA:", data);

$("ocrDebug").textContent = text || "OCR ไม่พบข้อความในภาพ";

$("ocrDebugWrap").classList.remove("hidden");



// ไม่บังคับ HN เพราะไม่ได้ใช้เป็นข้อมูลหลักของระบบจ่ายนี้

if (!data.patient_name || !data.medicine_name || !data.dose_count) {

const missing = [];

if (!data.patient_name) missing.push("ชื่อผู้รับบริการ");

if (!data.medicine_name) missing.push("ชื่อยา/วัคซีน");

if (!data.dose_count) missing.push("จำนวนโดส");

throw new Error(`อ่านข้อมูลไม่ครบ: ${missing.join(", ")} กรุณาจัด Sticker ให้เต็มภาพและถ่ายใหม่ หากยังไม่สำเร็จให้เปิด “ดูข้อความที่ OCR อ่านได้”`);

}



item = data;

stopCamera();

$("ocrBar").style.width = "100%";

$("ocrStatus").textContent = "อ่าน Sticker สำเร็จ กำลังค้นหา Lot จาก Inventory...";

lots = await getDispenseLots(item.medicine_name);

if (!Array.isArray(lots)) lots = [];

selectedLot = null;

render();

$("ocrStatus").textContent = lots.length

? "อ่านสำเร็จ — กรุณาตรวจสอบข้อมูลและเลือก Lot จาก Inventory"

: "อ่านข้อมูลสำเร็จ แต่ไม่พบ Lot ที่มี Stock สำหรับชื่อวัคซีนนี้";

} catch (e) {

console.error("DISPENSE OCR ERROR:", e);

Swal.fire({ icon: "warning", title: "อ่าน Sticker ไม่สำเร็จ", text: e?.message || "กรุณาลองถ่ายใหม่" });

$("ocrStatus").textContent = "อ่านไม่สำเร็จ — ตรวจข้อความ OCR ด้านล่าง หรือจัด Sticker ให้เต็มภาพแล้วลองใหม่";

} finally {

ocrBusy = false;

$("captureSticker").disabled = !stream;

setTimeout(() => { $("ocrProgress").style.display = "none"; }, 700);

}

}



function clean(value) {
      return String(value || "")
        .replace(/[|]/g, " ")
        .replace(/[‐‑‒–—]/g, "-")
        .replace(/[ \t]+/g, " ")
        .trim();
    }

    function normalizeThaiPrefix(value) {
      return String(value || "")
        .replace(/^น\s*\.?\s*ส\s*\.?\s*/, "น.ส. ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function parseStickerText(raw) {
      const lines = String(raw || "")
        .split(/\r?\n/)
        .map(clean)
        .filter(Boolean);
      const joined = lines.join(" ");

      const hnMatch = joined.match(/\bHN\s*[:：]?\s*(\d{8,20})\b/i);
      const hn = hnMatch ? hnMatch[1] : "";

      let patient = "";
      const patientPrefix = /^(?:น\s*\.?\s*ส\s*\.?|นางสาว|นาย|นาง|เด็กชาย|เด็กหญิง)\s*/;
      for (const line of lines) {
        if (patientPrefix.test(line)) {
          patient = line.replace(/\s*(?:วันที่|วันเกิด|HN)\s*[:：]?.*$/i, "").trim();
          patient = normalizeThaiPrefix(patient);
          break;
        }
      }
      if (!patient) {
        const patientMatch = joined.match(
          /((?:น\s*\.?\s*ส\s*\.?|นางสาว|นาย|นาง|เด็กชาย|เด็กหญิง)\s*[^0-9]{2,80}?)(?=\s*(?:วันที่|วันเกิด|HN)\b)/i
        );
        if (patientMatch) patient = normalizeThaiPrefix(clean(patientMatch[1]));
      }

      let medicine = "";
      for (const line of lines) {
        if (/^Vaccine\b/i.test(line)) {
          medicine = line
            .replace(/\s*[#＃]\s*\d+\s*(?:โด๊ส|โดส|dose|doses?)/i, "")
            .replace(/\s*[.,;:]+\s*$/, "")
            .trim();
          break;
        }
      }
      if (!medicine) {
        for (const line of lines) {
          if (/^(?:วัคซีน|ยา)\s*/i.test(line)) {
            medicine = line
              .replace(/\s*[#＃]\s*\d+\s*(?:โด๊ส|โดส|dose|doses?)/i, "")
              .replace(/\s*[.,;:]+\s*$/, "")
              .trim();
            break;
          }
        }
      }
      if (!medicine) {
        const medicineMatch = joined.match(/Vaccine\s+[A-Za-z0-9()/_.-]+(?:\s+[A-Za-z0-9()/_.-]+){0,8}/i);
        if (medicineMatch) medicine = clean(medicineMatch[0]).replace(/[.,;:]+$/, "");
      }

      // 3. อ่านจำนวนโดสจากข้อความไทย/อังกฤษและเลขไทย
      // Sticker นี้ใช้รูปแบบ "# 1 โด๊ส" จึงให้ความสำคัญกับเลขหลัง # ก่อน
      const normalizedText = joined
        .replace(/[๐-๙]/g, ch => String("๐๑๒๓๔๕๖๗๘๙".indexOf(ch)))
        .replace(/[＃﹟]/g, "#")
        .replace(/[|]/g, " ")
        .replace(/[ 	]+/g, " ");

      const dosePatterns = [
        /[#＃﹟]\s*(\d{1,2})\s*(?:โด๊ส|โดส|โดสส์|โดสๆ|dose|doses?)?/i,
        /(?:จำนวน|qty)\s*[:：]?\s*(\d{1,2})/i,
        /(\d{1,2})\s*(?:โด๊ส|โดส|โดสส์|dose|doses?)/i,
        /(?:โด๊ส|โดส|โดสส์|dose|doses?)\s*[#:：]?\s*(\d{1,2})/i
      ];

      let dose = "";
      for (const pattern of dosePatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
          dose = match[1];
          break;
        }
      }

      const result = {
        patient_name: patient,
        hn,
        medicine_name: medicine,
        dose_count: dose,
        ocr_raw: raw
      };
      console.log("OCR RAW TEXT:", raw);
      console.log("PARSED STICKER DATA:", result);
      return result;
    }

    function esc(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
      })[char]);
    }

    async function searchLots() {
  const medicineName = $("medicineName")?.value?.trim() || "";
  if (!medicineName) {
    return Swal.fire({ icon: "warning", title: "กรุณาระบุชื่อยา/วัคซีน" });
  }
  try {
    $("searchLotsBtn").disabled = true;
    $("lotInfo").textContent = "กำลังค้นหา LOT...";
    item.medicine_name = medicineName;
    item.patient_name = $("patientName").value.trim();
    item.dose_count = String($("doseCount").value).trim();
    lots = await getDispenseLots(medicineName);
    selectedLot = null;
    $("lotSelect").innerHTML = '<option value="">-- ผู้ตรวจเลือก LOT --</option>' +
      lots.map((lot, index) => `<option value="${index}">${esc(lot.name || medicineName)} | ${esc(lot.lot)} — คงเหลือ ${esc(lot.balance)}</option>`).join("");
    $("exp").value = "";
    $("confirm").disabled = true;
    $("lotInfo").textContent = lots.length
      ? `พบ ${lots.length} LOT สำหรับ ${medicineName} กรุณาตรวจชื่อยาและเลือก LOT`
      : "ไม่พบ LOT ที่มียาคงเหลือ กรุณาตรวจชื่อยา หรือเลือกชื่อยาจากฐานข้อมูล";
  } catch (e) {
    $("lotInfo").textContent = e.message || "ค้นหา LOT ไม่สำเร็จ";
  } finally {
    $("searchLotsBtn").disabled = false;
  }
}

function render() {

const preview = $("preview");

preview.classList.remove("hidden");

preview.innerHTML = `

<h2 style="margin:0 0 10px;font-size:20px">ตรวจสอบข้อมูลจาก Sticker</h2>

<p class="status">กรุณาตรวจชื่อผู้รับบริการ ชื่อวัคซีน และจำนวนโดสให้ถูกต้องก่อนจ่าย</p>

<div class="field"><label class="label" for="patientName">ชื่อผู้รับบริการ</label><input id="patientName" class="input" value="${esc(item.patient_name)}"></div>

<div class="field"><label class="label" for="medicineName">ชื่อยา/วัคซีน</label><input id="medicineName" class="input" value="${esc(item.medicine_name)}"></div>

<div class="field"><label class="label" for="doseCount">จำนวนโดส</label><input id="doseCount" class="input" value="${esc(item.dose_count)}" inputmode="numeric"></div>

<div class="field"><label class="label" for="lotSelect">Lot จาก INVENTORY_MOVEMENT</label><button id="searchLotsBtn" class="scan-again" type="button">🔎 ค้นหา LOT จากชื่อยาที่กรอก</button>

<select id="lotSelect" class="select"><option value="">-- ผู้ตรวจเลือก Lot --</option>${lots.map((lot, index) => `<option value="${index}">${esc(lot.lot)} — คงเหลือ ${esc(lot.balance)}</option>`).join("")}</select>

</div>

<div class="field"><label class="label" for="exp">EXP</label><input id="exp" class="input" value="" placeholder="ระบบจะเติมอัตโนมัติ" readonly></div>

<div id="lotInfo" class="lot-info">เลือก Lot เพื่อให้ระบบเติม EXP</div>

<button id="confirm" class="confirm" type="button" disabled>ยืนยันการจ่าย</button>

<button id="scanAgain" class="scan-again" type="button">📷 สแกน Sticker ใหม่</button>

`;



$("searchLotsBtn").onclick = searchLots;
$("medicineName").addEventListener("input", () => {
  selectedLot = null;
  lots = [];
  $("confirm").disabled = true;
  $("exp").value = "";
  $("lotSelect").innerHTML = '<option value="">แก้ไขชื่อยาแล้ว กรุณาค้นหา LOT ใหม่</option>';
  $("lotInfo").textContent = "ชื่อยาเปลี่ยนแล้ว ต้องค้นหา LOT ใหม่";
});
$("lotSelect").onchange = () => {

const index = $("lotSelect").value;

selectedLot = index === "" ? null : lots[Number(index)];

$("exp").value = formatDateMDY(selectedLot?.exp) || "";

$("lotInfo").textContent = selectedLot

? `Lot: ${selectedLot.lot} | EXP: ${formatDateMDY(selectedLot.exp) || "ไม่ระบุ"} | คงเหลือ: ${selectedLot.balance}`

: "เลือก Lot เพื่อให้ระบบเติม EXP";

$("confirm").disabled = !selectedLot;

};

$("confirm").onclick = confirmDispense;

$("scanAgain").onclick = async () => {

item = null;

lots = [];

selectedLot = null;

preview.classList.add("hidden");

$("ocrStatus").textContent = "พร้อมสแกน Sticker ใหม่";

await startCamera();

};



if (!lots.length) {

$("lotInfo").innerHTML = '<span class="danger">ไม่พบ Lot ที่มี Stock สำหรับรายการนี้ กรุณาตรวจชื่อวัคซีนใน Inventory</span>';

}

}



async function confirmDispense() {
if (item) {
  item.patient_name = $("patientName")?.value?.trim() || "";
  item.medicine_name = $("medicineName")?.value?.trim() || "";
  item.dose_count = String($("doseCount")?.value || "").trim();
}
if (!item || !selectedLot) {

return Swal.fire({ icon: "warning", title: "กรุณาเลือก Lot", text: "ผู้ตรวจต้องเลือก Lot จาก Inventory ก่อนยืนยันการจ่าย" });

}

if (Number(item.dose_count) > Number(selectedLot.balance)) {

return Swal.fire({ icon: "warning", title: "Stock ไม่พอ", text: `Lot ${selectedLot.lot} คงเหลือ ${selectedLot.balance} แต่ต้องจ่าย ${item.dose_count}` });

}



const confirmation = await Swal.fire({

icon: "question",

title: "ยืนยันการจ่าย?",

html: `${esc(item.patient_name)}<br>${esc(item.medicine_name)}<br>จำนวน <b>${esc(item.dose_count)}</b> โดส<br>Lot: <b>${esc(selectedLot.lot)}</b><br>EXP: <b>${esc(formatDateMDY(selectedLot.exp) || "ไม่ระบุ")}</b>`,

showCancelButton: true,

confirmButtonText: "ยืนยัน",

cancelButtonText: "ยกเลิก"

});

if (!confirmation.isConfirmed) return;



try {

item.request_id = item.request_id || (crypto.randomUUID ? crypto.randomUUID() : `DO-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const result = await submitDispense({ ...item, lot: selectedLot.lot, request_id: item.request_id });

await Swal.fire({ icon: "success", title: "บันทึกการจ่ายสำเร็จ", text: `เลขที่ ${result.ref_no}`, confirmButtonText: "สแกนรายการถัดไป" });

item = null;

lots = [];

selectedLot = null;

$("preview").classList.add("hidden");

$("ocrDebugWrap").classList.add("hidden");

$("ocrStatus").textContent = "พร้อมสแกนรายการถัดไป";

await startCamera();

} catch (e) {

console.error("SUBMIT DISPENSE ERROR:", e);

Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: e?.message || "เกิดข้อผิดพลาดระหว่างบันทึกการจ่าย" });

}

}



export async function init() {

try {

const response = await fetch("/api/auth/me", { credentials: "include" });

if (!response.ok) throw new Error("ยังไม่ได้เข้าสู่ระบบ");

} catch {

location.href = "/index.html";

return;

}

$("ocrStatus").textContent = "พร้อม — กดเปิดกล้องเพื่อเริ่มสแกน Sticker";

}



export async function destroy() {
  stopCamera();
  if (worker) {
    try { await worker.terminate(); } catch (error) { console.warn("OCR worker terminate:", error); }
    worker = null;
  }
}
