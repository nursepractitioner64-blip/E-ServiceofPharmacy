/* =========================================================
   VACCINE MASTER CRUD
   public/modules/vaccinemaster/vaccinemaster.crud.js

   หน้าที่:
   - เพิ่ม Vaccine Master
   - แก้ไข Vaccine Master
   - ลบ Vaccine Master
========================================================= */

import VM from "./vaccinemaster.shared.js";


/* =========================================================
   SAVE VACCINE MASTER
========================================================= */

async function saveVaccineMaster(
  form
) {

  const codeEl =
    document.getElementById(
      "vaccinemasterCode"
    );

  const nameEl =
    document.getElementById(
      "vaccinemasterName"
    );

  const thnameEl =
    document.getElementById(
      "vaccinemasterTHname"
    );


  const code =
    String(
      codeEl?.value ?? ""
    ).trim();


  let name =
    String(
      nameEl?.value ?? ""
    ).trim();


  let THname =
    String(
      thnameEl?.value ?? ""
    ).trim();


  /* =====================================================
     EDITING CODE
  ===================================================== */

  const editingCode =
    String(
      form?.dataset?.editingCode ?? ""
    ).trim();


  /* =====================================================
     EDIT MODE
     
     ถ้า NAME จาก input ว่าง
     ให้ดึงจาก Vaccine Master Data
     ===================================================== */

  if (
    editingCode
  ) {

    const existing =
      VM.vaccineMasterData.find(
        item => {

          const itemCode =
            String(
              item.code ??
              item.CODE ??
              ""
            )
              .trim()
              .toUpperCase();

          return (
            itemCode ===
            editingCode
              .toUpperCase()
          );

        }
      );


    if (existing) {

      if (!name) {

        name =
          String(
            existing.name ??
            existing.NAME ??
            ""
          ).trim();

      }


      if (!THname) {

        THname =
          String(
            existing.THname ??
            existing.thname ??
            existing.THNAME ??
            ""
          ).trim();

      }

    }

  }


  /* =====================================================
     DEBUG
  ===================================================== */

  console.log(
    "📝 SAVE VACCINE MASTER INPUT:",
    {
      code,
      name,
      THname,
      editingCode
    }
  );


  /* =====================================================
     VALIDATION
  ===================================================== */

  if (!code) {

    alert(
      "กรุณาระบุ CODE"
    );

    return;

  }


  if (!name) {

    alert(
      "กรุณาระบุ NAME"
    );

    return;

  }


  if (!THname) {

    alert(
      "กรุณาระบุ THname"
    );

    return;

  }


  try {

    let response;


    /* ===================================================
       EDIT
    =================================================== */

    if (
      editingCode
    ) {

      const payload = {

        name:
          name,

        THname:
          THname

      };


      console.log(
        "✏️ UPDATE VACCINE MASTER PAYLOAD:",
        payload
      );


      response =
        await fetch(
          `/api/vaccine-master/${encodeURIComponent(
            editingCode
          )}`,
          {

            method:
              "PUT",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(
                payload
              )

          }
        );

    }


    /* ===================================================
       CREATE
    =================================================== */

    else {

      const payload = {

        code:
          code,

        name:
          name,

        THname:
          THname

      };


      console.log(
        "➕ CREATE VACCINE MASTER PAYLOAD:",
        payload
      );


      response =
        await fetch(
          "/api/vaccine-master",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(
                payload
              )

          }
        );

    }


    /* ===================================================
       RESPONSE
    =================================================== */

    const result =
      await response.json();


    console.log(
      "📥 VACCINE MASTER API RESULT:",
      result
    );


    if (
      !response.ok
    ) {

      throw new Error(
        result.message ||
        `HTTP ${response.status}`
      );

    }


    /* ===================================================
       SUCCESS
    =================================================== */

    alert(
      editingCode
        ? "แก้ไขข้อมูลสำเร็จ"
        : "เพิ่มข้อมูล Vaccine Master สำเร็จ"
    );


    /* ===================================================
       CLOSE MODAL
    =================================================== */

    VM.closeMasterModal();


    /* ===================================================
       RESET FORM
    =================================================== */

    form.reset();


    delete form.dataset.editingCode;


    /* ===================================================
       ENABLE CODE
    =================================================== */

    if (codeEl) {

      codeEl.readOnly =
        false;

    }


    /* ===================================================
       RELOAD
    =================================================== */

    await VM.loadVaccineMaster();


    VM.populateVaccineStockSelect();


  } catch (
    error
  ) {

    console.error(
      "❌ SAVE VACCINE MASTER:",
      error
    );


    alert(
      error.message ||
      "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
    );

  }

}


