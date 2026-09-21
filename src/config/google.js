const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({
  path: path.join(__dirname, "../../.env")
});


/* =====================================================
   SPREADSHEET ID
===================================================== */

function getSpreadsheetId() {

  const id =
    String(
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
   GOOGLE SHEETS AUTH
===================================================== */

async function getSheets() {

  const authConfig = {

    scopes: [
      "https://www.googleapis.com/auth/spreadsheets"
    ]

  };


  /* ===================================================
     RENDER / PRODUCTION
     GOOGLE_SERVICE_ACCOUNT = JSON
  =================================================== */

  if (
    process.env.GOOGLE_SERVICE_ACCOUNT
  ) {

    let raw =
      process.env.GOOGLE_SERVICE_ACCOUNT;

    /*
     * รองรับ JSON ที่เก็บ \n
     */
    raw =
      raw.replace(/\\n/g, "\n");

    authConfig.credentials =
      JSON.parse(raw);

  }


  /* ===================================================
     RENDER / PRODUCTION
     EMAIL + PRIVATE KEY
  =================================================== */

  else if (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  ) {

    authConfig.credentials = {

      client_email:
        String(
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        ).trim(),

      private_key:
        String(
          process.env.GOOGLE_PRIVATE_KEY
        ).replace(/\\n/g, "\n")

    };

  }


  /* ===================================================
     LOCAL
  =================================================== */

  else {

    authConfig.keyFile =
      path.join(
        __dirname,
        "../../service-account.json"
      );

  }


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


  const client =
    await auth.getClient();


  return google.sheets({

    version: "v4",

    auth: client

  });

}


/* =====================================================
   HEADER CACHE
===================================================== */

const headerCache =
  new Map();


async function getHeaders(
  sheetName
) {

  if (
    headerCache.has(sheetName)
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
    (res.data.values || [])[0] || [];


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
  data
) {

  const sheets =
    await getSheets();


  const headers =
    await getHeaders(
      sheetName
    );


  const row =
    headers.map(
      h => data[h] ?? ""
    );


  console.log(
    `💾 APPEND ${sheetName}:`,
    row
  );


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


  console.log(
    "✅ GOOGLE SHEETS APPEND:",
    result.data.updates?.updatedRange
  );


  return true;

}


/* =====================================================
   EXPORT
===================================================== */

module.exports = {

  getSheets,

  readRows,

  appendRow,

  getSpreadsheetId

};

