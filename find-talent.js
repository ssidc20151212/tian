// 可信专业力量 - 独立搜索页
const REGIONS = { beijing:'北京市', shanghai:'上海市', guangzhou:'广州市', shenzhen:'深圳市', chengdu:'成都市', hangzhou:'杭州市' };
const LEVELS = { senior:'高级评估师', mid:'中级评估师', junior:'初级评估师' };
const SKILL_MAP = { cognitive:'认知症评估', disability:'失能评估', daily:'日常生活评估', mental:'精神状态评估', social:'社会参与评估' };
const TASK_OPTS = [
    ['routine_assess','常规老年人能力评估'], ['complex_case','复杂案例评估'],
    ['result_review','评估结果复核'], ['dispute','评估争议处理'],
    ['family_comm','家属沟通与结果解释'], ['quality_ctrl','评估质量控制'],
    ['training','评估师培训与督导'], ['proj_mgmt','评估项目组织管理'],
    ['data_report','评估数据分析与报告']
];

const talentData = [
    { name:'王美华', region:'beijing', level:'senior', skills:['cognitive','disability'], score:4.9, count:1280, years:8, badge:'金牌评估师', isTrainer:true },
    { name:'李建国', region:'shanghai', level:'mid', skills:['daily','mental'], score:4.7, count:856, years:5, badge:'', isTrainer:false },
    { name:'张秀芬', region:'guangzhou', level:'senior', skills:['social','cognitive'], score:4.8, count:1056, years:6, badge:'金牌评估师', isTrainer:true },
    { name:'赵丽萍', region:'shenzhen', level:'mid', skills:['disability','daily'], score:4.6, count:620, years:4, badge:'', isTrainer:false },
    { name:'陈志强', region:'chengdu', level:'senior', skills:['mental','social'], score:4.8, count:980, years:7, badge:'金牌评估师', isTrainer:true },
    { name:'刘晓燕', region:'hangzhou', level:'junior', skills:['daily','disability'], score:4.5, count:320, years:2, badge:'', isTrainer:false }
];

// 初始化下拉选项
function initFilters() {
    const regEl = document.getElementById('searchRegion');
    Object.entries(REGIONS).forEach(([k,v]) => regEl.innerHTML += `<option value="${k}">${v}</option>`);
    const lvlEl = document.getElementById('searchLevel');
    Object.entries(LEVELS).forEach(([k,v]) => lvlEl.innerHTML += `<option value="${k}">${v}</option>`);
    const skillEl = document.getElementById('searchSkill');
    TASK_OPTS.forEach(([k,v]) => skillEl.innerHTML += `<option value="${k}">${v}</option>`);
}

function doSearch() {
    const keyword = document.getElementById('searchInput').value.trim();
    const region = document.getElementById('searchRegion').value;
    const level = document.getElementById('searchLevel').value;
    const skill = document.getElementById('searchSkill').value;

    const results = talentData.filter(t => {
        if (keyword && !t.name.includes(keyword)) return false;
        if (region && t.region !== region) return false;
        if (level && t.level !== level) return false;
        if (skill && !(t.skills || []).includes(skill) && !(t.tasks || []).includes(skill)) return false;
        return true;
    });

    const container = document.getElementById('searchResults');
    if (results.length === 0) {
        container.innerHTML = '<p class="empty">未找到符合条件的评估师，请调整筛选条件</p>';
        return;
    }
    container.innerHTML = results.map(t => `
        <div class="talent-card">
            <div class="card-header">
                <div class="avatar">${t.name[0]}</div>
                <div class="info">
                    <h3>${t.name}</h3>
                    <div class="subtitle">${LEVELS[t.level]} · ${REGIONS[t.region]}</div>
                </div>
            </div>
            <div class="tags">
                ${t.badge ? `<span class="tag gold">${t.badge}</span>` : ''}
                ${t.isTrainer ? `<span class="tag" style="background:#f0e6ff;color:#8e44ad;">讲师</span>` : ''}
                ${t.skills.map(s => `<span class="tag">${SKILL_MAP[s] || s}</span>`).join('')}
            </div>
            <div class="metrics">
                <div class="metric"><div class="val">${t.score}</div><div class="lbl">评分</div></div>
                <div class="metric"><div class="val">${t.count.toLocaleString()}</div><div class="lbl">评估次数</div></div>
                <div class="metric"><div class="val">${t.years}年</div><div class="lbl">从业年限</div></div>
            </div>
            <div class="card-actions">
                <button class="btn-primary" onclick="requireLogin('${t.name}','profile')">查看完整画像</button>
                <button class="btn-accent" onclick="requireLogin('${t.name}','invite')">邀请合作</button>
            </div>
        </div>
    `).join('');
}

// 需要登录才能操作
function requireLogin(name, action) {
    const saved = localStorage.getItem('sdk_current_user');
    if (saved) {
        // 已登录，跳转到人才平台
        if (action === 'invite') {
            localStorage.setItem('sdk_pending_invite', name);
            location.href = 'talent-platform.html#talent-dispatch';
        } else {
            localStorage.setItem('sdk_view_profile', name);
            location.href = 'talent-platform.html';
        }
        return;
    }
    if (action === 'invite') localStorage.setItem('sdk_pending_invite', name);
    else localStorage.setItem('sdk_view_profile', name);
    location.href = 'login.html?role=org';
}

document.getElementById('year').textContent = new Date().getFullYear();
initFilters();
doSearch();
