const service = require("./receivestock.service");


/* =====================================================
   GET ALL RECEIVE STOCK
   GET /api/receivestock
===================================================== */

exports.getAll = async (req, res) => {

  try {

    const data =
      await service.getAll();

    return res.json({

      ok: true,

      data

    });

  } catch (err) {

    console.error(
      "GET RECEIVE STOCK ERROR:",
      err
    );

    return res.status(500).json({

      ok: false,

      message:
        err.message ||
        "โหลดข้อมูลไม่สำเร็จ"

    });

  }

};


/* =====================================================
   CREATE RECEIVE STOCK
   POST /api/receive-stock
===================================================== */

exports.create = async (req, res) => {

  try {

    console.log(
      "========================================"
    );

    console.log(
      "=== POST /api/receive-stock ==="
    );

    console.log(
      "BODY =",
      req.body
    );


    /* =================================================
       IMPORTANT DEBUG
    ================================================= */

    console.log(
      "BODY NAME =",
      req.body?.name
    );

    console.log(
      "BODY UNIT =",
      req.body?.unit
    );

    console.log(
      "NAME JSON =",
      JSON.stringify(
        req.body?.name
      )
    );

    console.log(
      "UNIT JSON =",
      JSON.stringify(
        req.body?.unit
      )
    );


    /* =================================================
       CREATE
    ================================================= */

    const result =
      await service.create(
        req.body || {}
      );


    console.log(
      "CREATE RESULT =",
      result
    );


    return res.status(200).json({

      ok: true,

      message:
        "บันทึกรับสินค้าสำเร็จ",

      ...result

    });

  } catch (err) {

    console.error(
      "CREATE RECEIVE STOCK ERROR:",
      err
    );

    return res.status(400).json({

      ok: false,

      message:
        err.message ||
        "บันทึกไม่สำเร็จ"

    });

  }

};


/* =====================================================
   NEXT REF NO
   GET /api/receive-stock/refno
===================================================== */

exports.getNextRefNo = async (req, res) => {

  try {

    const refNo =
      await service.getNextRefNo();

    return res.json({

      ok: true,

      refNo

    });

  } catch (err) {

    console.error(
      "GET REFNO ERROR:",
      err
    );

    return res.status(500).json({

      ok: false,

      message:
        err.message ||
        "สร้างเลขที่รับไม่สำเร็จ"

    });

  }

};


/* =====================================================
   INVENTORY MASTER
   GET /api/receive-stock/master
===================================================== */

exports.getInventoryMaster = async (req, res) => {

  try {

    const data =
      await service.getInventoryMaster();

    return res.json({

      ok: true,

      data

    });

  } catch (err) {

    console.error(
      "GET INVENTORY MASTER ERROR:",
      err
    );

    return res.status(500).json({

      ok: false,

      message:
        err.message ||
        "โหลด Master ไม่สำเร็จ"

    });

  }

};

