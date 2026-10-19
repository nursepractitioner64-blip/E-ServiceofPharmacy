# Emergency Checklist: Branch-Based Checklist

## Scope

This update is limited to **Emergency Checklist and Daily Check**. The `IMMUNIZATION SERVICES` files, routes, and behavior were not modified.

## Data model

- `BRANCH` is the only active location master. One branch represents exactly one emergency trolley.
- No `EMERGENCY_CART`, `USER_EMERGENCY_CART`, or `EMERGENCY_CART_ITEM` sheet is created or used by this implementation.
- `EMERGENCY_ITEM` holds the item reference, while `BRANCH_EMERGENCY_ITEM` assigns each item and its required quantity to a branch.
- `CHECK_SESSION`, `CHECK_DETAIL`, and `EMERGENCY_CHECK_LOG` store `BRANCH_ID` so checks and history can be separated by branch.
- `COUNT_SESSION` uses `BRANCH_ID` as its location field. If an existing spreadsheet already has a legacy ninth `CART_ID` column, it is left untouched and the updated app does not read or write it.
- Existing cart-related sheets or columns, if any, are left untouched and are not deleted. They are not used by the updated workflow; new tables do not include `CART_ID`.
- Annual IDs use `ECYYYY-00001` for individual emergency check logs and `ECSYYYY-00001` for check sessions; the sequence resets by year.

## UI/API changes

- Branch selector replaces branch + cart selectors.
- Admin can add a branch and assign an Inventory Master item plus required quantity directly to that branch.
- Daily Check filters item lists and history by `BRANCH_ID`; the branch-specific required quantity is used for comparisons and validation.
- API routes include `GET/POST /api/emergencycheck/branches` and `GET/POST /api/emergencycheck/branch-items`.
- Setup creates/ensures only the Emergency Checklist tables described above. It does not touch Immunization Services tables.

## Validation

- JavaScript syntax checks passed for the modified files.
- `npm test`: 26/28 passed. Two existing tests still fail outside this change: `router-structure.test.js` (legacy router file expectation) and `vaccine-modal-regression.test.js` (expects a Vaccine Master collection route). These tests were not changed because the scope explicitly excludes unrelated system changes.
- No live Google Sheets write test was run. Test against a backup or non-production spreadsheet before operational use.


## กำหนดรหัสสาขาโดย Admin (ปรับปรุงล่าสุด)
- หน้าเพิ่มสาขาบังคับให้ Admin กรอก `BRANCH_ID` เองตามรหัสสาขาจริงของหน่วยงาน
- Server ตรวจรหัสซ้ำแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ และปฏิเสธหากไม่กรอกรหัส
- การแก้ไขสาขาเดิมไม่อนุญาตให้เปลี่ยน `BRANCH_ID` เพื่อป้องกันสิทธิ์ผู้ใช้และประวัติการตรวจอ้างอิงผิดสาขา
- รหัสสาขาที่มีอยู่เดิมไม่ถูกเปลี่ยนโดยอัตโนมัติ
