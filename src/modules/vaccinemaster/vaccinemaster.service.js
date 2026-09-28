/* =========================================================
   VACCINE MASTER SERVICE

   FILE:
   src/modules/vaccinemaster/vaccinemaster.service.js

   หน้าที่:
   - Business Logic ของ Vaccine Master
   - เชื่อม Controller → Repository
   - ตรวจสอบข้อมูลระดับ Business Logic
   - จัดการ Vaccine Master
   - จัดการ Vaccine Stock

   IMPORTANT:
   - ลดการอ่าน Google Sheet ซ้ำจาก Service
   - Repository เป็นผู้จัดการการอ่าน/เขียน Sheet
   - Service ไม่เรียก findVaccineByCode()
     ก่อน CRUD โดยไม่จำเป็น
========================================================= */


/* =========================================================
   REPOSITORY
========================================================= */

const repository =
  require(
    "./vaccinemaster.repository"
  );



/* =========================================================
   GET VACCINE MASTER
========================================================= */

async function getVaccineMaster() {

  const rows =
    await repository.getVaccineMaster();


  if (
    !Array.isArray(rows)
  ) {

    return [];

  }


  return rows;

}



/* =========================================================
   CREATE VACCINE MASTER
========================================================= */

async function createVaccineMaster(
  data = {}
) {

  /* =====================================================
     1. READ INPUT
  ===================================================== */

  const code =
    String(
      data.code ??
      ""
    )
      .trim();


  const name =
    String(
      data.name ??
      ""
    )
      .trim();


  const THname =
    String(
      data.THname ??
      ""
    )
      .trim();



  /* =====================================================
     2. VALIDATION
  ===================================================== */

  if (!code) {

    throw new Error(
      "กรุณาระบุ CODE"
    );

  }


  if (!name) {

    throw new Error(
      "กรุณาระบุ NAME"
    );

  }



  /* =====================================================
     3. CREATE

     ไม่เรียก findVaccineByCode() ที่นี่

     เพราะ Repository.createVaccineMaster()
     ตรวจสอบ CODE ซ้ำอยู่แล้ว

     ช่วยลดการอ่าน VACCINE_MASTER
     จาก 2 ครั้ง เหลือ 1 ครั้ง
     ในกรณีที่ Repository จัดการตรวจสอบใน operation เดียว
  ===================================================== */

  const result =
    await repository.createVaccineMaster({

      code,

      name,

      THname

    });



  return result;

}



/* =========================================================
   UPDATE VACCINE MASTER
========================================================= */

async function updateVaccineMaster(
  code,
  data = {}
) {

  /* =====================================================
     1. CLEAN CODE
  ===================================================== */

  const vaccineCode =
    String(
      code ??
      ""
    )
      .trim();



  if (!vaccineCode) {

    throw new Error(
      "ไม่พบ CODE"
    );

  }



  /* =====================================================
     2. READ UPDATE VALUES
  ===================================================== */

  const name =
    String(
      data.name ??
      ""
    )
      .trim();


  const THname =
    String(
      data.THname ??
      ""
    )
      .trim();



  /* =====================================================
     3. VALIDATION
  ===================================================== */

  if (!name) {

    throw new Error(
      "กรุณาระบุ NAME"
    );

  }


  if (!THname) {

    throw new Error(
      "กรุณาระบุ THname"
    );

  }



  /* =====================================================
     4. UPDATE

     ไม่เรียก findVaccineByCode() ก่อน

     Repository.updateVaccineMaster()
     เป็นผู้ตรวจสอบว่ามี CODE หรือไม่
  ===================================================== */

  const result =
    await repository.updateVaccineMaster(
      vaccineCode,
      {

        name,

        THname

      }
    );



  return result;

}



/* =========================================================
   DELETE VACCINE MASTER
========================================================= */

async function deleteVaccineMaster(
  code
) {

  /* =====================================================
     1. CLEAN CODE
  ===================================================== */

  const vaccineCode =
    String(
      code ??
      ""
    )
      .trim();



  if (!vaccineCode) {

    throw new Error(
      "ไม่พบ CODE"
    );

  }



  /* =====================================================
     2. DELETE

     ไม่เรียก findVaccineByCode() ก่อน

     Repository.deleteVaccineMaster()
     เป็นผู้ตรวจสอบว่ามีข้อมูลหรือไม่
  ===================================================== */

  const result =
    await repository.deleteVaccineMaster(
      vaccineCode
    );



  return result;

}



