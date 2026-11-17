/*
 * ข้อมูลตัวอย่าง (สมมติ) สำหรับสาธิต/อบรม — ไม่มีข้อมูลลูกค้าหรือข้อมูลส่วนบุคคล
 * ชื่อกฎเกณฑ์ระบุเป็น "หัวข้อ" และทำเครื่องหมาย (ต้องตรวจสอบเลขที่ประกาศ) ไว้โดยเจตนา
 * ผู้ใช้ต้องแทนที่ด้วยเลขที่ประกาศ/หนังสือเวียนฉบับจริงจาก compliance universe ของธนาคาร
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SMARTHUB_SAMPLE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const imp = (regulatory, customer, financial, reputation) => ({ regulatory, customer, financial, reputation });
  return {
    planYear: 2027,
    universe: {
      NACC: { applicable: true, rationale: '' },
      NCB: { applicable: true, rationale: '' },
      OCPB: { applicable: true, rationale: '' },
      MDES: { applicable: false, rationale: 'ตัวอย่าง: ไม่มีกฎเกณฑ์ที่บังคับใช้โดยตรงนอกเหนือจากที่ครอบคลุมภายใต้ NCSA/ETDA — ต้องทบทวนโดย DBR' },
      FPO: { applicable: true, rationale: '' },
      OTHERS: { applicable: false, rationale: 'ตัวอย่าง: ยังไม่ระบุ — ต้องทบทวน' }
    },
    risks: [
      {
        id: 'CR-001', title: 'การทำ CDD/EDD ลูกค้าความเสี่ยงสูงไม่ครบถ้วน', regulator: 'AMLO',
        regulation: 'กฎหมายป้องกันและปราบปรามการฟอกเงิน และกฎกระทรวง/ประกาศ ปปง. ว่าด้วย CDD (ต้องตรวจสอบเลขที่)',
        businessUnit: 'สายงานลูกค้าบุคคล', riskOwner: 'ผู้อำนวยการฝ่ายปฏิบัติการสาขา', complianceReviewer: 'ฝ่าย AML Compliance',
        likelihood: 4, likelihoodRationale: 'พบข้อสังเกตจากการตรวจสอบภายในปีก่อน และยังเป็นกระบวนการ manual บางส่วน',
        impact: imp(5, 3, 4, 5), impactRationale: 'มีโทษตามกฎหมาย AML และกระทบชื่อเสียงร้ายแรง',
        controlDesign: 2, controlOperating: 2, controlRationale: 'มี checklist และระบบ screening แต่ยังพบเอกสารไม่ครบ',
        lastAssessed: '2026-10-15', lastTested: '2025-06-30',
        actionPlan: { description: 'ปรับระบบให้บังคับกรอกข้อมูล EDD ก่อนอนุมัติเปิดบัญชี', owner: 'ฝ่ายปฏิบัติการสาขา + IT', dueDate: '2026-12-10', status: 'OPEN' }
      },
      {
        id: 'CR-002', title: 'การขอความยินยอมและแจ้ง Privacy Notice ในช่องทางดิจิทัล', regulator: 'DPA',
        regulation: 'พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 และประกาศคณะกรรมการ สคส. ที่เกี่ยวข้อง (ต้องตรวจสอบเลขที่)',
        businessUnit: 'สายงาน Digital Banking', riskOwner: 'ผู้อำนวยการฝ่าย Digital Product', complianceReviewer: 'DPO Office / DBR',
        likelihood: 3, likelihoodRationale: 'มีการเปลี่ยนแปลง feature บ่อย เสี่ยงต่อการเก็บข้อมูลเกินวัตถุประสงค์',
        impact: imp(4, 4, 3, 4), impactRationale: 'ค่าปรับทางปกครองและความเชื่อมั่นของลูกค้า',
        controlDesign: 3, controlOperating: 2, controlRationale: 'มี privacy-by-design checklist แต่ยังไม่ครอบคลุมทุก release',
        lastAssessed: '2026-10-20', lastTested: null,
        actionPlan: { description: 'บังคับ DPIA/privacy review ใน release gate', owner: 'ฝ่าย Digital Product', dueDate: '2026-12-15', status: 'OPEN' }
      },
      {
        id: 'CR-003', title: 'การเสนอขายผลิตภัณฑ์ที่ซับซ้อนไม่เหมาะสมกับลูกค้า (Market Conduct)', regulator: 'BOT',
        regulation: 'ประกาศ ธปท. เรื่องการกำกับดูแลด้านการให้บริการอย่างเป็นธรรม (Market Conduct) (ต้องตรวจสอบเลขที่)',
        businessUnit: 'สายงาน Wealth', riskOwner: 'ผู้อำนวยการฝ่ายขาย Wealth', complianceReviewer: 'ฝ่าย Market Conduct Compliance',
        likelihood: 3, likelihoodRationale: 'มีการตั้งเป้ายอดขาย และพบเรื่องร้องเรียนบางส่วน',
        impact: imp(4, 5, 3, 4), impactRationale: 'กระทบลูกค้าโดยตรงและเป็นประเด็นที่ regulator ให้ความสำคัญ',
        controlDesign: 3, controlOperating: 3, controlRationale: 'มี suitability test และ mystery shopping ทำงานได้ดี',
        lastAssessed: '2026-09-30', lastTested: '2026-05-31',
        actionPlan: null
      },
      {
        id: 'CR-004', title: 'การรายงานภัยคุกคามไซเบอร์ต่อหน่วยงานกำกับไม่ทันกำหนด', regulator: 'NCSA',
        regulation: 'พ.ร.บ.การรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2562 และประกาศที่เกี่ยวข้อง (ต้องตรวจสอบเลขที่)',
        businessUnit: 'สายงาน IT Security', riskOwner: 'CISO Office', complianceReviewer: 'DBR',
        likelihood: 2, likelihoodRationale: 'มี SOC 24x7 และ playbook',
        impact: imp(4, 2, 2, 4), impactRationale: 'มีบทลงโทษและกระทบความเชื่อมั่น',
        controlDesign: 3, controlOperating: 2, controlRationale: 'playbook ครบ แต่ยังไม่ได้ซ้อมการรายงานข้ามหน่วยงาน',
        lastAssessed: '2026-10-01', lastTested: '2026-03-31', actionPlan: null
      },
      {
        id: 'CR-005', title: 'การนำส่งข้อมูล FATCA/CRS ไม่ครบถ้วน', regulator: 'RD',
        regulation: 'กฎหมายและประกาศกรมสรรพากรเกี่ยวกับการแลกเปลี่ยนข้อมูลบัญชีทางการเงิน (ต้องตรวจสอบเลขที่)',
        businessUnit: 'สายงานปฏิบัติการ', riskOwner: 'ฝ่ายปฏิบัติการรายงานภาษี', complianceReviewer: 'ฝ่าย Regulatory Reporting Compliance',
        likelihood: 2, likelihoodRationale: 'ระบบอัตโนมัติ มีการกระทบยอด',
        impact: imp(3, 1, 2, 2), impactRationale: 'ค่าปรับและการแก้ไขข้อมูล',
        controlDesign: 3, controlOperating: 3, controlRationale: 'มี reconciliation รายเดือน',
        lastAssessed: '2026-08-15', lastTested: '2026-02-28', actionPlan: null
      },
      {
        id: 'CR-006', title: 'การเปิดเผยข้อมูลและค่าธรรมเนียมผลิตภัณฑ์ประกัน (Bancassurance)', regulator: 'OIC',
        regulation: 'ประกาศ คปภ. ว่าด้วยการเสนอขายกรมธรรม์ผ่านธนาคาร (ต้องตรวจสอบเลขที่)',
        businessUnit: 'สายงาน Bancassurance', riskOwner: 'ผู้อำนวยการฝ่าย Bancassurance', complianceReviewer: 'ฝ่าย Market Conduct Compliance',
        likelihood: 3, likelihoodRationale: 'การขายผ่านสาขาจำนวนมาก',
        impact: imp(3, 4, 2, 3), impactRationale: 'เรื่องร้องเรียนจากลูกค้า',
        controlDesign: 2, controlOperating: 2, controlRationale: 'มีสคริปต์การขายแต่ยังไม่มีการบันทึกเสียงครบทุกช่องทาง',
        lastAssessed: '2026-10-05', lastTested: '2025-11-30',
        actionPlan: { description: 'ขยายการบันทึกเสียง/วิดีโอการเสนอขายให้ครบทุกสาขา', owner: 'ฝ่าย Bancassurance', dueDate: '2027-03-31', status: 'OPEN' }
      },
      {
        id: 'CR-007', title: 'การแจ้งข้อมูลการขายหลักทรัพย์/กองทุนให้ลูกค้า', regulator: 'SEC',
        regulation: 'ประกาศ ก.ล.ต. ว่าด้วยการติดต่อและให้บริการลูกค้า (ต้องตรวจสอบเลขที่)',
        businessUnit: 'สายงาน Wealth', riskOwner: 'ผู้อำนวยการฝ่ายขาย Wealth', complianceReviewer: 'ฝ่าย Securities Compliance',
        likelihood: 2, likelihoodRationale: 'มีระบบแจ้งอัตโนมัติ',
        impact: imp(3, 3, 2, 3), impactRationale: 'ค่าปรับและการแก้ไขข้อมูลต่อลูกค้า',
        controlDesign: 3, controlOperating: 3, controlRationale: 'มีการสอบทานรายเดือน',
        lastAssessed: '2026-09-10', lastTested: '2026-04-30', actionPlan: null
      },
      {
        id: 'CR-008', title: 'การยืนยันตัวตนทางอิเล็กทรอนิกส์ (Digital ID / e-KYC)', regulator: 'ETDA',
        regulation: 'มาตรฐาน/ข้อเสนอแนะ สพธอ. ด้าน Digital ID ที่ธนาคารนำมาใช้ (ต้องตรวจสอบเลขที่)',
        businessUnit: 'สายงาน Digital Banking', riskOwner: 'ผู้อำนวยการฝ่าย Digital Onboarding', complianceReviewer: 'DBR',
        likelihood: 3, likelihoodRationale: 'มีการเปลี่ยนแปลงมาตรฐานและผู้ให้บริการภายนอก',
        impact: imp(3, 3, 3, 4), impactRationale: 'เสี่ยงต่อการปลอมแปลงตัวตน',
        controlDesign: 2, controlOperating: 3, controlRationale: 'มี liveness check แต่ยังไม่ทบทวนตามมาตรฐานฉบับล่าสุด',
        lastAssessed: '2025-09-30', lastTested: null, actionPlan: null
      }
    ]
  };
});
