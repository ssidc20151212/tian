/* ================================================================
 * CareProof AI · institution-need.js — 机构需求提交与匹配展示
 * ================================================================ */
(function () {
  'use strict';
  var user = CP.currentUser();
  if (!user) return;

  // 填充分类下拉
  var catEl = document.getElementById('needCat');
  Object.entries(CP_CONST.PROBLEM_CATEGORIES).forEach(function (pair) {
    catEl.innerHTML += '<option value="' + pair[0] + '">' + pair[1] + '</option>';
  });

  function submitNeed() {
    var title = document.getElementById('needTitle').value.trim();
    var desc = document.getElementById('needDesc').value.trim();
    var cat = document.getElementById('needCat').value;
    var region = document.getElementById('needRegion').value;
    var urgency = document.getElementById('needUrgency').value;

    if (!title || !desc || !cat) {
      alert('请填写分类、标题和描述');
      return;
    }

    var need = {
      id: CP.newId('need'),
      isDemo: false,
      orgId: user.linkedId || user.username,
      orgName: user.displayName,
      category: cat,
      title: title,
      description: desc,
      region: region,
      urgency: urgency,
      status: 'matched',
      createdAt: new Date().toISOString()
    };
    CP.upsert(CP_STORAGE.NEEDS, need);

    // 运行 AI 匹配
    var results = CP_MATCH.matchNeed(need);
    var match = {
      id: CP.newId('match'),
      isDemo: false,
      needId: need.id,
      results: results,
      createdAt: new Date().toISOString(),
      confirmedBy: null
    };
    CP.upsert(CP_STORAGE.MATCHES, match);

    renderResults(results);
  }
  window.submitNeed = submitNeed;

  function renderResults(results) {
    var box = document.getElementById('resultBox');
    box.style.display = 'block';
    var container = document.getElementById('matchResults');
    if (!results.length) {
      container.innerHTML = '<p class="cp-empty">暂无合适的人才匹配</p>';
      return;
    }
    container.innerHTML = results.map(function (r, i) {
      var talent = CP.findById(CP_STORAGE.TALENTS, r.talentId);
      var name = talent ? talent.name : '未知';
      var bio = talent ? talent.bio : '';
      var demo = (talent && talent.isDemo) ? '<span class="cp-demo-badge">示范</span>' : '';
      var b = r.breakdown;
      return '<div class="match-card">'
        + '<div class="info"><h4>#' + (i + 1) + ' ' + name + ' ' + demo + '</h4>'
        + '<p>' + bio + '</p>'
        + '<p style="margin-top:4px;font-size:11px;color:var(--cp-text-light);">'
        + '领域' + b.domain + ' · 证据' + b.evidence + ' · 经验' + b.caseExp
        + ' · 交付' + b.delivery + ' · 可用' + b.avail + '</p></div>'
        + '<div class="match-score">' + r.score + '</div></div>';
    }).join('');
    document.querySelector('.form-card').style.opacity = '0.5';
    document.querySelector('.form-card').style.pointerEvents = 'none';
  }
})();
