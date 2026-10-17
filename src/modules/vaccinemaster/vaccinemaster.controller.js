/* =========================================================

VACCINE MASTER CONTROLLER

FILE:

src/modules/vaccinemaster/vaccinemaster.controller.js

Routes:

GET    /api/vaccine-master

POST   /api/vaccine-master

PUT    /api/vaccine-master/:code

DELETE /api/vaccine-master/:code

GET    /api/vaccine-master/stock/next-ref-no

GET    /api/vaccine-master/:code/stock

POST   /api/vaccine-master/stock

หน้าที่:

\* รับ Request

\* Validate ข้อมูลเบื้องต้น

\* เรียก Service

\* ส่ง Response

\* ไม่ทำ Business Logic

  ========================================================= */

/* =========================================================

SERVICE

\========================================================= */

const service =

require(

"./vaccinemaster.service"

);

/* =========================================================

HELPER

\========================================================= */

function clean(value) {

return (

value === undefined ||

value === null

)

? ""

: String(value).trim();

}

function sendError(

res,

error,

fallbackMessage

) {

console.error(

`❌ Vaccine Master Controller Error:`,

error

);

return res.status(

500

).json({

success:

  false,

message:

  error?.message ||

  fallbackMessage

});

}

/* =========================================================

GET VACCINE MASTER

GET /api/vaccine-master

\========================================================= */

async function getVaccineMaster(

req,

res

) {

try {

const data =

  await service.getVaccineMaster();

return res.json({

  success:

    true,

  data:

    Array.isArray(data)

      ? data

      : []

});

}

catch (error) {

return sendError(

  res,

  error,

  "ไม่สามารถโหลดข้อมูล Vaccine Master ได้"

);

}

}

/* =========================================================

CREATE VACCINE MASTER

POST /api/vaccine-master

\========================================================= */

async function createVaccineMaster(

req,

res

) {

try {

const body =

  req.body || {};

const code =

  clean(

    body.code ??

    body.CODE

  );

const name =

  clean(

    body.name ??

    body.NAME

  );

const THname =

  clean(

    body.THname ??

    body.thname ??

    body.THNAME

  );

/* =====================================================

   BASIC VALIDATION

\===================================================== */

if (!code) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุ CODE"

  });

}

if (!name) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุ NAME"

  });

}

/* =====================================================

   SERVICE

\===================================================== */

const result =

  await service.createVaccineMaster({

    code,

    name,

    THname

  });

return res.status(

  201

).json({

  success:

    true,

  data:

    result,

  message:

    "เพิ่มข้อมูล Vaccine Master สำเร็จ"

});

}

catch (error) {

console.error(

  "❌ createVaccineMaster:",

  error

);

/*

 \* CODE ซ้ำ / Validation จาก Service

 \* ให้ตอบ 400 แทน 500

 */

const message =

  error?.message ||

  "ไม่สามารถเพิ่มข้อมูล Vaccine Master ได้";

const status =

  message.includes(

    "มีอยู่แล้ว"

  )

    ? 400

    : 500;

return res.status(

  status

).json({

  success:

    false,

  message

});

}

}

/* =========================================================

UPDATE VACCINE MASTER

PUT /api/vaccine-master/:code

\========================================================= */

async function updateVaccineMaster(

req,

res

) {

try {

const code =

  clean(

    req.params?.code

  );

if (!code) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "ไม่พบ CODE"

  });

}

const body =

  req.body || {};

const name =

  clean(

    body.name ??

    body.NAME

  );

const THname =

  clean(

    body.THname ??

    body.thname ??

    body.THNAME

  );

/* =====================================================

   BASIC VALIDATION

\===================================================== */

if (!name) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุ NAME"

  });

}

if (!THname) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุ THname"

  });

}

/* =====================================================

   SERVICE

\===================================================== */

const result =

  await service.updateVaccineMaster(

    code,

    {

      name,

      THname

    }

  );

return res.json({

  success:

    true,

  data:

    result,

  message:

    "แก้ไขข้อมูล Vaccine Master สำเร็จ"

});

}

catch (error) {

console.error(

  "❌ updateVaccineMaster:",

  error

);

const message =

  error?.message ||

  "ไม่สามารถแก้ไขข้อมูล Vaccine Master ได้";

const status =

  message.includes(

    "ไม่พบ"

  )

    ? 404

    : 500;

return res.status(

  status

).json({

  success:

    false,

  message

});

}

}

/* =========================================================

DELETE VACCINE MASTER

DELETE /api/vaccine-master/:code

\========================================================= */

async function deleteVaccineMaster(

req,

res

) {

try {

const code =

  clean(

    req.params?.code

  );

if (!code) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "ไม่พบ CODE"

  });

}

/* =====================================================

   SERVICE

\===================================================== */

const result =

  await service.deleteVaccineMaster(

    code

  );

return res.json({

  success:

    true,

  data:

    result,

  message:

    "ลบข้อมูล Vaccine Master สำเร็จ"

});

}

catch (error) {

console.error(

  "❌ deleteVaccineMaster:",

  error

);

const message =

  error?.message ||

  "ไม่สามารถลบข้อมูล Vaccine Master ได้";

const status =

  message.includes(

    "ไม่พบ"

  )

    ? 404

    : 500;

return res.status(

  status

).json({

  success:

    false,

  message

});

}

}

