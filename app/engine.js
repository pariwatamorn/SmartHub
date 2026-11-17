/*
 * KTB Smart Legal & Compliance Hub — CRA / ACP / Blue Book engine
 * Pure functions (ไม่มี side effect) ใช้ได้ทั้งใน browser และ Node.js (สำหรับ unit test)
 *
 * หลักการออกแบบ:
 *  - Decision-support เท่านั้น: engine คำนวณ/เสนอ แต่ไม่อนุมัติแทนมนุษย์ (Human-in-the-loop)
 *  - Explainable: ทุกผลคำนวณมี explanation[] อธิบายที่มาเป็นภาษาไทย (FEAT — Transparency)
 *  - Configurable: เกณฑ์ทั้งหมดมาจาก config.js เพื่อปรับให้ตรง Blue Book ฉบับจริงได้
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'));
  else root.SmartHubEngine = factory(root.SMARTHUB_CONFIG);
})(typeof self !== 'undefined' ? self : this, function (DEFAULT_CONFIG) {
  'use strict';

  const HIGH_LEVELS = ['HIGH', 'VERY_HIGH'];

  function clampScore(n) {
    if (n == null || n === '') return null; // ห้ามเดาค่า: ค่าว่าง = ยังไม่ประเมิน
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    return Math.min(5, Math.max(1, Math.round(v)));
  }

  function levelFor(score, cfg = DEFAULT_CONFIG) {
    const lv = cfg.RISK_LEVELS.find(l => score >= l.min && score <= l.max);
    return lv ? lv.level : null;
  }

  function levelInfo(level, cfg = DEFAULT_CONFIG) {
    return cfg.RISK_LEVELS.find(l => l.level === level) || null;
  }

  /** Impact = ค่าสูงสุดของทุกมิติ (worst case) */
  function impactScore(impact, cfg = DEFAULT_CONFIG) {
    if (impact == null) return null;
    if (typeof impact === 'number') return clampScore(impact);
    const vals = cfg.IMPACT_DIMENSIONS.map(d => clampScore(impact[d.key])).filter(v => v != null);
    return vals.length ? Math.max(...vals) : null;
  }

  function controlRating(design, operating) {
    const d = Number(design), o = Number(operating);
    if (![1, 2, 3].includes(d) || ![1, 2, 3].includes(o)) return null;
    if (d === 3 && o === 3) return 'EFFECTIVE';
    if (d === 1 || o === 1) return 'INEFFECTIVE';
    return 'PARTIALLY_EFFECTIVE';
  }

  /** ประเมินความเสี่ยง 1 รายการ: Inherent → Control → Residual พร้อมคำอธิบาย */
  function assessRisk(risk, cfg = DEFAULT_CONFIG) {
    const explanation = [];
    const L = clampScore(risk.likelihood);
    const I = impactScore(risk.impact, cfg);
    if (L == null || I == null) {
      return { complete: false, explanation: ['ยังให้คะแนน Likelihood/Impact ไม่ครบ — ยังคำนวณระดับความเสี่ยงไม่ได้'] };
    }
    const inherentScore = L * I;
    const inherentLevel = levelFor(inherentScore, cfg);
    explanation.push(`Inherent Risk = Likelihood ${L} × Impact ${I} (ใช้มิติผลกระทบที่สูงสุด) = ${inherentScore} → ระดับ${levelInfo(inherentLevel, cfg).th}`);

    const rating = controlRating(risk.controlDesign, risk.controlOperating);
    const ctl = cfg.CONTROL_RATINGS.find(c => c.rating === rating);
    const reduction = ctl ? ctl.likelihoodReduction : 0;
    if (ctl) {
      explanation.push(`การควบคุม: Design ${risk.controlDesign}/3, Operating ${risk.controlOperating}/3 → ${ctl.th} (${ctl.rule}) ลดโอกาสเกิดได้ ${reduction} ขั้น`);
    } else {
      explanation.push('ยังไม่ได้ประเมินการควบคุม — ถือว่าไม่มีการควบคุมที่ลดความเสี่ยงได้ (conservative)');
    }
    const residualLikelihood = Math.max(1, L - reduction);
    const residualScore = residualLikelihood * I;
    const residualLevel = levelFor(residualScore, cfg);
    explanation.push(`Residual Risk = Likelihood หลังการควบคุม ${residualLikelihood} × Impact ${I} = ${residualScore} → ระดับ${levelInfo(residualLevel, cfg).th}`);

    const rule = cfg.ACP_RULES[residualLevel];
    if (rule) {
      const parts = [`ติดตามความถี่ ${frequencyTh(rule.monitoring.frequency)}`];
      if (rule.testing) parts.push(rule.testing.cycleYears ? `ทดสอบหมุนเวียนทุก ${rule.testing.cycleYears} ปี` : `ทดสอบ ${rule.testing.perYear} ครั้ง/ปี`);
      if (rule.actionPlanRequired) parts.push(`ต้องมีแผนแก้ไขภายใน ${rule.actionPlanMaxDays} วัน`);
      explanation.push(`ผลต่อ ACP: ${parts.join(', ')}`);
    }

    return {
      complete: true,
      likelihood: L,
      impact: I,
      inherentScore,
      inherentLevel,
      controlRating: rating,
      residualLikelihood,
      residualScore,
      residualLevel,
      explanation
    };
  }

  function frequencyTh(f) {
    return ({ MONTHLY: 'รายเดือน', QUARTERLY: 'รายไตรมาส', SEMI_ANNUAL: 'รายครึ่งปี', ANNUAL_CSA: 'ปีละครั้ง (Control Self-Assessment)', ANNUAL: 'รายปี' })[f] || f;
  }

  // ---------- Date helpers (ใช้สตริง YYYY-MM-DD เพื่อหลีกเลี่ยงปัญหา timezone) ----------
  function quarterEnd(year, q) {
    if (q === 0) return `${year - 1}-12-31`;
    if (q === 'ALL') return `${year}-12-31`;
    return `${year}-${['03-31', '06-30', '09-30', '12-31'][q - 1]}`;
  }

  function parseDate(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(s + 'T00:00:00Z');
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function monthsBetween(a, b) {
    const da = parseDate(a), db = parseDate(b);
    if (!da || !db) return null;
    return (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth()) - (db.getUTCDate() < da.getUTCDate() ? 1 : 0);
  }

  function daysBetween(a, b) {
    const da = parseDate(a), db = parseDate(b);
    if (!da || !db) return null;
    return Math.round((db - da) / 86400000);
  }

  // ---------- ACP generation ----------
  /**
   * สร้างร่าง ACP จาก risk register (risk-based)
   * ผลลัพธ์เป็น "ร่าง" (DRAFT) เสมอ ต้องให้ผู้มีอำนาจทบทวนและอนุมัติ
   */
  function generateACP(risks, year, cfg = DEFAULT_CONFIG) {
    const activities = [];
    let seq = 1;
    const id = () => `ACP-${year}-${String(seq++).padStart(3, '0')}`;

    cfg.BASELINE_ACTIVITIES.forEach(b => {
      activities.push({ id: id(), riskId: null, ...b, frequency: b.quarter === 'ALL' ? 'QUARTERLY' : null, dueDate: quarterEnd(year, b.quarter), status: 'PLANNED', basis: 'กิจกรรมพื้นฐานที่ต้องมีทุกปี' });
    });

    const assessed = risks.map(r => ({ risk: r, a: assessRisk(r, cfg) })).filter(x => x.a.complete);
    // เรียงจากความเสี่ยงสูงไปต่ำ เพื่อให้ผู้ทบทวนเห็นรายการสำคัญก่อน
    assessed.sort((x, y) => y.a.residualScore - x.a.residualScore);

    assessed.forEach(({ risk, a }, idx) => {
      const rule = cfg.ACP_RULES[a.residualLevel];
      if (!rule) return;
      const lvTh = levelInfo(a.residualLevel, cfg).th;
      const basis = `Residual ${a.residualScore} (${lvTh})`;
      const owner = risk.complianceReviewer || 'Compliance (ต้องระบุ)';

      activities.push({
        id: id(), riskId: risk.id, type: rule.monitoring.frequency === 'ANNUAL_CSA' ? 'CSA' : 'MONITORING',
        title: `${rule.monitoring.frequency === 'ANNUAL_CSA' ? 'ประเมินการควบคุมด้วยตนเอง (CSA)' : 'ติดตามการปฏิบัติตาม'}: ${risk.title}`,
        frequency: rule.monitoring.frequency, quarter: rule.monitoring.frequency === 'ANNUAL_CSA' ? 3 : 'ALL',
        owner: rule.monitoring.frequency === 'ANNUAL_CSA' ? (risk.riskOwner || 'Risk Owner (ต้องระบุ)') : owner,
        deliverable: rule.monitoring.frequency === 'ANNUAL_CSA' ? 'แบบประเมิน CSA ที่ Compliance สอบทานแล้ว' : `Monitoring report ${frequencyTh(rule.monitoring.frequency)}`,
        dueDate: quarterEnd(year, rule.monitoring.frequency === 'ANNUAL_CSA' ? 3 : 'ALL'), status: 'PLANNED', basis
      });

      if (rule.testing) {
        let skip = false;
        if (rule.testing.cycleYears && risk.lastTested) {
          const m = monthsBetween(risk.lastTested, `${year}-01-01`);
          // ทดสอบครั้งล่าสุดยังอยู่ในรอบหมุนเวียน (เช่น รอบ 2 ปี = ทดสอบภายใน 12 เดือนก่อนต้นปีแผน) → ข้ามปีนี้
          if (m != null && m < 12 * (rule.testing.cycleYears - 1)) skip = true;
        }
        if (skip) {
          activities.push({ id: id(), riskId: risk.id, type: 'NOTE', title: `ไม่จัดทดสอบปีนี้ (ทดสอบล่าสุด ${risk.lastTested} อยู่ในรอบหมุนเวียน): ${risk.title}`, quarter: null, owner, deliverable: '-', dueDate: null, status: 'N/A', basis });
        } else {
          const quarters = rule.testing.perYear >= 2 ? [2, 4] : [[2, 3][idx % 2]];
          quarters.slice(0, rule.testing.perYear).forEach(q => {
            activities.push({
              id: id(), riskId: risk.id, type: 'TESTING', title: `ทดสอบการปฏิบัติตาม (Compliance Testing): ${risk.title}`,
              frequency: null, quarter: q, owner, deliverable: 'Testing report + ข้อเสนอแนะ', dueDate: quarterEnd(year, q), status: 'PLANNED', basis
            });
          });
        }
      }

      if (rule.training) {
        activities.push({
          id: id(), riskId: risk.id, type: 'TRAINING', title: `อบรมเฉพาะเรื่องสำหรับหน่วยงานที่เกี่ยวข้อง: ${risk.title}`,
          frequency: null, quarter: 1, owner: risk.riskOwner || 'Risk Owner (ต้องระบุ)', deliverable: 'รายชื่อผู้เข้าอบรม + ผลทดสอบ', dueDate: quarterEnd(year, 1), status: 'PLANNED', basis
        });
      }
    });

    return { year, status: 'DRAFT', approval: null, generatedAt: null, activities };
  }

  // ---------- Blue Book conformance checks ----------
  const CHECKS = {
    universeCoverage(state, cfg) {
      const findings = [];
      const universe = state.universe || {};
      cfg.REGULATORS.forEach(r => {
        const u = universe[r.code];
        const hasRisk = (state.risks || []).some(k => k.regulator === r.code);
        if (hasRisk) return;
        if (u && u.applicable === false && u.rationale && u.rationale.trim()) return;
        findings.push(`${r.th}: ไม่มีความเสี่ยงใน register และไม่ได้บันทึกเหตุผลว่าไม่เกี่ยวข้อง`);
      });
      return findings.length ? { status: 'FAIL', findings } : { status: 'PASS', findings };
    },
    ownersAssigned(state) {
      const findings = (state.risks || []).filter(r => !nz(r.riskOwner) || !nz(r.complianceReviewer))
        .map(r => `${r.id} ${r.title}: ขาด${!nz(r.riskOwner) ? ' Risk Owner (1st line)' : ''}${!nz(r.complianceReviewer) ? ' Compliance Reviewer (2nd line)' : ''}`);
      return { status: findings.length ? 'FAIL' : 'PASS', findings };
    },
    assessmentFreshness(state, cfg, params, today) {
      const max = (params && params.maxMonths) || 12;
      const findings = (state.risks || []).filter(r => {
        const m = monthsBetween(r.lastAssessed, today);
        return m == null || m >= max;
      }).map(r => `${r.id} ${r.title}: ประเมินล่าสุด ${r.lastAssessed || 'ไม่ระบุ'} (เกิน ${max} เดือน หรือไม่มีข้อมูล)`);
      return { status: findings.length ? 'FAIL' : 'PASS', findings };
    },
    scoringComplete(state, cfg) {
      const findings = [];
      (state.risks || []).forEach(r => {
        const miss = [];
        if (clampScore(r.likelihood) == null) miss.push('Likelihood');
        if (impactScore(r.impact, cfg) == null) miss.push('Impact');
        if (controlRating(r.controlDesign, r.controlOperating) == null) miss.push('Control rating');
        if (!nz(r.likelihoodRationale)) miss.push('เหตุผล Likelihood');
        if (!nz(r.impactRationale)) miss.push('เหตุผล Impact');
        if (!nz(r.controlRationale)) miss.push('เหตุผล Control');
        if (!nz(r.regulation)) miss.push('ชื่อ/เลขที่กฎเกณฑ์อ้างอิง');
        if (miss.length) findings.push(`${r.id} ${r.title}: ขาด ${miss.join(', ')}`);
      });
      return { status: findings.length ? 'FAIL' : 'PASS', findings };
    },
    actionPlans(state, cfg) {
      const findings = [];
      let warn = false;
      (state.risks || []).forEach(r => {
        const a = assessRisk(r, cfg);
        if (!a.complete) return;
        const rule = cfg.ACP_RULES[a.residualLevel];
        if (!rule || !rule.actionPlanRequired) return;
        const p = r.actionPlan || {};
        if (!nz(p.description) || !nz(p.owner) || !nz(p.dueDate)) {
          findings.push(`${r.id} ${r.title}: Residual ${levelInfo(a.residualLevel, cfg).th} แต่แผนแก้ไขไม่ครบ (รายละเอียด/ผู้รับผิดชอบ/กำหนดเสร็จ)`);
          return;
        }
        const d = daysBetween(r.lastAssessed, p.dueDate);
        if (d != null && d > rule.actionPlanMaxDays) {
          warn = true;
          findings.push(`${r.id} ${r.title}: กำหนดเสร็จ ${p.dueDate} เกิน ${rule.actionPlanMaxDays} วันนับจากวันประเมิน — ต้องมีเหตุผล/อนุมัติขยายเวลา`);
        }
      });
      const hardFail = findings.some(f => f.includes('ไม่ครบ'));
      return { status: hardFail ? 'FAIL' : warn ? 'WARN' : 'PASS', findings };
    },
    acpCoversHighRisks(state, cfg) {
      const acts = (state.acp && state.acp.activities) || [];
      const findings = [];
      (state.risks || []).forEach(r => {
        const a = assessRisk(r, cfg);
        if (!a.complete || !HIGH_LEVELS.includes(a.residualLevel)) return;
        const mine = acts.filter(x => x.riskId === r.id);
        if (!mine.some(x => x.type === 'MONITORING')) findings.push(`${r.id} ${r.title}: ไม่มีกิจกรรม Monitoring ใน ACP`);
        if (!mine.some(x => x.type === 'TESTING')) findings.push(`${r.id} ${r.title}: ไม่มีกิจกรรม Testing ใน ACP`);
      });
      if (!state.acp) findings.push('ยังไม่ได้จัดทำ ACP');
      return { status: findings.length ? 'FAIL' : 'PASS', findings };
    },
    acpApproved(state) {
      const acp = state.acp;
      if (!acp) return { status: 'FAIL', findings: ['ยังไม่ได้จัดทำ ACP'] };
      const ap = acp.approval || {};
      if (acp.status !== 'APPROVED' || !nz(ap.approver) || !nz(ap.date)) {
        return { status: 'FAIL', findings: [`ACP ปี ${acp.year} สถานะ ${acp.status} — ยังไม่มีการอนุมัติโดยผู้มีอำนาจ`] };
      }
      if (ap.date >= `${acp.year}-01-01`) {
        return { status: 'WARN', findings: [`อนุมัติเมื่อ ${ap.date} ซึ่งหลังวันเริ่มปีแผน (${acp.year}-01-01)`] };
      }
      return { status: 'PASS', findings: [] };
    },
    activitiesComplete(state) {
      const acts = ((state.acp && state.acp.activities) || []).filter(a => a.type !== 'NOTE');
      const findings = acts.filter(a => !nz(a.owner) || /ต้องระบุ/.test(a.owner) || a.quarter == null || !nz(a.deliverable))
        .map(a => `${a.id} ${a.title}: ขาดผู้รับผิดชอบ/ช่วงเวลา/ผลลัพธ์`);
      if (!state.acp) findings.push('ยังไม่ได้จัดทำ ACP');
      return { status: findings.length ? 'FAIL' : 'PASS', findings };
    },
    trainingPlanned(state) {
      const ok = ((state.acp && state.acp.activities) || []).some(a => a.type === 'TRAINING');
      return { status: ok ? 'PASS' : 'FAIL', findings: ok ? [] : ['ACP ไม่มีกิจกรรมอบรม'] };
    },
    boardReporting(state) {
      const acts = ((state.acp && state.acp.activities) || []).filter(a => a.type === 'REPORTING');
      const quarterly = acts.some(a => a.quarter === 'ALL') || new Set(acts.map(a => a.quarter)).size >= 4;
      return { status: quarterly ? 'PASS' : 'FAIL', findings: quarterly ? [] : ['ไม่พบการรายงานต่อคณะกรรมการรายไตรมาสใน ACP'] };
    },
    noOverdue(state, cfg, params, today) {
      const findings = [];
      ((state.acp && state.acp.activities) || []).forEach(a => {
        if (a.dueDate && a.dueDate < today && !['DONE', 'N/A'].includes(a.status)) findings.push(`${a.id} ${a.title}: เกินกำหนด ${a.dueDate} (สถานะ ${a.status})`);
      });
      (state.risks || []).forEach(r => {
        const p = r.actionPlan;
        if (p && p.dueDate && p.dueDate < today && p.status !== 'DONE') findings.push(`แผนแก้ไข ${r.id} ${r.title}: เกินกำหนด ${p.dueDate}`);
      });
      return { status: findings.length ? 'WARN' : 'PASS', findings };
    },
    auditTrail(state) {
      const log = state.auditLog || [];
      const findings = [];
      if (!log.length) findings.push('ไม่มีบันทึก audit trail');
      if (state.acp && state.acp.status === 'APPROVED' && !log.some(l => l.action === 'ACP_APPROVED')) findings.push('ACP อนุมัติแล้วแต่ไม่พบบันทึกการอนุมัติใน audit trail');
      return { status: findings.length ? 'FAIL' : 'PASS', findings };
    }
  };

  function nz(s) { return typeof s === 'string' ? s.trim().length > 0 : s != null; }

  /** ตรวจความสอดคล้องกับเกณฑ์ Blue Book (ตาม criteria ใน config) */
  function evaluateBlueBook(state, today, cfg = DEFAULT_CONFIG) {
    const results = cfg.BLUE_BOOK_CRITERIA.map(c => {
      const fn = CHECKS[c.check];
      const r = fn ? fn(state, cfg, c.params, today) : { status: 'N/A', findings: [`ไม่พบ rule '${c.check}' ใน engine`] };
      return { ...c, ...r };
    });
    const count = s => results.filter(r => r.status === s).length;
    const summary = { total: results.length, pass: count('PASS'), warn: count('WARN'), fail: count('FAIL'), na: count('N/A') };
    summary.conformancePct = summary.total ? Math.round((summary.pass / (summary.total - summary.na || 1)) * 100) : 0;
    summary.readyForApproval = results.filter(r => r.check !== 'acpApproved' && r.check !== 'noOverdue').every(r => r.status !== 'FAIL');
    return { results, summary };
  }

  /** สรุป heat map (จำนวนความเสี่ยงในแต่ละช่อง L×I) */
  function heatMap(risks, mode = 'residual', cfg = DEFAULT_CONFIG) {
    const grid = Array.from({ length: 5 }, () => Array(5).fill(0).map(() => []));
    risks.forEach(r => {
      const a = assessRisk(r, cfg);
      if (!a.complete) return;
      const L = mode === 'residual' ? a.residualLikelihood : a.likelihood;
      grid[L - 1][a.impact - 1].push(r.id);
    });
    return grid; // grid[likelihood-1][impact-1]
  }

  return {
    CHECKS, assessRisk, controlRating, impactScore, levelFor, levelInfo, generateACP,
    evaluateBlueBook, heatMap, quarterEnd, monthsBetween, daysBetween, frequencyTh
  };
});
