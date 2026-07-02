/* ================================================================
 * CareProof AI · login.js — 角色登录路由分发
 * DEMO AUTH ONLY — NOT FOR PRODUCTION
 * 账号验证由 data-model.js 的 CP.login() 完成，登录后按角色跳转
 * ================================================================ */
(function () {
  'use strict';

  // URL 参数：?role=xxx 预选角色（支持旧参数别名）
  var ROLE_ALIAS = {
    talent: 'talent', assessor: 'talent',
    institution: 'institution', org: 'institution',
    admin: 'admin'
  };
  var params = new URLSearchParams(location.search);
  var preRole = ROLE_ALIAS[params.get('role')] || 'talent';

  // 默认账号提示
  var DEFAULT_USER = {
    talent: 'talent1',
    institution: 'org1',
    admin: 'admin'
  };

  // 若已登录，直接分发（避免重复登录）
  var existing = CP.currentUser();
  if (existing) {
    routeByRole(existing.role);
    return;
  }

  function selectRole(role) {
    var tabs = document.querySelectorAll('.role-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].dataset.role === role);
    }
    var userInput = document.getElementById('loginUser');
    if (userInput && !userInput.value) userInput.value = DEFAULT_USER[role] || '';
    if (userInput) userInput.focus();
  }
  window.selectRole = selectRole;

  // 初始化 tab 选择
  selectRole(preRole === 'admin' ? 'talent' : preRole);
  // admin 通过 URL ?role=admin 进入时，预填用户名但保持人才tab
  if (preRole === 'admin') {
    document.getElementById('loginUser').value = 'admin';
  }

  function doLogin() {
    var username = document.getElementById('loginUser').value.trim();
    var password = document.getElementById('loginPass').value;
    var errEl = document.getElementById('err');
    errEl.textContent = '';

    if (!username || !password) {
      errEl.textContent = '请输入账号和密码';
      return;
    }
    var user = CP.login(username, password);
    if (!user) {
      errEl.textContent = '账号或密码错误';
      return;
    }
    routeByRole(user.role);
  }
  window.doLogin = doLogin;

  function routeByRole(role) {
    // 优先处理 pending action
    var pending = localStorage.getItem(CP_STORAGE.PENDING_ACTION);
    if (pending) {
      try {
        var p = JSON.parse(pending);
        localStorage.removeItem(CP_STORAGE.PENDING_ACTION);
        if (p.redirect) { CP.safeReplace(p.redirect); return; }
      } catch (e) {}
    }
    if (role === 'talent') CP.safeReplace('talent-workspace.html');
    else if (role === 'institution') CP.safeReplace('institution-workspace.html');
    else if (role === 'admin') CP.safeReplace('admin-console.html');
    else CP.safeReplace('capability-platform.html');
  }

  // 回车登录
  document.getElementById('loginPass').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('loginUser').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
  });
})();
