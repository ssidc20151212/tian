/* ================================================================
 * CareProof AI · institution-workspace.js — 机构工作台逻辑
 * ================================================================ */
(function () {
  'use strict';
  var user = CP.currentUser();
  if (!user) return;

  var title = document.getElementById('wsTitle');
  if (title) title.textContent = user.displayName + ' · 机构工作台';
  var navUser = document.getElementById('navUser');
  if (navUser) navUser.textContent = user.displayName;

  function showNeeds() {
    document.getElementById('sec-needs').style.display = 'block';
    loadNeeds();
  }
  window.showNeeds = showNeeds;

  function loadNeeds() {
    var needs = CP.filterBy(CP_STORAGE.NEEDS, function (n) {
      return n.orgId === user.linkedId;
    });
    var box = document.getElementById('needList');
    if (!needs.length) {
      box.innerHTML = '<li class="cp-empty">尚未提交需求 · '
        + '<a href="institution-need.html" style="color:var(--cp-primary);">立即提交</a></li>';
      return;
    }
    box.innerHTML = needs.map(function (n) {
      var demo = n.isDemo ? '<span class="cp-demo-badge">示范数据</span>' : '';
      var statusLabel = CP_CONST.NEED_STATUS[n.status] || n.status;
      var matchTag = n.status === 'matched'
        ? '<span class="match-tag">AI 已匹配</span>' : '';
      var catLabel = CP_CONST.PROBLEM_CATEGORIES[n.category] || n.category;
      return '<li class="need-item">'
        + '<h4>' + n.title + ' ' + demo + matchTag + '</h4>'
        + '<div class="meta">' + catLabel + ' · ' + statusLabel
        + ' · ' + (n.createdAt || '').slice(0, 10) + '</div>'
        + '<div class="desc">' + n.description + '</div>'
        + (n.status === 'matched'
          ? '<a href="match-result.html?need=' + n.id + '" class="cp-btn cp-btn-sm cp-btn-primary" style="margin-top:12px;">查看匹配结果</a>'
          : '')
        + '</li>';
    }).join('');
  }

  // 默认展示需求
  showNeeds();
})();
