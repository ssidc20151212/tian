/* ================================================================
 * CareProof AI · find-talent.js — 公开能力档案浏览
 * 展示 CP.load(TALENTS) 中的示范档案（isDemo:true）
 * ================================================================ */
(function () {
  'use strict';

  var REGIONS = {
    beijing:'北京', shanghai:'上海', guangzhou:'广州',
    shenzhen:'深圳', chengdu:'成都', hangzhou:'杭州'
  };
  var LEVELS = { senior:'高级', mid:'中级', junior:'初级' };
  var DOMAINS = CP_CONST.CAPABILITY_DOMAINS;

  // 初始化下拉
  function initFilters() {
    var r = document.getElementById('fRegion');
    Object.keys(REGIONS).forEach(function (k) {
      r.innerHTML += '<option value="' + k + '">' + REGIONS[k] + '</option>';
    });
    var l = document.getElementById('fLevel');
    Object.keys(LEVELS).forEach(function (k) {
      l.innerHTML += '<option value="' + k + '">' + LEVELS[k] + '评估师</option>';
    });
    var d = document.getElementById('fDomain');
    Object.keys(DOMAINS).forEach(function (k) {
      d.innerHTML += '<option value="' + k + '">' + DOMAINS[k] + '</option>';
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function doSearch() {
    var kw = document.getElementById('fKeyword').value.trim();
    var region = document.getElementById('fRegion').value;
    var level = document.getElementById('fLevel').value;
    var domain = document.getElementById('fDomain').value;
    var list = CP.load(CP_STORAGE.TALENTS).filter(function (t) {
      if (kw && (t.name || '').indexOf(kw) < 0) return false;
      if (region && t.region !== region) return false;
      if (level && t.level !== level) return false;
      if (domain && (t.domains || []).indexOf(domain) < 0) return false;
      return true;
    });
    render(list);
  }
  window.doSearch = doSearch;

  function render(list) {
    var box = document.getElementById('talentGrid');
    if (!list.length) {
      box.innerHTML = '<div class="empty">未找到符合条件的能力档案</div>';
      return;
    }
    var evAll = CP.load(CP_STORAGE.EVIDENCES);
    box.innerHTML = list.map(function (t) {
      var evs = evAll.filter(function (e) { return e.talentId === t.id; });
      var verified = evs.filter(function (e) {
        return e.verifyStatus === 'verified' || e.verifyStatus === 'institution_confirmed';
      }).length;
      var scores = t.scores || {};
      var top3 = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; }).slice(0, 3);
      return '<div class="talent-card">' +
        '<div class="tc-head">' +
          '<div class="tc-avatar">' + (t.name || '?')[0] + '</div>' +
          '<div>' +
            '<div class="tc-name">' + escapeHtml(t.name) +
              (t.isDemo ? ' <span class="cp-demo-badge">示范数据</span>' : '') + '</div>' +
            '<div class="tc-sub">' + (LEVELS[t.level] || '-') + '评估师 · ' +
              (REGIONS[t.region] || '-') + ' · 从业' + (t.years || '-') + '年</div>' +
          '</div>' +
        '</div>' +
        '<div class="tc-tags">' +
          (t.domains || []).map(function (d) {
            return '<span class="cp-tag">' + (DOMAINS[d] || d) + '</span>';
          }).join('') +
        '</div>' +
        '<div class="tc-scores">' +
          top3.map(function (k) {
            return '<div class="s"><div class="v">' + scores[k] + '</div>' +
              '<div class="l">' + (DOMAINS[k] || k) + '</div></div>';
          }).join('') +
        '</div>' +
        '<div class="tc-sub" style="margin-bottom:12px;">已核验证据 ' + verified + ' 项</div>' +
        '<div class="tc-actions">' +
          '<button class="cp-btn cp-btn-outline cp-btn-sm" onclick="viewProfile(\'' + t.id + '\')">查看档案</button>' +
          '<button class="cp-btn cp-btn-primary cp-btn-sm" onclick="startInvite(\'' + t.id + '\')">发起合作</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  window.viewProfile = function (tid) {
    var user = CP.currentUser();
    if (!user) {
      localStorage.setItem(CP_STORAGE.PENDING_ACTION,
        JSON.stringify({ redirect: 'find-talent.html' }));
      CP.safeReplace('login.html');
      return;
    }
    alert('完整证据链查看功能开发中，当前用户：' + user.displayName);
  };
  window.startInvite = function (tid) {
    var user = CP.currentUser();
    if (!user || user.role !== 'institution') {
      localStorage.setItem(CP_STORAGE.PENDING_ACTION,
        JSON.stringify({ redirect: 'institution-need.html' }));
      CP.safeReplace('login.html?role=institution');
      return;
    }
    CP.safeReplace('institution-need.html');
  };

  // 已登录时隐藏登录按钮
  (function () {
    if (CP.currentUser()) {
      var btn = document.getElementById('navLoginBtn');
      if (btn) btn.textContent = '进入工作台';
    }
    document.getElementById('year').textContent = new Date().getFullYear();
    initFilters();
    doSearch();
  })();
})();
