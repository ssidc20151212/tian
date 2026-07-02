/* ================================================================
 * CareProof AI · talent-profile-edit.js — 人才档案编辑
 * ================================================================ */
(function () {
  'use strict';
  var user = CP.currentUser();
  if (!user || user.role !== 'talent') return;

  var CONST = CP_CONST;
  var selectedDomains = [];

  // 渲染能力领域标签
  function renderDomainTags() {
    var wrap = document.getElementById('domainTags');
    wrap.innerHTML = '';
    Object.entries(CONST.CAPABILITY_DOMAINS).forEach(function (kv) {
      var tag = document.createElement('div');
      tag.className = 'domain-tag';
      tag.dataset.key = kv[0];
      tag.textContent = kv[1];
      tag.onclick = function () {
        var k = tag.dataset.key;
        var idx = selectedDomains.indexOf(k);
        if (idx >= 0) { selectedDomains.splice(idx, 1); tag.classList.remove('selected'); }
        else { selectedDomains.push(k); tag.classList.add('selected'); }
      };
      wrap.appendChild(tag);
    });
  }
  renderDomainTags();

  // 加载现有档案
  function loadProfile() {
    var talent = user.linkedId ? CP.findById(CP_STORAGE.TALENTS, user.linkedId) : null;
    if (!talent) return;
    document.getElementById('pName').value = talent.name || '';
    document.getElementById('pYears').value = talent.years || '';
    document.getElementById('pRegion').value = talent.region || 'beijing';
    document.getElementById('pLevel').value = talent.level || 'mid';
    document.getElementById('pCertNo').value = talent.certNo || '';
    document.getElementById('pBio').value = talent.bio || '';
    selectedDomains = (talent.domains || []).slice();
    document.querySelectorAll('.domain-tag').forEach(function (t) {
      if (selectedDomains.indexOf(t.dataset.key) >= 0) t.classList.add('selected');
    });
  }
  loadProfile();

  window.savePr = function () {
    var name = document.getElementById('pName').value.trim();
    if (!name) { alert('请输入姓名'); return; }
    var id = user.linkedId || CP.newId('tal');
    var talent = {
      id: id,
      name: name,
      years: parseInt(document.getElementById('pYears').value, 10) || 0,
      region: document.getElementById('pRegion').value,
      level: document.getElementById('pLevel').value,
      certNo: document.getElementById('pCertNo').value.trim(),
      bio: document.getElementById('pBio').value.trim(),
      domains: selectedDomains.slice(),
      updatedAt: new Date().toISOString()
    };
    // 首次创建时初始化空评分
    var existing = CP.findById(CP_STORAGE.TALENTS, id);
    if (!existing) talent.scores = {};
    CP.upsert(CP_STORAGE.TALENTS, talent);
    // 若首次创建，回写 user.linkedId
    if (!user.linkedId) {
      user.linkedId = id;
      localStorage.setItem(CP_STORAGE.USER, JSON.stringify(user));
    }
    alert('档案已保存');
    CP.safeReplace('talent-workspace.html');
  };
})();
