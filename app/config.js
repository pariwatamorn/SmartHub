/*
 * KTB Smart Legal & Compliance Hub — Compliance Risk Assessment (CRA) & Annual Compliance Program (ACP)
 * Default configuration (methodology + Blue Book criteria template)
 *
 * IMPORTANT: เกณฑ์ใน BLUE_BOOK_CRITERIA เป็น "แม่แบบ" (template) ที่ออกแบบจากหลักปฏิบัติสากลของ
 * Compliance Function (risk-based approach) — ยังไม่ใช่ข้อความจาก Blue Book ฉบับจริง
 * ผู้รับผิดชอบ (DBR / Compliance) ต้องปรับ id, ข้อความ, ข้ออ้างอิง (reference) ให้ตรงกับ Blue Book
 * ฉบับที่มีผลบังคับใช้ และบันทึกเลขหมวด/ข้อให้ครบก่อนใช้งานจริง (status: "ต้องตรวจสอบ")
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SMARTHUB_CONFIG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const REGULATORS = [
    { code: 'BOT', th: 'ธนาคารแห่งประเทศไทย (ธปท.)' },
    { code: 'AMLO', th: 'สำนักงานป้องกันและปราบปรามการฟอกเงิน (ปปง.)' },
    { code: 'SEC', th: 'สำนักงานคณะกรรมการ ก.ล.ต.' },
    { code: 'NACC', th: 'สำนักงาน ป.ป.ช.' },
    { code: 'OIC', th: 'สำนักงาน คปภ.' },
    { code: 'DPA', th: 'สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)' },
    { code: 'NCB', th: 'คณะกรรมการคุ้มครองข้อมูลเครดิต' },
    { code: 'OCPB', th: 'สำนักงานคณะกรรมการคุ้มครองผู้บริโภค (สคบ.)' },
    { code: 'NCSA', th: 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ (สกมช.)' },
    { code: 'MDES', th: 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม (MDES)' },
    { code: 'ETDA', th: 'สำนักงานพัฒนาธุรกรรมทางอิเล็กทรอนิกส์ (สพธอ.)' },
    { code: 'RD', th: 'กรมสรรพากร' },
    { code: 'FPO', th: 'สำนักงานเศรษฐกิจการคลัง (สศค.) / กระทรวงการคลัง' },
    { code: 'OTHERS', th: 'หน่วยงานอื่น (Others)' }
  ];

  // ระดับโอกาสเกิด (Likelihood) 1–5 พร้อมแนวทางให้ผู้ประเมินเลือกได้สม่ำเสมอ
  const LIKELIHOOD = [
    { score: 1, label: 'แทบไม่เกิด (Rare)', guide: 'ไม่เคยพบการไม่ปฏิบัติตามในรอบ 3 ปี กระบวนการเรียบง่าย ไม่มีการเปลี่ยนแปลงกฎเกณฑ์' },
    { score: 2, label: 'ไม่น่าเกิด (Unlikely)', guide: 'พบประเด็นเล็กน้อย ≤1 ครั้งในรอบ 3 ปี ปริมาณธุรกรรมต่ำ' },
    { score: 3, label: 'อาจเกิด (Possible)', guide: 'พบประเด็นบางครั้ง/มี manual process หรือมีกฎเกณฑ์ใหม่ที่ยังปรับใช้ไม่ครบ' },
    { score: 4, label: 'น่าจะเกิด (Likely)', guide: 'พบประเด็นซ้ำในรอบปี มีข้อสังเกตจาก regulator/audit ที่ยังไม่ปิด หรือธุรกรรมซับซ้อน/ปริมาณสูง' },
    { score: 5, label: 'เกิดแน่นอน (Almost certain)', guide: 'พบการไม่ปฏิบัติตามต่อเนื่อง ไม่มีกระบวนการรองรับ หรือ regulator แจ้งให้แก้ไขเร่งด่วน' }
  ];

  // ระดับผลกระทบ (Impact) 1–5 — ใช้ค่าสูงสุดจากทุกมิติ (worst-case dimension)
  const IMPACT_DIMENSIONS = [
    { key: 'regulatory', label: 'การลงโทษ/มาตรการจาก regulator' },
    { key: 'customer', label: 'ผลกระทบต่อลูกค้า/ความเป็นธรรม (Market Conduct)' },
    { key: 'financial', label: 'ความเสียหายทางการเงิน (ค่าปรับ/ชดใช้)' },
    { key: 'reputation', label: 'ชื่อเสียงและความเชื่อมั่น' }
  ];
  const IMPACT = [
    { score: 1, label: 'ต่ำมาก (Insignificant)', guide: 'ไม่มีบทลงโทษ แก้ไขภายในได้ ไม่กระทบลูกค้า' },
    { score: 2, label: 'ต่ำ (Minor)', guide: 'regulator ตักเตือน/ขอคำชี้แจง กระทบลูกค้าจำนวนน้อยและแก้ไขได้ทันที' },
    { score: 3, label: 'ปานกลาง (Moderate)', guide: 'ค่าปรับทางปกครอง/สั่งให้แก้ไขภายในกำหนด ข่าวในวงจำกัด' },
    { score: 4, label: 'สูง (Major)', guide: 'ค่าปรับสูง/ข้อจำกัดทางธุรกิจ ลูกค้าเสียหายเป็นวงกว้าง ข่าวระดับประเทศ' },
    { score: 5, label: 'สูงมาก (Severe)', guide: 'โทษอาญา/เพิกถอนใบอนุญาตหรือหยุดธุรกิจ ความเชื่อมั่นเสียหายร้ายแรง' }
  ];

  // เกณฑ์ระดับความเสี่ยงจากคะแนน L x I (ปรับได้ตาม Risk Appetite ของธนาคาร)
  const RISK_LEVELS = [
    { level: 'LOW', th: 'ต่ำ', min: 1, max: 4, color: '#2e7d32' },
    { level: 'MEDIUM', th: 'ปานกลาง', min: 5, max: 9, color: '#f9a825' },
    { level: 'HIGH', th: 'สูง', min: 10, max: 15, color: '#ef6c00' },
    { level: 'VERY_HIGH', th: 'สูงมาก', min: 16, max: 25, color: '#c62828' }
  ];

  // ประสิทธิผลของการควบคุม = ประเมินทั้ง Design และ Operating (1=ไม่มี/ไม่ได้ผล, 2=บางส่วน, 3=ได้ผล)
  // ค่า likelihoodReduction = จำนวนขั้นที่ลดโอกาสเกิดได้ (ผลกระทบไม่ลด เพราะ control ส่วนใหญ่เป็น preventive)
  const CONTROL_RATINGS = [
    { rating: 'EFFECTIVE', th: 'มีประสิทธิผล', likelihoodReduction: 2, rule: 'Design = 3 และ Operating = 3' },
    { rating: 'PARTIALLY_EFFECTIVE', th: 'มีประสิทธิผลบางส่วน', likelihoodReduction: 1, rule: 'Design ≥ 2 และ Operating ≥ 2 (ไม่ใช่ 3/3)' },
    { rating: 'INEFFECTIVE', th: 'ไม่มีประสิทธิผล', likelihoodReduction: 0, rule: 'Design = 1 หรือ Operating = 1' }
  ];

  // กติกาการแปลง Residual Risk → กิจกรรมใน ACP (risk-based)
  const ACP_RULES = {
    VERY_HIGH: {
      monitoring: { frequency: 'MONTHLY', perYear: 12 },
      testing: { perYear: 2 },
      training: true,
      boardReporting: 'QUARTERLY',
      actionPlanRequired: true,
      actionPlanMaxDays: 30
    },
    HIGH: {
      monitoring: { frequency: 'QUARTERLY', perYear: 4 },
      testing: { perYear: 1 },
      training: true,
      boardReporting: 'QUARTERLY',
      actionPlanRequired: true,
      actionPlanMaxDays: 60
    },
    MEDIUM: {
      monitoring: { frequency: 'SEMI_ANNUAL', perYear: 2 },
      testing: { perYear: 1, cycleYears: 2 }, // ทดสอบแบบหมุนเวียนทุก 2 ปี
      training: false,
      boardReporting: 'ANNUAL',
      actionPlanRequired: false
    },
    LOW: {
      monitoring: { frequency: 'ANNUAL_CSA', perYear: 1 }, // Control Self-Assessment โดย 1st line
      testing: null,
      training: false,
      boardReporting: 'ANNUAL',
      actionPlanRequired: false
    }
  };

  // กิจกรรมพื้นฐานที่ต้องมีใน ACP ทุกปี ไม่ขึ้นกับระดับความเสี่ยง
  const BASELINE_ACTIVITIES = [
    { type: 'GOVERNANCE', title: 'เสนอ ACP ประจำปีให้คณะกรรมการ/คณะกรรมการชุดย่อยที่ได้รับมอบหมายอนุมัติ', quarter: 0, owner: 'Head of Compliance', deliverable: 'มติอนุมัติ ACP' },
    { type: 'REG_CHANGE', title: 'ติดตามและประเมินผลกระทบกฎเกณฑ์ใหม่/ที่เปลี่ยนแปลง (Regulatory Change Management)', quarter: 'ALL', owner: 'DBR / Compliance', deliverable: 'Regulatory change log + impact assessment' },
    { type: 'REPORTING', title: 'รายงานผลการปฏิบัติตาม ACP และประเด็นสำคัญต่อคณะกรรมการ', quarter: 'ALL', owner: 'Head of Compliance', deliverable: 'Compliance report รายไตรมาส' },
    { type: 'TRAINING', title: 'อบรม Compliance Awareness ประจำปีสำหรับพนักงานทุกระดับ', quarter: 2, owner: 'Compliance + HR', deliverable: 'สถิติผู้ผ่านการอบรม/แบบทดสอบ' },
    { type: 'CRA', title: 'ทบทวน Compliance Risk Assessment ประจำปีเพื่อจัดทำ ACP ปีถัดไป', quarter: 4, owner: 'Compliance + Risk Owners', deliverable: 'CRA report ปีถัดไป' },
    { type: 'REPORTING', title: 'จัดทำรายงานประจำปีด้าน Compliance (Annual Compliance Report)', quarter: 4, owner: 'Head of Compliance', deliverable: 'Annual Compliance Report' }
  ];

  /*
   * Blue Book criteria — TEMPLATE
   * check: ชื่อ rule ใน engine (ดู engine.js → CHECKS)
   * reference: ให้ระบุหมวด/ข้อของ Blue Book ฉบับจริง (ปัจจุบันระบุ "ต้องตรวจสอบ")
   */
  const BLUE_BOOK_CRITERIA = [
    { id: 'BB-01', area: 'Compliance Universe', requirement: 'ระบุกฎเกณฑ์ที่เกี่ยวข้องครอบคลุม regulator ทุกรายที่บังคับใช้กับธนาคาร หรือบันทึกเหตุผลกรณีไม่เกี่ยวข้อง', check: 'universeCoverage', severity: 'HIGH', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-02', area: 'Accountability', requirement: 'ทุกความเสี่ยงต้องมีผู้รับผิดชอบสายงานธุรกิจ (1st line) และผู้สอบทานจาก Compliance (2nd line)', check: 'ownersAssigned', severity: 'HIGH', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-03', area: 'Risk Assessment', requirement: 'ประเมินความเสี่ยงด้าน Compliance อย่างน้อยปีละ 1 ครั้ง', check: 'assessmentFreshness', params: { maxMonths: 12 }, severity: 'HIGH', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-04', area: 'Risk Assessment', requirement: 'การให้คะแนน Likelihood/Impact/Control ต้องครบและมีเหตุผลประกอบ (rationale) ตรวจสอบย้อนหลังได้', check: 'scoringComplete', severity: 'MEDIUM', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-05', area: 'Remediation', requirement: 'ความเสี่ยงคงเหลือระดับสูง/สูงมาก ต้องมีแผนแก้ไข ผู้รับผิดชอบ และกำหนดเสร็จภายในเวลาที่กำหนด', check: 'actionPlans', severity: 'HIGH', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-06', area: 'ACP Coverage', requirement: 'ACP ต้องมีการติดตาม (monitoring) และทดสอบ (testing) ครอบคลุมความเสี่ยงระดับสูง/สูงมากทุกรายการ', check: 'acpCoversHighRisks', severity: 'HIGH', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-07', area: 'Governance', requirement: 'ACP ต้องได้รับอนุมัติโดยผู้มีอำนาจ (บุคคล) ก่อนเริ่มปีแผน — ระบบไม่อนุมัติแทน', check: 'acpApproved', severity: 'HIGH', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-08', area: 'ACP Quality', requirement: 'ทุกกิจกรรมใน ACP ต้องมีผู้รับผิดชอบ ช่วงเวลา และผลลัพธ์ที่ส่งมอบ', check: 'activitiesComplete', severity: 'MEDIUM', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-09', area: 'Training', requirement: 'มีแผนอบรมด้าน Compliance ประจำปี', check: 'trainingPlanned', severity: 'MEDIUM', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-10', area: 'Reporting', requirement: 'รายงานผลต่อคณะกรรมการอย่างน้อยรายไตรมาส', check: 'boardReporting', severity: 'MEDIUM', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-11', area: 'Execution', requirement: 'ติดตามกิจกรรม/แผนแก้ไขที่เกินกำหนดและ escalate', check: 'noOverdue', severity: 'MEDIUM', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' },
    { id: 'BB-12', area: 'Audit Trail', requirement: 'มีบันทึกการเปลี่ยนแปลง/การอนุมัติ (audit trail) ครบถ้วน', check: 'auditTrail', severity: 'LOW', reference: 'Blue Book — ต้องตรวจสอบหมวด/ข้อ' }
  ];

  return {
    VERSION: '1.0.0',
    REGULATORS,
    LIKELIHOOD,
    IMPACT,
    IMPACT_DIMENSIONS,
    RISK_LEVELS,
    CONTROL_RATINGS,
    ACP_RULES,
    BASELINE_ACTIVITIES,
    BLUE_BOOK_CRITERIA
  };
});
