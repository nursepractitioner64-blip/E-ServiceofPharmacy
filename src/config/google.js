const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.join(__dirname, "../../.env") });

function getSpreadsheetId() {
  const id = String(process.env.GOOGLE_SHEET_ID || "").trim();
  if (!id) throw new Error("GOOGLE_SHEET_ID ยังไม่ได้ตั้งค่าใน .env");
  return id;
}

async function getSheets() {
  const authConfig = { scopes: ["https://www.googleapis.com/auth/spreadsheets"] };

  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    authConfig.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    authConfig.credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
  } else {
    authConfig.keyFile = path.join(__dirname, "../../service-account.json");
  }

  const auth = new google.auth.GoogleAuth(authConfig);
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

const headerCache = new Map();

async function getHeaders(sheetName) {
  if (headerCache.has(sheetName)) return headerCache.get(sheetName);
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(), range: `${sheetName}!A1:Z1`
  });
  const headers = (res.data.values || [])[0] || [];
  headerCache.set(sheetName, headers);
  return headers;
}

async function readRows(sheetName) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(), range: `${sheetName}!A:Z`
  });
  const values = res.data.values || [];
  if (!values.length) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ""; });
    return obj;
  });
}

async function appendRow(sheetName, data) {
  const sheets = await getSheets();
  const headers = await getHeaders(sheetName);
  const row = headers.map(h => data[h] ?? "");
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] }
  });
  return true;
}

module.exports = { getSheets, readRows, appendRow, getSpreadsheetId };
