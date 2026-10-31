# ม่านใจ · MOONMIND

## รันบนเครื่องตัวเองจาก GitHub

ใช้ **Node.js 24 ขึ้นไปและ npm** แล้วรันจากโฟลเดอร์โปรเจกต์:

```sh
npm ci
npm run local
```

เปิด `http://127.0.0.1:5173` คำสั่งนี้สร้างฐานข้อมูลจำลอง D1 บนเครื่องใน `.moonmind-local/` และใช้ migrations ที่อยู่ใน repository โดยอัตโนมัติ ไม่ต้องสมัคร Cloudflare หรือ ChatGPT ไม่มีการ deploy และไม่เรียกโมเดลหรือ API ภายนอก โหมดเริ่มต้นเป็นคำตอบตามกฎในเครื่อง

ผู้ดูแลเข้าได้ที่ `http://127.0.0.1:5173/signin-with-chatgpt?return_to=/` ซึ่งในโหมด local เป็นการจำลองการเข้าระบบสำหรับเจ้าของเครื่องเท่านั้น ไม่ใช้บัญชี ChatGPT จริง ชื่อ path นี้คงไว้เพื่อรองรับ UI เดิม เซิร์ฟเวอร์รับเฉพาะ loopback และตรวจ Host/Origin; อย่าเปิดผ่าน tunnel หรือ reverse proxy เพื่อใช้งานสาธารณะ

**GitHub เก็บโค้ด ไม่ได้เปิด backend หรือฐานข้อมูลให้เอง** GitHub Pages ใช้รัน API ของเว็บนี้ไม่ได้ ข้อมูลแชท คุกกี้ คีย์ และฐานข้อมูลบนเครื่องไม่ควรอัปโหลดไป GitHub `.gitignore` กันข้อมูล runtime ที่รู้จักไว้แล้ว แต่ควรตรวจไฟล์ก่อนอัปโหลดด้วย

อ่าน [คู่มือติดตั้งและตรวจสอบ local](./README-LOCAL.md) สำหรับพอร์ตอื่น การปิดโปรแกรม การเก็บประวัติและการสำรองข้อมูล รายละเอียดระบบด้านล่างรวมบันทึกการติดตั้งแบบ hosted เดิม; การตั้งค่า API และ sign-in จริงเหล่านั้นไม่จำเป็นและถูกปิดใน `npm run local`

ผู้ใช้ใหม่ที่ใส่ชื่อและยินยอมให้บันทึกบทสนทนาแล้วจะเริ่มสับไพ่และเลือกไพ่ทาโรต์ 3 ใบทันทีที่เข้าแชท ไม่ต้องส่งข้อความขอดูดวง ระบบบันทึกคำเชิญรอบแรกพร้อมโปรไฟล์ในธุรกรรมเดียว ไม่เรียกบริการ AI เพื่อสร้างคำเชิญ และไม่สร้างรอบแรกซ้ำเมื่อรีเฟรช ส่งแบบฟอร์มซ้ำ หรือกลับมาใช้ต่อ ผู้ใช้เดิมที่ล้างประวัติจะไม่ถูกเริ่มรอบแรกใหม่อัตโนมัติ

เมื่อถามเพื่อเอาคำตอบ ม่านใจตอบเนื้อหาที่ขอก่อนอธิบาย ไม่วนสัมภาษณ์เพิ่ม คำถาม MBTI/Enneagram ใช้เฉพาะเบาะแสที่ผู้ใช้เล่าจริง ถ้ามีเพียงบางด้านจะบอกเฉพาะด้านนั้น ไม่เติมตัวอักษรให้ครบด้วย INFP หรือเลือกลักษณ์ 5 เป็นค่าเริ่มต้น ไม่สร้างคะแนนหรือผลตรวจขึ้นมา โหมดทดลองใช้ข้อความผู้ใช้คนนั้นที่บันทึกไว้ล่าสุดไม่เกิน 200 ข้อความและ 64,000 ตัวอักษร คำแก้ล่าสุดมีน้ำหนักมากกว่าเดิม คำเดาไม่ถูกเก็บเป็นข้อเท็จจริงในโปรไฟล์ การตอบอิสระทุกหัวข้อยังต้องใช้โมเดลจริง; การเปลี่ยนนี้เพิ่มเส้นทางตอบตามกฎ ไม่ได้ฝึกโมเดลใหม่

