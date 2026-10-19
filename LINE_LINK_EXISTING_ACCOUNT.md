# ผูก LINE กับบัญชีเดิม — E-ServiceofPharmacy

## ขั้นตอนใช้งาน
1. รัน E-ServiceofPharmacy ตามปกติ แต่หากจะผูก LINE ห้ามเปิดผ่าน `http://localhost:2003` โดยตรง
2. เปิด tunnel เช่น `ngrok http 2003` แล้วเข้าโปรแกรมผ่าน HTTPS URL ที่ ngrok แสดง
3. ตั้ง URL HTTPS เดียวกันนี้เป็น LIFF Endpoint URL ใน LINE Developers และเปิด Scope `openid` กับ `profile`
4. ตั้ง `LINE_LIFF_ID` เป็น LIFF ID ของ LIFF App นี้ และ `LINE_CHANNEL_ID` เป็น Channel ID ของ LINE Login Channel ที่เป็นเจ้าของ LIFF App (ไม่ใช่ Messaging API Channel ID)
5. รีสตาร์ต Node.js หลังแก้ `.env`
6. เข้าระบบด้วย Username/Password เดิม แล้วกด “ผูกบัญชี LINE กับบัญชีเดิม”
7. ตรวจว่าแถบที่อยู่ยังเป็น HTTPS URL เดิมของ ngrok หลังกลับจาก LINE Login

## ข้อควรทราบ
- ต้องเปิดโปรแกรมผ่าน ngrok URL โดยตรง ไม่ใช่เปิด localhost แล้วหวังให้ LINE redirect กลับมาที่ localhost
- ถ้า ngrok URL เปลี่ยน ต้องปรับ LIFF Endpoint URL ให้ตรง และเปิดโปรแกรมผ่าน URL ใหม่
- API ตรวจสอบ ID Token ที่ Server และอัปเดตเฉพาะ `LINE_USER_ID`, `LINE_DISPLAY_NAME`, `LINE_PICTURE_URL` ในแถว `USERS` เดิม
- ถ้าได้รับข้อความ Channel ID ไม่ตรง ให้ตรวจว่า `LINE_CHANNEL_ID` เป็น Channel ID ของ LINE Login Channel เดียวกับ LIFF App
