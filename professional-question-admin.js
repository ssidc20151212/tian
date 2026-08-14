(function () {
  'use strict';

  var selectedId = null;

  function $(id) { return document.getElementById(id); }
  function esc(value) { return PQ.escape(value); }

  function init() {
    var user = CP.currentUser();
    $('adminUser').textContent = user ? user.displayName : '';
    bindTabs();
    bindKnowledgeForm();
    $('refreshAdmin').addEventListener('click', renderAll);
    renderKnowledgeOptions();
    renderAll();
  }

  function bindTabs() {
    document.querySelectorAll('[data-admin-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-admin-view]').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.pq-admin-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        $('admin-' + btn.dataset.adminView).classList.add('active');
      });
    });
  }

  function renderAll() {
    renderQuestionRows();
    renderAdminKnowledge();
    renderConsultRows();
    if (selectedId) renderDetail(selectedId);
  }

  function renderQuestionRows() {
    var rows = PQ.load(PQ_STORAGE.QUESTIONS);
    if (!rows.length) {
      $('adminQuestionRows').innerHTML = '<tr><td colspan="9">暂无专业问题。</td></tr>';
      return;
    }
    $('adminQuestionRows').innerHTML = rows.map(function (q) {
      return '<tr data-id="' + esc(q.id) + '">'
        + '<td>' + esc(q.questionNo) + '</td>'
        + '<td>' + esc(formatDate(q.createdAt)) + '</td>'
        + '<td>' + esc(q.name) + '</td>'
        + '<td>' + esc(q.unit) + '</td>'
        + '<td>' + esc(q.category) + '</td>'
        + '<td>' + esc(PQ.urgencyLabels[q.urgency] || q.urgency) + '</td>'
        + '<td>' + esc(PQ.summary(q.description)) + '</td>'
        + '<td><span class="pq-tag">' + esc(PQ.adminStatuses[q.status] || q.status) + '</span></td>'
        + '<td>' + esc(q.assignee || '-') + '</td>'
        + '</tr>';
    }).join('');
    $('adminQuestionRows').querySelectorAll('tr[data-id]').forEach(function (tr) {
      tr.addEventListener('click', function () { renderDetail(tr.dataset.id); });
    });
  }

  function renderDetail(id) {
    selectedId = id;
    var q = PQ.load(PQ_STORAGE.QUESTIONS).find(function (item) { return item.id === id; });
    if (!q) {
      $('questionDetail').innerHTML = '<div class="pq-empty">问题不存在。</div>';
      return;
    }
    var s = PQ.suggestion(q);
    $('questionDetail').innerHTML =
      '<div class="pq-organize"><h3>问题整理卡</h3><div class="pq-kv">'
      + kv('问题摘要', s.summary)
      + kv('核心诉求', s.coreNeed)
      + kv('所属类别', s.category)
      + kv('建议处理人', s.handler)
      + kv('建议处理方式', s.type + '：' + s.method)
      + '</div></div>'
      + '<h3>' + esc(q.questionNo) + '</h3>'
      + '<div class="pq-kv">'
      + kv('提交时间', formatDate(q.createdAt))
      + kv('姓名', q.name)
      + kv('单位', q.unit)
      + kv('联系电话', q.phone)
      + kv('分类', q.category)
      + kv('紧急程度', PQ.urgencyLabels[q.urgency] || q.urgency)
      + kv('问题描述', q.description)
      + kv('希望帮助', q.helpNeeded)
      + kv('附件', attachmentList(q.attachments))
      + '</div>'
      + '<div class="pq-admin-form-grid" style="margin-top:16px;">'
      + '<label>状态<select id="detailStatus">' + statusOptions(q.status) + '</select></label>'
      + '<label>负责人<input id="detailAssignee" value="' + esc(q.assignee || '') + '"></label>'
      + '<label>填写回复<textarea id="detailReply" rows="7">' + esc(q.reply || '') + '</textarea></label>'
      + '<div class="pq-actions">'
      + '<button class="cp-btn cp-btn-ghost" id="copyReply">复制回复</button>'
      + '<button class="cp-btn cp-btn-outline" id="toKnowledge">转成知识库条目</button>'
      + '<button class="cp-btn cp-btn-primary" id="saveDetail">保存处理结果</button>'
      + '</div></div>';

    $('saveDetail').addEventListener('click', saveDetail);
    $('toKnowledge').addEventListener('click', function () { convertToKnowledge(q); });
    $('copyReply').addEventListener('click', function () {
      var text = $('detailReply').value.trim();
      if (!text) return alert('请先填写回复内容。');
      navigator.clipboard.writeText(text).then(function () {
        alert('回复已复制。');
      }).catch(function () {
        alert('当前浏览器不允许自动复制，请手动复制。');
      });
    });
  }

  function saveDetail() {
    if (!selectedId) return;
    var patch = {
      status: $('detailStatus').value,
      assignee: $('detailAssignee').value.trim(),
      reply: $('detailReply').value.trim()
    };
    if (patch.reply && patch.status === 'pending') patch.status = 'replied';
    PQ.updateQuestion(selectedId, patch);
    renderAll();
    alert('已保存。');
  }

  function convertToKnowledge(q) {
    var reply = $('detailReply').value.trim();
    if (!reply) return alert('请先填写回复，再转为知识库条目。');
    var category = mapKnowledgeCategory(q.category);
    PQ.addKnowledge({
      category: category,
      question: PQ.summary(q.description),
      answer: reply,
      scenario: q.unit + ' 提交的' + q.category + '问题',
      boundary: '该条目由个案整理而来，正式使用时需结合当地政策、老人状态和机构制度复核。',
      tools: ''
    });
    PQ.updateQuestion(q.id, {
      status: 'knowledge',
      reply: reply,
      assignee: $('detailAssignee').value.trim()
    });
    renderAll();
    alert('已转成知识库条目。');
  }

  function bindKnowledgeForm() {
    $('kbForm').addEventListener('submit', function (e) {
      e.preventDefault();
      PQ.addKnowledge({
        category: $('kbCategory').value,
        question: $('kbQuestion').value.trim(),
        answer: $('kbAnswer').value.trim(),
        scenario: $('kbScenario').value.trim(),
        boundary: $('kbBoundary').value.trim(),
        tools: $('kbTools').value.trim()
      });
      $('kbForm').reset();
      renderAdminKnowledge();
      alert('知识库条目已保存。');
    });
  }

  function renderKnowledgeOptions() {
    $('kbCategory').innerHTML = PQ.knowledgeCategories.map(function (cat) {
      return '<option value="' + esc(cat) + '">' + esc(cat) + '</option>';
    }).join('');
  }

  function renderAdminKnowledge() {
    var list = PQ.load(PQ_STORAGE.KNOWLEDGE);
    $('adminKnowledgeList').innerHTML = list.length ? list.map(function (k) {
      return '<article class="pq-item"><div class="pq-item-head"><h3>' + esc(k.question) + '</h3><span class="pq-tag">' + esc(k.category) + '</span></div>'
        + '<div class="pq-reply">' + esc(k.answer) + '</div>'
        + '<p class="pq-meta">适用场景：' + esc(k.scenario || '-') + '</p></article>';
    }).join('') : '<div class="pq-empty">暂无知识库条目。</div>';
  }

  function renderConsultRows() {
    var rows = PQ.load(PQ_STORAGE.CONSULTS);
    $('consultRows').innerHTML = rows.length ? rows.map(function (c) {
      return '<tr><td>' + esc(formatDate(c.createdAt)) + '</td><td>' + esc(c.unit) + '</td><td>' + esc(c.contact) + '</td><td>' + esc(c.phone) + '</td><td>' + esc(c.need) + '</td><td><span class="pq-tag">' + esc(c.status) + '</span></td></tr>';
    }).join('') : '<tr><td colspan="6">暂无专项咨询申请。</td></tr>';
  }

  function statusOptions(value) {
    return Object.keys(PQ.adminStatuses).map(function (key) {
      return '<option value="' + key + '" ' + (key === value ? 'selected' : '') + '>' + PQ.adminStatuses[key] + '</option>';
    }).join('');
  }

  function attachmentList(files) {
    if (!files || !files.length) return '无附件';
    return files.map(function (f) { return f.name + '（' + f.sizeLabel + '，' + f.type + '）'; }).join('；');
  }

  function kv(label, value) {
    return '<div><b>' + esc(label) + '</b><span>' + esc(value || '-') + '</span></div>';
  }

  function formatDate(value) {
    return value ? value.slice(0, 16).replace('T', ' ') : '-';
  }

  function mapKnowledgeCategory(category) {
    if (category.indexOf('评估') >= 0) return '能力评估';
    if (category.indexOf('认知症') >= 0 || category.indexOf('BPSD') >= 0) return '认知症/BPSD';
    if (category.indexOf('照护计划') >= 0) return '照护计划';
    if (category.indexOf('风险') >= 0) return '风险管理';
    if (category.indexOf('家属') >= 0 || category.indexOf('纠纷') >= 0) return '家属沟通';
    return '机构建设';
  }

  init();
})();
