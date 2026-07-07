/**
 * 思德库AI评估副驾 V0.1
 * ai-eval-copilot.js — 本地规则引擎
 *
 * 功能：
 * 1. 读取页面表单数据
 * 2. 加载 data/eval-qc-rules-v01.json 规则库
 * 3. 基于表单关键词和选项匹配触发规则
 * 4. 按风险等级排序后展示结果
 * 5. 不调用任何外部 AI API
 *
 * 所有结论均为"AI质控建议，不替代评估师专业判断"
 */
;(function () {
  'use strict';

  /* ========== 常量 ========== */
  // 风险等级排序权重（越高越优先展示）
  const RISK_ORDER = { blocking: 0, high: 1, medium: 2, low: 3 };
  // 免责声明
  const DISCLAIMER =
    'AI质控建议，不替代评估师专业判断';

  /* ========== DOM 引用 ========== */
  const form = document.getElementById('qcForm');
  const btnRun = document.getElementById('btnRunQC');
  const btnReset = document.getElementById('btnReset');
  const btnImport = document.getElementById('btnImport');
  const btnPrint = document.getElementById('btnPrint');
  const btnExport = document.getElementById('btnExport');
  const loadingEl = document.getElementById('loadingOverlay');
  const qcPanel = document.getElementById('qcResultPanel');
  const qcList = document.getElementById('qcResultList');
  const sugPanel = document.getElementById('suggestionPanel');
  const sugList = document.getElementById('suggestionList');
  const reportPanel = document.getElementById('reportPanel');
  const reportContent = document.getElementById('reportContent');
  const steps = document.querySelectorAll('.step-item');

  /* ========== 规则库缓存 ========== */
  let rulesDB = null;

  /**
   * 加载 JSON 规则库
   * 优先通过 fetch 加载外部 JSON 文件；
   * 如果失败（如 file:// 协议下无法 fetch），则使用内嵌规则
   */
  async function loadRules() {
    if (rulesDB) return rulesDB;
    try {
      const resp = await fetch('data/eval-qc-rules-v01.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      rulesDB = data.rules;
    } catch (e) {
      // file:// 协议或网络异常时使用内嵌规则
      console.warn('fetch 规则库失败，使用内嵌规则:', e.message);
      rulesDB = getEmbeddedRules();
    }
    return rulesDB;
  }

  /**
   * 内嵌规则精简版（与 JSON 文件保持同步）
   * 用于 file:// 协议直接打开时的 fallback
   */
  function getEmbeddedRules() {
    return [
      { id:'QC-001', title:'坐轮椅不等于完全不能移位', risk_level:'high', dimension:'移动能力', logic:'使用轮椅是移动代偿方式，不能直接等同于丧失移位能力。需观察实际转移动作。', message:'使用轮椅与移位能力丧失是不同概念，需逐项观察实际转移动作后判定。', follow_up_questions:['老人能否在辅助下从床移至轮椅？','轮椅上能否自主调整坐姿？','是否具备短暂站立支撑能力？'], required_observations:['床椅转移过程','轮椅上体位调整','下肢承重能力'], human_confirmation_required:true },
      { id:'QC-002', title:'使用尿裤不等于失禁', risk_level:'high', dimension:'排泄控制', logic:'使用尿裤可能出于预防性措施或机构管理便利，不能直接认定排泄功能丧失。', message:'尿裤使用属于照护安排而非能力判定依据，需确认实际排泄控制功能。', follow_up_questions:['老人是否有排尿/排便意识？','能否主动表达如厕需求？','日间在提醒下能否定时如厕？','使用尿裤是老人需要还是机构安排？'], required_observations:['排尿意识表达','定时如厕配合程度','日间与夜间排泄控制差异'], human_confirmation_required:true },
      { id:'QC-003', title:'失语不等于无认知', risk_level:'blocking', dimension:'认知功能', logic:'失语是语言通道损伤，不等同于认知加工能力丧失。需通过非语言途径评估。', message:'语言表达障碍不能作为认知功能丧失的唯一依据，需通过非语言方式补充评估。', follow_up_questions:['是否尝试过非语言指令测试？','老人能否通过点头/摇头/手势回应？','是否有对熟悉物品或人物的识别反应？','目光追踪和面部表情是否有交互回应？'], required_observations:['对非语言指令的动作反应','目光追踪能力','手势或表情沟通能力','对熟悉环境刺激的反应'], human_confirmation_required:true },
      { id:'QC-004', title:'表达缓慢不等于认知障碍', risk_level:'medium', dimension:'认知功能', logic:'表达速度受听力、性格、方言转换、药物等因素影响，缓慢不等于错误。', message:'反应速度与认知准确性是不同维度，需确认回答内容是否正确，而非仅以速度判定。', follow_up_questions:['延长等待时间后老人能否给出正确回答？','是否存在听力下降或语言转换因素？','是否有镇静类药物影响反应速度？','在熟悉话题上反应是否明显改善？'], required_observations:['给予充分时间后的回答准确率','听力状况','用药情况','不同话题下的反应差异'], human_confirmation_required:false },
      { id:'QC-005', title:'家属全天照护不等于重度失能', risk_level:'high', dimension:'综合判定', logic:'家属全天照护的原因多元，照护投入时间反映照护安排而非被照护者能力水平。', message:'照护时间投入不能替代能力观察，需区分"家属选择照护"与"老人确实需要照护"。', follow_up_questions:['如果不陪护，老人实际能独立完成哪些活动？','全天照护的主要顾虑是什么？','老人是否有被限制活动的情况？','在机构环境中表现是否与家中不同？'], required_observations:['无家属在场时的独立活动能力','日常生活各项目的实际执行','安全风险的具体内容与概率'], human_confirmation_required:true },
      { id:'QC-006', title:'疾病诊断不能直接代替能力等级', risk_level:'blocking', dimension:'综合判定', logic:'同一疾病在不同个体、不同阶段表现差异巨大。评估必须基于此人此刻能做什么。', message:'疾病诊断是参考信息而非判定依据，能力等级必须基于逐项功能观察确定。', follow_up_questions:['该诊断在此老人身上的实际功能影响是什么？','是否逐项观察了对应维度的实际表现？','现阶段药物控制效果如何？'], required_observations:['疾病影响的具体功能维度表现','当前治疗/控制状态','各ADL项目的实际完成情况'], human_confirmation_required:true },
      { id:'QC-007', title:'能完成动作不等于能安全独立完成', risk_level:'high', dimension:'日常生活活动', logic:'评估应关注"安全、独立、完整"地完成，而非仅观察动作是否能做出。', message:'"能做"与"能安全独立完成"是不同判定标准，需记录完成质量与安全条件。', follow_up_questions:['完成该活动时是否存在跌倒或受伤风险？','是否需要他人在旁监护？','能否每次稳定完成？','完成所需时间是否合理？'], required_observations:['动作完成的稳定性','过程中的安全风险','是否需要监护或提示','完成耗时'], human_confirmation_required:false },
      { id:'QC-008', title:'能走不等于行走安全', risk_level:'high', dimension:'移动能力', logic:'行走能力判定需综合考虑步态稳定性、平衡、环境适应、持续距离。', message:'行走能力判定需包含安全维度，建议记录步态质量、平衡表现及跌倒风险。', follow_up_questions:['近3个月内是否有跌倒事件？','行走时步态是否稳定？','能否安全应对台阶等障碍？','独立行走的安全距离大约多远？'], required_observations:['步态稳定性','转弯与起坐时的平衡','辅具使用情况','3个月内跌倒史'], human_confirmation_required:false },
      { id:'QC-009', title:'能进食不等于完全独立进食', risk_level:'medium', dimension:'进食能力', logic:'独立进食完整判定应包括食物处理、餐具使用、进食安全和完整度。', message:'进食独立性需考虑食物准备、餐具使用、进食安全和完整度。', follow_up_questions:['食物是否需要预先切碎或加工？','是否使用特殊辅助餐具？','进食过程中是否有呛咳风险？','能否在合理时间内完成整餐？'], required_observations:['食物处理需求','餐具使用能力','进食过程中的安全性','进食完成度与耗时'], human_confirmation_required:false },
      { id:'QC-010', title:'认知症诊断不能代替逐项认知观察', risk_level:'blocking', dimension:'认知功能', logic:'认知症影响是不均匀的，必须逐项观察而非以诊断代替评估。', message:'认知症诊断不能替代逐项功能观察，需分别评估记忆、定向、理解、执行等各维度。', follow_up_questions:['近记忆与远记忆损伤程度是否一致？','时间、地点、人物定向分别如何？','能否理解并执行简单日常指令？','是否保留程序性记忆？'], required_observations:['各认知维度的独立评估结果','保留能力与丧失能力的区分','日常情境中的实际认知表现','不同时段认知波动情况'], human_confirmation_required:true },
      { id:'QC-011', title:'突然等级变化必须有事件解释', risk_level:'blocking', dimension:'纵向一致性', logic:'能力等级大幅变化通常对应明确事件，无事件解释时需复核。', message:'等级大幅变化需有对应的健康事件支撑，缺少事件解释时需复核。', follow_up_questions:['两次评估间发生了什么健康事件？','能力下降是突然发生还是渐进的？','前次评估结论当时是否被质疑过？','变化是否与近期用药调整相关？'], required_observations:['两次评估间的病历/事件记录','功能变化的时间线','前次评估的方法与结论'], human_confirmation_required:true },
      { id:'QC-012', title:'护理记录与家属陈述冲突需核实', risk_level:'high', dimension:'信息一致性', logic:'护理记录反映机构环境下的表现，家属陈述反映家庭环境认知，需交叉验证。', message:'多信息源冲突时，需说明采信依据并尝试现场验证。', follow_up_questions:['护理记录与家属说法具体矛盾点是什么？','是否在不同环境下观察到不同表现？','护理记录的更新频率和时效如何？','是否可以现场演示验证争议项目？'], required_observations:['争议项目的现场观察','护理记录时效性确认','不同环境/时段的表现对比'], human_confirmation_required:true },
      { id:'QC-013', title:'病历严重但现场能力保留需解释', risk_level:'high', dimension:'信息一致性', logic:'病重但能力好可能因为疾病已控制、康复效果好、代偿策略有效。', message:'病历严重程度与实际能力不符时，需记录解释原因。', follow_up_questions:['当前疾病控制状态如何？','是否经过系统康复训练？','老人采用了哪些代偿策略？','病历记录的是急性期还是稳定期状态？'], required_observations:['当前疾病控制情况','实际功能表现与病历的差异点','代偿策略的有效性'], human_confirmation_required:false },
      { id:'QC-014', title:'现场观察缺失时不能直接确认边界项目', risk_level:'blocking', dimension:'评估方法', logic:'对于决定等级归属的边界项目，仅依赖口头询问的可靠性不足。', message:'关键边界项目需现场观察确认，仅靠询问不足以支撑等级判定。', follow_up_questions:['该项目是否进行了现场观察或操作测试？','如未观察，原因是什么？','是否可以安排补充观察？','该项的分值是否直接影响等级归属？'], required_observations:['边界项目的现场操作测试','观察条件是否具备','替代验证方法的可靠性'], human_confirmation_required:true },
      { id:'QC-015', title:'家属情绪强烈时需区分情绪与事实', risk_level:'medium', dimension:'信息采集', logic:'家属可能因照护压力、经济考虑放大或缩小失能程度，需识别情绪干扰。', message:'家属诉求是重要参考但不是判定依据，需确保评估结论基于独立观察。', follow_up_questions:['家属的核心诉求是什么？','评估师是否独立完成了观察？','家属描述与实际观察是否一致？','是否存在经济利益因素影响陈述准确性？'], required_observations:['评估师独立观察记录','家属诉求的客观对照','老人本人意愿表达'], human_confirmation_required:false },
      { id:'QC-016', title:'暂时疾病恢复期不能直接认定长期失能', risk_level:'high', dimension:'时间维度', logic:'急性期后的功能状态可能是暂时性的，评估应标注当前状态的时间属性。', message:'恢复期内的评估需标注时间属性，建议设定复评时间点以确认长期功能水平。', follow_up_questions:['距急性事件发生多长时间？','目前是否仍在积极康复中？','医疗团队对功能恢复的预期如何？','是否已安排复评时间？'], required_observations:['急性事件时间线','当前康复进展','医疗团队的功能预后判断'], human_confirmation_required:true },
      { id:'QC-017', title:'使用辅具不等于完全依赖', risk_level:'high', dimension:'辅具与独立性', logic:'辅具是能力延伸工具，使用辅具后能独立完成的应计为独立或轻度依赖。', message:'使用辅具后能独立完成活动的，应依据辅具下的实际表现评定。', follow_up_questions:['使用辅具后能否独立完成该活动？','辅具是否为日常可及的常规辅具？','是否仍需他人在旁协助？','评估标准中对辅具使用的计分规则是什么？'], required_observations:['辅具使用下的实际功能表现','是否需要额外人力协助','辅具获取和维护的可及性'], human_confirmation_required:false },
      { id:'QC-018', title:'环境障碍不等于能力丧失', risk_level:'medium', dimension:'环境因素', logic:'能力评估应区分"因能力不足无法完成"和"因环境障碍无法完成"。', message:'因环境障碍导致的功能受限不应直接等同于能力丧失。', follow_up_questions:['如果改善环境条件，该项目能否完成？','当前评估环境是否代表老人的日常环境？','是否有条件在适宜环境下补充评估？','环境改造后能力是否会改善？'], required_observations:['环境条件对功能表现的具体影响','不同环境下的能力对比','环境改造的可行性'], human_confirmation_required:false },
      { id:'QC-019', title:'照护时间长不等于能力等级高', risk_level:'medium', dimension:'综合判定', logic:'照护时间受照护者技能、机构配比、管理模式等非能力因素影响。', message:'照护时间是服务量指标而非能力指标，等级判定应基于功能评估结果。', follow_up_questions:['照护时间中哪些是直接身体照护？','哪些照护时间属于监护/陪伴？','同等能力的老人在不同机构照护时间是否一致？','照护时间是否包含了可由老人自行完成的活动？'], required_observations:['照护内容的具体分解','直接身体照护vs监护时间比例','各功能维度的独立评分'], human_confirmation_required:false },
      { id:'QC-020', title:'评估结论必须能展开依据', risk_level:'blocking', dimension:'结论可追溯性', logic:'每一项结论都应能回答"为什么是这个分数"，无法展开说明的判定需补充证据。', message:'评估结论必须可追溯至具体观察或测试依据。', follow_up_questions:['该项评分的观察依据是什么？','评分时参考了哪些具体表现？','如果要向第三方解释此评分能提供什么证据？','是否存在凭经验直觉打分的情况？'], required_observations:['每项评分对应的观察记录','评分与观察之间的逻辑链','等级判定的推导过程'], human_confirmation_required:true }
    ];
  }

  /* ========== 表单数据读取 ========== */
  function getFormData() {
    return {
      evalType: val('evalType'),
      name: val('personName'),
      age: num('personAge'),
      assessor: val('assessorName'),
      cognitiveScore: num('cognitiveScore'),
      adlScore: num('adlScore'),
      careLevel: num('careLevel'),
      duration: num('duration'),
      mobilityMode: val('mobilityMode'),
      continence: val('continence'),
      feedingStatus: val('feedingStatus'),
      speechStatus: val('speechStatus'),
      assistDevice: val('assistDevice'),
      infoSource: val('infoSource'),
      notes: val('notes')
    };
  }
  // 辅助：获取字段值
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function num(id) {
    return parseInt(document.getElementById(id).value) || 0;
  }

  /* ==========================================================
   * 规则触发判定引擎
   * 每条规则通过 ID 映射到具体的触发逻辑
   * 触发逻辑基于表单结构化字段 + 备注关键词匹配
   * ========================================================== */
  function buildTriggerMap() {
    return {
      // QC-001: 坐轮椅不等于完全不能移位
      'QC-001': (d) =>
        d.mobilityMode === 'wheelchair' && d.adlScore <= 20,

      // QC-002: 使用尿裤不等于失禁
      'QC-002': (d) =>
        d.continence === 'diaper' ||
        (d.continence === 'incontinent' &&
         hasKeyword(d.notes, ['尿裤', '纸尿裤', '尿不湿'])),

      // QC-003: 失语不等于无认知
      'QC-003': (d) =>
        d.speechStatus === 'aphasia' && d.cognitiveScore <= 10,

      // QC-004: 表达缓慢不等于认知障碍
      'QC-004': (d) =>
        d.speechStatus === 'slow' && d.cognitiveScore <= 20,

      // QC-005: 家属全天照护不等于重度失能
      'QC-005': (d) =>
        hasKeyword(d.notes, ['24小时', '全天', '不离人', '全天候']) &&
        d.careLevel >= 3,

      // QC-006: 疾病诊断不能直接代替能力等级
      'QC-006': (d) =>
        hasKeyword(d.notes, [
          '帕金森', '脑梗', '脑出血', '痴呆', '认知症',
          '阿尔茨海默', '股骨', '骨折'
        ]) && d.infoSource !== 'observation',

      // QC-007: 能完成动作不等于能安全独立完成
      'QC-007': (d) =>
        d.adlScore >= 80 && d.careLevel >= 2,

      // QC-008: 能走不等于行走安全
      'QC-008': (d) =>
        (d.mobilityMode === 'independent' ||
         d.mobilityMode === 'cane') &&
        hasKeyword(d.notes, ['跌倒', '摔', '不稳', '平衡差']),

      // QC-009: 能进食不等于完全独立进食
      'QC-009': (d) =>
        d.feedingStatus === 'independent' &&
        hasKeyword(d.notes, ['切碎', '打糊', '辅助餐具', '呛咳']),

      // QC-010: 认知症诊断不能代替逐项认知观察
      'QC-010': (d) =>
        hasKeyword(d.notes, ['认知症', '痴呆', '阿尔茨海默']) &&
        d.cognitiveScore <= 10 &&
        d.infoSource !== 'observation',

      // QC-011: 突然等级变化必须有事件解释
      'QC-011': (d) =>
        hasKeyword(d.notes, ['等级变化', '上次', '从.*级到']) &&
        !hasKeyword(d.notes, [
          '骨折', '脑梗', '手术', '感染', '跌倒', '中风'
        ]),

      // QC-012: 护理记录与家属陈述冲突需核实
      'QC-012': (d) =>
        hasKeyword(d.notes, ['家属说', '家属认为', '家属反映']) &&
        hasKeyword(d.notes, ['但', '矛盾', '不一致', '记录显示']),

      // QC-013: 病历严重但现场能力保留需解释
      'QC-013': (d) =>
        hasKeyword(d.notes, [
          '多种疾病', '合并症', '病历严重', '重症'
        ]) && d.adlScore >= 60,

      // QC-014: 现场观察缺失时不能直接确认边界项目
      'QC-014': (d) =>
        d.infoSource === 'inquiry' || d.infoSource === 'records',

      // QC-015: 家属情绪强烈时需区分情绪与事实
      'QC-015': (d) =>
        hasKeyword(d.notes, [
          '情绪', '激动', '坚持', '强烈要求', '不满', '投诉'
        ]),

      // QC-016: 暂时疾病恢复期不能直接认定长期失能
      'QC-016': (d) =>
        hasKeyword(d.notes, [
          '术后', '骨折后', '恢复期', '出院不久',
          '近期手术', '感染后'
        ]) && d.careLevel >= 3,

      // QC-017: 使用辅具不等于完全依赖
      'QC-017': (d) =>
        d.assistDevice !== '' && d.adlScore <= 30,

      // QC-018: 环境障碍不等于能力丧失
      'QC-018': (d) =>
        hasKeyword(d.notes, [
          '无扶手', '台阶', '狭窄', '环境', '地面湿滑'
        ]),

      // QC-019: 照护时间长不等于能力等级高
      'QC-019': (d) =>
        hasKeyword(d.notes, [
          '照护时间', '小时', '全天照护', '24小时'
        ]) && d.careLevel >= 3,

      // QC-020: 评估结论必须能展开依据
      'QC-020': (d) =>
        d.notes.length < 5 && d.careLevel >= 3
    };
  }

  /**
   * 关键词匹配工具：检查文本是否包含任一关键词
   */
  function hasKeyword(text, keywords) {
    if (!text) return false;
    return keywords.some((kw) => text.includes(kw));
  }

  /* ==========================================================
   * 核心引擎：执行所有规则并返回触发结果
   * ========================================================== */
  async function executeEngine(formData) {
    const rules = await loadRules();
    const triggerMap = buildTriggerMap();
    const triggered = []; // 触发的规则

    rules.forEach((rule) => {
      const fn = triggerMap[rule.id];
      // 如果有对应的触发函数且条件满足
      if (fn && fn(formData)) {
        triggered.push({
          ...rule,
          triggerReason: buildTriggerReason(rule, formData)
        });
      }
    });

    // 按风险等级排序：blocking > high > medium > low
    triggered.sort((a, b) =>
      (RISK_ORDER[a.risk_level] || 9) -
      (RISK_ORDER[b.risk_level] || 9)
    );

    return triggered;
  }

  /**
   * 生成触发原因说明（基于表单数据拼接）
   */
  function buildTriggerReason(rule, d) {
    // 从表单数据中提取与规则相关的证据
    const reasons = [];
    if (rule.dimension === '移动能力' && d.mobilityMode) {
      reasons.push('移动方式: ' + getLabelFor('mobilityMode', d.mobilityMode));
    }
    if (rule.dimension === '排泄控制' && d.continence) {
      reasons.push('排泄状态: ' + getLabelFor('continence', d.continence));
    }
    if (rule.dimension === '认知功能') {
      reasons.push('认知评分: ' + d.cognitiveScore + '/30');
      if (d.speechStatus) {
        reasons.push('语言表达: ' + getLabelFor('speechStatus', d.speechStatus));
      }
    }
    if (rule.dimension === '进食能力' && d.feedingStatus) {
      reasons.push('进食状态: ' + getLabelFor('feedingStatus', d.feedingStatus));
    }
    if (d.careLevel > 0) {
      reasons.push('照护等级: ' + d.careLevel + '级');
    }
    if (d.adlScore > 0) {
      reasons.push('ADL评分: ' + d.adlScore + '/100');
    }
    if (d.notes && d.notes.length > 0) {
      // 截取备注前30字作为上下文
      reasons.push('备注提及: "' + d.notes.slice(0, 30) +
        (d.notes.length > 30 ? '..."' : '"'));
    }
    return reasons.length > 0 ? reasons.join('；') : '综合条件触发';
  }

  /**
   * 获取选项的中文显示文本
   */
  function getLabelFor(fieldId, value) {
    const el = document.getElementById(fieldId);
    if (!el) return value;
    const opt = el.querySelector('option[value="' + value + '"]');
    return opt ? opt.textContent : value;
  }

  /* ==========================================================
   * 渲染函数：将触发结果渲染到页面
   * ========================================================== */

  /**
   * 渲染质控结果列表（主面板）
   */
  function renderQCResults(triggered) {
    if (triggered.length === 0) {
      // 无规则触发时的展示
      qcList.innerHTML = `
        <div class="qc-item pass">
          <span class="qc-badge pass">通过</span>
          <span>未发现明显逻辑冲突，但仍需评估师确认。</span>
        </div>
        <p class="qc-disclaimer">${DISCLAIMER}</p>
      `;
      return;
    }

    let html = triggered.map((r) => `
      <div class="qc-item ${riskToClass(r.risk_level)}">
        <div class="qc-item-header">
          <span class="qc-badge ${riskToClass(r.risk_level)}">
            ${riskToLabel(r.risk_level)}
          </span>
          <strong class="qc-item-title">${r.title}</strong>
          ${r.human_confirmation_required
            ? '<span class="qc-confirm-tag">需人工确认</span>' : ''}
        </div>
        <div class="qc-item-body">
          <div class="qc-row">
            <span class="qc-label">问题说明</span>
            <span>${r.message}</span>
          </div>
          <div class="qc-row">
            <span class="qc-label">触发原因</span>
            <span>${r.triggerReason}</span>
          </div>
          <div class="qc-row">
            <span class="qc-label">推理逻辑</span>
            <span>${r.logic}</span>
          </div>
          <div class="qc-row">
            <span class="qc-label">建议补问</span>
            <ul class="qc-sub-list">
              ${r.follow_up_questions.map(
                (q) => '<li>' + q + '</li>').join('')}
            </ul>
          </div>
          <div class="qc-row">
            <span class="qc-label">建议观察</span>
            <ul class="qc-sub-list">
              ${r.required_observations.map(
                (o) => '<li>' + o + '</li>').join('')}
            </ul>
          </div>
        </div>
      </div>
    `).join('');

    html += `<p class="qc-disclaimer">${DISCLAIMER}</p>`;
    qcList.innerHTML = html;
  }

  /**
   * 渲染补问建议汇总
   */
  function renderSuggestions(triggered) {
    if (triggered.length === 0) {
      sugList.innerHTML =
        '<li>当前数据未触发规则，建议评估师自行确认各项判定依据。</li>';
      return;
    }
    // 汇总所有补问（去重）
    const allQuestions = [];
    triggered.forEach((r) => {
      r.follow_up_questions.forEach((q) => {
        if (!allQuestions.includes(q)) allQuestions.push(q);
      });
    });
    sugList.innerHTML = allQuestions.map(
      (q) => '<li>' + q + '</li>').join('');
  }

  /**
   * 渲染结构化评估质控报告草案（10大板块）
   * 报告语言适合养老机构使用，不做最终判断
   */
  function renderReport(formData, triggered) {
    const now = new Date().toLocaleString('zh-CN');
    const highRisk = triggered.filter(
      (r) => r.risk_level === 'blocking' || r.risk_level === 'high');
    const allQuestions = [];
    const allObservations = [];
    triggered.forEach((r) => {
      r.follow_up_questions.forEach((q) => {
        if (!allQuestions.includes(q)) allQuestions.push(q);
      });
      r.required_observations.forEach((o) => {
        if (!allObservations.includes(o)) allObservations.push(o);
      });
    });

    const html = `
      <div class="report-page" id="reportPage">
        <!-- 报告头 -->
        <div class="rpt-header">
          <h2>思德库AI评估副驾 · 评估质控报告</h2>
          <p class="rpt-subtitle">（草案 · 需评估师确认后生效）</p>
          <p class="rpt-time">生成时间：${now}</p>
        </div>

        <!-- 1. 基本信息摘要 -->
        <section class="rpt-section">
          <h3 class="rpt-section-title">一、基本信息摘要</h3>
          <table class="rpt-table">
            <tr><td class="rpt-td-label">被评估人</td>
                <td>${formData.name}</td>
                <td class="rpt-td-label">年龄</td>
                <td>${formData.age}岁</td></tr>
            <tr><td class="rpt-td-label">评估类型</td>
                <td>${getTypeName(formData.evalType)}</td>
                <td class="rpt-td-label">评估师</td>
                <td>${formData.assessor || '未填写'}</td></tr>
            <tr><td class="rpt-td-label">认知评分(MMSE)</td>
                <td>${formData.cognitiveScore}/30</td>
                <td class="rpt-td-label">ADL评分(Barthel)</td>
                <td>${formData.adlScore}/100</td></tr>
            <tr><td class="rpt-td-label">移动方式</td>
                <td>${getLabelFor('mobilityMode', formData.mobilityMode) || '未选择'}</td>
                <td class="rpt-td-label">排泄控制</td>
                <td>${getLabelFor('continence', formData.continence) || '未选择'}</td></tr>
            <tr><td class="rpt-td-label">信息来源</td>
                <td>${getLabelFor('infoSource', formData.infoSource) || '未选择'}</td>
                <td class="rpt-td-label">评估耗时</td>
                <td>${formData.duration ? formData.duration + '分钟' : '未记录'}</td></tr>
          </table>
          ${formData.notes ? '<p class="rpt-notes">补充说明：' + formData.notes + '</p>' : ''}
        </section>

        <!-- 2. 评估师初步等级 -->
        <section class="rpt-section">
          <h3 class="rpt-section-title">二、评估师初步等级</h3>
          <div class="rpt-level-box">
            <span class="rpt-level-num">${formData.careLevel}</span>
            <span class="rpt-level-text">${getCareLevelName(formData.careLevel)}</span>
          </div>
          <p class="rpt-hint">以上为评估师录入的初步等级判定，以下质控分析供复核参考。</p>
        </section>

        <!-- 3. 本次触发的质控规则 -->
        <section class="rpt-section">
          <h3 class="rpt-section-title">三、本次触发的质控规则</h3>
          ${triggered.length === 0
            ? '<p class="rpt-pass">未发现明显逻辑冲突，但仍需评估师确认各项判定依据。</p>'
            : buildTriggeredTable(triggered)}
        </section>

        <!-- 4. 高风险问题 -->
        <section class="rpt-section">
          <h3 class="rpt-section-title">四、高风险问题（初步提示）</h3>
          ${highRisk.length === 0
            ? '<p class="rpt-pass">未发现高风险逻辑问题。</p>'
            : highRisk.map((r) => `
              <div class="rpt-risk-item">
                <span class="rpt-risk-badge">${riskToLabel(r.risk_level)}</span>
                <strong>${r.title}</strong>
                <p>${r.message}</p>
                <p class="rpt-hint">触发依据：${r.triggerReason}</p>
              </div>`).join('')}
        </section>

        <!-- 5. 需要补问的问题 -->
        <section class="rpt-section">
          <h3 class="rpt-section-title">五、建议补问清单</h3>
          ${allQuestions.length === 0
            ? '<p class="rpt-pass">无特定补问建议，请评估师自行确认。</p>'
            : '<ol class="rpt-list">' + allQuestions.map(
                (q) => '<li>' + q + '</li>').join('') + '</ol>'}
          <p class="rpt-hint">以上问题为质控引擎基于规则库生成，建议核实后决定是否采用。</p>
        </section>

        <!-- 6. 需要补充的现场观察 -->
        <section class="rpt-section">
          <h3 class="rpt-section-title">六、建议补充观察项目</h3>
          ${allObservations.length === 0
            ? '<p class="rpt-pass">无特定观察建议。</p>'
            : '<ol class="rpt-list">' + allObservations.map(
                (o) => '<li>' + o + '</li>').join('') + '</ol>'}
        </section>

        <!-- 7. 等级解释草案 -->
        <section class="rpt-section">
          <h3 class="rpt-section-title">七、等级解释草案（需评估师确认）</h3>
          <div class="rpt-draft-box">
            ${generateLevelExplanation(formData, triggered)}
          </div>
        </section>

        <!-- 8. 家属沟通说明草案 -->
        <section class="rpt-section">
          <h3 class="rpt-section-title">八、家属沟通说明草案（需评估师确认）</h3>
          <div class="rpt-draft-box">
            ${generateFamilyCommunication(formData, triggered)}
          </div>
        </section>

        <!-- 9. 照护计划草案 -->
        <section class="rpt-section">
          <h3 class="rpt-section-title">九、照护计划草案（需评估师确认）</h3>
          <div class="rpt-draft-box">
            ${generateCarePlan(formData)}
          </div>
        </section>

        <!-- 10. 评估师确认区 -->
        <section class="rpt-section rpt-confirm-section">
          <h3 class="rpt-section-title">十、评估师确认</h3>
          <div class="rpt-confirm-box">
            <div class="rpt-confirm-row">
              <span>评估师签名：</span>
              <span class="rpt-sign-line"></span>
            </div>
            <div class="rpt-confirm-row">
              <span>确认日期：</span>
              <span class="rpt-sign-line"></span>
            </div>
            <div class="rpt-confirm-row">
              <span>复核意见：</span>
              <span class="rpt-sign-line rpt-sign-long"></span>
            </div>
            <p class="rpt-confirm-note">
              本报告由思德库AI评估副驾V0.1基于规则库自动生成，
              所有结论均为初步提示，不替代评估师专业判断。
              经评估师确认签名后方可作为质控参考文件。
            </p>
          </div>
        </section>
      </div>
    `;
    reportContent.innerHTML = html;
  }

  /**
   * 构建触发规则汇总表格
   */
  function buildTriggeredTable(triggered) {
    let rows = triggered.map((r) => `
      <tr>
        <td><span class="rpt-risk-badge rpt-badge-${r.risk_level}">
          ${riskToLabel(r.risk_level)}</span></td>
        <td>${r.title}</td>
        <td>${r.message}</td>
        <td>${r.human_confirmation_required ? '是' : '否'}</td>
      </tr>`).join('');
    return `
      <table class="rpt-table rpt-table-full">
        <thead><tr>
          <th>风险</th><th>规则</th>
          <th>说明</th><th>需确认</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="rpt-hint">共触发 ${triggered.length} 条规则，
        其中阻断级 ${triggered.filter((r) => r.risk_level === 'blocking').length} 条，
        高风险 ${triggered.filter((r) => r.risk_level === 'high').length} 条。</p>`;
  }

  /**
   * 生成等级解释草案（基于数据自动拼接）
   */
  function generateLevelExplanation(d, triggered) {
    const levelName = getCareLevelName(d.careLevel);
    let text = `<p>根据本次评估，${d.name}初步评定为<strong>${levelName}（${d.careLevel}级）</strong>。</p>`;
    text += '<p>主要判定依据（初步提示）：</p><ul>';

    // 基于 ADL
    if (d.adlScore <= 20) {
      text += '<li>日常生活活动能力(ADL)评分较低（' + d.adlScore + '/100），提示日常活动大部分需要协助；</li>';
    } else if (d.adlScore <= 60) {
      text += '<li>日常生活活动能力(ADL)评分' + d.adlScore + '/100，提示部分活动需要协助；</li>';
    } else {
      text += '<li>日常生活活动能力(ADL)评分' + d.adlScore + '/100，提示基本生活活动能力尚可；</li>';
    }
    // 基于认知
    if (d.cognitiveScore <= 10) {
      text += '<li>认知功能评分较低（' + d.cognitiveScore + '/30），提示认知功能明显受损；</li>';
    } else if (d.cognitiveScore <= 20) {
      text += '<li>认知功能评分' + d.cognitiveScore + '/30，提示存在认知功能下降；</li>';
    } else {
      text += '<li>认知功能评分' + d.cognitiveScore + '/30，认知功能处于正常或轻度下降范围；</li>';
    }
    // 补充维度
    if (d.mobilityMode === 'wheelchair') {
      text += '<li>当前以轮椅为主要移动方式（建议核实移位能力）；</li>';
    }
    if (d.mobilityMode === 'bedridden') {
      text += '<li>当前为卧床状态；</li>';
    }
    text += '</ul>';

    if (triggered.length > 0) {
      text += '<p class="rpt-hint">注意：本次评估触发了' + triggered.length +
        '条质控规则，建议核实相关项目后确认最终等级。</p>';
    }
    text += '<p class="rpt-hint">以上为系统基于数据的初步提示，最终等级解释需评估师根据专业判断确认。</p>';
    return text;
  }

  /**
   * 生成家属沟通说明草案
   */
  function generateFamilyCommunication(d, triggered) {
    const levelName = getCareLevelName(d.careLevel);
    let text = '<p><strong>尊敬的家属：</strong></p>';
    text += `<p>经专业评估，${d.name}目前的综合能力初步评定为${levelName}。以下是本次评估的简要说明：</p>`;
    text += '<ul>';
    // 能力现状
    if (d.adlScore >= 60) {
      text += '<li>在日常基本生活活动方面，老人保留了较多的自理能力；</li>';
    } else if (d.adlScore >= 30) {
      text += '<li>在日常生活活动方面，老人部分活动需要协助，但仍保留一定自主能力；</li>';
    } else {
      text += '<li>在日常生活活动方面，老人目前较多活动需要协助；</li>';
    }
    // 照护建议方向
    if (d.careLevel >= 3) {
      text += '<li>建议提供系统性照护支持，重点关注安全保障和生活质量维护；</li>';
    } else if (d.careLevel >= 1) {
      text += '<li>建议在关键活动中提供适度协助，鼓励保持现有能力；</li>';
    } else {
      text += '<li>目前能力状况良好，建议定期评估以监测变化；</li>';
    }
    text += '</ul>';

    if (triggered.length > 0) {
      text += '<p>本次评估中发现若干需要进一步核实的项目，评估师将在确认后与您沟通具体情况。</p>';
    }
    text += '<p>如您对评估过程或结果有疑问，欢迎与评估师沟通。评估结果将在专业复核确认后正式生效。</p>';
    text += '<p class="rpt-hint">（以上为沟通草案，评估师可根据实际情况调整措辞。）</p>';
    return text;
  }

  /**
   * 生成照护计划草案
   */
  function generateCarePlan(d) {
    let text = '<p><strong>照护计划草案</strong>（基于评估数据生成，需评估师及照护团队确认）</p>';
    text += '<table class="rpt-table rpt-table-full"><thead><tr>';
    text += '<th>维度</th><th>现状初步提示</th><th>建议照护方向</th>';
    text += '</tr></thead><tbody>';

    // 移动
    const mobilityStatus = getMobilityStatus(d);
    text += '<tr><td>移动与转移</td><td>' + mobilityStatus.status +
      '</td><td>' + mobilityStatus.plan + '</td></tr>';
    // 认知
    const cogStatus = getCognitiveStatus(d);
    text += '<tr><td>认知与沟通</td><td>' + cogStatus.status +
      '</td><td>' + cogStatus.plan + '</td></tr>';
    // 进食
    const feedStatus = getFeedingPlan(d);
    text += '<tr><td>进食与营养</td><td>' + feedStatus.status +
      '</td><td>' + feedStatus.plan + '</td></tr>';
    // 排泄
    const contStatus = getContinencePlan(d);
    text += '<tr><td>排泄管理</td><td>' + contStatus.status +
      '</td><td>' + contStatus.plan + '</td></tr>';
    // 安全
    text += '<tr><td>安全防护</td><td>需评估师根据现场观察补充</td>';
    text += '<td>建议根据跌倒风险评估结果制定个性化防护措施</td></tr>';

    text += '</tbody></table>';
    text += '<p class="rpt-hint">以上为基于评估数据的初步建议方向，具体照护计划需结合老人个人意愿、家属意见及机构资源，由照护团队讨论确认。</p>';
    return text;
  }

  /* ========== 照护计划辅助函数 ========== */
  function getMobilityStatus(d) {
    const map = {
      independent: { status: '可独立行走', plan: '维持现有活动能力，关注环境安全' },
      cane: { status: '使用辅具行走', plan: '确保辅具适配，定期评估行走安全' },
      wheelchair: { status: '以轮椅为主要移动方式', plan: '关注移位训练，预防压疮，维持上肢活动' },
      bedridden: { status: '卧床状态', plan: '定时翻身，预防压疮，维持关节活动度' }
    };
    return map[d.mobilityMode] || { status: '未评估', plan: '建议补充移动能力评估' };
  }
  function getCognitiveStatus(d) {
    if (d.cognitiveScore <= 10) {
      return { status: '认知功能明显受损', plan: '简化沟通方式，提供结构化环境，关注安全' };
    } else if (d.cognitiveScore <= 20) {
      return { status: '认知功能下降', plan: '提供认知刺激活动，使用提示与引导策略' };
    }
    return { status: '认知功能尚可', plan: '鼓励社交参与，定期监测认知变化' };
  }
  function getFeedingPlan(d) {
    const map = {
      independent: { status: '可独立进食', plan: '监测营养摄入量，确保饮食均衡' },
      assisted: { status: '需辅助备餐', plan: '提供适宜餐具，食物预处理，监测进食安全' },
      partial: { status: '部分需要协助', plan: '协助困难食物，鼓励自主进食，监测呛咳风险' },
      dependent: { status: '需完全协助进食', plan: '控制进食速度，注意体位，监测吞咽安全' }
    };
    return map[d.feedingStatus] || { status: '未评估', plan: '建议补充进食能力评估' };
  }
  function getContinencePlan(d) {
    const map = {
      independent: { status: '可自主如厕', plan: '确保通道安全，夜间照明充足' },
      reminder: { status: '提醒下可控', plan: '制定定时如厕计划，记录排泄规律' },
      diaper: { status: '使用辅助用品', plan: '建议核实实际控制能力，尝试如厕训练' },
      incontinent: { status: '排泄控制困难', plan: '皮肤护理，定时更换，维护尊严' }
    };
    return map[d.continence] || { status: '未评估', plan: '建议补充排泄功能评估' };
  }

  /**
   * 获取照护等级中文名
   */
  function getCareLevelName(level) {
    const map = {
      0: '能力完好', 1: '轻度失能', 2: '中度失能',
      3: '重度失能', 4: '完全失能', 5: '特殊照护'
    };
    return map[level] || '未判定';
  }

  /* ========== 辅助：风险等级映射 ========== */
  function riskToClass(level) {
    const map = {
      blocking: 'error', high: 'error',
      medium: 'warning', low: 'pass'
    };
    return map[level] || 'pass';
  }
  function riskToLabel(level) {
    const map = {
      blocking: '阻断', high: '高风险',
      medium: '中风险', low: '低风险'
    };
    return map[level] || level;
  }
  function getTypeName(val) {
    const map = {
      ability: '老年人能力评估',
      ltc: '长护险评估',
      nursing: '护理等级评定'
    };
    return map[val] || '未选择';
  }

  /* ========== UI 工具 ========== */
  function setStep(n) {
    steps.forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i + 1 < n) el.classList.add('done');
      if (i + 1 === n) el.classList.add('active');
    });
  }
  function show(el) { el.classList.add('visible'); }
  function hide(el) { el.classList.remove('visible'); }

  /* ==========================================================
   * 事件绑定
   * ========================================================== */
  btnRun.addEventListener('click', async function () {
    // 表单基础校验
    if (!form.reportValidity()) return;

    const formData = getFormData();

    // 隐藏旧结果，显示加载
    hide(qcPanel); hide(sugPanel); hide(reportPanel);
    loadingEl.classList.add('visible');
    setStep(2);

    try {
      // 执行规则引擎
      const triggered = await executeEngine(formData);

      // 模拟分析延迟（增强用户感知）
      await new Promise((r) => setTimeout(r, 1200));

      loadingEl.classList.remove('visible');

      // 渲染结果
      renderQCResults(triggered);
      renderSuggestions(triggered);
      renderReport(formData, triggered);

      show(qcPanel); show(sugPanel); show(reportPanel);
      setStep(3);
    } catch (err) {
      loadingEl.classList.remove('visible');
      qcList.innerHTML = `
        <div class="qc-item error">
          <span class="qc-badge error">错误</span>
          <span>规则库加载失败：${err.message}</span>
        </div>`;
      show(qcPanel);
    }
  });

  // 重置按钮
  btnReset.addEventListener('click', function () {
    form.reset();
    hide(qcPanel); hide(sugPanel); hide(reportPanel);
    setStep(1);
  });

  // 从最近评估导入
  btnImport.addEventListener('click', function () {
    const raw = localStorage.getItem('ssidc_last_assessment');
    if (!raw) {
      alert('未找到最近的评估记录。\n请先在"老年人能力评估系统"中完成一次评估。');
      return;
    }
    try {
      const data = JSON.parse(raw);
      const dims = data.dimensions || {};
      // ADL 维度得分转换为 Barthel 近似值（原始满分30，Barthel满分100）
      const adlRaw = dims['日常生活活动'] || 0;
      // assess-system 的 ADL 分数越高=越依赖，Barthel 反向（越高=越独立）
      const adlBarthel = Math.max(0, Math.round((1 - adlRaw / 30) * 100));
      // 精神状态维度分数转换为 MMSE 近似（原始满分17，MMSE满分30）
      const mentalRaw = dims['精神状态'] || 0;
      const mmseApprox = Math.max(0, Math.round((1 - mentalRaw / 17) * 30));

      // 填充表单
      document.getElementById('evalType').value = 'ability';
      document.getElementById('cognitiveScore').value = mmseApprox;
      document.getElementById('adlScore').value = adlBarthel;
      document.getElementById('careLevel').value = data.level || 0;

      // 语言表达推断（感知觉与沟通维度）
      const commRaw = dims['感知觉与沟通'] || 0;
      if (commRaw >= 8) {
        document.getElementById('speechStatus').value = 'aphasia';
      } else if (commRaw >= 4) {
        document.getElementById('speechStatus').value = 'slow';
      } else {
        document.getElementById('speechStatus').value = 'normal';
      }

      // 备注中写入导入信息
      const time = new Date(data.timestamp).toLocaleString('zh-CN');
      const noteEl = document.getElementById('notes');
      noteEl.value = '【自动导入】来源：综合能力评估（' + time + '）\n' +
        '原始总分：' + data.totalScore + '，等级：' + data.levelText + '\n' +
        '各维度：' + Object.entries(dims).map(
          ([k, v]) => k + ':' + v + '分').join('、');

      alert('已导入最近一次评估数据（' + time + '）\n' +
        '等级：' + data.levelText + '\n\n' +
        '请补充姓名、年龄、评估师等信息后运行质控。');
    } catch (e) {
      alert('评估数据解析失败：' + e.message);
    }
  });

  // 打印
  btnPrint.addEventListener('click', function () {
    window.print();
  });

  // 导出文本（从 HTML 报告提取纯文本）
  btnExport.addEventListener('click', function () {
    const reportEl = document.getElementById('reportPage');
    const text = reportEl ? reportEl.innerText : reportContent.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '质控报告_' +
      new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  });

})();
