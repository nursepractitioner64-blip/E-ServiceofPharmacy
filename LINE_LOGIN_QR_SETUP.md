# LINE Login แบบ QR Code และการผูกบัญชีเดิม

## พฤติกรรมที่ตั้งใจให้ทำงาน

1. Username + Password ยังคงใช้บัญชีเดิมตามปกติ
2. ปุ่ม `เข้าสู่ระบบด้วย LINE (สแกน QR Code)` เปิดหน้า LINE Login ของ LINE โดยตรง ไม่ใช้ LIFF auto-login หน้า LINE เป็นผู้แสดงวิธีเข้าสู่ระบบ/QR ตามอุปกรณ์และสถานะ LINE Login
3. ผู้ใช้ต้องเข้าสู่ระบบด้วย Username + Password ก่อนเพื่อผูก LINE กับบัญชีเดิม
4. เมื่อสถานะแสดง `สถานะ: บัญชีนี้ยังไม่ได้ผูก LINE` ปุ่ม `ผูกบัญชี LINE กับบัญชีเดิม` ต้องเปิดหน้า LINE Login เพื่อยืนยัน เมื่อ callback สำเร็จจึงบันทึกเฉพาะ `LINE_USER_ID`, `LINE_DISPLAY_NAME`, `LINE_PICTURE_URL` ในแถว USERS เดิม
5. LINE ที่ผูกกับบัญชีอื่นอยู่แล้วจะถูกปฏิเสธ ไม่สร้างผู้ใช้ใหม่ และไม่เปลี่ยน USER_ID, USERNAME, PASSWORD_HASH, ROLE, STATUS หรือ BRANCH_IDS
6. Login ด้วย LINE สำเร็จได้เฉพาะเมื่อ LINE_USER_ID ตรงกับบัญชี USERS ที่ ACTIVE เพียงหนึ่งบัญชี

## ตั้งค่า LINE Login (จำเป็น)

การเปิดหน้า LINE Login แบบ OAuth ต้องใช้ Channel Secret และ Callback URL เพิ่มเติม ไม่สามารถใช้ LIFF ID อย่างเดียวได้

1. เปิด `.env` ของโปรเจกต์เดิม แล้วเพิ่ม/ตรวจสอบค่าต่อไปนี้ โดยใช้ค่าจาก **LINE Login Channel เดียวกัน**:

   ```env
   LINE_CHANNEL_ID=YOUR_LINE_LOGIN_CHANNEL_ID
   LINE_CHANNEL_SECRET=YOUR_LINE_LOGIN_CHANNEL_SECRET
   PUBLIC_BASE_URL=https://YOUR-CURRENT-NGROK-DOMAIN.ngrok-free.dev
   ```

   `PUBLIC_BASE_URL` ต้องเป็น HTTPS URL ที่เปิดแอปอยู่จริง ไม่มี `/` ปิดท้าย ห้ามใช้ `localhost` และต้องแก้เมื่อ ngrok เปลี่ยนโดเมน

2. ใน LINE Developers Console ของ LINE Login Channel เดียวกัน เพิ่ม Callback URL ให้ตรงทุกตัวอักษร:

   `https://YOUR-CURRENT-NGROK-DOMAIN.ngrok-free.dev/api/auth/line/callback`

3. ตรวจสอบว่า Channel เปิดใช้งาน LINE Login และขอ scope `openid profile` ได้
4. รีสตาร์ต Node.js server แล้วเปิดเว็บจาก `PUBLIC_BASE_URL` เดียวกัน
5. ทดสอบผูกบัญชีที่ยังไม่ได้ผูกก่อน จากนั้นออกจากระบบและทดสอบ Login ด้วย LINE

## ข้อจำกัดสำคัญ

QR Code ถูกแสดงโดยหน้า LINE Login ที่ LINE ให้บริการ ไม่ใช่ QR ที่ระบบนี้สร้างเอง ระบบส่งผู้ใช้ไปหน้า LINE Login โดยตรงเพื่อให้ใช้ QR login ได้เมื่อ LINE แสดงตัวเลือกดังกล่าว (ขึ้นอยู่กับอุปกรณ์และสถานะการเข้าสู่ระบบของ LINE) หาก LINE จำการเข้าสู่ระบบในเบราว์เซอร์อยู่แล้ว อาจยืนยันต่อโดยไม่แสดง QR

## ความปลอดภัยและไฟล์

- OAuth ใช้ state แบบสุ่มและหมดอายุภายใน 10 นาที
- ID Token ถูกตรวจสอบกับ LINE และตรวจ nonce จากคำขอ
- ไม่บันทึก access token หรือ ID token ลง Google Sheets
- ZIP ที่ส่งให้ไม่รวม `.env`, `service-account.json`, `.git`, `node_modules` หรือไฟล์อัปโหลดส่วนตัว ต้องเก็บไฟล์ตั้งค่าเดิมไว้