/* =========================================================
   EDIT VACCINE
========================================================= */

function editVaccine(
  code
) {

  const vaccine =
    VM.vaccineMasterData.find(
      item => {

        const itemCode =
          String(
            item.code ??
            item.CODE ??
            ""
          )
            .trim()
            .toUpperCase();


        return (
          itemCode ===
          String(
            code
          )
            .trim()
            .toUpperCase()
        );

      }
    );


  /* =====================================================
     NOT FOUND
  ===================================================== */

  if (!vaccine) {

    alert(
      "ไม่พบข้อมูลวัคซีน"
    );

    return;

  }


  /* =====================================================
     OPEN MODAL
  ===================================================== */

  VM.openMasterModal();


  /* =====================================================
     GET ELEMENTS
  ===================================================== */

  const codeEl =
    document.getElementById(
      "vaccinemasterCode"
    );


  const nameEl =
    document.getElementById(
      "vaccinemasterName"
    );


  const thnameEl =
    document.getElementById(
      "vaccinemasterTHname"
    );


  const form =
    document.getElementById(
      "vaccinemasterForm"
    );


  /* =====================================================
     CODE
  ===================================================== */

  if (codeEl) {

    codeEl.value =
      vaccine.code ??
      vaccine.CODE ??
      "";

  }


  /* =====================================================
     NAME
  ===================================================== */

  if (nameEl) {

    nameEl.value =
      vaccine.name ??
      vaccine.NAME ??
      "";

  }


  /* =====================================================
     THAI NAME
  ===================================================== */

  if (thnameEl) {

    thnameEl.value =
      vaccine.THname ??
      vaccine.thname ??
      vaccine.THNAME ??
      "";

  }


  /* =====================================================
     CODE READONLY
  ===================================================== */

  if (codeEl) {

    codeEl.readOnly =
      true;

  }


/* =====================================================
   EDITING STATE
===================================================== */

if (form) {

  form.dataset.editingCode =
    String(
      vaccine.code ??
      vaccine.CODE ??
      code
    ).trim();

}


/* =====================================================
   DEBUG
===================================================== */

console.log(
  "✏️ EDIT VACCINE:",
  {
    code:
      codeEl?.value,

    name:
      nameEl?.value,

    THname:
      thnameEl?.value,

    editingCode:
      form?.dataset?.editingCode
  }
);

}


/* =========================================================
   DELETE VACCINE
========================================================= */

async function deleteVaccine(
  code
) {

  const vaccine =
    VM.vaccineMasterData.find(
      item => {

        const itemCode =
          String(
            item.code ??
            item.CODE ??
            ""
          )
            .trim()
            .toUpperCase();


        return (
          itemCode ===
          String(
            code
          )
            .trim()
            .toUpperCase()
        );

      }
    );


  const name =
    vaccine?.name ??
    vaccine?.NAME ??
    code;


  /* =====================================================
     CONFIRM
  ===================================================== */

  const confirmed =
    confirm(
      `ต้องการลบวัคซีน\n\n${name}\nCODE: ${code}\n\nหรือไม่?`
    );


  if (!confirmed) {

    return;

  }


  try {

    /* ===================================================
       DELETE API
    =================================================== */

    const response =
      await fetch(
        `/api/vaccine-master/${encodeURIComponent(
          code
        )}`,
        {

          method:
            "DELETE"

        }
      );


    /* ===================================================
       RESPONSE
    =================================================== */

    const result =
      await response.json();


    if (
      !response.ok
    ) {

      throw new Error(
        result.message ||
        `HTTP ${response.status}`
      );

    }


    /* ===================================================
       SUCCESS
    =================================================== */

    alert(
      "ลบข้อมูลสำเร็จ"
    );


    /* ===================================================
       RELOAD
    =================================================== */

    await VM.loadVaccineMaster();


    VM.populateVaccineStockSelect();


  } catch (
    error
  ) {

    console.error(
      "❌ DELETE VACCINE:",
      error
    );


    alert(
      error.message
    );

  }

}


/* =========================================================
   REGISTER TO SHARED CONTEXT
========================================================= */

VM.saveVaccineMaster =
  saveVaccineMaster;


VM.editVaccine =
  editVaccine;


VM.deleteVaccine =
  deleteVaccine;