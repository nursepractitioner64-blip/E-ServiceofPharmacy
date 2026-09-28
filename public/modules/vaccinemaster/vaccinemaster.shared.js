/* =========================================================
   VACCINE MASTER SHARED CONTEXT
   public/modules/vaccinemaster/vaccinemaster.shared.js

   ใช้เป็น Shared State / Shared Function Context
   ระหว่าง Vaccine Master modules ที่ถูกแยกไฟล์
========================================================= */

const VM =
  globalThis.VaccineMasterContext ||
  (
    globalThis.VaccineMasterContext = {}
  );


/* =========================================================
   SHARED STATE
========================================================= */

/*
 * Vaccine Master data
 */
VM.vaccineMasterData =
  VM.vaccineMasterData ||
  [];


/*
 * Module initialized state
 */
VM.initialized =
  Boolean(
    VM.initialized
  );


/*
 * Module active state
 */
VM.moduleActive =
  Boolean(
    VM.moduleActive
  );


/* =========================================================
   EXPORT
========================================================= */

export default VM;