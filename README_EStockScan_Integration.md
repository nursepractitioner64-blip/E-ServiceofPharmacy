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

### DISPENSE (NurseHub Quick Access)

คงหน้าจอ OCR Sticker, การตรวจข้อมูลผู้รับบริการ, ค้นหา Lot, เลือก Lot, ตรวจจำนวนคงเหลือ และยืนยันการจ่าย ตามต้นฉบับ E-StockScanVer3

อ่าน:
- `VACCINE_MOVEMENT` — ค้นหา CODE, NAME, LOT, EXP และคำนวณยอด IN − OUT
- `INVENTORY_DISPENSE` — ตรวจสอบรายละเอียดการจ่ายย้อนหลังที่ยังไม่มี REF_NO เชื่อมกับ OUT movement เพื่อป้องกันการนับ Stock ซ้ำ

เขียน:
- `VACCINE_MOVEMENT` — เพิ่มรายการ TYPE=OUT เพื่อบันทึกการเคลื่อนไหวและตัด Stock
- `INVENTORY_DISPENSE` — บันทึกรายละเอียดผู้รับบริการ HN ชื่อยา จำนวน LOT/EXP และ QR_RAW

การแยกสาขา:
- โครงสร้าง `VACCINE_MOVEMENT` ตาม E-StockScanVer3 มี 16 คอลัมน์ A:P และไม่มี `BRANCH_ID`
- Hub จึงใช้ค่า `Location` ใน `VACCINE_MOVEMENT` เทียบกับ `BRANCH_NAME` ของสาขาที่ Login แบบเข้มงวด ไม่อ่าน Stock ของสาขาที่ Location ไม่ตรง
- รายการ OUT ใหม่บันทึก `Location` เป็นชื่อสาขาปัจจุบัน
- `INVENTORY_DISPENSE` เป็น Detail Log และไม่มีการเพิ่ม `BRANCH_ID` เพื่อคง Header เดิม
- ใช้ Hub authentication และ `requireBranch`; การบันทึกสองชีตใช้ Google Sheets `batchUpdate` คำขอเดียว

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

- `VACCINE_MOVEMENT` ตามโครงสร้างต้นฉบับไม่มี `BRANCH_ID`; ระบบ Hub ใช้ `Location` เทียบกับ `BRANCH_NAME` ของสาขาที่ Login
- แถวเก่าที่ `Location` ว่างหรือไม่ระบุชื่อสาขาจะไม่ถูกนำมาคำนวณเป็น Stock ของสาขาใด เพื่อป้องกันการปะปนข้ามสาขา
- `INVENTORY_DISPENSE` ตามโครงสร้างเดิมไม่มี `BRANCH_ID`; รายการย้อนหลังที่ไม่มี OUT movement จึงไม่สามารถระบุสาขาได้จาก Detail เพียงอย่างเดียว ควรกระทบยอดรายการเก่าก่อนเปิดใช้งานหลายสาขา
- SESSION ยังคงใช้ `INVENTORY_MOVEMENT` ตามเดิม การปรับนี้จำกัดเฉพาะ DISPENSE ใน NurseHub Quick Access
