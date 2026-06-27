# v0.1 基础审计 · 修改清单与风险说明

> 审计时间：2026-06-23

---

## 一、本次已完成的修改

### 1. 品牌名称统一

| 文件 | 修改内容 |
|------|---------|
| index.html | `<title>` 改为"思德库养老机构能力支持平台" |
| index.html | footer 副标题改为"养老机构能力支持平台" |
| academy.html | `<title>` 中"专业化建设终端"→"养老机构能力支持平台" |
| academy.html | page-header .brand 文字统一 |
| academy.html | page-footer 文字统一 |
| courses-ltc.html | page-footer 文字统一 |

### 2. 免责声明统一

以下文件的 disclaimer 已统一为：
> "本平台提供养老服务场景中的专业评估、观察与照护支持，不替代医学诊断、临床决策及依法应由持证专业人员完成的工作。最终判断应由相应专业人员结合实际情况确认。"

| 文件 |
|------|
| index.html |
| terminal-v2/01-home.html |
| terminal-v2/02-activity.html |
| terminal-v2/03-cognitive.html |
| terminal-v2/04-bpsd.html |
| terminal-v2/05-courses.html |
| terminal-v2/06-pricing.html |
| terminal-v2/07-partner.html |
| terminal-v2/08-contact.html |

### 3. 页脚年份动态化

| 文件 | 修改内容 |
|------|---------|
| index.html | "© 2024" → `© <script>document.write(new Date().getFullYear())</script>` |

### 4. 导航栏样式统一

| 文件 | 修改内容 |
|------|---------|
| academy.html | 新增 site-nav CSS 样式定义 |
| courses-ltc.html | 新增 site-nav CSS 样式定义 |
| courses.html | 新增 site-nav CSS 样式定义 |
| courses-assess.html | 新增 site-nav CSS 样式定义 |
| courses-elderly-service.html | 新增 site-nav CSS 样式定义 |

### 5. 报告文件生成

| 文件 | 说明 |
|------|------|
| broken-links-report.md | 站内链接完整性报告 |
| SITE-MAP.md | 全站页面地图（含功能、用户、模块分类） |

---

## 二、未修改项（需用户确认后操作）

| 编号 | 文件 | 问题 | 建议 | 风险等级 |
|:----:|------|------|------|:-------:|
| A1 | assessment.html | 返回按钮指向 terminal-v2/08-contact.html，与同系列 assess-* 不一致 | 改为 index.html | 低 |
| A2 | care-plan.html / nursing-record.html / self-check.html | 返回按钮指向 terminal-v2/08-contact.html | 视产品逻辑决定——这 3 个管理工具页可能是原本设计为从终端进入的，返回联系页有其逻辑 | 低 |
| A3 | cognitive-care.html | 无 page-footer、无返回链接 | 补充返回首页链接和 footer | 低 |
| A4 | courses-ltc.html | 返回链接指向 academy.html（其余课程页返回 index.html） | 保持现状——该页确实从 academy 进入，逻辑合理 | 无风险 |
| A5 | coach.html | disclaimer 为"思德库成长教练 \| 养老能力支持终端"，与其他页不同 | 改为统一免责声明 | 低 |
| A6 | courses-*.html (4个) | page-footer 为课程用途说明而非统一免责 | 可在现有内容后追加免责声明 | 低 |
| A7 | index_副本.html | 孤立备份文件 | 从仓库移除 | 无风险 |
| A8 | terminal-v2/01~05 | 首页未链接这 5 个终端页面 | 属于终端专用入口，暂保留 | 无风险 |
| A9 | assess-* / dementia-* 系列（22个文件） | 页脚只有品牌署名"思德库养老能力支持终端"，无完整免责声明 | 统一追加免责声明 | 低 |

---

## 三、风险说明

### 零风险操作（已执行）
- 品牌名称文字替换：仅修改展示文本，不影响功能
- 免责声明替换：仅修改展示文本
- 年份动态化：`document.write()` 是同步执行，不影响页面渲染
- 导航栏 CSS：纯样式新增，不影响现有功能

### 不触碰的内容（本次审计承诺）
- ❌ 不修改任何量表评分逻辑（assess-* 系列）
- ❌ 不修改任何 localStorage 数据结构（dementia-* 系列）
- ❌ 不删除任何文件
- ❌ 不修改页面主要内容和视觉设计
- ❌ 不修改已有的 JavaScript 交互逻辑

### 潜在注意事项
1. **terminal-v2/08-contact.html 的工作时间信息被免责声明替换**——如需保留工作时间，可在免责声明前追加回来
2. **terminal-v2/05-courses.html 的"课程持续更新"提示被替换**——如需保留，可追加回来
3. **22 个 assess-*/dementia-* 页面尚未更新免责声明**——待确认后批量处理

---

## 四、下一步建议

1. 确认上述"未修改项"中 A1~A9 的处理意见
2. 批量更新 22 个工具页面的免责声明（确认后可一次完成）
3. 部署并验证线上页面
