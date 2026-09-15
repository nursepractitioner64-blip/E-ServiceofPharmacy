const AdmZip = require("adm-zip");
const repository = require("./dispense.repository");
const mapper = require("./dispense.mapper");
const running = require("./dispense.running");

const { mapToSchema } = require("../../config/mapping.engine");

// =========================
// HELPERS
// =========================

function formatPrename(code) {
  const map = {
    "001": "เด็กชาย",
    "002": "เด็กหญิง",
    "003": "นาย",
    "004": "นางสาว",
    "005": "นาง"
  };
  return map[String(code || "").trim()] || "";
}

function formatBirth(v) {
  if (!v) return "";
  const s = String(v);
  if (s.length !== 8) return s;
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
}

function clean(v) {
  const s = String(v || "").trim();
  if (!s || s === "0" || s === "-") return "";
  return s;
}

function buildLocationKey(addr) {
  return [
    addr?.CHANGWAT,
    addr?.AMPUR,
    addr?.TAMBON
  ]
    .map(v => String(v || "").trim().padStart(2, "0"))
    .join("");
}

// =========================
// MAIN UPLOAD
// =========================

async function uploadDrugOpd(buffer) {

  console.log("ZIP SIZE:", buffer.length);

  const [drugMaster, locationMaster, existingMovements] =
    await Promise.all([
      repository.getDrugMaster(),
      repository.getLocationMaster(),
      repository.getStockMovements()
    ]);

  const existingSet = new Set(
    (existingMovements || []).map(r =>
      [r.date, r.code, r.target].join("|")
    )
  );

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  let drugOpdRows = [];
  let persons = [];
  let addresses = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const name = entry.entryName.toLowerCase();
    const text = entry.getData().toString("utf8");

    if (name.includes("drug_opd")) {
      drugOpdRows = mapper.parseDrugOpd(text);
    }

    if (name.includes("person")) {
      persons = mapper.parsePerson(text);
    }

    if (name.includes("address")) {
      addresses = mapper.parseAddress(text);
    }
  }

  // =========================
  // MAPS
  // =========================

  const personMap = new Map();
  const addressMap = new Map();
  const locationMap = new Map();
  const drugMap = new Map();

  for (const p of persons) {
    const cid = String(p.CID || "").trim();
    if (cid) personMap.set(cid, p);
  }

  for (const a of addresses) {
    const cid = String(a.CID || "").trim();
    if (!cid) continue;

    if (!addressMap.has(cid)) addressMap.set(cid, []);
    addressMap.get(cid).push(a);
  }

  for (const l of locationMaster) {
    const key = String(l.code || l.CODE || "").trim();
    const value = String(l.name || l.NAME || "").trim();
    if (key) locationMap.set(key, value);
  }

  for (const r of drugOpdRows) {
    const keys = [r.DNAME, r.DIDSTD, r.CODE]
      .filter(Boolean)
      .map(v => String(v).trim().toLowerCase());

    for (const k of keys) {
      if (!drugMap.has(k)) drugMap.set(k, []);
      drugMap.get(k).push(r);
    }
  }

  // =========================
  // PROCESS
  // =========================

  const dispenseLogs = [];
  const stockMovements = [];

  let count = 0;

  for (const drug of drugMaster) {

    const lookup = [drug.CODE, drug.NAME]
      .filter(Boolean)
      .map(v => String(v).trim().toLowerCase());

    let rows = [];

    for (const k of lookup) {
      rows.push(...(drugMap.get(k) || []));
    }

    // กันซ้ำ DRUG_OPD
    rows = [...new Map(
      rows.map(x => [
        [x.CID, x.SEQ, x.DATESERV, x.DNAME].join("|"),
        x
      ])
    ).values()];

    for (const r of rows) {

      const opd = mapToSchema(r, "STOCK");

      const key = [opd.DATE, drug.CODE, r.CID].join("|");

      // กัน import ซ้ำ MOV
      if (existingSet.has(key)) continue;
      existingSet.add(key);

      const REF_NO = await running.getRefNo();
      const MOVEMENT_ID = await running.getMovementId();

      const cid = String(r.CID || "").trim();
      const person = personMap.get(cid);
      const addr = (addressMap.get(cid) || [])[0];

      const TARGET = person
        ? [
            formatPrename(person.PRENAME),
            person.NAME,
            person.LNAME,
            formatBirth(person.BIRTH),
            person.CID
          ].join(" ")
        : "";

      const locationKey = buildLocationKey(addr);

      const LOCATION = [
        clean(addr?.HOUSENO),
        clean(locationMap.get(locationKey))
      ]
        .filter(Boolean)
        .join(" ");

      const TIME = new Date().toISOString();

      dispenseLogs.push([
        REF_NO,
        opd.DATE,
        "OUT",
        drug.CODE,
        drug.NAME,
        Number(opd.QTY || 0),
        drug.UNIT,
        "",
        "",
        TARGET,
        "SYSTEM",
        TIME
      ]);

      stockMovements.push([
        MOVEMENT_ID,
        "OUT",
        REF_NO,
        opd.DATE,
        drug.CODE,
        drug.NAME,
        Number(opd.QTY || 0),
        drug.UNIT,
        "",
        "",
        TARGET,
        "SYSTEM",
        TIME,
        "",
        LOCATION
      ]);

      count++;
    }
  }

  if (!dispenseLogs.length) {
    throw new Error("ไม่พบข้อมูล DRUG_OPD");
  }

  await repository.insertDispenseLog(dispenseLogs);
  await repository.insertStockMovement(stockMovements);

  return { count };
}

// =========================
// CRUD (เดิมใช้ได้เลย)
// =========================

async function getList() {
  return repository.getStockMovements();
}

async function getByRefNo(refNo) {
  return repository.getByRefNo(refNo);
}

async function createDispense(body) {
  return repository.createDispense(body);
}

async function updateDispense(refNo, body) {
  return repository.updateDispense(refNo, body);
}

async function deleteDispense(refNo) {
  return repository.deleteDispense(refNo);
}

module.exports = {
  uploadDrugOpd,
  getList,
  getByRefNo,
  createDispense,
  updateDispense,
  deleteDispense
};