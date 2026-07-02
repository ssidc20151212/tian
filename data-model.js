/* ================================================================
 * CareProof AI · 思德库养老专业能力AI验证与匹配系统
 * data-model.js — 数据模型、存储、演示数据、权限工具
 *
 * DEMO AUTH ONLY — NOT FOR PRODUCTION
 * 本文件中的模拟账号仅用于本地开发和演示。
 * 生产环境必须由后端认证接口决定角色和权限。
 * ================================================================ */
(function (global) {
  'use strict';

  // ---------- 存储键 ----------
  const CP_STORAGE = {
    USER: 'cp_current_user',
    TALENTS: 'cp_talents',
    EVIDENCES: 'cp_evidences',
    NEEDS: 'cp_needs',
    MATCHES: 'cp_matches',
    REVIEWS: 'cp_reviews',
    LEADS: 'cp_leads',
    DEMO_INIT: 'cp_demo_initialized',
    PENDING_ACTION: 'cp_pending_action',
    MIGRATION_DONE: 'cp_migration_v1_done'
  };
  const CP_SESSION = { ROUTE_HOP: 'cp_route_hop' };

  // ---------- 常量：角色 ----------
  const ROLES = { TALENT: 'talent', INSTITUTION: 'institution', ADMIN: 'admin' };
  const ROLE_LABELS = {
    talent: '专业人才',
    institution: '机构用户',
    admin: '思德库管理员'
  };

  // ---------- 常量：问题分类 ----------
  const PROBLEM_CATEGORIES = {
    training: '评估培训',
    dispute: '评估结果争议',
    quality_review: '评估质量复核',
    process: '评估流程建设',
    standard: '标准导入',
    dementia: '认知症评估',
    care_plan: '照护计划',
    other: '其他专业问题'
  };

  // ---------- 常量：能力领域 ----------
  const CAPABILITY_DOMAINS = {
    assessment: '老年人能力评估',
    complex_case: '复杂案例分析',
    dispute: '评估争议处理',
    quality_ctrl: '评估质量控制',
    training: '评估员培训',
    system_build: '机构评估体系建设',
    dementia: '认知症与BPSD评估',
    care_plan: '照护计划制定'
  };

  // ---------- 常量：证据类型 ----------
  const EVIDENCE_TYPES = {
    project: '实际完成的项目',
    case: '真实案例',
    report: '评估报告',
    training: '培训记录',
    teaching: '授课成果',
    standard: '标准编制经历',
    recommendation: '机构推荐',
    review: '服务评价',
    article: '专业文章',
    certificate: '资格证书'
  };

  // ---------- 常量：验证状态 ----------
  const VERIFICATION_STATUS = {
    unverified: '未验证',
    submitted: '材料已提交',
    verified: '思德库已核验',
    institution_confirmed: '机构已确认'
  };

  // ---------- 常量：需求状态 ----------
  const NEED_STATUS = {
    new: '新提交',
    analyzing: '待分析',
    matched: 'AI 已匹配',
    pending_confirm: '待人工确认',
    contacted: '已联系机构',
    discussing: '方案沟通中',
    quoted: '已报价',
    deal: '已成交',
    paused: '暂缓',
    lost: '未成交'
  };

  // ---------- 常量：线索阶段 ----------
  const LEAD_STAGE = {
    new: '新线索',
    contacted: '已联系',
    proposal: '方案沟通',
    negotiating: '商务谈判',
    won: '已成交',
    lost: '未成交',
    paused: '暂缓'
  };

  // ---------- 演示账号（DEMO AUTH ONLY — NOT FOR PRODUCTION） ----------
  const DEMO_ACCOUNTS = [
    { username: 'talent1', password: '123456', role: 'talent',
      displayName: '王美华（示范）', linkedId: 'tal_demo_1' },
    { username: 'talent2', password: '123456', role: 'talent',
      displayName: '张秀芬（示范）', linkedId: 'tal_demo_2' },
    { username: 'org1', password: '123456', role: 'institution',
      displayName: '示范养老机构', linkedId: 'org_demo_1' },
    { username: 'admin', password: '123456', role: 'admin',
      displayName: '思德库管理员', linkedId: null }
  ];

  // ---------- CRUD 工具 ----------
  const CP = {};
  CP.load = function (key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  };
  CP.save = function (key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr || [])); return true; }
    catch (e) { console.warn('CP.save failed', key, e); return false; }
  };
  CP.upsert = function (key, obj, matchFn) {
    const list = CP.load(key);
    const idx = list.findIndex(matchFn || (x => x.id === obj.id));
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], obj);
    else list.push(obj);
    CP.save(key, list);
    return obj;
  };
  CP.remove = function (key, id) {
    const list = CP.load(key).filter(x => x.id !== id);
    CP.save(key, list);
  };
  CP.findById = function (key, id) {
    return CP.load(key).find(x => x.id === id) || null;
  };
  CP.filterBy = function (key, predicate) {
    return CP.load(key).filter(predicate || (() => true));
  };

  // ---------- ID 生成 ----------
  CP.newId = function (prefix) {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 8);
    return (prefix || 'id') + '_' + t + r;
  };

  // ---------- 认证工具 ----------
  CP.currentUser = function () {
    try { return JSON.parse(localStorage.getItem(CP_STORAGE.USER)); }
    catch (e) { return null; }
  };
  CP.hasRole = function (role) {
    const u = CP.currentUser();
    return u && u.role === role;
  };
  CP.requireLogin = function (redirectTo) {
    if (!CP.currentUser()) {
      CP.safeReplace(redirectTo || 'login.html');
      return false;
    }
    return true;
  };
  CP.requireRole = function (role, redirectTo) {
    const u = CP.currentUser();
    if (!u) { CP.safeReplace(redirectTo || 'login.html'); return false; }
    if (u.role !== role && u.role !== 'admin') {
      CP.safeReplace(redirectTo || 'login.html');
      return false;
    }
    return true;
  };
  CP.logout = function () {
    localStorage.removeItem(CP_STORAGE.USER);
    CP.safeReplace('capability-platform.html');
  };
  CP.login = function (username, password) {
    const acct = DEMO_ACCOUNTS.find(
      a => a.username === username && a.password === password
    );
    if (!acct) return null;
    const user = {
      username: acct.username, role: acct.role,
      displayName: acct.displayName, linkedId: acct.linkedId,
      loginAt: new Date().toISOString()
    };
    localStorage.setItem(CP_STORAGE.USER, JSON.stringify(user));
    return user;
  };

  // ---------- 路由跳转保护 ----------
  CP.safeReplace = function (url) {
    const key = CP_SESSION.ROUTE_HOP;
    const hop = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (hop > 5) {
      console.error('CP: route loop detected, stopped at', url);
      return;
    }
    sessionStorage.setItem(key, String(hop + 1));
    window.location.replace(url);
  };

  // ---------- 演示数据初始化 ----------
  CP.initDemoData = function () {
    if (localStorage.getItem(CP_STORAGE.DEMO_INIT)) return;
    var talents = [
      { id:'tal_demo_1', isDemo:true, name:'王美华', region:'beijing',
        level:'senior', years:8, certNo:'GJ-2018-001',
        domains:['assessment','complex_case','dementia'],
        bio:'8年老年人能力评估经验，擅长认知症BPSD评估与复杂案例分析',
        scores:{ assessment:92, complex_case:88, dispute:75, quality_ctrl:80, training:85, dementia:95 }
      },
      { id:'tal_demo_2', isDemo:true, name:'张秀芬', region:'guangzhou',
        level:'senior', years:6, certNo:'GJ-2020-042',
        domains:['assessment','training','system_build'],
        bio:'6年评估经验，专注评估体系建设与评估员培训督导',
        scores:{ assessment:88, complex_case:72, dispute:70, quality_ctrl:90, training:92, system_build:85 }
      },
      { id:'tal_demo_3', isDemo:true, name:'李建国', region:'shanghai',
        level:'mid', years:4, certNo:'ZJ-2021-118',
        domains:['assessment','care_plan'],
        bio:'4年评估与照护计划制定经验，熟悉长护险评估流程',
        scores:{ assessment:80, complex_case:65, dispute:60, quality_ctrl:70, training:55, care_plan:82 }
      }
    ];
    CP.save(CP_STORAGE.TALENTS, talents);

    var evidences = [
      { id:'ev_demo_1', isDemo:true, talentId:'tal_demo_1',
        type:'project', domain:'dementia',
        title:'北京朝阳区某养老院认知症评估体系建设',
        summary:'为200床位机构建立BPSD评估流程，培训评估员12人',
        year:2023, verifyStatus:'verified', evidenceLevel:'A' },
      { id:'ev_demo_2', isDemo:true, talentId:'tal_demo_1',
        type:'case', domain:'complex_case',
        title:'重度失智合并躯体疾病评估案例',
        summary:'85岁女性，重度阿尔茨海默症合并帕金森，完成综合能力评估',
        year:2024, verifyStatus:'verified', evidenceLevel:'A' },
      { id:'ev_demo_3', isDemo:true, talentId:'tal_demo_2',
        type:'training', domain:'training',
        title:'广州市某区评估员岗前培训（4期）',
        summary:'累计培训评估员78人，通过率91%',
        year:2023, verifyStatus:'verified', evidenceLevel:'A' },
      { id:'ev_demo_4', isDemo:true, talentId:'tal_demo_2',
        type:'standard', domain:'system_build',
        title:'参与《广东省老年人能力评估操作手册》编制',
        summary:'第三章"评估流程"主要执笔人',
        year:2022, verifyStatus:'institution_confirmed', evidenceLevel:'A' },
      { id:'ev_demo_5', isDemo:true, talentId:'tal_demo_3',
        type:'report', domain:'care_plan',
        title:'长护险失能评估报告样本（50份）',
        summary:'上海浦东新区长护险评估报告，含照护计划建议',
        year:2024, verifyStatus:'submitted', evidenceLevel:'B' }
    ];
    CP.save(CP_STORAGE.EVIDENCES, evidences);

    // 演示需求 + 匹配 + 线索（继承 isDemo）
    var needs = [
      { id:'need_demo_1', isDemo:true, orgId:'org_demo_1',
        orgName:'示范养老机构', category:'dementia',
        title:'认知症专区评估体系搭建', region:'beijing',
        description:'新建60床认知症专区，需专业评估师帮助建立BPSD评估流程并培训内部评估员',
        urgency:'normal', status:'matched', createdAt:'2024-11-20T10:00:00Z' },
      { id:'need_demo_2', isDemo:true, orgId:'org_demo_1',
        orgName:'示范养老机构', category:'dispute',
        title:'家属对评估等级提出异议', region:'beijing',
        description:'一位老人家属对评估结果为"轻度失能"不认可，要求复核',
        urgency:'urgent', status:'matched', createdAt:'2024-12-01T08:30:00Z' }
    ];
    CP.save(CP_STORAGE.NEEDS, needs);

    var matches = [
      { id:'match_demo_1', isDemo:true, needId:'need_demo_1',
        results:[
          { talentId:'tal_demo_1', score:92, breakdown:{domain:30,evidence:25,caseExp:18,delivery:12,avail:7} },
          { talentId:'tal_demo_2', score:78, breakdown:{domain:22,evidence:20,caseExp:14,delivery:13,avail:9} }
        ], createdAt:'2024-11-20T10:01:00Z', confirmedBy:null },
      { id:'match_demo_2', isDemo:true, needId:'need_demo_2',
        results:[
          { talentId:'tal_demo_1', score:85, breakdown:{domain:25,evidence:22,caseExp:20,delivery:12,avail:6} }
        ], createdAt:'2024-12-01T08:31:00Z', confirmedBy:'admin' }
    ];
    CP.save(CP_STORAGE.MATCHES, matches);

    var leads = [
      { id:'lead_demo_1', isDemo:true, needId:'need_demo_1',
        talentId:'tal_demo_1', orgId:'org_demo_1',
        stage:'proposal', notes:'已沟通方案细节，待报价',
        createdAt:'2024-11-21T14:00:00Z' }
    ];
    CP.save(CP_STORAGE.LEADS, leads);
    localStorage.setItem(CP_STORAGE.DEMO_INIT, '1');
  };

  // ---------- 清除演示数据 ----------
  CP.clearDemoData = function () {
    Object.values(CP_STORAGE).forEach(function (key) {
      if (key === CP_STORAGE.USER || key === CP_STORAGE.MIGRATION_DONE) return;
      var list = CP.load(key);
      if (Array.isArray(list)) {
        CP.save(key, list.filter(function (x) { return !x.isDemo; }));
      }
    });
    localStorage.removeItem(CP_STORAGE.DEMO_INIT);
  };

  CP.isDemoItem = function (item) { return item && item.isDemo === true; };

  // ---------- 旧版数据迁移 ----------
  CP.migrateLegacyData = function () {
    if (localStorage.getItem(CP_STORAGE.MIGRATION_DONE)) return;
    // 清除旧系统 sdk_* 键
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.startsWith('sdk_')) keysToRemove.push(k);
    }
    keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
    localStorage.setItem(CP_STORAGE.MIGRATION_DONE, '1');
  };

  // ---------- 自动启动 ----------
  CP.boot = function () {
    sessionStorage.setItem(CP_SESSION.ROUTE_HOP, '0');
    CP.migrateLegacyData();
    CP.initDemoData();
  };

  global.CP_STORAGE = CP_STORAGE;
  global.CP_SESSION = CP_SESSION;
  global.CP_CONST = {
    ROLES, ROLE_LABELS, PROBLEM_CATEGORIES, CAPABILITY_DOMAINS,
    EVIDENCE_TYPES, VERIFICATION_STATUS, NEED_STATUS, LEAD_STAGE
  };
  global.CP_DEMO_ACCOUNTS = DEMO_ACCOUNTS;
  global.CP = CP;
})(window);
