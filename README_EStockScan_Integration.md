# Nurse Station Hub — E-StockScan Integration

## สิ่งที่รวมเข้ามา

นำ SESSION และ DISPENSE จาก E-StockScan เข้ามาเป็นโมดูลภายใน SPA ของ Nurse Station Hub โดยไม่เปิดเว็บไซต์ E-StockScan ภายนอก

- Dashboard Quick Access: `#estockscan-session`
- Dashboard Quick Access: `#estockscan-dispense`
- SESSION view/module: `public/views/estockscan-session.html`, `public/modules/estockscan/session.client.js`
- DISPENSE view/module: `public/views/estockscan-dispense.html`, `public/modules/estockscan/dispense.client.js`
- API namespace: `/api/estockscan/*`

## Authentication / Branch

ทุก API ใช้ Hub `requireAuth` และ `requireBranch`:
- ใช้ Cookie Session ของ Hub
- ใช้สาขาที่เลือกอยู่ใน Hub (`req.authBranchId`)
- ไม่รับสิทธิ์สาขาจากค่าที่ผู้ใช้ส่งมาเพื่อใช้แทนสิทธิ์จาก Session
- ไม่มีการส่ง username/password ผ่าน URL

## Google Sheets

ใช้ `GOOGLE_SHEET_ID` และ Google credentials ของ Hub (ไม่ใช้ credential แยกของ E-StockScan)

### SESSION

อ่าน:
- `INVENTORY_MOVEMENT` — ค้นหา Sticker ตาม `MOVEMENT_ID` และจำกัดสาขา
- `INVENTORY_MASTER` — อ่าน `CODE`, `NAME`, `UNIT`, `REQUIRED`

เขียน:
- `COUNT_SESSION` — เพิ่มรายการ SESSION พร้อม `BRANCH_ID`
- `SESSION_RESULT` — สรุป `REQUIRED`, `ACTUAL`, `DIFF` พร้อม `BRANCH_ID`

การป้องกันซ้ำ:
- Client block `MOVEMENT_ID` ซ้ำใน SESSION เดียวกัน
- API ตรวจซ้ำก่อนรับรายการ
- การ retry หลังบันทึก COUNT_SESSION แต่ SESSION_RESULT ยังไม่สำเร็จ จะไม่ append Sticker เดิมซ้ำ
- การสรุป SESSION ซ้ำจะคืนผลเดิม ไม่เพิ่มผลซ้ำ

### DISPENSE

คงหน้าจอ OCR Sticker, การตรวจข้อมูลผู้รับบริการ, ค้นหา Lot, เลือก Lot, ตรวจจำนวนคงเหลือ และยืนยันการจ่าย

การบันทึก:
- `INVENTORY_MOVEMENT` เป็น Stock Ledger หลัก และเพิ่ม OUT เพียงหนึ่งรายการ
- `INVENTORY_DISPENSE` เป็น Detail Log ของ E-StockScan
- ใช้ Google Sheets `batchUpdate` เพิ่มรายการทั้งสองชีตในคำขอเดียว
- ไม่เขียน `VACCINE_MOVEMENT` ซ้ำ เพราะ Hub ใช้ `INVENTORY_MOVEMENT` คำนวณ Stock อยู่แล้ว
- ใช้ `BRANCH_ID` จาก Hub และตรวจยอดคงเหลือซ้ำใน Repository ภายใต้ Sequence Lock

## ข้อมูลย้อนหลัง

- ไม่มีการลบหรือแก้ไขแถวข้อมูลย้อนหลัง
- ไม่ backfill `BRANCH_ID` ให้ข้อมูลเก่า
- ถ้า Header ของ `COUNT_SESSION`, `SESSION_RESULT` หรือ `INVENTORY_DISPENSE` ไม่ตรง ระบบจะหยุดและแจ้ง error แทนการเขียนทับ Header
- ไม่ใช้ `CART_ID`

## การทดสอบที่ทำในชุดนี้

- JavaScript syntax checks: ผ่าน 7 ไฟล์ที่แก้ไข
- Integration guard tests: ผ่าน 5/5
- ตรวจว่า Quick Access ไม่มี External E-StockScan URL
- ตรวจว่า API ของ E-StockScan แยก namespace จาก `/api/dispense` เดิมของ Hub

ยังไม่ได้ทดสอบ:
- การเชื่อม Google Sheets จริงจาก environment ที่ deploy
- การเปิดกล้องและ OCR บนอุปกรณ์จริง
- การยืนยันยอดคงเหลือจริงกับข้อมูล production

## เริ่มใช้งาน

1. แตก ZIP
2. ใช้ไฟล์ `.env` ของ Hub ที่เก็บไว้ในเครื่อง/ระบบ deploy (ไฟล์นี้ไม่ได้รวมใน ZIP)
3. ตรวจ `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` ของ Hub ให้ถูกต้อง
4. ติดตั้ง dependencies: `npm install`
5. เริ่มระบบ: `npm start`
6. Login เข้า Hub และเลือกสาขาก่อนเปิด SESSION หรือ DISPENSE

## หมายเหตุสำคัญก่อน Production

ข้อมูล DISPENSE เก่าของ E-StockScan บางชุดอาจอยู่ใน `VACCINE_MOVEMENT`/`INVENTORY_DISPENSE` โดยไม่มี `BRANCH_ID` ขณะที่ Stock Ledger ของ Hub แยกสาขาใน `INVENTORY_MOVEMENT` ได้ชัดเจน

โมดูลใหม่จะไม่เดาสาขาให้ข้อมูลเก่า และคำนวณ Lot จาก `INVENTORY_MOVEMENT` ของสาขาปัจจุบันเท่านั้น เพื่อไม่ให้ตัด Stock ซ้ำหรือโยกข้อมูลย้อนหลังผิดสาขา ควรตรวจสอบ/กระทบยอดรายการ DISPENSE เก่าที่ไม่มี `BRANCH_ID` ก่อนเปิดใช้งานจริง
