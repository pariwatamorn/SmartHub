# SmartHub — Compliance Risk Assessment & Annual Compliance Program

ระบบสนับสนุนการตัดสินใจของ KTB Smart Legal & Compliance Hub สำหรับ
1. **ประเมินความเสี่ยงด้าน Compliance (CRA)** — Inherent → Control → Residual อธิบายที่มาทุกขั้น
2. **กำหนด Annual Compliance Program (ACP)** แบบ risk-based เป็นร่างให้มนุษย์ทบทวน/อนุมัติ
3. **แนะนำผู้รับผิดชอบ** — คู่มือหลักการ เกณฑ์การให้คะแนน และ RACI ในระบบ
4. **ควบคุมตามเกณฑ์ Blue Book** — ชุดตรวจ 12 ข้อ (แม่แบบ ปรับให้ตรงฉบับจริงได้)

## เริ่มใช้งาน
เปิด `app/index.html` ในเบราว์เซอร์ (ไม่มี dependency, ไม่ส่งข้อมูลออกภายนอก)

```bash
npm test
```

## โครงสร้าง
| ไฟล์ | หน้าที่ |
|---|---|
| `app/config.js` | เกณฑ์ประเมิน, ระดับความเสี่ยง, กติกา ACP, เกณฑ์ Blue Book (แก้ไขที่นี่) |
| `app/engine.js` | ตรรกะคำนวณ/สร้าง ACP/ตรวจ Blue Book (pure functions) |
| `app/app.js`, `index.html`, `styles.css` | หน้าจอผู้ใช้ |
| `app/sample-data.js` | ข้อมูลสมมติสำหรับอบรม |
| `docs/methodology.md` | หลักการประเมินและการกำหนด ACP |
| `docs/user-guide.md` | คู่มือแยกตามบทบาท |
| `tests/engine.test.js` | unit tests |

> ⚠️ เกณฑ์ Blue Book ในระบบเป็นแม่แบบ ต้องเทียบและใส่ข้ออ้างอิงจาก Blue Book ฉบับที่มีผลบังคับใช้ก่อนใช้งานจริง
>
> ข้อมูลนี้เป็นการสนับสนุนการพิจารณาเบื้องต้น มิใช่ความเห็นทางกฎหมายที่สิ้นสุด โปรดสอบทานโดยผู้รับผิดชอบและตรวจสอบกับฉบับกฎเกณฑ์ล่าสุดก่อนนำไปใช้
