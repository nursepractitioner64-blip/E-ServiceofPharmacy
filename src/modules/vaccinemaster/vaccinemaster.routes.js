/* =========================================================
   VACCINE MASTER ROUTES
   src/modules/vaccinemaster/vaccinemaster.routes.js
========================================================= */

const express = require("express");

const router =
  express.Router();


/* =========================================================
   CONTROLLER
========================================================= */

const controller =
  require(
    "./vaccinemaster.controller"
  );


/* =========================================================
   GET VACCINE MASTER
   GET /api/vaccine-master
========================================================= */

router.get(
  "/",
  controller.getVaccineMaster
);


/* =========================================================
   CREATE VACCINE MASTER
   POST /api/vaccine-master
========================================================= */

router.post(
  "/",
  controller.createVaccineMaster
);


/* =========================================================
   UPDATE VACCINE MASTER
   PUT /api/vaccine-master/:code
========================================================= */

router.put(
  "/:code",
  controller.updateVaccineMaster
);


/* =========================================================
   DELETE VACCINE MASTER
   DELETE /api/vaccine-master/:code
========================================================= */

router.delete(
  "/:code",
  controller.deleteVaccineMaster
);


/* =========================================================
   NEXT STOCK REF NO
   GET /api/vaccine-master/stock/next-ref-no

   ต้องวางก่อน /:code
   เพื่อไม่ให้ "stock" ถูกตีความเป็น code
========================================================= */

router.get(
  "/stock/next-ref-no",
  controller.getNextStockRefNo
);

/* =========================================================
   GET VACCINE DISPENSE HISTORY
   GET /api/vaccine-master/stock/movements
========================================================= */

router.get(
  "/stock/movements",
  controller.getVaccineDispenseHistory
);

/* =========================================================
   GET STOCK BY VACCINE CODE
   GET /api/vaccine-master/:code/stock
========================================================= */

router.get(
  "/:code/stock",
  controller.getVaccineStock
);


/* =========================================================
   CREATE STOCK MOVEMENT
   POST /api/vaccine-master/stock
========================================================= */

router.post(
  "/stock",
  controller.createVaccineStock
);


/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;