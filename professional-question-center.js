(function () {
  'use strict';

  var currentView = 'submit';
  var mineStatus = 'all';
  var kbCategory = '全部';

  function $(id) { return document.getElementById(id); }
  function esc(value) { return PQ.escape(value); }

  function init() {
    renderOwnerNote();
    renderCategories();
    renderKnowledgeTabs();
    bindNavigation();
    bindForms();
    renderMine();
    renderKnowledge();
    showView((location.hash || '#submit').slice(1));
  }

  function renderOwnerNote() {
    var owner = PQ.currentOwner();
    $('ownerNote').textContent = owner.loggedIn
      ? '当前账号：' + owner.name + '。我的问题仅显示该账号提交的记录。'
      : '当前为本机访客模式。问题记录只保存在这台设备的当前浏览器中；跨设备查看需要接入登录和服务器数据库。';
  }

  function renderCategories() {
    $('categoryChoices').innerHTML = PQ.categories.map(function (cat, index) {
      return '<label><input type="radio" name="category" value="' + esc(cat) + '" ' + (index === 0 ? 'checked' : '') + '>' + esc(cat) + '</label>';
    }).join('');
  }

  function renderKnowledgeTabs() {
    $('kbTabs').innerHTML = ['全部'].concat(PQ.knowledgeCategories).map(function (cat) {
      return '<button data-kb="' + esc(cat) + '" class="' + (cat === kbCategory ? 'active' : '') + '">' + esc(cat) + '</button>';
    }).join('');
    $('kbTabs').querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        kbCategory = btn.dataset.kb;
        renderKnowledgeTabs();
        renderKnowledge();
      });
    });
  }

  function bindNavigation() {
    document.querySelectorAll('[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () { showView(btn.dataset.view); });
    });
    $('mineTabs').querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        mineStatus = btn.dataset.status;
        $('mineTabs').querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderMine();
      });
    });
  }

  function showView(name) {
    currentView = ['submit', 'mine', 'knowledge', 'consult'].indexOf(name) >= 0 ? name : 'submit';
    document.querySelectorAll('.pq-panel').forEach(function (panel) { panel.classList.remove('active'); });
    $('view-' + currentView).classList.add('active');
    if (currentView === 'mine') renderMine();
    if (currentView === 'knowledge') renderKnowledge();
    history.replaceState(null, '', '#' + currentView);
  }

  function bindForms() {
    $('qDesc').addEventListener('input', function () {
      $('descCount').textContent = $('qDesc').value.trim().length + '/500';
    });
    $('questionForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitQuestion();
    });
    $('consultForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var saved = PQ.addConsult({
        unit: $('cUnit').value.trim(),
        contact: $('cName').value.trim(),
        phone: $('cPhone').value.trim(),
        need: $('cNeed').value.trim()
      });
      $('consultSuccess').style.display = 'block';
      $('consultSuccess').textContent = '专项咨询申请已提交，编号：' + saved.id + '。';
      $('consultForm').reset();
    });
  }

  function submitQuestion() {
    var desc = $('qDesc').value.trim();
    if (desc.length < 200 || desc.length > 500) {
      alert('问题描述请控制在200-500字之间，当前为 ' + desc.length + ' 字。');
      return;
    }
    var selectedCategory = document.querySelector('input[name="category"]:checked');
    var selectedUrgency = document.querySelector('input[name="urgency"]:checked');
    var saved = PQ.createQuestion({
      name: $('qName').value.trim(),
      unit: $('qUnit').value.trim(),
      phone: $('qPhone').value.trim(),
      category: selectedCategory ? selectedCategory.value : '其他',
      description: desc,
      helpNeeded: $('qHelp').value.trim(),
      urgency: selectedUrgency ? selectedUrgency.value : 'normal',
      attachments: PQ.fileMeta($('qFiles').files)
    });
    $('submitSuccess').style.display = 'block';
    $('submitSuccess').innerHTML = '问题已经进入思德库专业问题池，我们将统一整理和处理。普通专业问题不再通过个人微信重复转发。<br>问题编号：' + esc(saved.questionNo);
    $('questionForm').reset();
    $('descCount').textContent = '0/500';
    renderMine();
  }

  function renderMine() {
    var owner = PQ.currentOwner();
    var list = PQ.load(PQ_STORAGE.QUESTIONS).filter(function (q) {
      return q.ownerId === owner.id;
    });
    if (mineStatus !== 'all') {
      list = list.filter(function (q) { return PQ.userStatus(q.status, q.reply) === mineStatus; });
    }
    if (!list.length) {
      $('myQuestions').innerHTML = '<div class="pq-empty">当前没有符合条件的问题。</div>';
      return;
    }
    $('myQuestions').innerHTML = list.map(function (q) {
      var status = PQ.userStatus(q.status, q.reply);
      return '<article class="pq-item">'
        + '<div class="pq-item-head"><div><h3>' + esc(q.questionNo) + '</h3>'
        + '<div class="pq-meta">' + esc(formatDate(q.createdAt)) + ' · ' + esc(q.category) + ' · ' + esc(PQ.urgencyLabels[q.urgency]) + '</div></div>'
        + '<span class="pq-tag ' + (q.urgency === 'safety' ? 'hot' : '') + '">' + esc(status) + '</span></div>'
        + '<p><b>问题摘要：</b>' + esc(PQ.summary(q.description)) + '</p>'
        + '<p class="pq-meta">当前状态：' + esc(status) + '</p>'
        + (q.reply ? '<div class="pq-reply"><b>回复内容：</b>\n' + esc(q.reply) + '</div>' : '')
        + '</article>';
    }).join('');
  }

  function renderKnowledge() {
    var list = PQ.load(PQ_STORAGE.KNOWLEDGE);
    if (kbCategory !== '全部') list = list.filter(function (k) { return k.category === kbCategory; });
    if (!list.length) {
      $('knowledgeList').innerHTML = '<div class="pq-empty">当前分类暂无常见问题。</div>';
      return;
    }
    $('knowledgeList').innerHTML = list.map(function (k) {
      return '<article class="pq-item">'
        + '<div class="pq-item-head"><h3>' + esc(k.question) + '</h3><span class="pq-tag">' + esc(k.category) + '</span></div>'
        + '<div class="pq-reply">' + esc(k.answer) + '</div>'
        + '<p class="pq-meta"><b>适用场景：</b>' + esc(k.scenario || '-') + '</p>'
        + '<p class="pq-meta"><b>需要注意的边界：</b>' + esc(k.boundary || '-') + '</p>'
        + '<p class="pq-meta"><b>相关工具或课程：</b>' + esc(k.tools || '-') + '</p>'
        + '</article>';
    }).join('');
  }

  function formatDate(value) {
    if (!value) return '-';
    return value.slice(0, 16).replace('T', ' ');
  }

  init();
})();