/* =========================================================
   NEXT STOCK REF NO
========================================================= */

async function getNextStockRefNo() {

  const refNo =
    await repository.getNextStockRefNo();


  return refNo;

}



/* =========================================================
   GET VACCINE STOCK
========================================================= */

async function getVaccineStock(
  code
) {

  const vaccineCode =
    String(
      code ??
      ""
    )
      .trim();



  if (!vaccineCode) {

    throw new Error(
      "ไม่พบ Vaccine CODE"
    );

  }



  const stock =
    await repository.getVaccineStock(
      vaccineCode
    );



  if (
    !Array.isArray(stock)
  ) {

    return [];

  }



  return stock;

}



/* =========================================================
   CREATE VACCINE STOCK
========================================================= */

async function createVaccineStock(
  data
) {

  /* =====================================================
     1. CHECK DATA
  ===================================================== */

  if (!data) {

    throw new Error(
      "ไม่พบข้อมูล Stock"
    );

  }



  /* =====================================================
     2. TYPE

     Repository ปัจจุบันรองรับ IN เท่านั้น

     ดังนั้น Service ต้องไม่ประกาศรองรับ OUT
     ทั้งที่ Repository ยังไม่รองรับ
  ===================================================== */

  const type =
    String(
      data.type ??
      "IN"
    )
      .trim()
      .toUpperCase();



  if (
    type !== "IN"
  ) {

    throw new Error(
      "Vaccine Stock รับเข้าได้เฉพาะ TYPE = IN"
    );

  }



  /* =====================================================
     3. CODE
  ===================================================== */

  const code =
    String(
      data.code ??
      ""
    )
      .trim();



  if (!code) {

    throw new Error(
      "กรุณาระบุ CODE"
    );

  }



  /* =====================================================
     4. QTY
  ===================================================== */

  const qty =
    Number(
      data.qty
    );



  if (
    !Number.isFinite(qty) ||
    qty <= 0
  ) {

    throw new Error(
      "จำนวนต้องมากกว่า 0"
    );

  }



  /* =====================================================
     5. LOT
  ===================================================== */

  const lot =
    String(
      data.lot ??
      ""
    )
      .trim();



  if (!lot) {

    throw new Error(
      "กรุณาระบุ LOT"
    );

  }



  /* =====================================================
     6. EXP
  ===================================================== */

  const exp =
    String(
      data.exp ??
      ""
    )
      .trim();



  if (!exp) {

    throw new Error(
      "กรุณาระบุวันหมดอายุ"
    );

  }



  /* =====================================================
     7. USER
  ===================================================== */

  const user =
    String(
      data.user ??
      ""
    )
      .trim();



  if (!user) {

    throw new Error(
      "กรุณาระบุผู้ดำเนินการ"
    );

  }



  /* =====================================================
     8. CREATE STOCK

     สำคัญ:

     ไม่เรียก findVaccineByCode() ที่นี่

     เพราะ Repository.createVaccineStock()
     จะตรวจสอบ CODE กับ VACCINE_MASTER
     และดึงชื่อจาก Master เอง

     ดังนั้นคำสั่งเดียวไม่ควรอ่าน Master
     จากทั้ง Service และ Repository
  ===================================================== */

  const result =
    await repository.createVaccineStock({

      type,

      date:
        data.date,

      code,

      name:
        String(
          data.name ??
          ""
        )
          .trim(),

      qty,

      unit:
        String(
          data.unit ??
          ""
        )
          .trim(),

      lot,

      exp,

      user,

location:
  String(
    data.location ??
    ""
  )
    .trim(),

target:
  String(
    data.target ??
    ""
  )
    .trim(),

remark:
  String(
    data.remark ??
    ""
  )
    .trim()

    });



  return result;

}



/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  getVaccineMaster,

  createVaccineMaster,

  updateVaccineMaster,

  deleteVaccineMaster,

  getNextStockRefNo,

  getVaccineStock,

  createVaccineStock

};

