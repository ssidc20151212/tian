# 站内链接完整性报告

> 审计时间：2026-06-23
> 审计范围：根目录 + terminal-v2/ 目录全部 HTML 文件

## 结论

**所有站内相对链接均指向真实存在的文件，无断链（404）。**

---

## 详细链接清单

### index.html（首页）

| 链接文字 | href | 目标文件存在 | 备注 |
|---------|------|:----------:|------|
| 专业评估 | #assess | ✅ | 页内锚点 |
| 认知症照护 | #dementia | ✅ | 页内锚点 |
| 照护管理 | #management | ✅ | 页内锚点 |
| 网络学苑 | #academy | ✅ | 页内锚点 |
| 价格 | terminal-v2/06-pricing.html | ✅ | |
| 联系我们 | terminal-v2/08-contact.html | ✅ | |
| 老年人能力评估系统 | assess-system.html | ✅ | |
| Morse跌倒风险 | assess-morse.html | ✅ | |
| Braden压疮风险 | assess-braden.html | ✅ | |
| MNA营养筛查 | assess-mna.html | ✅ | |
| MMSE认知筛查 | assess-mmse.html | ✅ | |
| GDS抑郁量表 | assess-gds.html | ✅ | |
| 疼痛评估 | assess-pain.html | ✅ | |
| 吞咽筛查 | assess-swallow.html | ✅ | |
| 约束必要性评估 | assess-restraint.html | ✅ | |
| 排泄功能评估 | assess-incontinence.html | ✅ | |
| CDR认知分期 | dementia-cdr.html | ✅ | |
| ADL日常追踪 | dementia-adl.html | ✅ | |
| BPSD行为日志 | dementia-bpsd-log.html | ✅ | |
| BPSD应对方案 | dementia-bpsd-plan.html | ✅ | |
| 非药物干预 | dementia-activity.html | ✅ | |
| 认知训练 | dementia-cognitive-train.html | ✅ | |
| 环境自查 | dementia-environment.html | ✅ | |
| 走失防控 | dementia-wandering.html | ✅ | |
| 家属沟通 | dementia-family-comm.html | ✅ | |
| 家属教育 | dementia-family-edu.html | ✅ | |
| 专项培训 | dementia-training.html | ✅ | |
| 质量看板 | dementia-quality.html | ✅ | |
| 照护计划 | care-plan.html | ✅ | |
| 护理记录 | nursing-record.html | ✅ | |
| 机构自查 | self-check.html | ✅ | |
| 网络学苑 | academy.html | ✅ | |
| 护理员课程 | courses.html | ✅ | |
| 评估师课程 | courses-assess.html | ✅ | |
| 冲突十问 | courses-conflict.html | ✅ | |
| 养老服务师 | courses-elderly-service.html | ✅ | |
| 成长教练 | coach.html | ✅ | |
| 伙伴机构 | terminal-v2/07-partner.html | ✅ | |
| 了解合作方案 | terminal-v2/08-contact.html | ✅ | |

### academy.html（网络学苑）

| 链接文字 | href | 目标文件存在 | 备注 |
|---------|------|:----------:|------|
| ← 返回首页 | index.html | ✅ | |
| 养老服务师职业课程 | courses-elderly-service.html | ✅ | |
| 长期照护师职业技能培训 | courses-ltc.html | ✅ | |
| 老年人能力评估师职业课程 | courses-assess.html | ✅ | |
| 养老护理员职业课程 | courses.html | ✅ | |

### courses-ltc.html（长期照护师课程）

| 链接文字 | href | 目标文件存在 | 备注 |
|---------|------|:----------:|------|
| ← 返回网络学苑 | academy.html | ✅ | |
| 导航-专业评估 | index.html#assess | ✅ | |
| 导航-价格 | terminal-v2/06-pricing.html | ✅ | |
| 导航-联系我们 | terminal-v2/08-contact.html | ✅ | |

### 课程页面（courses.html / courses-assess.html / courses-elderly-service.html / courses-conflict.html）

所有导航链接和返回链接均指向 index.html，文件存在。✅

### 评估工具页面（assess-* 系列，10个文件）

所有页面 footer-btn 链接指向 index.html。✅

### 认知症工具页面（dementia-* 系列，12个文件）

所有页面 footer-btn 链接指向 index.html。✅

### 管理工具页面（care-plan / nursing-record / self-check / coach）

所有页面 footer-btn 链接指向 terminal-v2/08-contact.html。文件存在。✅

---

## 需关注项（非断链）

| 来源页面 | 问题 | 建议 |
|---------|------|------|
| assessment.html | 返回按钮指向 terminal-v2/08-contact.html，与同系列 assess-* 不一致 | 改为 index.html |
| care-plan.html / nursing-record.html / self-check.html | 返回按钮指向 terminal-v2/08-contact.html 而非首页 | 视产品逻辑决定是否统一 |
| cognitive-care.html | 无返回链接、无 page-footer | 补充返回链接 |
| index_副本.html | 孤立文件，无任何页面链接到它 | 可清理 |
| terminal-v2/01~05-*.html | 孤立文件，首页未链接 | 属于终端专用页面，暂保留 |

---

## academy.html 404 问题说明

`academy.html` 文件确认存在于仓库中，已随 commit `f61dcb3` 推送至 `origin/main`。此前线上 404 的原因是该文件尚未推送到远程仓库。当前已修复。
