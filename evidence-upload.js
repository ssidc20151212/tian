/* ================================================================
 * CareProof AI · evidence-upload.js — 证据提交逻辑
 * ================================================================ */
(function () {
  'use strict';
  var user = CP.currentUser();
  if (!user || user.role !== 'talent') return;

  // 填充下拉
  var typeEl = document.getElementById('evType');
  Object.entries(CP_CONST.EVIDENCE_TYPES).forEach(function (p) {
    typeEl.innerHTML += '<option value="' + p[0] + '">' + p[1] + '</option>';
  });
  var domainEl = document.getElementById('evDomain');
  Object.entries(CP_CONST.CAPABILITY_DOMAINS).forEach(function (p) {
    domainEl.innerHTML += '<option value="' + p[0] + '">' + p[1] + '</option>';
  });

  window.submitEvidence = function () {
    var title = document.getElementById('evTitle').value.trim();
    var summary = document.getElementById('evSummary').value.trim();
    var type = document.getElementById('evType').value;
    var domain = document.getElementById('evDomain').value;
    var year = parseInt(document.getElementById('evYear').value) || new Date().getFullYear();
    var level = document.getElementById('evLevel').value;

    if (!title || !summary || !type || !domain) {
      alert('请填写证据类型、能力领域、标题和摘要');
      return;
    }

    var evidence = {
      id: CP.newId('ev'),
      isDemo: false,
      talentId: user.linkedId || user.username,
      type: type,
      domain: domain,
      title: title,
      summary: summary,
      year: year,
      verifyStatus: 'submitted',
      evidenceLevel: level,
      createdAt: new Date().toISOString()
    };
    CP.upsert(CP_STORAGE.EVIDENCES, evidence);

    document.getElementById('formCard').style.display = 'none';
    document.getElementById('successMsg').style.display = 'block';
  };
})();
