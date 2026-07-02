// 思德库登录逻辑
const ACCOUNTS = {
    assessor: { pass: '123456', role: 'assessor', name: '张评估' },
    org: { pass: '123456', role: 'org', name: '示例养老院' },
    admin: { pass: '123456', role: 'admin', name: '平台管理员' }
};

// URL 参数：?role=xxx 预选角色
const params = new URLSearchParams(location.search);
const preRole = params.get('role');

function selectRole(role) {
    document.querySelectorAll('.role-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.role === role);
    });
    document.getElementById('loginUser').value = role;
    document.getElementById('loginUser').focus();
}

// 初始化：默认选中 preRole 或 assessor
selectRole(preRole && ACCOUNTS[preRole] ? preRole : 'assessor');

function doLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const errEl = document.getElementById('err');
    errEl.textContent = '';

    if (!ACCOUNTS[user] || ACCOUNTS[user].pass !== pass) {
        errEl.textContent = '账号或密码错误';
        return;
    }
    const currentUser = { username: user, ...ACCOUNTS[user] };
    localStorage.setItem('sdk_current_user', JSON.stringify(currentUser));

    // 检查是否有待处理的邀请
    const pendingInvite = localStorage.getItem('sdk_pending_invite');
    if (pendingInvite && currentUser.role === 'org') {
        // 跳到发布任务页面并带上邀请信息
        location.href = 'talent-platform.html#talent-dispatch';
        return;
    }

    // 按角色分流
    if (currentUser.role === 'assessor') {
        // 评估师：进入能力账户
        location.href = 'talent-platform.html#talent-entry';
    } else if (currentUser.role === 'org') {
        // 机构：进入机构信息
        location.href = 'talent-platform.html#org-info';
    } else {
        // 管理员：进入数据总览
        location.href = 'talent-platform.html#stats';
    }
}

// 回车登录
document.getElementById('loginPass').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doLogin();
});
document.getElementById('loginUser').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
});
