/* =========================================================
   VACCINE MASTER UTILITIES
   public/modules/vaccinemaster/vaccinemaster.utils.js

   หน้าที่:
   - จัดรูปแบบตัวเลข
   - จัดรูปแบบวันที่
   - แปลงวันที่
   - ป้องกัน HTML Injection
========================================================= */

import VM from "./vaccinemaster.shared.js";


/* =========================================================
   FORMAT NUMBER
========================================================= */

function formatNumber(
  value
) {

  const number =
    Number(
      value || 0
    );


  return number.toLocaleString(
    "th-TH"
  );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
  value
) {

  if (!value) {

    return "-";

  }


  const date =
    parseDate(
      value
    );


  if (!date) {

    return String(
      value
    );

  }


  return date.toLocaleDateString(
    "th-TH",
    {

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric"

    }
  );

}


/* =========================================================
   PARSE DATE
========================================================= */

function parseDate(
  value
) {

  if (!value) {

    return null;

  }


  /*
   * Already Date object
   */
  if (
    value instanceof Date
  ) {

    return value;

  }


  const text =
    String(
      value
    ).trim();


  if (!text) {

    return null;

  }


  /* =====================================================
     YYYY-MM-DD
  ===================================================== */

  const isoMatch =
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );


  if (isoMatch) {

    let year =
      Number(
        isoMatch[1]
      );


    const month =
      Number(
        isoMatch[2]
      ) - 1;


    const day =
      Number(
        isoMatch[3]
      );


    /*
     * พ.ศ. → ค.ศ.
     */
    if (
      year > 2400
    ) {

      year -= 543;

    }


    const date =
      new Date(
        year,
        month,
        day
      );


    if (
      !Number.isNaN(
        date.getTime()
      )
      &&
      date.getFullYear() ===
        year
      &&
      date.getMonth() ===
        month
      &&
      date.getDate() ===
        day
    ) {

      return date;

    }

  }


  /* =====================================================
     DD/MM/YYYY
     DD-MM-YYYY
  ===================================================== */

  const parts =
    text.split(
      /[\/\-]/
    );


  if (
    parts.length === 3
  ) {

    let day =
      Number(
        parts[0]
      );


    let month =
      Number(
        parts[1]
      ) - 1;


    let year =
      Number(
        parts[2]
      );


    /*
     * พ.ศ. → ค.ศ.
     */
    if (
      year > 2400
    ) {

      year -= 543;

    }


    const date =
      new Date(
        year,
        month,
        day
      );


    if (
      !Number.isNaN(
        date.getTime()
      )
      &&
      date.getDate() ===
        day
      &&
      date.getMonth() ===
        month
    ) {

      return date;

    }

  }


  /* =====================================================
     FALLBACK
  ===================================================== */

  const date =
    new Date(
      text
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;

  }


  return date;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   REGISTER TO SHARED CONTEXT
========================================================= */

VM.formatNumber =
  formatNumber;


VM.formatDate =
  formatDate;


VM.parseDate =
  parseDate;


VM.escapeHtml =
  escapeHtml;