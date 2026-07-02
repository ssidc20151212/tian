/* ================================================================
 * CareProof AI · match-result.js — 匹配结果展示页
 * ================================================================ */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var needId = params.get('need');
  var container = document.getElementById('content');

  if (!needId) {
    container.innerHTML = '<div class="cp-empty">缺少需求参数，无法展示匹配结果</div>';
    return;
  }
  var need = CP.findById(CP_STORAGE.NEEDS, needId);
  if (!need) {
    container.innerHTML = '<div class="cp-empty">未找到该需求</div>';
    return;
  }
  var talents = CP.load(CP_STORAGE.TALENTS);
  var evidences = CP.load(CP_STORAGE.EVIDENCES);
  var results = CP_MATCH.rank(need, talents, evidences, 5);

  var CONST = CP_CONST;
  var brief = '<div class="need-brief">' +
    '<h3>' + escapeHtml(need.title) + (need.isDemo ? ' <span class="cp-demo-badge">示范数据</span>' : '') + '</h3>' +
    '<div class="meta">' +
      (CONST.PROBLEM_CATEGORIES[need.category] || need.category) +
      ' · ' + (need.region || '未指定地区') +
      ' · ' + (CONST.NEED_STATUS[need.status] || need.status) +
    '</div>' +
    '<div class="desc">' + escapeHtml(need.description || '') + '</div>' +
    '</div>';

  if (results.length === 0) {
    container.innerHTML = brief + '<div class="cp-empty">暂无匹配到的合适人才</div>';
    return;
  }

  var html = brief + '<div class="rank-list">';
  results.forEach(function (r, idx) {
    var t = r.talent;
    var talentEvidences = evidences.filter(function (e) { return e.talentId === t.id; });
    html += '<div class="rank-card' + (idx === 0 ? ' top' : '') + '">' +
      '<div class="rank-head">' +
        '<div class="rank-name">' +
          '#' + (idx + 1) + ' ' + escapeHtml(t.name) +
          (idx === 0 ? '<span class="rank-badge">最佳匹配</span>' : '') +
          (t.isDemo ? ' <span class="cp-demo-badge">示范数据</span>' : '') +
        '</div>' +
        '<div class="match-score">' +
          '<div class="v">' + r.score + '</div><div class="l">匹配度</div>' +
        '</div>' +
      '</div>' +
      '<div class="breakdown">' +
        bdCell(r.breakdown.domain, '领域匹配') +
        bdCell(r.breakdown.evidence, '证据强度') +
        bdCell(r.breakdown.caseExp, '案例经验') +
        bdCell(r.breakdown.delivery, '交付能力') +
        bdCell(r.breakdown.avail, '可用性') +
      '</div>' +
      '<div class="rank-meta">' +
        '从业 ' + (t.years || '-') + ' 年 · ' +
        '已核验证据 ' + talentEvidences.filter(function (e) {
          return e.verifyStatus === 'verified' || e.verifyStatus === 'institution_confirmed';
        }).length + ' 项' +
      '</div>' +
      '<div class="rank-actions">' +
        '<button class="cp-btn cp-btn-outline cp-btn-sm" onclick="viewProfile(\'' + t.id + '\')">查看证据链</button>' +
        '<button class="cp-btn cp-btn-primary cp-btn-sm" onclick="confirmMatch(\'' + needId + '\',\'' + t.id + '\')">确认合作</button>' +
      '</div>' +
      '</div>';
  });
  html += '</div>';
  container.innerHTML = html;

  function bdCell(v, l) {
    return '<div class="bd-cell"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>';
  }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  window.viewProfile = function (talentId) {
    var t = CP.findById(CP_STORAGE.TALENTS, talentId);
    if (!t) return;
    var evs = evidences.filter(function (e) { return e.talentId === talentId; });
    var msg = '【' + t.name + '】证据链\n\n' +
      evs.map(function (e, i) {
        return (i + 1) + '. [' + (CP_CONST.EVIDENCE_TYPES[e.type] || e.type) + '] ' + e.title +
          '\n   状态：' + (CP_CONST.VERIFICATION_STATUS[e.verifyStatus] || e.verifyStatus) +
          '\n   ' + (e.summary || '');
      }).join('\n\n');
    alert(msg || '暂无证据');
  };
  window.confirmMatch = function (nid, tid) {
    if (!confirm('确认与该人才合作？状态将更新为"待人工确认"。')) return;
    var n = CP.findById(CP_STORAGE.NEEDS, nid);
    if (n) { n.status = 'pending_confirm'; n.selectedTalentId = tid; CP.upsert(CP_STORAGE.NEEDS, n); }
    // 生成一条业务线索
    var lead = {
      id: CP.newId('lead'),
      needId: nid, talentId: tid, orgId: n && n.orgId,
      stage: 'contacted', notes: '机构已确认匹配',
      createdAt: new Date().toISOString()
    };
    CP.upsert(CP_STORAGE.LEADS, lead);
    alert('已确认合作，思德库将尽快联系您。');
    CP.safeReplace('institution-workspace.html');
  };
})();
