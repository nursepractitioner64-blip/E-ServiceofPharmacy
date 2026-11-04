# Dispense — Vaccine Stock style fix

## เป้าหมาย
ทำให้การคำนวณสต็อกยาในหน้า Inventory Dispense ใช้หลักการเดียวกับ Vaccine Stock:
- IN เพิ่มยอด
- OUT หักยอด
- รวมยอดแยกตาม CODE + LOT + EXP
- แสดงเฉพาะ LOT ที่เหลือมากกว่า 0
- ยังคงจำกัดสต็อกตาม BRANCH_ID ของผู้ใช้ที่เข้าสู่ระบบ

## จุดที่แก้
1. `public/modules/inventorydispense/inventorydispense.client.js`
   - โหลดทั้ง IN และ OUT ของสาขาปัจจุบัน
   - สร้างตัวเลือก LOT จาก IN
   - คำนวณยอดคงเหลือจาก IN - OUT และแสดงยอดใน dropdown
   - ปรับการอ่านวันที่ slash ให้ตรงกับ Vaccine Stock (MM/DD/YYYY)

2. `src/modules/dispense/dispense.repository.js`
   - ปรับ normalize EXP ให้รองรับ ISO และ MM/DD/YYYY แบบเดียวกับ Vaccine Stock
   - ตรวจยอดภายใน sequence lock โดยรวม IN - OUT ตาม BRANCH_ID + CODE + LOT + EXP
   - บันทึก OUT พร้อมข้อมูล Container/QR จากรายการ IN ต้นทาง

## ติดตั้ง
- สำรองโปรเจกต์เดิม
- แตก ZIP และนำ Source Code ไปแทนไฟล์เดิม
- คง `.env`, credentials และไฟล์ตั้งค่าจากโปรเจกต์เดิมไว้
- Restart Server และ hard refresh หน้าเว็บ (Ctrl+F5)

## ทดสอบ
เลือกสาขาเดิม แล้วตรวจ LOT ที่ต้องการ:
1. Dropdown ต้องแสดงยอดคงเหลือ
2. ทดลองจ่ายไม่เกินยอดคงเหลือ
3. ตรวจ `INVENTORY_MOVEMENT` ว่ามีแถว TYPE=OUT เพิ่มพร้อม BRANCH_ID, CODE, LOT, EXP เดิม
4. ตรวจยอดใหม่ว่า IN - OUT ถูกหักแล้ว

หมายเหตุ: ไม่สามารถทดสอบเชื่อมต่อ Google Sheets จริงจากสภาพแวดล้อมสร้าง ZIP ได้ ต้องยืนยันกับข้อมูลจริงก่อนใช้งานจริง
\n5. แก้ service/repository ให้ค้นหารายการจ่ายตาม REF_NO ได้ตรงกับชื่อฟังก์ชัน และจำกัดผลลัพธ์ตามสาขา\n