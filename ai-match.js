/* ================================================================
 * CareProof AI · ai-match.js — AI 匹配算法
 * 五维加权：领域(30) · 证据(25) · 案例经验(20) · 交付(15) · 可用性(10)
 * ================================================================ */
(function (global) {
  'use strict';

  // 问题分类 → 能力领域 映射
  var CATEGORY_TO_DOMAIN = {
    training: ['training'],
    dispute: ['dispute', 'complex_case'],
    quality_review: ['quality_ctrl', 'assessment'],
    process: ['system_build', 'quality_ctrl'],
    standard: ['system_build'],
    dementia: ['dementia', 'complex_case'],
    care_plan: ['care_plan', 'assessment'],
    other: ['assessment']
  };

  function scoreDomain(talent, need) {
    var needDomains = CATEGORY_TO_DOMAIN[need.category] || ['assessment'];
    var talentDomains = talent.domains || [];
    var hits = needDomains.filter(function (d) { return talentDomains.indexOf(d) >= 0; });
    if (hits.length === 0) return 5;
    var scores = talent.scores || {};
    var avg = hits.reduce(function (s, d) { return s + (scores[d] || 0); }, 0) / hits.length;
    return Math.min(30, (avg / 100) * 30);
  }

  function scoreEvidence(talent, need) {
    var evidences = CP.load(CP_STORAGE.EVIDENCES)
      .filter(function (e) { return e.talentId === talent.id; });
    if (!evidences.length) return 3;
    var needDomains = CATEGORY_TO_DOMAIN[need.category] || [];
    var relevant = evidences.filter(function (e) { return needDomains.indexOf(e.domain) >= 0; });
    var verified = relevant.filter(function (e) {
      return e.verifyStatus === 'verified' || e.verifyStatus === 'institution_confirmed';
    }).length;
    var raw = verified * 6 + (relevant.length - verified) * 3;
    return Math.min(25, raw);
  }

  function scoreCase(talent, need) {
    var years = talent.years || 0;
    var levelBonus = talent.level === 'senior' ? 8 : (talent.level === 'mid' ? 5 : 2);
    return Math.min(20, years * 1.5 + levelBonus);
  }

  function scoreDelivery(talent, need) {
    var base = 10;
    if (need.region && talent.region === need.region) base += 5;
    return Math.min(15, base);
  }

  function scoreAvailability(talent, need) {
    return need.urgency === 'urgent' ? 6 : 9;
  }

  function matchOne(talent, need) {
    var b = {
      domain: scoreDomain(talent, need),
      evidence: scoreEvidence(talent, need),
      caseExp: scoreCase(talent, need),
      delivery: scoreDelivery(talent, need),
      avail: scoreAvailability(talent, need)
    };
    var total = b.domain + b.evidence + b.caseExp + b.delivery + b.avail;
    return {
      talentId: talent.id,
      score: Math.round(total),
      breakdown: {
        domain: Math.round(b.domain),
        evidence: Math.round(b.evidence),
        caseExp: Math.round(b.caseExp),
        delivery: Math.round(b.delivery),
        avail: Math.round(b.avail)
      }
    };
  }

  function matchNeed(need) {
    var talents = CP.load(CP_STORAGE.TALENTS);
    var results = talents.map(function (t) { return matchOne(t, need); })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 5);
    return results;
  }

  // rank() 返回带 talent 对象的结果，供 match-result 页使用
  function rank(need, talents, evidences, limit) {
    var ts = talents || CP.load(CP_STORAGE.TALENTS);
    var n = limit || 5;
    var results = ts.map(function (t) {
      var r = matchOne(t, need);
      r.talent = t;
      return r;
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, n);
    return results;
  }

  global.CP_MATCH = {
    matchNeed: matchNeed,
    matchOne: matchOne,
    rank: rank,
    CATEGORY_TO_DOMAIN: CATEGORY_TO_DOMAIN
  };
})(window);
