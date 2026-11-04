# Modern Mint UI — E-ServiceofPharmacy

## สิ่งที่ปรับ
- เพิ่ม CSS ธีม Modern Mint โดยแยกไว้ที่ `public/assets/css/modern-mint.css`
- เพิ่มภาพพยาบาล Illustration ที่ `public/assets/images/nurse-illustration-hero.png`
- เพิ่มแบนเนอร์ต้อนรับในหน้า Dashboard จริง (`public/views/dashboard.html`) พร้อมวันที่/เวลา
- ปรับหน้าล็อกอิน การ์ด ตาราง ปุ่ม ฟอร์ม เมนู และ Modal ด้วย CSS โดยไม่เปลี่ยน API หรือ logic การบันทึกข้อมูล

## วิธีเปิดใช้งาน
1. สำรองโปรเจกต์เดิมก่อน
2. แตก ZIP นี้ในโฟลเดอร์ใหม่
3. ใช้ Node.js เวอร์ชันที่โปรเจกต์รองรับ แล้วรัน `npm ci`
4. สร้างไฟล์ `.env` จาก `.env.example` และใส่ค่าการเชื่อมต่อของระบบเดิมให้ครบ (ไฟล์ `.env` จริงไม่ถูกรวมใน ZIP เพื่อป้องกันข้อมูลลับรั่วไหล)
5. รัน `npm start`
6. ทดสอบล็อกอินและโมดูลที่ใช้งานจริงในสภาพแวดล้อมทดสอบก่อนนำขึ้นระบบหลัก

## ข้อควรทราบ
- ตรวจสอบ syntax ของ `server.js` และ `public/modules/dashboard/dashboard.view.js` แล้ว
- ชุดทดสอบเดิม `npm test` ยังมี test failures ที่เกี่ยวกับ branch/auth/navigation/vaccine routes อยู่ จึงไม่ควรถือว่าทั้งระบบผ่าน regression test จากการปรับ UI ครั้งนี้
- การปรับครั้งนี้เน้น presentation layer และคง endpoint/ID ที่หน้าเดิมใช้ไว้ แต่ต้องทดสอบเชื่อมต่อ Google Sheets, LINE และทุกโมดูลใน environment จริงก่อน deploy
