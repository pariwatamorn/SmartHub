/* UI layer — vanilla JS, ไม่มี dependency ภายนอก (ใช้งาน offline / ภายในเครือข่ายธนาคารได้) */
(function () {
  'use strict';
  const CFG = window.SMARTHUB_CONFIG;
  const E = window.SmartHubEngine;
  const STORE_KEY = 'smarthub-cra-acp-v1';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const today = () => new Date().toISOString().slice(0, 10);
  const nowTs = () => new Date().toISOString();

  let state = load() || freshState();

  function freshState() {
    return { planYear: new Date().getFullYear() + 1, currentUser: '', universe: {}, risks: [], acp: null, auditLog: [] };
  }
  function load() {
    try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable — ใช้ export JSON แทน */ }
  }
  function log(action, detail) {
    state.auditLog.push({ ts: nowTs(), user: state.currentUser || '(ไม่ระบุ)', action, detail });
    save();
  }

  // ---------------- Tabs ----------------
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
    render();
  });
  $('#currentUser').addEventListener('change', e => { state.currentUser = e.target.value.trim(); save(); });
  $('#planYear').addEventListener('change', e => { state.planYear = Number(e.target.value); save(); render(); });

  const levelPill = lv => { const i = E.levelInfo(lv, CFG); return i ? `<span class="pill" style="background:${i.color}">${i.th}</span>` : '-'; };
  const statusPill = s => `<span class="pill status-${s === 'N/A' ? 'NA' : s}">${s}</span>`;
  const regTh = code => (CFG.REGULATORS.find(r => r.code === code) || {}).th || code;

  // ---------------- 1. Guide ----------------
  function renderGuide() {
    const lk = CFG.LIKELIHOOD.map(l => `<tr><td>${l.score}</td><td>${esc(l.label)}</td><td>${esc(l.guide)}</td></tr>`).join('');
    const im = CFG.IMPACT.map(l => `<tr><td>${l.score}</td><td>${esc(l.label)}</td><td>${esc(l.guide)}</td></tr>`).join('');
    const lv = CFG.RISK_LEVELS.map(l => `<tr><td>${levelPill(l.level)}</td><td>${l.min}–${l.max}</td><td>${acpRuleText(l.level)}</td></tr>`).join('');
    const ctl = CFG.CONTROL_RATINGS.map(c => `<tr><td>${esc(c.th)}</td><td>${esc(c.rule)}</td><td>ลด Likelihood ${c.likelihoodReduction} ขั้น</td></tr>`).join('');
    $('#tab-guide').innerHTML = `
      <div class="card">
        <h2>ภาพรวมกระบวนการ (Annual Compliance Cycle)</h2>
        <ol>
          <li><b>กำหนด Compliance Universe</b> — ระบุกฎเกณฑ์จาก regulator ทั้ง 14 ราย ที่บังคับใช้กับธนาคาร หรือบันทึกเหตุผลหากไม่เกี่ยวข้อง</li>
          <li><b>ประเมินความเสี่ยง (CRA)</b> — Risk Owner (1st line) ให้คะแนน Likelihood/Impact และประเมินการควบคุม พร้อมเหตุผล; Compliance (2nd line) สอบทาน (challenge)</li>
          <li><b>คำนวณ Residual Risk</b> — ระบบคำนวณและอธิบายที่มาของผลทุกขั้นตอน</li>
          <li><b>จัดทำร่าง ACP</b> — ระบบเสนอกิจกรรม Monitoring / Testing / Training / Reporting ตามระดับ Residual Risk (risk-based)</li>
          <li><b>ตรวจตามเกณฑ์ Blue Book</b> — ต้องไม่มีรายการ FAIL ก่อนเสนออนุมัติ</li>
          <li><b>อนุมัติโดยผู้มีอำนาจ (Human-in-the-loop)</b> — บันทึกผู้อนุมัติ วันที่ และเลขที่มติ ระบบไม่อนุมัติแทน</li>
          <li><b>ติดตามผลระหว่างปีและรายงานรายไตรมาส</b> — ระบบแจ้งรายการที่เกินกำหนด</li>
        </ol>
        <div class="info">แนะนำช่วงเวลา: ไตรมาส 3–4 ของปีก่อนหน้า ทบทวน CRA → ต้นไตรมาส 4 จัดทำร่าง ACP → ก่อน 31 ธ.ค. เสนออนุมัติ → ม.ค.–ธ.ค. ปฏิบัติตามแผนและรายงานรายไตรมาส</div>
      </div>
      <div class="card">
        <h2>บทบาทผู้รับผิดชอบ (Three Lines Model — RACI)</h2>
        <div class="table-wrap"><table>
          <tr><th>ขั้นตอน</th><th>Risk Owner (1st line)</th><th>Compliance / DBR (2nd line)</th><th>Head of Compliance</th><th>คณะกรรมการ / Committee</th><th>Internal Audit (3rd line)</th></tr>
          <tr><td>Compliance Universe</td><td>C</td><td>R</td><td>A</td><td>I</td><td>I</td></tr>
          <tr><td>ให้คะแนนความเสี่ยง & การควบคุม</td><td>R</td><td>C (challenge)</td><td>A</td><td>I</td><td>I</td></tr>
          <tr><td>แผนแก้ไขความเสี่ยงสูง</td><td>R/A</td><td>C (ติดตาม)</td><td>I</td><td>I</td><td>I</td></tr>
          <tr><td>จัดทำ ACP</td><td>C</td><td>R</td><td>A</td><td>I</td><td>I</td></tr>
          <tr><td>อนุมัติ ACP</td><td>-</td><td>C</td><td>R (เสนอ)</td><td>A</td><td>I</td></tr>
          <tr><td>ติดตาม / ทดสอบ / รายงาน</td><td>C</td><td>R</td><td>A</td><td>I</td><td>C (ประเมินอิสระ)</td></tr>
        </table></div>
        <p class="hint">R = Responsible, A = Accountable, C = Consulted, I = Informed — ปรับให้ตรงกับโครงสร้างอำนาจอนุมัติและ Blue Book ของธนาคาร</p>
      </div>
      <div class="grid2">
        <div class="card"><h3>เกณฑ์ Likelihood (โอกาสเกิดการไม่ปฏิบัติตาม)</h3><table><tr><th>คะแนน</th><th>ระดับ</th><th>แนวทางเลือก</th></tr>${lk}</table></div>
        <div class="card"><h3>เกณฑ์ Impact (ใช้มิติที่สูงสุด)</h3><p class="hint">มิติ: ${CFG.IMPACT_DIMENSIONS.map(d => esc(d.label)).join(' · ')}</p><table><tr><th>คะแนน</th><th>ระดับ</th><th>แนวทางเลือก</th></tr>${im}</table></div>
      </div>
      <div class="grid2">
        <div class="card"><h3>ประสิทธิผลการควบคุม</h3><table><tr><th>ผล</th><th>เงื่อนไข (Design/Operating 1–3)</th><th>ผลต่อความเสี่ยง</th></tr>${ctl}</table>
          <p class="hint">ยังไม่ประเมินการควบคุม = ถือว่าไม่ลดความเสี่ยง (conservative)</p></div>
        <div class="card"><h3>ระดับความเสี่ยง → ข้อกำหนดใน ACP</h3><table><tr><th>ระดับ</th><th>คะแนน L×I</th><th>สิ่งที่ต้องมีใน ACP</th></tr>${lv}</table></div>
      </div>
      <div class="card">
        <h2>ข้อควรระวังในการประเมิน (FEAT)</h2>
        <ul>
          <li><b>Fairness</b> — ให้น้ำหนักมิติผลกระทบต่อลูกค้าเท่าเทียมกับมิติอื่น ไม่ลดคะแนนเพราะเหตุผลด้านยอดขาย</li>
          <li><b>Accountability</b> — ทุกคะแนนต้องมีเหตุผลและหลักฐาน (audit finding, เรื่องร้องเรียน, ผล testing) ที่ตรวจสอบย้อนหลังได้</li>
          <li><b>Transparency</b> — ระบุชื่อ/เลขที่ประกาศของกฎเกณฑ์ หากไม่แน่ใจให้เขียน "ต้องตรวจสอบ" ห้ามเดา</li>
          <li><b>PDPA</b> — ห้ามใส่ชื่อลูกค้า เลขบัญชี หรือข้อมูลส่วนบุคคลในระบบนี้ ใช้ตำแหน่ง/หน่วยงานแทนชื่อบุคคลเมื่อเป็นไปได้</li>
        </ul>
        <div class="note">เกณฑ์ Blue Book ในระบบเป็น <b>แม่แบบ</b> ที่ต้องปรับข้อความและข้ออ้างอิงให้ตรงกับ Blue Book ฉบับที่มีผลบังคับใช้ (แก้ไขได้ที่ <code>app/config.js</code>) — ดู docs/methodology.md</div>
      </div>`;
  }
  function acpRuleText(level) {
    const r = CFG.ACP_RULES[level];
    const p = [`Monitoring ${E.frequencyTh(r.monitoring.frequency)}`];
    if (r.testing) p.push(r.testing.cycleYears ? `Testing หมุนเวียนทุก ${r.testing.cycleYears} ปี` : `Testing ${r.testing.perYear} ครั้ง/ปี`);
    if (r.training) p.push('อบรมเฉพาะเรื่อง');
    if (r.actionPlanRequired) p.push(`แผนแก้ไข ≤ ${r.actionPlanMaxDays} วัน`);
    p.push(`รายงานคณะกรรมการ ${r.boardReporting === 'QUARTERLY' ? 'รายไตรมาส' : 'รายปี'}`);
    return p.join(' · ');
  }

  // ---------------- 2. Universe ----------------
  function renderUniverse() {
    const rows = CFG.REGULATORS.map(r => {
      const u = state.universe[r.code] || { applicable: true, rationale: '' };
      const n = state.risks.filter(k => k.regulator === r.code).length;
      return `<tr><td><b>${r.code}</b></td><td>${esc(r.th)}</td><td>${n}</td>
        <td><label><input type="checkbox" data-uni="${r.code}" ${u.applicable !== false ? 'checked' : ''}> เกี่ยวข้อง</label></td>
        <td><input style="width:100%" data-uni-rat="${r.code}" value="${esc(u.rationale)}" placeholder="${u.applicable === false ? 'ต้องระบุเหตุผลที่ไม่เกี่ยวข้อง' : 'หมายเหตุ (ถ้ามี)'}"></td></tr>`;
    }).join('');
    $('#tab-universe').innerHTML = `<div class="card"><h2>Compliance Universe — หน่วยงานกำกับ 14 ราย</h2>
      <p>ทุก regulator ต้องมีความเสี่ยงอย่างน้อย 1 รายการใน register หรือระบุว่า "ไม่เกี่ยวข้อง" พร้อมเหตุผล (Blue Book: BB-01)</p>
      <div class="table-wrap"><table><tr><th>รหัส</th><th>หน่วยงาน</th><th>จำนวนความเสี่ยง</th><th>สถานะ</th><th>เหตุผล/หมายเหตุ</th></tr>${rows}</table></div></div>`;
    document.querySelectorAll('[data-uni]').forEach(cb => cb.addEventListener('change', () => {
      const c = cb.dataset.uni; state.universe[c] = { ...(state.universe[c] || {}), applicable: cb.checked };
      log('UNIVERSE_UPDATED', `${c} applicable=${cb.checked}`); renderUniverse();
    }));
    document.querySelectorAll('[data-uni-rat]').forEach(inp => inp.addEventListener('change', () => {
      const c = inp.dataset.uniRat; state.universe[c] = { applicable: true, ...(state.universe[c] || {}), rationale: inp.value };
      log('UNIVERSE_UPDATED', `${c} rationale updated`);
    }));
  }

  // ---------------- 3. Register ----------------
  function renderRegister() {
    const rows = state.risks.map(r => {
      const a = E.assessRisk(r, CFG);
      return `<tr><td>${esc(r.id)}</td><td>${esc(r.title)}<div class="hint">${esc(r.regulation)}</div></td><td>${esc(r.regulator)}</td>
        <td>${esc(r.riskOwner)}<div class="hint">${esc(r.complianceReviewer)}</div></td>
        <td>${a.complete ? `${a.inherentScore} ${levelPill(a.inherentLevel)}` : '-'}</td>
        <td>${a.complete ? `${a.residualScore} ${levelPill(a.residualLevel)}` : '<i>ไม่ครบ</i>'}</td>
        <td>${esc(r.lastAssessed || '-')}</td>
        <td><button class="btn secondary" data-edit="${esc(r.id)}">แก้ไข/ดูเหตุผล</button></td></tr>`;
    }).join('');
    $('#tab-register').innerHTML = `<div class="card"><h2>Compliance Risk Register</h2>
      <div class="actions"><button class="btn" id="addRisk">+ เพิ่มความเสี่ยง</button>
      <button class="btn secondary" id="loadSample">โหลดข้อมูลตัวอย่าง (สำหรับอบรม)</button></div>
      ${state.risks.length ? `<div class="table-wrap"><table><tr><th>ID</th><th>ความเสี่ยง / กฎเกณฑ์</th><th>Regulator</th><th>Risk Owner / Reviewer</th><th>Inherent</th><th>Residual</th><th>ประเมินล่าสุด</th><th></th></tr>${rows}</table></div>`
        : '<p class="hint">ยังไม่มีความเสี่ยง — เพิ่มรายการ หรือโหลดข้อมูลตัวอย่างเพื่อฝึกใช้งาน</p>'}</div>`;
    $('#addRisk').onclick = () => openRisk(null);
    $('#loadSample').onclick = () => {
      if (state.risks.length && !confirm('แทนที่ข้อมูลปัจจุบันด้วยข้อมูลตัวอย่าง?')) return;
      const s = window.SMARTHUB_SAMPLE;
      state.risks = JSON.parse(JSON.stringify(s.risks)); state.universe = JSON.parse(JSON.stringify(s.universe));
      state.planYear = s.planYear; state.acp = null; $('#planYear').value = state.planYear;
      log('SAMPLE_LOADED', 'โหลดข้อมูลตัวอย่าง (สมมติ)'); render();
    };
    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openRisk(b.dataset.edit));
  }

  function opt(list, val, labelFn) { return list.map(x => `<option value="${x.v}" ${String(x.v) === String(val) ? 'selected' : ''}>${esc(labelFn(x))}</option>`).join(''); }

  function openRisk(id) {
    const existing = state.risks.find(r => r.id === id);
    const r = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: nextRiskId(), title: '', regulator: 'BOT', regulation: '', businessUnit: '', riskOwner: '', complianceReviewer: '',
      likelihood: '', likelihoodRationale: '', impact: {}, impactRationale: '', controlDesign: '', controlOperating: '', controlRationale: '',
      lastAssessed: today(), lastTested: '', actionPlan: { description: '', owner: '', dueDate: '', status: 'OPEN' }
    };
    r.actionPlan = r.actionPlan || { description: '', owner: '', dueDate: '', status: 'OPEN' };
    const scoreOpts = (list, v) => `<option value="">— เลือก —</option>` + opt(list.map(l => ({ v: l.score, ...l })), v, x => `${x.score} — ${x.label}`);
    const ctlOpts = v => `<option value="">— เลือก —</option>` + opt([{ v: 1, t: '1 — ไม่มี/ไม่ได้ผล' }, { v: 2, t: '2 — มีบางส่วน' }, { v: 3, t: '3 — ครบถ้วน/ได้ผล' }], v, x => x.t);
    const f = $('#riskForm');
    f.innerHTML = `<h2>${existing ? 'แก้ไข' : 'เพิ่ม'}ความเสี่ยง ${esc(r.id)}</h2>
      <div class="form-grid">
        <label class="wide">ชื่อความเสี่ยง (เหตุการณ์ที่อาจไม่ปฏิบัติตาม)<input name="title" required value="${esc(r.title)}"></label>
        <label>Regulator<select name="regulator">${opt(CFG.REGULATORS.map(g => ({ v: g.code, th: g.th })), r.regulator, x => `${x.v} — ${x.th}`)}</select></label>
        <label>กฎเกณฑ์อ้างอิง (ชื่อ + เลขที่ประกาศ)<input name="regulation" value="${esc(r.regulation)}" placeholder="ไม่แน่ใจเลขที่ ให้ระบุ (ต้องตรวจสอบ)"></label>
        <label>หน่วยงาน/สายงาน<input name="businessUnit" value="${esc(r.businessUnit)}"></label>
        <label>Risk Owner (1st line)<input name="riskOwner" value="${esc(r.riskOwner)}" placeholder="ตำแหน่ง/หน่วยงาน"></label>
        <label>Compliance Reviewer (2nd line)<input name="complianceReviewer" value="${esc(r.complianceReviewer)}"></label>
        <label>Likelihood<select name="likelihood">${scoreOpts(CFG.LIKELIHOOD, r.likelihood)}</select><span class="hint" id="lkHint"></span></label>
        <label class="wide">เหตุผล/หลักฐาน Likelihood<textarea name="likelihoodRationale">${esc(r.likelihoodRationale)}</textarea></label>
        ${CFG.IMPACT_DIMENSIONS.map(d => `<label>Impact — ${esc(d.label)}<select name="impact.${d.key}">${scoreOpts(CFG.IMPACT, (r.impact || {})[d.key])}</select></label>`).join('')}
        <label class="wide">เหตุผล/หลักฐาน Impact<textarea name="impactRationale">${esc(r.impactRationale)}</textarea></label>
        <label>Control Design<select name="controlDesign">${ctlOpts(r.controlDesign)}</select><span class="hint">การออกแบบครอบคลุมข้อกำหนดหรือไม่</span></label>
        <label>Control Operating<select name="controlOperating">${ctlOpts(r.controlOperating)}</select><span class="hint">ปฏิบัติได้จริงสม่ำเสมอ (อ้างผล testing/audit)</span></label>
        <label class="wide">การควบคุมที่มีและเหตุผลการให้คะแนน<textarea name="controlRationale">${esc(r.controlRationale)}</textarea></label>
        <label>วันที่ประเมิน<input type="date" name="lastAssessed" value="${esc(r.lastAssessed)}"></label>
        <label>วันที่ทดสอบล่าสุด<input type="date" name="lastTested" value="${esc(r.lastTested || '')}"></label>
        <label class="wide">แผนแก้ไข (บังคับเมื่อ Residual สูง/สูงมาก)<textarea name="ap.description">${esc(r.actionPlan.description)}</textarea></label>
        <label>ผู้รับผิดชอบแผน<input name="ap.owner" value="${esc(r.actionPlan.owner)}"></label>
        <label>กำหนดเสร็จ<input type="date" name="ap.dueDate" value="${esc(r.actionPlan.dueDate)}"></label>
        <label>สถานะแผน<select name="ap.status">${opt([{ v: 'OPEN' }, { v: 'DONE' }], r.actionPlan.status, x => x.v)}</select></label>
      </div>
      <div class="explain" id="liveExplain"></div>
      <div class="actions" style="justify-content:flex-end">
        ${existing ? '<button class="btn danger" value="delete" id="delRisk" type="button">ลบ</button>' : ''}
        <button class="btn secondary" value="cancel" formnovalidate>ยกเลิก</button>
        <button class="btn" value="save" id="saveRisk">บันทึก</button>
      </div>`;
    const read = () => {
      const fd = new FormData(f); const out = JSON.parse(JSON.stringify(r)); out.impact = {}; out.actionPlan = {};
      for (const [k, v] of fd.entries()) {
        if (k.startsWith('impact.')) out.impact[k.slice(7)] = v === '' ? null : Number(v);
        else if (k.startsWith('ap.')) out.actionPlan[k.slice(3)] = v;
        else if (['likelihood', 'controlDesign', 'controlOperating'].includes(k)) out[k] = v === '' ? null : Number(v);
        else out[k] = v;
      }
      return out;
    };
    const live = () => {
      const x = read(); const a = E.assessRisk(x, CFG);
      const lk = CFG.LIKELIHOOD.find(l => l.score === x.likelihood);
      $('#lkHint').textContent = lk ? lk.guide : '';
      $('#liveExplain').innerHTML = '<b>ผลการคำนวณและที่มา (Explainability)</b><ol>' + a.explanation.map(t => `<li>${esc(t)}</li>`).join('') + '</ol>';
    };
    f.oninput = live; live();
    const dlg = $('#riskDialog');
    if (existing) $('#delRisk').onclick = () => {
      if (!confirm(`ลบ ${r.id}?`)) return;
      state.risks = state.risks.filter(k => k.id !== r.id); log('RISK_DELETED', r.id); dlg.close(); render();
    };
    dlg.onclose = () => {
      if (dlg.returnValue !== 'save') return;
      const x = read();
      if (!x.title.trim()) { alert('กรุณาระบุชื่อความเสี่ยง'); return; }
      const i = state.risks.findIndex(k => k.id === x.id);
      const a = E.assessRisk(x, CFG);
      if (i >= 0) state.risks[i] = x; else state.risks.push(x);
      log(i >= 0 ? 'RISK_UPDATED' : 'RISK_CREATED', `${x.id} residual=${a.complete ? a.residualScore + ' ' + a.residualLevel : 'incomplete'}`);
      if (state.acp && state.acp.status === 'APPROVED') {
        state.acp.status = 'DRAFT'; state.acp.approval = null;
        log('ACP_REOPENED', 'ความเสี่ยงเปลี่ยนหลังอนุมัติ — ACP กลับเป็นร่าง ต้องทบทวน/อนุมัติใหม่');
        alert('มีการเปลี่ยนแปลงความเสี่ยงหลัง ACP อนุมัติแล้ว: ACP ถูกเปลี่ยนเป็นร่างเพื่อทบทวนและอนุมัติใหม่');
      }
      render();
    };
    dlg.returnValue = ''; dlg.showModal();
  }
  function nextRiskId() {
    const n = state.risks.map(r => Number(String(r.id).replace(/\D/g, '')) || 0);
    return 'CR-' + String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0');
  }

  // ---------------- 4. Heat map ----------------
  function renderHeat() {
    const block = mode => {
      const g = E.heatMap(state.risks, mode, CFG);
      let html = '';
      for (let L = 5; L >= 1; L--) {
        html += `<div class="axis">L${L}</div>`;
        for (let I = 1; I <= 5; I++) {
          const info = E.levelInfo(E.levelFor(L * I, CFG), CFG);
          const ids = g[L - 1][I - 1];
          html += `<div style="background:${info.color};opacity:${ids.length ? 1 : .35}" title="${L}×${I}=${L * I}">${ids.join('<br>')}</div>`;
        }
      }
      html += '<div class="axis"></div>' + [1, 2, 3, 4, 5].map(i => `<div class="axis">I${i}</div>`).join('');
      return `<div class="heat">${html}</div>`;
    };
    $('#tab-heatmap').innerHTML = `<div class="grid2"><div class="card"><h2>Inherent Risk</h2>${block('inherent')}</div>
      <div class="card"><h2>Residual Risk (หลังการควบคุม)</h2>${block('residual')}</div></div>
      <p class="hint">แกนตั้ง = Likelihood, แกนนอน = Impact · การเลื่อนจาก Inherent → Residual แสดงประสิทธิผลของการควบคุม</p>`;
  }

  // ---------------- 5. ACP ----------------
  function renderACP() {
    const acp = state.acp;
    const bb = E.evaluateBlueBook(state, today(), CFG);
    const canSubmit = acp && acp.status === 'DRAFT' && bb.summary.readyForApproval;
    const types = { GOVERNANCE: 'กำกับดูแล', REG_CHANGE: 'Reg Change', REPORTING: 'รายงาน', TRAINING: 'อบรม', CRA: 'CRA', MONITORING: 'Monitoring', TESTING: 'Testing', CSA: 'CSA', NOTE: 'หมายเหตุ' };
    const qLabel = q => q === 'ALL' ? 'ตลอดปี' : q === 0 ? 'ก่อนเริ่มปี' : q == null ? '-' : 'Q' + q;
    const rows = acp ? acp.activities.map((a, i) => `<tr>
        <td>${esc(a.id)}</td><td>${types[a.type] || a.type}</td><td>${esc(a.title)}<div class="hint">${esc(a.basis || '')}${a.frequency ? ' · ' + E.frequencyTh(a.frequency) : ''}</div></td>
        <td>${qLabel(a.quarter)}<div class="hint">${esc(a.dueDate || '')}</div></td>
        <td><input data-owner="${i}" value="${esc(a.owner)}" ${acp.status === 'APPROVED' ? 'disabled' : ''}></td><td>${esc(a.deliverable)}</td>
        <td><select data-status="${i}">${['PLANNED', 'IN_PROGRESS', 'DONE', 'N/A'].map(s => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('') : '';
    $('#tab-acp').innerHTML = `<div class="card"><h2>Annual Compliance Program ปี ${esc(state.planYear)}</h2>
      <div class="kpis">
        <div class="kpi">สถานะ<b>${acp ? acp.status : 'ยังไม่จัดทำ'}</b></div>
        <div class="kpi">กิจกรรม<b>${acp ? acp.activities.filter(a => a.type !== 'NOTE').length : 0}</b></div>
        <div class="kpi">ความสอดคล้อง Blue Book<b>${bb.summary.conformancePct}%</b></div>
        <div class="kpi">FAIL<b style="color:var(--fail)">${bb.summary.fail}</b></div>
      </div>
      <div class="actions">
        <button class="btn" id="genAcp" ${acp && acp.status === 'APPROVED' ? 'disabled' : ''}>${acp ? 'สร้างร่างใหม่จาก Risk Register' : 'สร้างร่าง ACP จาก Risk Register'}</button>
        <button class="btn secondary" id="submitAcp" ${canSubmit ? '' : 'disabled'} title="ต้องไม่มี FAIL ในเกณฑ์ Blue Book">ส่งทบทวน/เสนออนุมัติ</button>
        <button class="btn secondary" id="approveAcp" ${acp && acp.status === 'SUBMITTED' ? '' : 'disabled'}>บันทึกผลการอนุมัติ (โดยผู้มีอำนาจ)</button>
        <button class="btn secondary" id="csvAcp" ${acp ? '' : 'disabled'}>Export CSV</button>
      </div>
      ${acp && acp.status === 'DRAFT' && !bb.summary.readyForApproval ? '<div class="note">ยังเสนออนุมัติไม่ได้: มีรายการ FAIL ในแท็บ "ตรวจตามเกณฑ์ Blue Book" — ต้องแก้ไขก่อน</div>' : ''}
      ${acp && acp.approval ? `<div class="info">อนุมัติโดย ${esc(acp.approval.approver)} (${esc(acp.approval.role)}) วันที่ ${esc(acp.approval.date)} อ้างอิงมติ ${esc(acp.approval.resolutionRef || '-')}</div>` : ''}
      ${acp ? `<div class="table-wrap"><table><tr><th>ID</th><th>ประเภท</th><th>กิจกรรม / เหตุผลเชิงความเสี่ยง</th><th>ช่วงเวลา</th><th>ผู้รับผิดชอบ</th><th>ผลลัพธ์</th><th>สถานะ</th></tr>${rows}</table></div>` : '<p class="hint">กดสร้างร่างเพื่อให้ระบบเสนอกิจกรรมตามระดับ Residual Risk</p>'}
      </div>`;
    $('#genAcp').onclick = () => {
      if (!state.risks.length) { alert('ยังไม่มีความเสี่ยงใน register'); return; }
      if (acp && !confirm('สร้างร่างใหม่จะแทนที่ร่างเดิม (รวมการแก้ไขผู้รับผิดชอบ/สถานะ) ยืนยัน?')) return;
      state.acp = E.generateACP(state.risks, state.planYear, CFG); state.acp.generatedAt = nowTs();
      log('ACP_GENERATED', `ร่าง ACP ปี ${state.planYear}: ${state.acp.activities.length} รายการ`); render();
    };
    $('#submitAcp').onclick = () => { state.acp.status = 'SUBMITTED'; log('ACP_SUBMITTED', `ส่ง ACP ปี ${state.acp.year} เพื่ออนุมัติ`); render(); };
    $('#approveAcp').onclick = () => {
      const approver = prompt('ผู้อนุมัติ (ตำแหน่ง/คณะกรรมการ):'); if (!approver) return;
      const role = prompt('บทบาท/อำนาจอนุมัติ (เช่น คณะกรรมการธนาคาร, Compliance Committee):', 'คณะกรรมการ'); if (!role) return;
      const date = prompt('วันที่อนุมัติ (YYYY-MM-DD):', today()); if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { alert('รูปแบบวันที่ไม่ถูกต้อง'); return; }
      const resolutionRef = prompt('เลขที่มติ/หนังสืออนุมัติ:') || '';
      const reject = !confirm('กด OK = อนุมัติ, Cancel = ไม่อนุมัติ/ส่งกลับแก้ไข');
      if (reject) { state.acp.status = 'DRAFT'; log('ACP_RETURNED', `${approver} ส่งกลับแก้ไข`); }
      else { state.acp.status = 'APPROVED'; state.acp.approval = { approver, role, date, resolutionRef }; log('ACP_APPROVED', `${approver} (${role}) ${date} มติ ${resolutionRef}`); }
      render();
    };
    $('#csvAcp').onclick = () => {
      const head = ['id', 'type', 'title', 'riskId', 'quarter', 'dueDate', 'owner', 'deliverable', 'status', 'basis'];
      const csv = [head.join(',')].concat(state.acp.activities.map(a => head.map(h => `"${String(a[h] == null ? '' : a[h]).replace(/"/g, '""')}"`).join(','))).join('\n');
      download(`ACP-${state.acp.year}.csv`, '﻿' + csv, 'text/csv'); log('ACP_EXPORTED', 'CSV');
    };
    document.querySelectorAll('[data-owner]').forEach(inp => inp.onchange = () => {
      const a = state.acp.activities[inp.dataset.owner]; a.owner = inp.value; log('ACTIVITY_UPDATED', `${a.id} owner → ${inp.value}`);
    });
    document.querySelectorAll('[data-status]').forEach(sel => sel.onchange = () => {
      const a = state.acp.activities[sel.dataset.status]; a.status = sel.value; log('ACTIVITY_STATUS', `${a.id} → ${sel.value}`);
    });
  }

  // ---------------- 6. Blue Book ----------------
  function renderBlueBook() {
    const { results, summary } = E.evaluateBlueBook(state, today(), CFG);
    const rows = results.map(r => `<tr><td><b>${esc(r.id)}</b><div class="hint">${esc(r.area)}</div></td><td>${esc(r.requirement)}<div class="hint">อ้างอิง: ${esc(r.reference)}</div></td>
      <td>${esc(r.severity)}</td><td>${statusPill(r.status)}</td>
      <td>${r.findings.length ? '<ul>' + r.findings.map(f => `<li>${esc(f)}</li>`).join('') + '</ul>' : '—'}</td></tr>`).join('');
    $('#tab-bluebook').innerHTML = `<div class="card"><h2>ตรวจความสอดคล้องตามเกณฑ์ Blue Book</h2>
      <div class="kpis"><div class="kpi">PASS<b style="color:var(--pass)">${summary.pass}</b></div><div class="kpi">WARN<b style="color:var(--warn)">${summary.warn}</b></div>
      <div class="kpi">FAIL<b style="color:var(--fail)">${summary.fail}</b></div><div class="kpi">ความสอดคล้อง<b>${summary.conformancePct}%</b></div></div>
      <div class="note">เกณฑ์ชุดนี้เป็นแม่แบบ — ต้องปรับข้อความ/ข้ออ้างอิงให้ตรงกับ Blue Book ฉบับจริงก่อนใช้ประกอบการรายงาน ผลการตรวจเป็นข้อมูลประกอบ ไม่ใช่การรับรองความสอดคล้องแทนผู้รับผิดชอบ</div>
      <div class="table-wrap"><table><tr><th>เกณฑ์</th><th>ข้อกำหนด</th><th>ระดับ</th><th>ผล</th><th>ข้อค้นพบ / สิ่งที่ต้องแก้ไข</th></tr>${rows}</table></div></div>`;
  }

  // ---------------- 7. Audit ----------------
  function renderAudit() {
    const rows = state.auditLog.slice().reverse().map(l => `<tr><td>${esc(l.ts)}</td><td>${esc(l.user)}</td><td>${esc(l.action)}</td><td>${esc(l.detail)}</td></tr>`).join('');
    $('#tab-audit').innerHTML = `<div class="card"><h2>ข้อมูล</h2><div class="actions">
        <button class="btn" id="exportJson">Export ข้อมูลทั้งหมด (JSON)</button>
        <label class="btn secondary">Import JSON<input type="file" id="importJson" accept="application/json" hidden></label>
        <button class="btn danger" id="resetAll">ล้างข้อมูล</button></div>
        <p class="hint">ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น — ใช้ Export เพื่อสำรอง/ส่งต่อให้ผู้สอบทาน และจัดเก็บตามนโยบายการจัดเก็บเอกสารของธนาคาร</p></div>
      <div class="card"><h2>Audit Trail (${state.auditLog.length})</h2><div class="table-wrap"><table><tr><th>เวลา (UTC)</th><th>ผู้ใช้งาน</th><th>การกระทำ</th><th>รายละเอียด</th></tr>${rows}</table></div></div>`;
    $('#exportJson').onclick = () => { log('DATA_EXPORTED', 'JSON'); download(`smarthub-cra-acp-${today()}.json`, JSON.stringify(state, null, 2), 'application/json'); };
    $('#importJson').onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      file.text().then(t => {
        const s = JSON.parse(t);
        if (!Array.isArray(s.risks) || !Array.isArray(s.auditLog)) throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
        state = { ...freshState(), ...s }; log('DATA_IMPORTED', file.name); syncHeader(); render();
      }).catch(err => alert('นำเข้าไม่สำเร็จ: ' + err.message));
    };
    $('#resetAll').onclick = () => { if (confirm('ล้างข้อมูลทั้งหมดในเบราว์เซอร์นี้? (แนะนำให้ Export ก่อน)')) { state = freshState(); save(); syncHeader(); render(); } };
  }

  function download(name, content, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function syncHeader() { $('#currentUser').value = state.currentUser || ''; $('#planYear').value = state.planYear; }

  function render() {
    const active = (document.querySelector('#tabs button.active') || {}).dataset;
    const tab = active ? active.tab : 'guide';
    ({ guide: renderGuide, universe: renderUniverse, register: renderRegister, heatmap: renderHeat, acp: renderACP, bluebook: renderBlueBook, audit: renderAudit })[tab]();
    save();
  }

  syncHeader();
  render();
})();