/* =========================================================

GET NEXT STOCK REF NO

GET /api/vaccine-master/stock/next-ref-no

\========================================================= */

async function getNextStockRefNo(

req,

res

) {

try {

const type = clean(req.query?.type || "IN").toUpperCase();

if (!["IN", "OUT"].includes(type)) {

  return res.status(400).json({

    success: false,

    message: "TYPE ต้องเป็น IN หรือ OUT"

  });

}

const result =

  await service.getNextStockRefNo(type);

return res.json({

  success:

    true,

  data:

    result

});

}

catch (error) {

return sendError(

  res,

  error,

  "ไม่สามารถสร้างเลข REF NO ได้"

);

}

}

/* =========================================================

GET VACCINE STOCK

GET /api/vaccine-master/:code/stock

\========================================================= */

async function getVaccineStock(

req,

res

) {

try {

const code =

  clean(

    req.params?.code

  );

if (!code) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "ไม่พบ CODE"

  });

}

const data =

  await service.getVaccineStock(

    code

  );

return res.json({

  success:

    true,

  data:

    Array.isArray(data)

      ? data

      : []

});

}

catch (error) {

console.error(

  "❌ getVaccineStock:",

  error

);

const message =

  error?.message ||

  "ไม่สามารถโหลด Vaccine Stock ได้";

const status =

  message.includes(

    "ไม่พบ"

  )

    ? 404

    : 500;

return res.status(

  status

).json({

  success:

    false,

  message

});

}

}

/* =========================================================

CREATE VACCINE STOCK

POST /api/vaccine-master/stock

ปัจจุบัน Repository รองรับการรับเข้า

TYPE = IN

Controller รับ TYPE เพื่อให้ API

ยังรองรับโครงสร้างเดิม

\========================================================= */

async function createVaccineStock(

req,

res

) {

try {

const body =

  req.body || {};

/* =====================================================

   READ INPUT

\===================================================== */

const type =

  clean(

    body.type ??

    body.TYPE ??

    "IN"

  )

    .toUpperCase();

const date =

  clean(

    body.date ??

    body.DATE

  );

const code =

  clean(

    body.code ??

    body.CODE

  );

const name =

  clean(

    body.name ??

    body.NAME

  );

const qty =

  Number(

    body.qty ??

    body.QTY ??

    0

  );

const unit =

  clean(

    body.unit ??

    body.UNIT

  );

const lot =

  clean(

    body.lot ??

    body.LOT

  );

const exp =

  clean(

    body.exp ??

    body.EXP

  );

const user =

  clean(

    body.user ??

    body.USER

  );

const location =

  clean(

    body.location ??

    body.Location ??

    body.LOCATION

  );

const target =

  clean(

    body.target ??

    body.TARGET

  );

const remark =

  clean(

    body.remark ??

    body.REMARK

  );

/* =====================================================

   BASIC VALIDATION

\===================================================== */

if (type !== "IN" && type !== "OUT") {

  return res.status(400).json({

    success: false,

    message: "TYPE ต้องเป็น IN หรือ OUT"

  });

}

if (!date) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุวันที่"

  });

}

if (!code) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุ CODE"

  });

}

if (

  !Number.isFinite(qty) ||

  qty <= 0

) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "จำนวนต้องมากกว่า 0"

  });

}

if (!unit) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุ UNIT"

  });

}

if (!lot) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุ LOT"

  });

}

if (!exp) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุวันหมดอายุ"

  });

}

if (!user) {

  return res.status(

    400

  ).json({

    success:

      false,

    message:

      "กรุณาระบุผู้ดำเนินการ"

  });

}

/* =====================================================

   SERVICE

\===================================================== */

const result =

  await service.createVaccineStock({

    type,

    date,

    code,

    name,

    qty,

    unit,

    lot,

    exp,

    user,

    location,

    target,

    remark

  });

/* =====================================================

   SUCCESS

\===================================================== */

return res.status(

  201

).json({

  success:

    true,

  data:

    result,

  message:

    "บันทึก Vaccine Stock สำเร็จ"

});

}

catch (error) {

console.error(

  "❌ createVaccineStock:",

  error

);

const message =

  error?.message ||

  "ไม่สามารถบันทึก Vaccine Stock ได้";

const status =

  (

    message.includes(

      "ไม่พบ"

    ) ||

    message.includes(

      "ไม่เพียงพอ"

    ) ||

    message.includes(

      "กรุณา"

    ) ||

    message.includes(

      "จำนวน"

    )

  )

    ? 400

    : 500;

return res.status(

  status

).json({

  success:

    false,

  message

});

}

}



/* =========================================================
   GET VACCINE DISPENSE HISTORY
   GET /api/vaccine-master/stock/movements
========================================================= */

async function getVaccineDispenseHistory(req, res) {
  try {
    const data = await service.getVaccineDispenseHistory();

    return res.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });
  } catch (error) {
    console.error(
      "❌ getVaccineDispenseHistory:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error?.message ||
        "ไม่สามารถโหลดประวัติการจ่ายวัคซีนได้"
    });
  }
}



module.exports = {
  getVaccineMaster,
  createVaccineMaster,
  updateVaccineMaster,
  deleteVaccineMaster,
  getNextStockRefNo,
  getVaccineStock,
  createVaccineStock,
  getVaccineDispenseHistory
};
