/* ================================================================
 * CareProof AI · talent-workspace.js — 人才工作台逻辑
 * ================================================================ */
(function () {
  'use strict';
  var user = CP.currentUser();
  if (!user || user.role !== 'talent') return;

  // 顶部欢迎
  var title = document.getElementById('wsTitle');
  if (title) title.textContent = user.displayName + ' · 人才工作台';
  var navUser = document.getElementById('navUser');
  if (navUser) navUser.textContent = user.displayName;

  // 加载档案
  function loadProfile() {
    var talent = CP.findById(CP_STORAGE.TALENTS, user.linkedId);
    var box = document.getElementById('profileSummary');
    if (!talent) {
      box.innerHTML = '<p style="color:var(--cp-text-light);">尚未创建能力档案。'
        + '<a href="talent-profile-edit.html" class="cp-btn cp-btn-primary cp-btn-sm" '
        + 'style="margin-left:12px;">立即创建</a></p>';
      return;
    }
    var demoBadge = talent.isDemo ? '<span class="cp-demo-badge">示范数据</span>' : '';
    var LEVELS = { senior:'高级', mid:'中级', junior:'初级' };
    var REGIONS = { beijing:'北京', shanghai:'上海', guangzhou:'广州', shenzhen:'深圳', chengdu:'成都', hangzhou:'杭州' };
    var domains = (talent.domains || []).map(function(d){
      return CP_CONST.CAPABILITY_DOMAINS[d] || d;
    }).join('、');
    var scoresHtml = '';
    var scores = talent.scores || {};
    Object.keys(scores).forEach(function(k){
      scoresHtml += '<div class="score-item"><div class="val">' + scores[k]
        + '</div><div class="lbl">' + (CP_CONST.CAPABILITY_DOMAINS[k] || k) + '</div></div>';
    });
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">'
      + '<h3 style="font-size:18px;color:var(--cp-text-dark);">' + talent.name + '</h3>'
      + demoBadge + '</div>'
      + '<div class="profile-row"><div class="label">地区</div><div>' + (REGIONS[talent.region] || talent.region) + '</div></div>'
      + '<div class="profile-row"><div class="label">等级</div><div>' + (LEVELS[talent.level] || talent.level) + '</div></div>'
      + '<div class="profile-row"><div class="label">从业年限</div><div>' + talent.years + '年</div></div>'
      + '<div class="profile-row"><div class="label">证书编号</div><div>' + (talent.certNo || '未提供') + '</div></div>'
      + '<div class="profile-row"><div class="label">能力领域</div><div>' + domains + '</div></div>'
      + '<div class="profile-row"><div class="label">简介</div><div>' + (talent.bio || '') + '</div></div>'
      + '<div class="score-grid">' + scoresHtml + '</div>'
      + '<div style="margin-top:16px;text-align:right;">'
      + '<a href="talent-profile-edit.html" class="cp-btn cp-btn-ghost cp-btn-sm">编辑档案</a></div>';
  }

  function loadEvidence() {
    var list = CP.filterBy(CP_STORAGE.EVIDENCES, function(e){ return e.talentId === user.linkedId; });
    var box = document.getElementById('evidenceList');
    if (!list.length) {
      box.innerHTML = '<li style="color:var(--cp-text-light);padding:20px;text-align:center;">'
        + '尚未提交能力证据 · <a href="evidence-upload.html" style="color:var(--cp-primary);">立即提交</a></li>';
      return;
    }
    box.innerHTML = list.map(function(ev){
      var demoBadge = ev.isDemo ? '<span class="cp-demo-badge" style="margin-left:8px;">示范</span>' : '';
      var statusLabel = CP_CONST.VERIFICATION_STATUS[ev.verifyStatus] || ev.verifyStatus;
      var statusColor = ev.verifyStatus === 'verified' || ev.verifyStatus === 'institution_confirmed'
        ? 'var(--cp-success)' : 'var(--cp-warning)';
      var typeLabel = CP_CONST.EVIDENCE_TYPES[ev.type] || ev.type;
      var domainLabel = CP_CONST.CAPABILITY_DOMAINS[ev.domain] || ev.domain;
      return '<li class="evidence-item">'
        + '<div><h4>' + ev.title + demoBadge + '</h4>'
        + '<div class="meta">' + typeLabel + ' · ' + domainLabel + ' · ' + ev.year + '年'
        + ' · <span style="color:' + statusColor + ';">' + statusLabel + '</span>'
        + (ev.evidenceLevel ? ' · 证据等级 ' + ev.evidenceLevel : '') + '</div></div>'
        + '</li>';
    }).join('');
  }

  function loadMatches() {
    // 找到匹配结果里包含 me 的
    var me = user.linkedId;
    var matches = CP.filterBy(CP_STORAGE.MATCHES, function(m){
      return (m.results || []).some(function(r){ return r.talentId === me; });
    });
    var box = document.getElementById('matchList');
    if (!matches.length) { box.textContent = '暂无匹配记录'; box.className='cp-empty'; return; }
    box.className = '';
    box.innerHTML = matches.map(function(m){
      var need = CP.findById(CP_STORAGE.NEEDS, m.needId);
      var myRes = m.results.find(function(r){ return r.talentId === me; });
      var demoBadge = m.isDemo ? '<span class="cp-demo-badge">示范</span>' : '';
      return '<div class="cp-card" style="margin-bottom:12px;">'
        + '<div style="display:flex;justify-content:space-between;">'
        + '<h4 style="color:var(--cp-text-dark);">' + (need ? need.title : '(需求已删除)') + '</h4>'
        + demoBadge + '</div>'
        + '<p style="font-size:13px;color:var(--cp-text-light);margin:8px 0;">'
        + (need ? need.description : '') + '</p>'
        + '<div style="font-size:14px;color:var(--cp-primary);font-weight:600;">'
        + '匹配度：' + myRes.score + ' 分</div></div>';
    }).join('');
  }

  window.showSection = function(name) {
    document.getElementById('sec-profile').style.display = name === 'profile' ? 'block' : 'none';
    document.getElementById('sec-matches').style.display = name === 'matches' ? 'block' : 'none';
    if (name === 'profile') { loadProfile(); loadEvidence(); }
    if (name === 'matches') loadMatches();
  };

  // 默认展示档案
  showSection('profile');
})();
