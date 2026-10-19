# Branch-specific Emergency Inventory List

## Behavior
- `INVENTORY_MASTER` remains the master catalogue for CODE, NAME, UNIT, and default REQUIRED.
- `BRANCH_EMERGENCY_ITEMS` stores branch-specific settings: `BRANCH_ID`, `CODE`, `ENABLED`, `REQUIRED`, `UPDATED_AT`, `UPDATED_BY`.
- `EMER001` through `EMER078` are mandatory for every active branch and cannot be disabled.
- Every other item found in `INVENTORY_MASTER` outside `EMER001`–`EMER078` is optional and may be enabled per branch (including `EMER079` and any future Master List items).
- Admin may adjust REQUIRED quantity per branch. NAME and UNIT always come from `INVENTORY_MASTER`.
- The Emergency Checklist summary/items and Daily Check list use the selected branch's enabled list. Daily Check save verifies the item is enabled for that branch on the server.
- Daily Check records continue to carry `BRANCH_ID` in `COUNT_SESSION` column H. Existing records without a branch ID are not assigned to a branch automatically.
- The new page is available from Emergency Checklist > `Inventory List สาขา` to Admin only. Server endpoints also require Admin for configuration changes.

## First use
1. Ensure `INVENTORY_MASTER` contains all codes `EMER001` through `EMER078`. If any required code is missing, the page warns; saving existing Master List settings remains available, but the missing mandatory codes must be added before the checklist can be considered complete.
2. Start the server and log in as Admin.
3. Open Emergency Checklist > `Inventory List สาขา`.
4. Select a branch. All `INVENTORY_MASTER` rows are listed. Adjust REQUIRED quantities as needed; mandatory codes cannot be disabled, while all other items can be enabled or disabled independently per branch.
5. Save. The server creates `BRANCH_EMERGENCY_ITEMS` automatically and saves one configuration row per branch/code for all rows in `INVENTORY_MASTER`.

## Safety notes
- This feature does not edit or rename `INVENTORY_MASTER`.
- It does not assign branch IDs to historical records.
- `IMMUNIZATION SERVICES` files are not modified by this change.
- Live Google Sheets writes must be verified in the user's deployment; automated tests do not substitute for that check.


## สิทธิ์ Staff
- Staff เปิดเมนู Inventory List สาขาได้
- API ส่งกลับเฉพาะสาขาที่ได้รับมอบหมายใน `USERS.BRANCH_IDS` และตรวจสิทธิ์ซ้ำทุกครั้งที่โหลด/บันทึก
- Staff ไม่มีสิทธิ์เพิ่ม/แก้ไขสาขา หรือแก้ไข `INVENTORY_MASTER` จากหน้านี้
- หากไม่มีสาขาที่ได้รับมอบหมาย ให้ Admin กำหนดสาขาในเมนูจัดการผู้ใช้งานก่อน
