# Emergency Checklist Login — Setup

## Environment variables

Set the following in the local `.env` file or in the Render service's Environment settings. Do not commit `.env` or real credentials.

- `AUTH_BOOTSTRAP_ADMIN_USERNAME`: username for the first administrator.
- `AUTH_BOOTSTRAP_ADMIN_PASSWORD`: initial password, at least 12 characters.
- `AUTH_BOOTSTRAP_ADMIN_FULL_NAME`: optional display name.

The Google service account used by this application must have edit access to the spreadsheet referenced by `GOOGLE_SHEET_ID`.

## First login

1. Set the bootstrap variables on the server.
2. Start the application and open the website.
3. Login reads the existing `USERS` sheet (columns such as `USER_ID`, `FULL_NAME_TH`, `USERNAME`, `PASSWORD_HASH`, `STATUS`, and `ROLE`). It does not create a duplicate account sheet. Header matching is by column name, not by column order; harmless spaces and a UTF-8 BOM in headers are normalized. The first Admin bootstrap is used only if the `USERS` sheet has no Admin account. Existing `scrypt:salt:hash` and `scrypt$salt$hash` password-hash formats are supported.
4. Sign in with the bootstrap username and password.
5. Once an Admin exists in `USERS`, subsequent server starts do not create another Admin. Remove the bootstrap password from the server environment after the first successful setup if operationally possible; keep a secure recovery procedure for future deployments.

## Security notes

- Passwords are stored as salted scrypt hashes.
- Login attempts are throttled after five failures per IP/username for 15 minutes.
- Session cookies are HttpOnly and SameSite=Lax; Secure is enabled in production.
- Sessions are held in server memory and expire after 8 hours. Restarting the server invalidates active sessions, and deployments require users to sign in again.
- Emergency Checklist and Daily Check APIs require a valid session. Branch-level authorization is a separate implementation step and is not yet enforced by this Login milestone.
- This change does not modify IMMUNIZATION SERVICES module files.

## จัดการผู้ใช้และสาขา

- เมนู **จัดการผู้ใช้งาน** ใช้ได้เฉพาะ ADMIN: เพิ่มบัญชี, ตั้งรหัสผ่านเริ่มต้น, รีเซ็ตรหัสผ่าน, เปิด/ระงับบัญชี และเลือกสาขาที่รับผิดชอบ
- เมนู **จัดการสาขา** ใช้ได้เฉพาะ ADMIN: เพิ่มสาขา, เปลี่ยนชื่อ และเปิด/ปิดการใช้งาน
- ระบบสร้างชีต `BRANCHES` ให้อัตโนมัติเมื่อเปิดเมนูสาขาครั้งแรก โดยเก็บ `BRANCH_ID`, `BRANCH_NAME`, `STATUS`, `CREATED_AT`, `UPDATED_AT`
- ระบบเพิ่มคอลัมน์ `BRANCH_IDS` ต่อท้ายชีต `USERS` หากยังไม่มี โดยไม่ลบหรือย้ายคอลัมน์เดิม ค่า `BRANCH_IDS` เก็บรหัสสาขาคั่นด้วยเครื่องหมายจุลภาค
- ก่อนใช้งานจริง ให้ Admin สร้างสาขาก่อน แล้วจึงกำหนดสาขาให้เจ้าหน้าที่
- การปิดสาขาเป็นการปิดใช้งาน ไม่ลบข้อมูลสาขาหรือประวัติเดิม


## Branch master sheet

- ระบบจัดการสาขาใช้ชีต `BRANCH` เป็นแหล่งข้อมูลหลัก โดยอ่านหัวคอลัมน์ตามชื่อ ไม่บังคับลำดับ
- ถ้ามีชีตเดิมชื่อ `BRANCHES` ระบบจะคัดลอกสาขาที่มี `BRANCH_ID` ยังไม่อยู่ใน `BRANCH` เข้าชีต `BRANCH` โดยไม่ลบชีตเก่า
- แถวใน `BRANCH` ที่มี `BRANCH_ID` ซ้ำและมีข้อมูลสาขาเหมือนกันทุกแถว จะเก็บแถวที่ `UPDATED_AT` ล่าสุดไว้เพียงแถวเดียว ส่วนกรณีข้อมูลขัดแย้งจะไม่ลบอัตโนมัติ
- ก่อน deploy ให้สำรอง Google Spreadsheet ไว้ก่อน เพราะระบบอาจลบเฉพาะแถวซ้ำที่มีรหัสและรายละเอียดสาขาตรงกันทุกประการ
