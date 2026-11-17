'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../app/engine.js');
const CFG = require('../app/config.js');
const SAMPLE = require('../app/sample-data.js');

const baseRisk = {
  id: 'T-1', title: 'ทดสอบ', regulator: 'BOT', regulation: 'ประกาศทดสอบ',
  riskOwner: 'Owner', complianceReviewer: 'Compliance',
  likelihood: 4, likelihoodRationale: 'x',
  impact: { regulatory: 5, customer: 2, financial: 1, reputation: 3 }, impactRationale: 'x',
  controlDesign: 3, controlOperating: 3, controlRationale: 'x',
  lastAssessed: '2026-10-01'
};

test('impact uses worst-case dimension', () => {
  assert.equal(E.impactScore(baseRisk.impact), 5);
});

test('control rating matrix', () => {
  assert.equal(E.controlRating(3, 3), 'EFFECTIVE');
  assert.equal(E.controlRating(3, 2), 'PARTIALLY_EFFECTIVE');
  assert.equal(E.controlRating(2, 2), 'PARTIALLY_EFFECTIVE');
  assert.equal(E.controlRating(1, 3), 'INEFFECTIVE');
  assert.equal(E.controlRating(null, 3), null);
});

test('inherent and residual risk with explanation', () => {
  const a = E.assessRisk(baseRisk);
  assert.equal(a.inherentScore, 20);
  assert.equal(a.inherentLevel, 'VERY_HIGH');
  assert.equal(a.residualLikelihood, 2); // effective control reduces 2 steps
  assert.equal(a.residualScore, 10);
  assert.equal(a.residualLevel, 'HIGH');
  assert.ok(a.explanation.length >= 3);
});

test('missing control assessment is treated conservatively', () => {
  const a = E.assessRisk({ ...baseRisk, controlDesign: null });
  assert.equal(a.residualScore, a.inherentScore);
});

test('incomplete scoring is reported, not guessed', () => {
  const a = E.assessRisk({ ...baseRisk, likelihood: null });
  assert.equal(a.complete, false);
});

test('level boundaries', () => {
  assert.equal(E.levelFor(4), 'LOW');
  assert.equal(E.levelFor(5), 'MEDIUM');
  assert.equal(E.levelFor(9), 'MEDIUM');
  assert.equal(E.levelFor(10), 'HIGH');
  assert.equal(E.levelFor(15), 'HIGH');
  assert.equal(E.levelFor(16), 'VERY_HIGH');
});

test('ACP is generated as DRAFT and high risks get monitoring + testing', () => {
  const acp = E.generateACP([baseRisk], 2027);
  assert.equal(acp.status, 'DRAFT');
  assert.equal(acp.approval, null);
  const mine = acp.activities.filter(a => a.riskId === 'T-1');
  assert.ok(mine.some(a => a.type === 'MONITORING' && a.frequency === 'QUARTERLY'));
  assert.equal(mine.filter(a => a.type === 'TESTING').length, 1);
  assert.ok(acp.activities.some(a => a.type === 'GOVERNANCE' && a.dueDate === '2026-12-31'));
});

test('very high residual gets monthly monitoring and two tests', () => {
  const r = { ...baseRisk, likelihood: 5, controlDesign: 1, controlOperating: 1 };
  const acp = E.generateACP([r], 2027);
  const mine = acp.activities.filter(a => a.riskId === 'T-1');
  assert.ok(mine.some(a => a.frequency === 'MONTHLY'));
  assert.equal(mine.filter(a => a.type === 'TESTING').length, 2);
});

test('medium risk tested within last 12 months is rotated out', () => {
  const r = { ...baseRisk, likelihood: 3, impact: 3, controlDesign: 1, controlOperating: 1, lastTested: '2026-06-30' }; // 9 MEDIUM
  const acp = E.generateACP([r], 2027);
  const mine = acp.activities.filter(a => a.riskId === 'T-1');
  assert.equal(mine.filter(a => a.type === 'TESTING').length, 0);
  assert.ok(mine.some(a => a.type === 'NOTE'));
  const r2 = { ...r, lastTested: '2025-06-30' };
  assert.equal(E.generateACP([r2], 2027).activities.filter(a => a.type === 'TESTING').length, 1);
});

test('Blue Book: unapproved ACP fails, human approval passes', () => {
  const state = { risks: [baseRisk], acp: E.generateACP([baseRisk], 2027), universe: {}, auditLog: [{ action: 'ACP_GENERATED' }] };
  let r = E.evaluateBlueBook(state, '2026-11-17');
  assert.equal(r.results.find(x => x.id === 'BB-07').status, 'FAIL');
  state.acp.status = 'APPROVED';
  state.acp.approval = { approver: 'คณะกรรมการ', role: 'Board', date: '2026-12-20' };
  state.auditLog.push({ action: 'ACP_APPROVED' });
  r = E.evaluateBlueBook(state, '2026-11-17');
  assert.equal(r.results.find(x => x.id === 'BB-07').status, 'PASS');
  assert.equal(r.results.find(x => x.id === 'BB-12').status, 'PASS');
});

test('Blue Book: high residual risk without action plan fails BB-05', () => {
  const r = E.evaluateBlueBook({ risks: [baseRisk], acp: null, universe: {}, auditLog: [] }, '2026-11-17');
  assert.equal(r.results.find(x => x.id === 'BB-05').status, 'FAIL');
});

test('Blue Book: universe coverage requires rationale for non-applicable regulators', () => {
  const universe = {};
  CFG.REGULATORS.forEach(g => { universe[g.code] = { applicable: false, rationale: 'ไม่เกี่ยวข้อง' }; });
  const r = E.CHECKS.universeCoverage({ risks: [], universe }, CFG);
  assert.equal(r.status, 'PASS');
  universe.BOT.rationale = '';
  assert.equal(E.CHECKS.universeCoverage({ risks: [], universe }, CFG).status, 'FAIL');
});

test('Blue Book: stale assessment and overdue items are flagged', () => {
  const stale = { ...baseRisk, lastAssessed: '2025-10-01', actionPlan: { description: 'x', owner: 'y', dueDate: '2026-01-01', status: 'OPEN' } };
  const r = E.evaluateBlueBook({ risks: [stale], acp: null, universe: {}, auditLog: [] }, '2026-11-17');
  assert.equal(r.results.find(x => x.id === 'BB-03').status, 'FAIL');
  assert.equal(r.results.find(x => x.id === 'BB-11').status, 'WARN');
});

test('sample data runs end-to-end and every criterion maps to a check', () => {
  CFG.BLUE_BOOK_CRITERIA.forEach(c => assert.ok(E.CHECKS[c.check], `missing check ${c.check}`));
  const acp = E.generateACP(SAMPLE.risks, SAMPLE.planYear);
  const r = E.evaluateBlueBook({ risks: SAMPLE.risks, acp, universe: SAMPLE.universe, auditLog: [{ action: 'X' }] }, '2026-11-17');
  assert.equal(r.summary.total, CFG.BLUE_BOOK_CRITERIA.length);
  assert.ok(r.results.every(x => ['PASS', 'WARN', 'FAIL', 'N/A'].includes(x.status)));
});
