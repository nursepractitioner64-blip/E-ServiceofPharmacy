const path = require("path");
const dns = require("dns");
const dotenv = require("dotenv");
const { google } = require("googleapis");

/* =====================================================
   GOOGLE SHEETS CONFIG
   ===================================================== */

try {
  dns.setDefaultResultOrder("ipv4first");
} catch (err) {
  console.warn(
    "⚠️ ไม่สามารถตั้ง DNS result order:",
    err.message
  );
}

dotenv.config({
  path: path.join(__dirname, "../../.env")
});

/* =====================================================
   SPREADSHEET ID
   ===================================================== */

function getSpreadsheetId() {
  const id = String(
    process.env.GOOGLE_SHEET_ID || ""
  ).trim();

  if (!id) {
    throw new Error(
      "GOOGLE_SHEET_ID ยังไม่ได้ตั้งค่าใน .env"
    );
  }

  return id;
}

/* =====================================================
   ENV HELPERS
   ===================================================== */

function normalizePrivateKey(value) {
  return String(value || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

/* =====================================================
   GOOGLE AUTH CONFIG
   ===================================================== */

function getAuthConfig() {
  const scopes = [
    "https://www.googleapis.com/auth/spreadsheets"
  ];

  /* ===================================================
     RENDER / PRODUCTION
     GOOGLE_SERVICE_ACCOUNT = JSON
  =================================================== */

  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    let raw = String(
      process.env.GOOGLE_SERVICE_ACCOUNT
    ).trim();

    raw = raw
      .replace(/\r\n/g, "")
      .replace(/\\n/g, "\n");

    let credentials;

    try {
      credentials = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT ไม่ใช่ JSON ที่ถูกต้อง: ${err.message}`
      );
    }

    if (
      !credentials.client_email ||
      !credentials.private_key
    ) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT ไม่มี client_email หรือ private_key"
      );
    }

    credentials.private_key =
      normalizePrivateKey(
        credentials.private_key
      );

    return {
      scopes,
      credentials
    };
  }

  /* ===================================================
     RENDER / PRODUCTION
     EMAIL + PRIVATE KEY
  =================================================== */

  if (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  ) {
    const clientEmail = String(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ).trim();

    const privateKey =
      normalizePrivateKey(
        process.env.GOOGLE_PRIVATE_KEY
      );

    if (
      !clientEmail ||
      !privateKey
    ) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_EMAIL หรือ GOOGLE_PRIVATE_KEY ว่าง"
      );
    }

    return {
      scopes,

      credentials: {
        client_email: clientEmail,
        private_key: privateKey
      }
    };
  }

  /* ===================================================
     LOCAL
     =================================================== */

  return {
    scopes,

    keyFile: path.join(
      __dirname,
      "../../service-account.json"
    )
  };
}

/* =====================================================
   AUTH CACHE
   ===================================================== */

let authPromise = null;
let sheetsPromise = null;

/* =====================================================
   CREATE GOOGLE AUTH
   ===================================================== */

async function createAuth() {
  const authConfig =
    getAuthConfig();

  console.log(
    "🔐 GOOGLE AUTH:",
    authConfig.credentials
      ? "ENV"
      : `KEYFILE: ${authConfig.keyFile}`
  );

  const auth =
    new google.auth.GoogleAuth(
      authConfig
    );

  /*
   * Google Auth อาจต้องเรียก OAuth token
   * จึง retry กรณี network / DNS สะดุด
   */

  const maxAttempts = 3;

  let lastError = null;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      const client =
        await auth.getClient();

      console.log(
        `✅ GOOGLE AUTH CLIENT READY (attempt ${attempt})`
      );

      return client;

    } catch (err) {

      lastError = err;

      console.error(
        `❌ GOOGLE AUTH CLIENT FAILED (${attempt}/${maxAttempts}):`,
        err.code ||
          err.message
      );

      if (
        attempt < maxAttempts
      ) {

        const delay =
          attempt * 1000;

        console.log(
          `⏳ Retry Google Auth ใน ${delay} ms...`
        );

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              delay
            )
        );
      }
    }
  }

  throw lastError;
}

/* =====================================================
   GOOGLE SHEETS CLIENT
   ===================================================== */

async function getSheets() {

  /*
   * สร้าง Auth เพียงครั้งเดียว
   * ต่อ Node process
   */

  if (!authPromise) {

    authPromise =
      createAuth()
        .catch(err => {

          /*
           * ถ้า Auth ครั้งแรกพัง
           * อนุญาตให้ request ถัดไปลองใหม่
           */

          authPromise = null;

          throw err;
        });
  }

  const client =
    await authPromise;

  /*
   * สร้าง Sheets API object เพียงครั้งเดียว
   */

  if (!sheetsPromise) {

    sheetsPromise =
      Promise.resolve(
        google.sheets({
          version: "v4",
          auth: client
        })
      );
  }

  return sheetsPromise;
}

/* =====================================================
   HEADER CACHE
   ===================================================== */

const headerCache =
  new Map();

/* =====================================================
   GET HEADERS
   ===================================================== */

async function getHeaders(
  sheetName
) {

  if (
    headerCache.has(
      sheetName
    )
  ) {

    return headerCache.get(
      sheetName
    );
  }

  const sheets =
    await getSheets();

  const res =
    await sheets.spreadsheets.values.get({

      spreadsheetId:
        getSpreadsheetId(),

      range:
        `${sheetName}!A1:Z1`
    });

  const headers =
    (res.data.values || [])[0] ||
    [];

  console.log(
    `📋 ${sheetName} HEADERS =`,
    headers
  );

  if (
    !headers.length
  ) {

    throw new Error(
      `ไม่พบ Header ใน Sheet ${sheetName}`
    );
  }

  headerCache.set(
    sheetName,
    headers
  );

  return headers;
}

/* =====================================================
   READ ROWS
   ===================================================== */

async function readRows(
  sheetName
) {

  const sheets =
    await getSheets();

  const res =
    await sheets.spreadsheets.values.get({

      spreadsheetId:
        getSpreadsheetId(),

      range:
        `${sheetName}!A:Z`
    });

  const values =
    res.data.values || [];

  if (
    !values.length
  ) {

    return [];
  }

  const headers =
    values[0];

  return values
    .slice(1)
    .map(row => {

      const obj = {};

      headers.forEach(
        (h, i) => {

          obj[h] =
            row[i] ?? "";

        }
      );

      return obj;
    });
}

/* =====================================================
   APPEND ROW
   ===================================================== */

async function appendRow(
  sheetName,
  data = {}
) {

  const sheets =
    await getSheets();

  const headers =
    await getHeaders(
      sheetName
    );

  /* ===================================================
     NORMALIZE DATA
     =================================================== */

  const normalizedData = {};

  Object.keys(
    data || {}
  ).forEach(
    key => {

      normalizedData[
        String(key)
          .trim()
          .toUpperCase()
      ] = data[key];

    }
  );

  /* ===================================================
     BUILD ROW
     =================================================== */

  const row =
    headers.map(
      header => {

        const normalizedHeader =
          String(header)
            .trim()
            .toUpperCase();

        return (
          normalizedData[
            normalizedHeader
          ] ?? ""
        );

      }
    );

  console.log(
    `💾 APPEND ${sheetName}:`,
    {
      headers,
      data,
      row
    }
  );

  /* ===================================================
     VALIDATE
     =================================================== */

  const hasData =
    row.some(
      value =>
        String(
          value ?? ""
        ).trim() !== ""
    );

  if (!hasData) {

    throw new Error(
      `ไม่สามารถสร้างข้อมูลสำหรับ Sheet ${sheetName}`
    );
  }

  /* ===================================================
     GOOGLE SHEETS APPEND
     =================================================== */

  const result =
    await sheets.spreadsheets.values.append({

      spreadsheetId:
        getSpreadsheetId(),

      range:
        `${sheetName}!A:Z`,

      valueInputOption:
        "USER_ENTERED",

      insertDataOption:
        "INSERT_ROWS",

      requestBody: {

        values: [
          row
        ]
      }
    });

  const updatedRange =
    result.data
      ?.updates
      ?.updatedRange;

  console.log(
    "✅ GOOGLE SHEETS APPEND:",
    updatedRange
  );

  if (
    !updatedRange
  ) {

    throw new Error(
      `Google Sheets ไม่สามารถเพิ่มข้อมูลใน ${sheetName} ได้`
    );
  }

  return true;
}

/* =====================================================
   FIND ROW NUMBER
   ===================================================== */

async function findRowNumber(
  sheetName,
  keyHeader,
  keyValue
) {

  const sheets =
    await getSheets();

  const headers =
    await getHeaders(
      sheetName
    );

  const keyIndex =
    headers.findIndex(
      h =>
        String(h)
          .trim()
          .toUpperCase() ===
        String(keyHeader)
          .trim()
          .toUpperCase()
    );

  if (
    keyIndex === -1
  ) {

    throw new Error(
      `ไม่พบ Column ${keyHeader} ใน Sheet ${sheetName}`
    );
  }

  const columnLetter =
    columnNumberToLetter(
      keyIndex + 1
    );

  const res =
    await sheets.spreadsheets.values.get({

      spreadsheetId:
        getSpreadsheetId(),

      range:
        `${sheetName}!${columnLetter}:${columnLetter}`
    });

  const values =
    res.data.values || [];

  const wanted =
    String(
      keyValue ?? ""
    ).trim();

  /*
   * values[0] = Header
   * ข้อมูลจริงเริ่มแถว 2
   */

  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const current =
      String(
        values[i]?.[0] ?? ""
      ).trim();

    if (
      current === wanted
    ) {

      return i + 1;
    }
  }

  return null;
}

/* =====================================================
   COLUMN NUMBER → LETTER
   ===================================================== */

function columnNumberToLetter(
  number
) {

  let result = "";

  let n =
    Number(number);

  while (
    n > 0
  ) {

    const remainder =
      (n - 1) % 26;

    result =
      String.fromCharCode(
        65 + remainder
      ) +
      result;

    n =
      Math.floor(
        (n - 1) / 26
      );
  }

  return result;
}

/* =====================================================
   UPDATE ROW
   ===================================================== */

async function updateRow(
  sheetName,
  keyHeader,
  keyValue,
  data
) {

  const sheets =
    await getSheets();

  const headers =
    await getHeaders(
      sheetName
    );

  const rowNumber =
    await findRowNumber(
      sheetName,
      keyHeader,
      keyValue
    );

  if (
    !rowNumber
  ) {

    throw new Error(
      `ไม่พบข้อมูล ${keyHeader}=${keyValue} ใน Sheet ${sheetName}`
    );
  }

  const normalizedData = {};

  Object.keys(
    data || {}
  ).forEach(
    key => {

      normalizedData[
        String(key)
          .trim()
          .toUpperCase()
      ] = data[key];

    }
  );

  const row =
    headers.map(
      header => {

        const normalizedHeader =
          String(header)
            .trim()
            .toUpperCase();

        return (
          normalizedData[
            normalizedHeader
          ] ?? ""
        );

      }
    );

  console.log(
    `✏️ UPDATE ${sheetName} ROW ${rowNumber}:`,
    row
  );

  const result =
    await sheets.spreadsheets.values.update({

      spreadsheetId:
        getSpreadsheetId(),

      range:
        `${sheetName}!A${rowNumber}:Z${rowNumber}`,

      valueInputOption:
        "USER_ENTERED",

      requestBody: {

        values: [
          row
        ]
      }
    });

  console.log(
    "✅ GOOGLE SHEETS UPDATE:",
    result.data.updatedRange
  );

  return true;
}

/* =====================================================
   DELETE ROW
   ===================================================== */

async function deleteRow(
  sheetName,
  keyHeader,
  keyValue
) {

  const sheets =
    await getSheets();

  const rowNumber =
    await findRowNumber(
      sheetName,
      keyHeader,
      keyValue
    );

  if (
    !rowNumber
  ) {

    throw new Error(
      `ไม่พบข้อมูล ${keyHeader}=${keyValue} ใน Sheet ${sheetName}`
    );
  }

  const spreadsheet =
    await sheets.spreadsheets.get({

      spreadsheetId:
        getSpreadsheetId(),

      fields:
        "sheets.properties"
    });

  const targetSheet =
    (
      spreadsheet.data.sheets ||
      []
    ).find(
      sheet =>
        sheet.properties &&
        sheet.properties.title ===
        sheetName
    );

  if (
    !targetSheet
  ) {

    throw new Error(
      `ไม่พบ Sheet ${sheetName}`
    );
  }

  const sheetId =
    targetSheet.properties.sheetId;

  console.log(
    `🗑️ DELETE ${sheetName} ROW ${rowNumber}`
  );

  await sheets.spreadsheets.batchUpdate({

    spreadsheetId:
      getSpreadsheetId(),

    requestBody: {

      requests: [

        {

          deleteDimension: {

            range: {

              sheetId,

              dimension:
                "ROWS",

              startIndex:
                rowNumber - 1,

              endIndex:
                rowNumber
            }
          }
        }
      ]
    }
  });

  console.log(
    `✅ GOOGLE SHEETS DELETE: ${sheetName} ROW ${rowNumber}`
  );

  return true;
}

/* =====================================================
   RESET GOOGLE AUTH CACHE
   ===================================================== */

function resetGoogleAuth() {

  authPromise = null;

  sheetsPromise = null;

  console.log(
    "🔄 GOOGLE AUTH CACHE RESET"
  );
}

/* =====================================================
   EXPORT
   ===================================================== */

module.exports = {

  getSheets,

  readRows,

  appendRow,

  updateRow,

  deleteRow,

  findRowNumber,

  getSpreadsheetId,

  resetGoogleAuth

};