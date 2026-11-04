# Inventory Dispense: เลือก CODE ก่อน แล้วเลือก LOT

ปรับหน้า Inventory Dispense ให้ลำดับการเลือกเหมือนหน้าจ่ายวัคซีนออก:

1. เลือก CODE / ชื่อยา จากรายการยาที่มี LOT คงเหลือในสาขาที่กำลังใช้งาน
2. ระบบแสดงเฉพาะ LOT ของ CODE ที่เลือก พร้อม EXP และยอดคงเหลือ
3. เมื่อเลือก LOT ระบบเติม LOT และ EXP ลงในข้อมูลที่จะบันทึก
4. Backend ตรวจสอบยอดคงเหลือซ้ำจาก INVENTORY_MOVEMENT โดยใช้ BRANCH_ID + CODE + LOT + EXP ก่อนบันทึก OUT

## ไฟล์ที่แก้ไข
- `public/views/inventorydispense.html`
- `public/modules/inventorydispense/inventorydispense.client.js`
- `src/modules/dispense/dispense.repository.js`

## ติดตั้ง
1. สำรองโปรเจกต์เดิม
2. แตก ZIP แล้วนำไฟล์ในโฟลเดอร์โปรเจกต์ไปแทนที่ไฟล์เดิม โดยคง `.env` และ credential ของเครื่องเดิมไว้
3. Restart Node.js server
4. เปิดหน้า Inventory Dispense แล้วกด Ctrl + F5

## หมายเหตุด้านความปลอดภัย
ZIP นี้ไม่รวม `.env`, `.git` และ `node_modules` เพื่อไม่เผยแพร่ secret หรือข้อมูล Git ภายในโปรเจกต์
