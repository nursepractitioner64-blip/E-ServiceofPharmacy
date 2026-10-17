# Vaccine Dispense OUT UI Fix

## ไฟล์ที่แก้
- `public/views/vaccinemasterstock.html`
- `public/modules/vaccinemasterstock/vaccinemasterstock.view.js`
- `public/modules/vaccinemasterstock/vaccinemasterstock.css`

## การทำงาน
- เพิ่มปุ่ม `จ่ายวัคซีนออก` บนหน้า Vaccine Stock
- ใช้ฟอร์ม Modal เดิม แต่เปลี่ยนเป็นโหมด OUT
- เมื่อเลือกวัคซีน จะโหลด LOT / EXP และจำนวนคงเหลือจาก `GET /api/vaccine-master/:code/stock`
- ส่ง `TYPE=OUT`, LOT, EXP, QTY, USER, Location และ TARGET ไปที่ `POST /api/vaccine-master/stock`
- เลข REF NO preview ขอจาก `GET /api/vaccine-master/stock/next-ref-no?type=OUT`

## วิธีติดตั้ง
1. สำรองไฟล์เดิมก่อน
2. แตก ZIP และคัดลอกโฟลเดอร์ `public` ทับโฟลเดอร์ `public` ของโปรเจกต์
3. รีสตาร์ตเซิร์ฟเวอร์และ hard refresh เบราว์เซอร์ (Ctrl+F5)

## หมายเหตุ
ZIP นี้เป็นสำเนา source project ที่ไม่รวม `.env`, `service-account.json`, `.git` และ `node_modules` เพื่อไม่แนบข้อมูลลับ/ไฟล์ dependency ขนาดใหญ่
ตรวจ syntax ของ JavaScript ที่เกี่ยวข้องด้วย `node --check` แล้ว แต่ยังไม่ได้เชื่อม Google Sheets จริงหรือทดสอบการจ่ายจริง
