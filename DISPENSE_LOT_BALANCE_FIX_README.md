# Dispense LOT balance fix

แก้ไขเพิ่มเติมจากชุดก่อนหน้า:

- เปลี่ยนการอ่าน INVENTORY_MOVEMENT ใน dispense.repository.js จากการ map ด้วยชื่อ Header ไปอ่านตามตำแหน่งคอลัมน์ A:R เช่นเดียวกับ `/api/inventory-movement`
- ป้องกันปัญหาชื่อ Header มีช่องว่าง/BOM/ตัวอักษรแฝง ทำให้ `BRANCH_ID`, `CODE`, `LOT`, `EXP` ถูกอ่านเป็นค่าว่างใน Repository ทั้งที่หน้าเว็บอ่านข้อมูลได้
- ยังคงตรวจสต็อกตาม BRANCH_ID + CODE + LOT + EXP และหัก OUT ตามจริง ไม่ได้ปิดการตรวจสต็อก
- เพิ่ม server log `[DISPENSE STOCK CHECK]` เมื่อยอดเป็น 0 เพื่อแสดงข้อมูล IN/OUT ของ branch/code/lot เดียวกัน พร้อมวันหมดอายุที่ normalize แล้ว

## ติดตั้ง
สำรองโปรเจกต์เดิม แตก ZIP แล้วแทนที่ Source Code เก็บ `.env` และ credentials เดิมไว้ จากนั้น restart server และทดสอบ LOT J690034

จากข้อมูล INVENTORY_MOVEMENT ที่ผู้ใช้ส่งมา พบ IN ของ EMER023 / LOT J690034 / EXP 2028-02-05 / BRANCH_ID 41616 / QTY 4 amp. หากไม่มี OUT ของ LOT เดียวกัน ยอดคงเหลือควรเป็น 4 amp. ต้องยืนยันกับ Google Sheets จริงหลังติดตั้ง
