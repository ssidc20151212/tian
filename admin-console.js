/* ================================================================
 * CareProof AI · admin-console.js — 管理后台
 * ================================================================ */
(function () {
  'use strict';
  var user = CP.currentUser();
  if (!user || user.role !== 'admin') return;

  var C = CP_CONST;
  document.getElementById('navUser').textContent = user.displayName;

  window.switchTab = function (name) {
    var tabs = document.querySelectorAll('.admin-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    var idx = ['overview','talents','needs','leads'].indexOf(name);
    if (idx >= 0) tabs[idx].classList.add('active');
    var secs = document.querySelectorAll('.admin-section');
    for (var j = 0; j < secs.length; j++) secs[j].classList.remove('active');
    document.getElementById('tab-' + name).classList.add('active');
  };

  function renderOverview() {
    var talents = CP.load(CP_STORAGE.TALENTS);
    var evidences = CP.load(CP_STORAGE.EVIDENCES);
    var needs = CP.load(CP_STORAGE.NEEDS);
    var leads = CP.load(CP_STORAGE.LEADS);
    var html = '<div class="stat-grid">' +
      '<div class="stat-box"><div class="num">' + talents.length + '</div><div class="lbl">人才档案</div></div>' +
      '<div class="stat-box"><div class="num">' + evidences.length + '</div><div class="lbl">能力证据</div></div>' +
      '<div class="stat-box"><div class="num">' + needs.length + '</div><div class="lbl">机构需求</div></div>' +
      '<div class="stat-box"><div class="num">' + leads.length + '</div><div class="lbl">商务线索</div></div>' +
      '</div>';
    var verified = evidences.filter(function(e){ return e.verifyStatus==='verified' || e.verifyStatus==='institution_confirmed'; }).length;
    var demoCount = talents.filter(function(t){return t.isDemo;}).length;
    html += '<div class="cp-card"><h3 style="margin-bottom:12px;">运营指标</h3>' +
      '<p style="font-size:13px;line-height:2;">' +
      '· 已核验证据数：<strong>' + verified + '</strong> / ' + evidences.length + '<br>' +
      '· 示范数据：<strong>' + demoCount + '</strong> 个人才档案<br>' +
      '· 匹配请求数：<strong>' + CP.load(CP_STORAGE.MATCHES).length + '</strong><br>' +
      '· 待处理线索：<strong>' + leads.filter(function(l){return l.stage!=='won'&&l.stage!=='lost';}).length + '</strong>' +
      '</p></div>';
    document.getElementById('tab-overview').innerHTML = html;
  }

  function renderTalents() {
    var talents = CP.load(CP_STORAGE.TALENTS);
    var rows = talents.map(function(t){
      return '<tr><td>' + (t.isDemo?'<span class="cp-demo-badge">示范数据</span> ':'') + t.name + '</td>' +
        '<td>' + (C.CAPABILITY_DOMAINS[t.domains&&t.domains[0]]||'-') + '</td>' +
        '<td>' + (t.level||'-') + '</td>' +
        '<td>' + (t.years||0) + '年</td>' +
        '<td>' + (t.certNo||'-') + '</td></tr>';
    }).join('');
    document.getElementById('tab-talents').innerHTML =
      '<table class="data-table"><thead><tr><th>姓名</th><th>主要能力</th><th>等级</th><th>年限</th><th>证书号</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5" style="text-align:center;color:#999;">暂无数据</td></tr>') + '</tbody></table>';
  }

  function renderNeeds() {
    var needs = CP.load(CP_STORAGE.NEEDS);
    var rows = needs.map(function(n){
      return '<tr><td>' + (n.isDemo?'<span class="cp-demo-badge">示范</span> ':'') + n.title + '</td>' +
        '<td>' + n.orgName + '</td>' +
        '<td>' + (C.PROBLEM_CATEGORIES[n.category]||'-') + '</td>' +
        '<td>' + (C.NEED_STATUS[n.status]||n.status) + '</td>' +
        '<td>' + (n.createdAt||'').slice(0,10) + '</td></tr>';
    }).join('');
    document.getElementById('tab-needs').innerHTML =
      '<table class="data-table"><thead><tr><th>需求标题</th><th>机构</th><th>分类</th><th>状态</th><th>提交时间</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5" style="text-align:center;color:#999;">暂无数据</td></tr>') + '</tbody></table>';
  }

  function renderLeads() {
    var leads = CP.load(CP_STORAGE.LEADS);
    var talents = CP.load(CP_STORAGE.TALENTS);
    var needs = CP.load(CP_STORAGE.NEEDS);
    var rows = leads.map(function(l){
      var t = talents.find(function(x){return x.id===l.talentId;});
      var n = needs.find(function(x){return x.id===l.needId;});
      return '<tr><td>' + (l.isDemo?'<span class="cp-demo-badge">示范</span> ':'') + (n?n.title:'-') + '</td>' +
        '<td>' + (t?t.name:'-') + '</td>' +
        '<td>' + (C.LEAD_STAGE[l.stage]||l.stage) + '</td>' +
        '<td>' + (l.notes||'-') + '</td></tr>';
    }).join('');
    document.getElementById('tab-leads').innerHTML =
      '<table class="data-table"><thead><tr><th>需求</th><th>匹配人才</th><th>阶段</th><th>备注</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="4" style="text-align:center;color:#999;">暂无数据</td></tr>') + '</tbody></table>';
  }

  renderOverview();
  renderTalents();
  renderNeeds();
  renderLeads();
})();