เมื่อขอดูดวงหรือเปิดไพ่ หน้าแชทสับกองไพ่ทาโรต์ประมาณ 2 วินาที แล้วแจกไพ่คว่ำ 3 ใบจากชุด Major Arcana 22 ใบให้เลือกหนึ่งใบ ภาพหน้าไพ่เป็น SVG ที่วาดขึ้นเอง ไม่ใช้ภาพจากสำรับเชิงพาณิชย์ ชุดไพ่ของแต่ละรอบผูกกับ ID คำเชิญที่บันทึกในประวัติ จึงตรงกันระหว่างหน้าเว็บและคำตอบและไม่เปลี่ยนเมื่อรีเฟรช เลือกแล้วอธิบายภาพ ความหมายเชิงสัญลักษณ์ และแนวคิดที่ใช้สะท้อนใจ ไม่ยืนยันการทำนายหรือสร้างข้อเท็จจริงส่วนตัว รองรับมือถือ reduced motion และ retry คำขอเดิม

อ้างอิงสัญลักษณ์ทาโรต์: [Major Arcana](https://labyrinthos.co/blogs/tarot-card-meanings-list), [The Hermit](https://labyrinthos.co/blogs/tarot-card-meanings-list/the-hermit-meaning-major-arcana-tarot-card-meanings), [The Star](https://labyrinthos.co/blogs/tarot-card-meanings-list/the-star-meaning-major-arcana-tarot-card-meanings), [Wheel of Fortune](https://labyrinthos.co/blogs/tarot-card-meanings-list/the-wheel-of-fortune-meaning-major-arcana-tarot-card-meanings). คำตีความในโค้ดเขียนใหม่เพื่อสะท้อนใจ ไม่ใช้สัญลักษณ์เป็นหลักฐานว่ารู้อนาคต

หน้าแชทแสดงสถานะกำลังตอบเฉพาะระหว่างรอคำขอจริง ไม่มีการหน่วงคำตอบทดลองให้ครบ 2 วินาที และไม่บังคับทุกข้อความให้ครบ 3 บรรทัด คำทักทาย มุก ขอบคุณ บอกลา และขอหยุดตอบสั้นได้ ส่วนการเล่าปัญหามีรายละเอียดตามประเด็นที่ขอ ระบบติดตามเรื่องที่กำลังคุยและเจ้าของเหตุการณ์ก่อนเลือกแนวตอบ เช่น งานของแฟนไม่กลายเป็นปัญหางานของผู้ใช้ เมื่อแก้ความเข้าใจต้องใช้รายละเอียดใหม่ และเรื่องใหม่ต้องจบการอ้างบริบทเก่าที่ไม่เกี่ยวข้อง ความต้องการขอฟังเฉย ๆ และความปลอดภัยยังมีลำดับก่อนคำแนะนำ

ผู้ช่วยใช้ “เรา” เรียกตัวเองและภาษาคุยกัน ลดความห่างเหิน ในหัวข้อที่เกี่ยวข้องจะชวนมองด้านที่ไม่น่าพอใจของมนุษย์ เช่น ความหลงภาพภายนอก ความเห็นแก่ตัว และผลประโยชน์ที่ปะปนกับความจริงใจ เพื่อให้พิจารณาความไว้ใจจากพฤติกรรมจริง ไม่เหมารวมเจตนาคนอื่น ไม่ทำให้ร่างกายเป็นสิ่งไร้ค่า และไม่รับประกันการเปลี่ยนโลกทัศน์ คำขอระบายอย่างเดียว ความปลอดภัย และการเปลี่ยนเรื่องยังมาก่อนมุมปรัชญา โหมดทดลองมีตัวอย่างตามกฎจำกัดสำหรับหัวข้อรูปลักษณ์กับผลประโยชน์ ส่วนโหมดโมเดลใช้แนวทางเดียวกันในคำสั่งระบบ ข้อความและหลักฐานความจำของผู้ใช้คงสรรพนามเดิม

เว็บภาษาไทยสำหรับสำรวจความคิดและความรู้สึกในบรรยากาศดูดวง สีชมพู ม่วง ดำ และขาว ผู้ใช้ใส่ชื่อเล่นแล้วสนทนากับ “จันทร์” ได้เลย ไม่ต้องล็อกอิน ChatGPT หรือติดตั้ง AI ในเครื่อง

ไม่มีการเลือกเลขหรือจับเวลาตอบเพื่อสรุปบุคลิก ข้อสังเกตจากบทสนทนาเป็นสมมติฐานที่ผู้ใช้แก้ไขได้ คำตอบเป็นภาษาสนทนา ไม่แทรกข้อความแจ้งโหมดซ้ำ แต่ยังแสดงโหมดจริงในหน้าเว็บและตอบตรงไปตรงมาเมื่อถามวิธีทำงาน

การสนทนาเน้นรับฟังและสะท้อนก่อน โดยผูกข้อสังเกตกับสิ่งที่ผู้ใช้เล่าและใช้คำไม่ฟันธง คำตอบทั่วไปไม่ลงท้ายด้วยคำถาม ถามเฉพาะเมื่อข้อมูลที่ขาดจำเป็นต่อคำแนะนำหรือความปลอดภัย และเว้นคำถามหากเพิ่งถามในสองข้อความล่าสุด การรับรู้ความรู้สึกไม่ใช่การเห็นด้วยกับทุกข้อสรุปของผู้ใช้

บางช่วงใช้ภาพดาวเชิงสัญลักษณ์เป็นอุปมาสั้น ๆ ให้บรรยากาศดูดวง แล้วเชื่อมกับเรื่องที่ผู้ใช้เล่า เว้นอย่างน้อยสี่คำตอบก่อนใช้ภาพดาวซ้ำ ไม่ใช้ภาพดาวแทนคำตอบด้านความปลอดภัยหรืออ้างข้อมูลที่ผู้ใช้ไม่ได้ให้

ข้อความใหม่ที่เปิดเผยความรู้สึกหรือพูดถึงสายตาคนอื่นมีลำดับก่อนหัวข้อเก่า ใช้บริบทเดิมเมื่อผู้ใช้พูดอ้างอิงจริง เมื่อเล่าปัญหาที่รองรับ ระบบอธิบายต่อได้ตั้งแต่ครั้งแรกโดยรับช่วงเหตุการณ์ เชื่อมความขัดแย้งของมนุษย์เป็นความเป็นไปได้ เช่น ความอยากได้รับการยอมรับ ความกลัวเสียประโยชน์ และต้นทุนที่คนอื่นผลักมา แล้วเสนอหลักมองที่ใช้กับปัญหานั้น ไม่รอให้เล่าซ้ำหรือขอปรัชญา ไม่หยุดที่คำปลอบสั้น ๆ หลังเคยแนะนำแล้ว ผู้ใช้ยังขอฟังเฉย ๆ ได้ ส่วนเรื่องคุยเล่นไม่แทรกบทเรียน ปัญหาทั่วไปไม่แทรกภาพดาวเอง แต่คำขอดูดวงยังใช้ภาพเชิงสัญลักษณ์แบบเว้นจังหวะได้ โหมดทดลองยังเป็นระบบกฎและตัวเลือกข้อความจำกัด ไม่ใช่การวิเคราะห์อิสระทุกเรื่อง การคุยยืดหยุ่นต้องตั้งค่า OPENAI_API_KEY และ OPENAI_MODEL ฝั่งเซิร์ฟเวอร์ เมื่อเปิดโมเดลจริง ถ้าคำตอบยาวซ้ำกับคำตอบล่าสุด ระบบขอคำตอบใหม่ได้หนึ่งครั้งภายในงบเวลาเดิม และไม่บันทึกคำตอบซ้ำถ้ายังแก้ไม่สำเร็จ

## ส่วนของระบบ

- `core/persona.mjs`: บุคลิก น้ำเสียง คำถามเปิด และข้อความตอบในโหมดทดลอง
- `app/page.tsx` และ `app/globals.css`: หน้าแรก ใส่ชื่อ แล้วเริ่มแชท ประวัติสำหรับผู้ดูแล และสถานะกำลังตอบ/ลองใหม่
- `lib/ai.ts` และ `lib/ai-provider.mjs`: เรียกโมเดลจากเซิร์ฟเวอร์ หรือใช้ข้อความตามกฎเมื่อยังไม่ได้ตั้งค่าบริการ AI
- `lib/backend.ts`, `app/api/`, `db/schema.ts`, `drizzle/`: API, สิทธิ์เข้าถึง, ฐานข้อมูล D1 และ migrations

## ประวัติและการเข้าใช้

ผู้ใช้ทั่วไปเข้าถึงผ่านคุกกี้ HttpOnly อายุ 180 วันแบบสุ่ม 256 บิต ระบบเก็บ SHA-256 ของ token เป็นตัวระบุประวัติใน D1 ชื่อเล่นใช้แสดงผลเท่านั้น ชื่อซ้ำไม่เปิดประวัติของกันได้ กลับมาเบราว์เซอร์เดิมจะโหลดบทสนทนาเดิม หากล้างคุกกี้ เปลี่ยนเครื่อง หรือใช้โหมดไม่ระบุตัวตน จะเข้าถึงประวัติเดิมด้วยชื่อไม่ได้ ผู้ที่ล็อกอินอยู่เดิมยังใช้ประวัติที่ผูกบัญชีได้ ผู้ดูแลยังยืนยันตัวตนผ่าน ChatGPT และตรวจสิทธิ์จาก ADMIN_EMAILS / ADMIN_USER_IDS ฝั่งเซิร์ฟเวอร์ ผู้ใช้แบบไม่ล็อกอินไม่มีสิทธิ์ผู้ดูแล

ระบบขอความยินยอมก่อนบันทึก และมีความยินยอมแยกสำหรับให้ผู้ดูแลตรวจบทสนทนา ผู้ใช้เปลี่ยนความยินยอมและลบประวัติของตนได้ ผู้ดูแลต้องอยู่ใน `ADMIN_USER_IDS` และดูได้เฉพาะคนที่ยินยอม ข้อมูลที่เคยเปิดอ่านแล้วไม่สามารถเรียกคืนจากความทรงจำของผู้ดูแลได้

ทุกคำขอบันทึกข้อความผู้ใช้ก่อนสร้างคำตอบ การลองใหม่ใช้ `requestId` เดิมเพื่อไม่สร้างข้อความซ้ำ จำกัดข้อความ 4,000 ตัวอักษร, 20 ครั้งต่อชั่วโมง, สูงสุด 5 ครั้งต่อคำขอ และประวัติสูงสุด 1,000 ข้อความต่อบัญชี หน้าแชทโหลด 200 ข้อความล่าสุด ส่วนผู้ดูแลดูได้ถึง 1,000 ข้อความ

## เปิดโหมด AI จริง

เจ้าของเว็บเปิด `/admin/settings` หรือเมนู **ตั้งค่า AI** เพื่อกรอก OpenAI API key และชื่อโมเดลด้วยตนเอง ช่องคีย์ซ่อนตัวอักษรและล้างหลังส่ง ไม่มีการเก็บคีย์ใน browser storage เมื่อกด **ตรวจสอบและเปิดใช้ AI** จะเรียก Responses API ด้วยข้อความทดสอบสั้น ๆ ซึ่งมีค่าใช้จ่ายตามบัญชี API ก่อนบันทึก หากตรวจสอบไม่ผ่านจะเก็บการตั้งค่าเดิมไว้

ค่าที่กรอกในหน้าผู้ดูแลเข้ารหัส AES-256-GCM แล้วเก็บใน D1 โดยใช้ `AI_SETTINGS_ENCRYPTION_KEY` (สุ่ม 32 ไบต์ในรูป hex) ที่อยู่ใน hosted secret แยกจากฐานข้อมูล ห้ามเปลี่ยนค่านี้โดยไม่ย้ายคีย์ที่เข้ารหัสไว้ด้วย หน้า GET ส่งกลับเฉพาะสถานะและชื่อโมเดล ผู้ใช้ทั่วไปและบัญชีที่ไม่มีสิทธิ์ผู้ดูแลอ่าน/แก้การตั้งค่าไม่ได้ คีย์ที่บันทึกผ่านหน้านี้มีผลกับการแชทครั้งถัดไปทันทีโดยไม่ต้อง deploy ใหม่

ตอนยังไม่มีทั้งคีย์และชื่อโมเดล ระบบเป็น **โหมดทดลองที่ตอบด้วยกฎ ไม่ใช่ generative AI** คำตอบมีข้อจำกัดและไม่ได้ใช้ประเมินความเสี่ยงทางคลินิก

ตั้งค่าบนเซิร์ฟเวอร์เท่านั้น:

```text
OPENAI_API_KEY=<server secret>
OPENAI_MODEL=<model available to your API project>
ADMIN_USER_IDS=<comma-separated Site-scoped ChatGPT user IDs>
ADMIN_EMAILS=<exact authenticated owner emails, server-only>
```

หากต้องการให้ Codex สร้างคีย์ใหม่ ใช้ plugin OpenAI Developers และ workflow `openai-platform-api-key` ผู้ใช้เลือกกรอกคีย์ที่ตนจัดการเองผ่านหน้าผู้ดูแลได้ ไม่ควรส่ง API key ในแชทหรือใส่ไว้ในโค้ดหน้าเว็บ การเปลี่ยน runtime environment บน Sites ต้อง deploy version อีกครั้งจึงใช้ค่าใหม่ ห้ามใช้ `local_seedy` เป็นผู้ดูแลบน production เพราะเป็นบัญชีจำลองเฉพาะ local preview

การตั้งผู้ดูแลบนเว็บที่เผยแพร่: เข้าสู่ระบบและเริ่มแชทด้วยบัญชีที่จะเป็นผู้ดูแล จากนั้นเปิด `/api/session` บนเว็บเดียวกันเพื่ออ่าน `user.id` นำ ID นี้ไปตั้ง `ADMIN_USER_IDS` ฝั่งเซิร์ฟเวอร์แล้ว deploy อีกครั้ง เมนูประวัติผู้ใช้จะแสดงเมื่อบัญชีตรงกับ allowlist ห้ามใช้ชื่อเล่นหรืออีเมลแทน ID

หน้าเจ้าของเว็บเปิดตรงที่ `/admin` ได้โดยไม่ต้องสร้างชื่อเล่นหรือเริ่มแชทก่อน มีรายชื่อผู้ใช้ ค้นหาชื่อ ประวัติพร้อมเวลาส่ง และลิงก์กลับแชท หน้าแรกมีลิงก์ “ผู้ดูแลเว็บ” หากบัญชีไม่ตรงกับ allowlist จะไม่อ่านประวัติได้

อีกวิธีคือกำหนด `ADMIN_EMAILS` ฝั่งเซิร์ฟเวอร์ ซึ่งเทียบกับอีเมลจากการเข้าสู่ระบบของ Sites โดยตรง ไม่อ่านสิทธิ์หรืออีเมลจากข้อมูลที่หน้าเว็บส่งมา เวอร์ชันนี้ตั้งบัญชีเจ้าของจาก access policy ของ Site ไว้แล้ว บันทึกบทสนทนายังคงผูกกับ Site-scoped user ID ตามเดิม

โหมด AI ส่งเฉพาะประวัติของเจ้าของบัญชี 24 ข้อความล่าสุดตามขนาดที่กำหนด ไม่ส่งชื่อให้โมเดลเป็นคำสั่ง ระบบไม่แสดง chain-of-thought เก็บ API key เฉพาะฝั่งเซิร์ฟเวอร์ ใช้ Responses API โดย `store: false` และจัดการประวัติเอง ตาม [เอกสาร OpenAI เรื่อง conversation state](https://developers.openai.com/api/docs/guides/conversation-state) การตั้งค่านี้ไม่ใช่คำรับรองว่าไม่มีการเก็บข้อมูลของผู้ให้บริการในทุกกรณี

## รันในเครื่อง

เครื่องปัจจุบันเตรียม dependencies และฐานข้อมูล local แล้ว เปิด PowerShell ในโฟลเดอร์โปรเจกต์และรัน `./Start-Moonmind.ps1` เพื่อเริ่มเว็บ ตัวเรียกนี้ใช้ Node ที่ติดตั้งอยู่หรือ runtime ของ Codex หากมี

ต้องมี Node.js >=22.13 และ npm จากนั้น:

```powershell
npm ci
npm run db:generate
npm run build
```

หากมี migrations อยู่แล้ว ไม่ต้อง generate ซ้ำ ใช้ migration SQL แต่ละไฟล์ตามลำดับกับฐานข้อมูล local เพียงครั้งเดียว:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/<migration.sql>
npm run dev
```

เปิด URL loopback ที่ dev server แสดง ปุ่มเข้าสู่ระบบใน local preview ใช้บัญชีจำลอง `local_seedy` โดย starter ไม่ส่ง mock auth ไป production สร้างไฟล์ `.dev.vars` ซึ่ง Git ละเว้นเพื่อกำหนด `ADMIN_USER_IDS="local_seedy"` และค่าทดลองอื่น

## ตรวจสอบ

```powershell
node --test core/persona.test.mjs tests/ai-provider.test.mjs tests/backend.test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

การทดสอบ provider ใช้ mock ไม่เรียก API แบบเสียค่าใช้จ่าย การทดสอบ backend ใช้ SQLite กับ migrations จริงเพื่อตรวจเจ้าของข้อมูล ความยินยอม สิทธิ์ผู้ดูแล การส่งซ้ำ การลองใหม่ และการลบประวัติ

`node tests/http-smoke.mjs` ใช้ทดสอบเซิร์ฟเวอร์ local ที่กำลังเปิดอยู่เท่านั้น โดยสร้างข้อมูลสมมติชื่อ `__MOONMIND_HTTP_SMOKE__` และปฏิเสธการแก้บัญชี local ที่มีชื่ออื่น ต้องตั้ง `ADMIN_USER_IDS="local_seedy"` และใช้ demo mode การตรวจนี้ไม่ใช่การตรวจภาพหรือการทำงานของ JavaScript ในเบราว์เซอร์

## เผยแพร่

`.openai/hosting.json` เก็บ Site ID และ binding `DB` ระบบ Sites จัดการฐานข้อมูลและ migration ตอน deploy เว็บไซต์เริ่มต้นเป็น private สำหรับเจ้าของ การเปิดให้บุคคลอื่นใช้ต้องตั้งค่าผู้ดูแลและการเข้าถึงอย่างชัดเจนก่อนเปลี่ยน audience
# Thai chat language interpretation

`core/thai-language.mjs` provides bounded lexical assistance for common Thai chat slang, abbreviations, elongated spellings and known typos. `analyzeThaiText(text, { previousText })` returns `{ normalized, hints, ambiguous }`. It preserves negation and treats laughter and ambiguous terms as context clues, not evidence of personality, diagnosis or intent. Unknown slang and names remain unchanged.

The demo uses these clues for relevant reflection. The configured model receives bounded clues as untrusted user data alongside the original message; clues never become system instructions. Stored messages keep the user's original wording. The dictionary is intentionally limited and does not guarantee understanding every slang term. This feature needs no extra API or language service.
# Conversation pacing and casual chat

`core/casual-chat.mjs` adds a bounded demo path for recognizable everyday topics, welcome light banter and grounded congratulations. It follows the newest topic without forcing psychological interpretation or asking another question. Emoji use follows the tone and respects explicit opt-out and recent replies. Distress stays with the existing support/safety paths. This remains a finite demo, not unrestricted generative conversation.

Requests to explain “ค้นหา” in the preceding self-discovery context receive a concrete explanation and small examples. Unknown demo input no longer launches repeated clarification questions. In configured AI mode the persona and per-turn guidance also prioritize direct answers, topic changes, proportionate humour and optional emojis. User messages and credentials are never interpolated into these instructions.
# Broad exploration from short messages

`core/exploration-chat.mjs` gives small, reversible starting points for recognized education, career and self-discovery uncertainty without requiring a full biography. It distinguishes stated skills, preferences and enjoyment, including the math example. A single optional goal question follows useful guidance; recent questions and requests not to be asked suppress further questions. Goal replies continue the same caller's context, while casual topic changes remain independent. It does not select a major, invent personality traits or infer hidden feelings.
# Continuing short replies

The demo's general fallback now acknowledges and keeps the conversation open without requiring more detail or claiming complete understanding. Ordinary reflective replies also avoid information-scarcity boilerplate. The exploration path recognizes enjoyment of discovering something new and follows stated interests within the caller's existing exploration context. It preserves negation, keeps questions spaced, and does not infer a personality or choose a career. Model instructions apply the same conversation policy; factual capability explanations remain truthful.

Reply selection checks the caller's last 24 dialogue messages, preferring unused alternatives and otherwise the least recently used wording. Attached questions, symbolic paragraphs and emojis do not hide reused wording. General acknowledgements have twelve alternatives and do not echo the user's sentence or use “ฉันฟังอยู่”. Repeated unfamiliar messages stay on this varied path. Learning-enjoyment replies also cover the happiness screenshot. The demo still uses finite templates; it cannot guarantee permanently unique wording across an unlimited conversation. Configured-model instructions request varied structures, and duplicate replies of at least 32 non-whitespace characters receive the existing bounded revision when seen among twelve recent assistant replies.
# Per-user conversational memory

The backend derives learning context from the caller's latest 200 saved user messages, separately from recent dialogue. A bounded extractor remembers explicit supported interests, dislikes, abilities, goals and style requests. The latest supported correction replaces the old statement. The demo can recall these statements and apply question/emoji preferences; the configured model receives them only as untrusted user-role data. Names never select another visitor's memory. Deleting chat history removes the source of this memory.

This is automatic memory and adaptation from existing conversation history, not training model weights or reusing one visitor's statements for everyone. It does not create an extra inference service or model request. Learned context is intentionally bounded and depends on saved history. Unsupported wording may remain unrecognized.

# Gentle guidance toward the user's own direction

`core/gentle-guidance.mjs` adds a paced path for recognized ordinary distress when the user asks for guidance or continues their own related disclosure. Replies acknowledge the stated difficulty, offer one perspective for consideration, name real constraints and tradeoffs, and give a reusable way to review decisions from experience. Possible beliefs are conditional, not assertions of hidden psychology. Outcomes, accountability, resources and unequal opportunity are acknowledged without guaranteed success or fatalism. Supported goals come only from the caller's explicit saved statements and latest corrections, via fixed canonical labels. No goal or hidden motive is invented. Casual topics and joy are not converted into life lessons, and corrections, safety and higher-stakes decision requests bypass this path.

A request to vent or receive no advice persists until a later explicit request for guidance. The next ordinary turn after coaching returns to listening unless guidance is requested again. The configured-model instructions carry the same approach without embedding raw user goals as instructions. This adds bounded local demo behavior and instructions, not a new generative model or training service.

Precise requests such as “ช่วยมองให้ลึกหน่อย” can continue the user's previous supported topic. Assistant-only context, unrelated new subjects and prior harm signals cannot establish that topic. Deeper coaching takes precedence over ordinary exploration when eligible. The four alternatives in each of five categories retain recent-reply variety. These replies invite reflection; they cannot establish that a user's worldview changed or guarantee enlightenment from a conversation.

# Event-grounded social conversation

`core/social-boundaries.mjs` follows supported events and roles rather than the broad friend/relationship keyword. It distinguishes messenger duties, unequal group-work burdens, unwelcome personal pressure and interrupted/dismissed sharing. Replies begin with the actual friction, then connect boundaries or responsibility in conversational language. Brief hesitation continues the caller's own most recent substantive event; an unrelated new topic or assistant-only narrative cannot supply context. Prior generic replies can be acknowledged and repaired. Refusal costs are recognized without alleging the other person's motives or promising acceptance. Listening-only requests suppress advice; recent-reply variety is retained. Symbolic imagery is suppressed on these concrete event paths. Model instructions generalize the event/role approach. Demo recognition remains bounded by supported patterns.
# Three content lines and detailed stated-conflict analysis

New successful chat replies are formatted into at least three nonempty content lines before saving, so the chat, resumed history, administrator history and completed-request retries share the same text. Existing saved replies are retained. This uses actual newline characters and the existing `white-space: pre-wrap` styling, rather than relying on viewport wrapping or blank rows. Brief replies receive contextual supporting content; stopping, listening-only preferences and safety still take precedence. No automatic emoji is added by the formatter.

The deterministic demo now has multi-signal plans for explicitly stated ability/interest conflicts, family/study-choice conflicts and workload/income constraints. Each plan retains matched user evidence, separates the competing needs, and connects realistic costs with a way to assess the next choice. Denials, other people's ability and different subjects do not establish these personal conflicts. New discovery/enjoyment details retain the exploration route. The system prompt also requests substantive three-line replies and grounded analysis. These remain local rules; no model reasoning effort, API credentials, provider settings or outbound model calls were changed.
# INFJ-inspired persona and personality reflection frameworks

The persona now uses an INFJ-inspired conversational style: connect meaning and longer-term patterns, consider human impact, check interpretations against reasons, and return to concrete events and costs. This is a designed style, not an assertion that the AI has a human personality or special insight.

`core/personality-frameworks.mjs` supports all 16 MBTI preference combinations and all 9 Enneagram motive lenses. Definition questions receive explanations; requested type conclusions now use `core/requested-answer.mjs` to give a tentative choice first, with real self-reported cues and disclosed assumptions rather than a fabricated test score or wing. Explicit self-reported labels can inform a later problem response within the caller's bounded history; only user turns are a source, and newer corrections/denials supersede older reports. Third-party statements, examples, guesses posed as questions, and assistant labels do not establish the user's type. No inferred personality profile is written into a new database field.

Ordinary problem responses can add one conditional motive perspective when the user states both a behavior and a concern, or a type-informed perspective when the user previously specified a label. This supplements the actual problem explanation and is spaced after recent lens use. Safety, listening-only, topic switches and corrections keep precedence. Existing three-line delivery remains intact. No model/provider configuration, API credentials, runtime environment or schema changed; the live demonstration remains deterministic.

Sources used for the original reflective summaries: [MBTI preferences and appropriate interpretation](https://www.myersbriggs.org/unique-features-of-myers-briggs/is-the-mbti-a-test/), [type dynamics](https://www.myersbriggs.org/unique-features-of-myers-briggs/type-dynamics-processes/), and [Enneagram descriptions](https://www.enneagraminstitute.com/type-descriptions/). These are reflection frameworks, not a clinical diagnostic tool or an official assessment. The [systematic review of Enneagram research](https://pubmed.ncbi.nlm.nih.gov/33332604/) reports mixed reliability/validity evidence and limited support for secondary aspects, so the implementation does not claim accurate typing or infer wings/stress paths.

ผู้ใช้ทั่วไปมีปุ่ม **ออกจากระบบ** ในเมนูด้านข้าง (มือถือกดเปิดเมนูก่อน) `DELETE /api/session` ตรวจ origin แล้วพักการเข้าแชทและกลับหน้าแรก พร้อมแจ้งแท็บผู้ใช้ทั่วไปอื่นในเบราว์เซอร์เดียวกันผ่าน storage event โดยเก็บตัวตนและประวัติไว้ ใส่ชื่อเล่นเดิมบนเบราว์เซอร์เดิมจะกลับมาคุยต่อได้ ชื่ออื่นแยกเป็นอีกประวัติ และใช้ชื่อเดียวกันในอีกเบราว์เซอร์จะไม่เปิดข้อมูลของกันและกัน ระบบรักษาประวัติผู้ใช้ก่อนเพิ่มฟีเจอร์นี้เมื่อคุกกี้เดิมยังอยู่ หากคุกกี้เคยถูกล้างไปแล้ว ชื่อเล่นอย่างเดียวไม่สามารถยืนยันเจ้าของเพื่อกู้ประวัตินั้นได้ ปุ่มของบัญชีที่ล็อกอินยังใช้การออกจากระบบ ChatGPT ตามเดิม

คำอ่านไพ่ทั้ง 22 ใบเริ่มด้วยคำทำนายสั้น ๆ ในบรรยากาศดูดวง โดยใช้คำว่า “อาจ” แล้วขยายภาพและความหมายด้วยภาษาทั่วไป มีตัวอย่างใกล้ชีวิตประจำวันและแนวทางให้ลองทำ เช่น แยกสิ่งที่อยากทำเองออกจากความคาดหวังของคนอื่น คำอ่านใหม่มีผลกับการเลือกไพ่ครั้งถัดไป ข้อความที่บันทึกไว้แล้วคงเดิม

ผู้ดูแลลบบัญชีผู้ใช้ในเว็บได้จากหน้าประวัติ: เลือกรายชื่อ → **ลบบัญชีนี้** → ตรวจชื่อและ ID → **ยืนยันลบบัญชีถาวร** การลบจะลบโปรไฟล์ ข้อความ และคำขอแชททั้งหมดด้วย foreign-key cascade รวมถึงข้อมูลที่ใช้จำบทสนทนา กู้คืนผ่านเว็บไม่ได้ หากกลับมาใส่ชื่อเดิมจะเริ่มโปรไฟล์และประวัติใหม่ ใช้ ID แยกบัญชีชื่อซ้ำกัน และไม่อนุญาตลบบัญชีผู้ดูแลผ่านเมนูนี้

`DELETE /api/admin/users` รับ `{ userId, confirmName, confirmed: true }` เฉพาะผู้ดูแลที่ยืนยันตัวตน คำขอจาก origin เดียวกัน และบัญชีที่ยินยอมแชร์ประวัติ ชื่อหรือความยินยอมที่เปลี่ยนไปจะทำให้คำขอเดิมถูกปฏิเสธ ไม่ได้ลบบัญชี ChatGPT ของผู้ใช้

