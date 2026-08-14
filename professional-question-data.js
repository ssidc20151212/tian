/* ================================================================
 * 思德库专业问题中心 - 本地数据与规则建议
 * 第一版为静态站点可运行版本：使用 localStorage 保存问题、回复、知识库和专项咨询申请。
 * 生产环境接入后端后，可保持下列数据结构不变，替换存储实现。
 * ================================================================ */
(function (global) {
  'use strict';

  var PQ_STORAGE = {
    QUESTIONS: 'sdk_professional_questions',
    KNOWLEDGE: 'sdk_professional_knowledge',
    CONSULTS: 'sdk_professional_consults',
    VISITOR: 'sdk_professional_visitor_id'
  };

  var PQ = {};

  PQ.categories = [
    '老年人能力评估',
    '认知症/BPSD',
    '照护计划',
    '照护风险',
    '家属沟通/纠纷',
    '机构运营',
    '认知症专区建设',
    '智慧养老产品',
    '标准/政策',
    '其他'
  ];

  PQ.knowledgeCategories = [
    '能力评估',
    '认知症/BPSD',
    '照护计划',
    '风险管理',
    '家属沟通',
    '机构建设'
  ];

  PQ.urgencyLabels = {
    normal: '普通',
    week: '一周内需要答复',
    safety: '涉及老人安全/重大纠纷'
  };

  PQ.adminStatuses = {
    pending: '待处理',
    processing: '处理中',
    expert: '待专家',
    replied: '已回复',
    consult: '转专项咨询',
    knowledge: '已沉淀知识库'
  };

  PQ.userStatus = function (status, hasReply) {
    if (status === 'replied' || status === 'knowledge' || hasReply) return '已回复';
    if (status === 'processing' || status === 'expert' || status === 'consult') return '处理中';
    return '已提交';
  };

  PQ.escape = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  PQ.load = function (key) {
    try {
      var raw = localStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  };

  PQ.save = function (key, arr) {
    localStorage.setItem(key, JSON.stringify(arr || []));
  };

  PQ.currentOwner = function () {
    var user = global.CP && CP.currentUser ? CP.currentUser() : null;
    if (user) {
      return {
        id: user.role + ':' + (user.linkedId || user.username),
        name: user.displayName || user.username,
        role: user.role,
        loggedIn: true
      };
    }
    var visitor = localStorage.getItem(PQ_STORAGE.VISITOR);
    if (!visitor) {
      visitor = 'visitor:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(PQ_STORAGE.VISITOR, visitor);
    }
    return { id: visitor, name: '本机访客', role: 'visitor', loggedIn: false };
  };

  PQ.newId = function (prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  PQ.nextQuestionNo = function () {
    var day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    var count = PQ.load(PQ_STORAGE.QUESTIONS).filter(function (q) {
      return q.questionNo && q.questionNo.indexOf('SDK-PQ-' + day) === 0;
    }).length + 1;
    return 'SDK-PQ-' + day + '-' + String(count).padStart(3, '0');
  };

  PQ.summary = function (text) {
    var clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > 72 ? clean.slice(0, 72) + '...' : clean;
  };

  PQ.fileMeta = function (files) {
    return Array.prototype.slice.call(files || []).map(function (file) {
      return {
        name: file.name,
        type: file.type || '未知类型',
        size: file.size,
        sizeLabel: file.size < 1024 * 1024
          ? Math.ceil(file.size / 1024) + ' KB'
          : (file.size / 1024 / 1024).toFixed(1) + ' MB'
      };
    });
  };

  PQ.createQuestion = function (payload) {
    var owner = PQ.currentOwner();
    var item = Object.assign({
      id: PQ.newId('pq'),
      questionNo: PQ.nextQuestionNo(),
      ownerId: owner.id,
      ownerName: owner.name,
      status: 'pending',
      assignee: '',
      reply: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, payload);
    var list = PQ.load(PQ_STORAGE.QUESTIONS);
    list.unshift(item);
    PQ.save(PQ_STORAGE.QUESTIONS, list);
    return item;
  };

  PQ.updateQuestion = function (id, patch) {
    var list = PQ.load(PQ_STORAGE.QUESTIONS);
    var found = null;
    list = list.map(function (q) {
      if (q.id !== id) return q;
      found = Object.assign({}, q, patch, { updatedAt: new Date().toISOString() });
      return found;
    });
    PQ.save(PQ_STORAGE.QUESTIONS, list);
    return found;
  };

  PQ.addKnowledge = function (item) {
    var list = PQ.load(PQ_STORAGE.KNOWLEDGE);
    var saved = Object.assign({
      id: PQ.newId('kb'),
      createdAt: new Date().toISOString()
    }, item);
    list.unshift(saved);
    PQ.save(PQ_STORAGE.KNOWLEDGE, list);
    return saved;
  };

  PQ.addConsult = function (item) {
    var owner = PQ.currentOwner();
    var list = PQ.load(PQ_STORAGE.CONSULTS);
    var saved = Object.assign({
      id: PQ.newId('consult'),
      ownerId: owner.id,
      ownerName: owner.name,
      createdAt: new Date().toISOString(),
      status: '待联系'
    }, item);
    list.unshift(saved);
    PQ.save(PQ_STORAGE.CONSULTS, list);
    return saved;
  };

  PQ.suggestion = function (question) {
    var text = [
      question.category,
      question.description,
      question.helpNeeded
    ].join(' ');
    var has = function (words) {
      return words.some(function (word) { return text.indexOf(word) >= 0; });
    };
    var result = {
      summary: PQ.summary(question.description),
      coreNeed: question.helpNeeded || '需要思德库进行专业判断并给出处理建议',
      category: question.category || '其他',
      handler: '思德库专业问题值班人员',
      type: '普通专业答疑',
      method: '先整理事实和边界，再由专业人员统一答复。'
    };

    if (has(['认知症专区', '平面图', '设计', '专区方案', '动线'])) {
      result.type = '认知症专区专业复核';
      result.handler = '认知症专区建设顾问';
      result.method = '先专业初审，如需详细修改平面图或方案，建议转专项咨询。';
    } else if (has(['评分', '能力评估', '等级争议', '复核', '失能等级'])) {
      result.type = '复杂评估案例';
      result.handler = '能力评估专家';
      result.method = '转评估专家核对评分依据、争议点和材料完整性。';
    } else if (has(['BPSD', '攻击', '游走', '幻觉', '妄想', '拒绝照护'])) {
      result.type = '认知症/BPSD照护问题';
      result.handler = '认知症照护专家';
      result.method = '先补充触发因素、ABC记录和安全风险，再给出照护建议。';
    } else if (has(['纠纷', '投诉', '家属', '赔偿', '沟通'])) {
      result.type = '家属沟通与纠纷应对';
      result.handler = '机构服务与沟通负责人';
      result.method = '先梳理事实、记录证据和沟通目标，必要时建议升级专项咨询。';
    } else if (has(['跌倒', '压疮', '噎食', '走失', '安全', '风险'])) {
      result.type = '照护风险管理';
      result.handler = '照护风险管理专家';
      result.method = '优先判断老人安全风险，先给临时防控建议，再完善制度和记录。';
    }
    return result;
  };

  PQ.seedKnowledge = function () {
    if (localStorage.getItem('sdk_professional_knowledge_seeded')) return;
    PQ.save(PQ_STORAGE.KNOWLEDGE, [
      {
        id: 'kb_seed_1',
        category: '能力评估',
        question: '家属对能力评估等级有争议时，机构应先做什么？',
        answer: '先核对评估记录、评分依据、老人当天状态和家属提出异议的具体项目。不要直接争辩等级，应把争议点拆成可复核的事实。',
        scenario: '长护险评估、院内能力评估、入住评估后沟通。',
        boundary: '不能替代当地主管部门的正式复核流程，也不能承诺一定改变等级。',
        tools: '能力评估复核清单、家属沟通记录表',
        createdAt: new Date().toISOString()
      },
      {
        id: 'kb_seed_2',
        category: '认知症/BPSD',
        question: '认知症老人出现拒绝洗澡，应立即强制完成吗？',
        answer: '一般不建议强制。先判断疼痛、羞耻感、环境温度、照护者表达方式和既往生活习惯，再调整时间、方式和照护人员。',
        scenario: '认知症专区日常照护、BPSD行为应对。',
        boundary: '如涉及严重感染、皮肤破损或安全风险，需要护理负责人同步评估。',
        tools: 'ABC行为记录表、个案照护计划',
        createdAt: new Date().toISOString()
      }
    ]);
    localStorage.setItem('sdk_professional_knowledge_seeded', '1');
  };

  global.PQ_STORAGE = PQ_STORAGE;
  global.PQ = PQ;
  PQ.seedKnowledge();
})(window);
