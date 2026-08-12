(function(){
'use strict';
const app=document.getElementById('app');
const API=(window.OPS_API_BASE||'').replace(/\/$/,'');
const vague=/^(持续跟进|继续跟进|继续沟通|加强宣传|继续联系|保持联系|后续关注|再联系)$/;
let state={token:sessionStorage.getItem('ops_token')||'',me:null,view:'today',cache:{}};

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=n=>{const x=Number(n||0);return x?'¥'+x.toLocaleString('zh-CN'):'—'};
const fmtDate=s=>s?String(s).slice(0,10):'—';
const today=()=>new Date().toISOString().slice(0,10);

async function api(path,opt={}){
  if(!API) throw new Error('尚未配置共享API地址。请先在 ops/config.js 中填写 Cloudflare Worker 地址。');
  const headers=Object.assign({'Content-Type':'application/json'},opt.headers||{});
  if(state.token) headers.Authorization='Bearer '+state.token;
  const r=await fetch(API+path,Object.assign({},opt,{headers}));
  const data=await r.json().catch(()=>({}));
  if(r.status===401){sessionStorage.removeItem('ops_token');state.token='';state.me=null;renderLogin();throw new Error(data.error||'登录已失效');}
  if(!r.ok) throw new Error(data.error||('请求失败 '+r.status));
  return data;
}

function renderLogin(msg=''){
  app.innerHTML=`<div class="login-page"><div class="login-card">
    <div class="brand">思德<span>库</span></div><h1>经营作战台</h1>
    <p>内部使用：今天找谁、做什么、什么时候完成、有没有形成结果。</p>
    <form id="loginForm"><div class="field"><label>账号</label><input id="loginUser" autocomplete="username" required></div>
    <div class="field"><label>密码</label><input id="loginPass" type="password" autocomplete="current-password" required></div>
    <button class="btn btn-primary full">登录</button><div class="error" id="loginMsg">${esc(msg)}</div></form>
    <p style="margin-top:18px">员工只看到被分配给自己的工作；总库、批量导出和全员数据仅管理员可见。</p>
  </div></div>`;
  document.getElementById('loginForm').onsubmit=async e=>{
    e.preventDefault();const m=document.getElementById('loginMsg');m.textContent='登录中…';
    try{const d=await api('/api/login',{method:'POST',body:JSON.stringify({username:loginUser.value.trim(),password:loginPass.value})});state.token=d.token;sessionStorage.setItem('ops_token',d.token);state.me=d.user;state.view='today';renderShell();}
    catch(err){m.textContent=err.message;}
  };
}

async function boot(){
  if(!state.token){renderLogin();return;}
  try{const d=await api('/api/me');state.me=d.user;renderShell();}catch(e){renderLogin(e.message);}
}

function navItems(){
  if(state.me.role==='admin') return [['dashboard','经营驾驶舱'],['today','今日作战'],['work','全部机会'],['recycle','回收站'],['assign','分配中心'],['import','导入总库']];
  return [['today','今天做什么'],['work','我的工作池'],['radar','机会雷达'],['results','我的成果'],['recycle','我的回收站']];
}
function renderShell(){
  const items=navItems();
  app.innerHTML=`<div class="shell"><header class="topbar"><div class="top-left"><div class="top-title">思德库经营作战台</div><nav class="nav">${items.map(([k,l])=>`<button data-view="${k}" class="${state.view===k?'active':''}">${l}</button>`).join('')}</nav></div><div class="top-user"><span>${esc(state.me.display_name)} · ${roleName(state.me.role)}</span><button class="btn btn-ghost btn-sm" id="logoutBtn">退出</button></div></header><main id="main" class="wrap"></main></div>`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;renderShell();});
  document.getElementById('logoutBtn').onclick=()=>{sessionStorage.removeItem('ops_token');state.token='';state.me=null;renderLogin();};
  renderView();
}
function roleName(r){return r==='admin'?'管理员':r==='sales'?'招生运营':'人才/伙伴运营';}
async function renderView(){
  const m=document.getElementById('main');m.innerHTML='<div class="empty">加载中…</div>';
  try{
    if(state.view==='today') return renderToday(await api('/api/today'));
    if(state.view==='work') return renderWork(await api('/api/work'));
    if(state.view==='radar') return renderRadar(await api('/api/radar'));
    if(state.view==='results') return renderResults(await api('/api/results?range=week'));
    if(state.view==='recycle') return renderRecycleBin(await api('/api/recycle-bin'));
    if(state.view==='dashboard') return renderDashboard(await api('/api/admin/dashboard'));
    if(state.view==='assign') return renderAssign(await api('/api/admin/assign-summary'));
    if(state.view==='import') return renderImport();
  }catch(e){m.innerHTML=`<div class="card"><div class="card-body"><div class="error">${esc(e.message)}</div></div></div>`;}
}

function pageHead(title,sub,right=''){return `<div class="page-head"><div><h2>${title}</h2><p>${sub}</p></div><div class="date-note">${right||today()}</div></div>`;}
function kpi(v,l,cls=''){return `<div class="kpi ${cls}"><div class="v">${v}</div><div class="l">${l}</div></div>`;}
function priorityBadge(p){return `<span class="badge ${esc(p||'C')}">${esc(p||'C')}</span>`;}
function lineName(x){return ({sales:'招生',talent:'人才',partner:'伙伴',institution:'机构'})[x]||x||'未分类';}
function stageName(x){return ({new:'新机会',contacted:'已联系',qualified:'明确需求',proposal:'已发方案/报名',payment_pending:'待付款',won:'已成交/完成',lost:'未成交',paused:'暂缓'})[x]||x||'未设置';}
function stageBadge(x){const cls=x==='won'?'C':(x==='lost'||x==='paused'?'paused':'B');return `<span class="badge ${cls}">${esc(stageName(x))}</span>`;}

function renderToday(d){
  const list=d.items||[];document.getElementById('main').innerHTML=pageHead('今天做什么','只处理今天到期、已逾期和A级未排期事项。')+
    `<div class="kpis">${kpi(d.metrics?.due||0,'今天/逾期')}${kpi(d.metrics?.a||0,'A级机会','orange')}${kpi(d.metrics?.active||0,'我的活跃机会')}${kpi(money(d.metrics?.expected||0),'预计金额','green')}${kpi(d.metrics?.new_today||0,'今日新补给','purple')}</div>`+
    `<div class="card"><div class="card-head"><h3>必须处理</h3><span class="muted">每次联系后必须更新“下一动作 + 日期”</span></div><div class="table-wrap">${workTable(list,true)}</div></div>`;
  bindEditButtons();
}
function workTable(list,compact=false){
  if(!list.length)return '<div class="empty">当前没有待办。请到“机会雷达”领取/查看今日新机会。</div>';
  return `<table class="table"><thead><tr><th>#</th><th>对象</th><th>业务</th><th>等级</th><th>阶段</th><th>当前需求</th><th>${compact?'今天做什么':'下一步动作'}</th><th>日期</th><th>预计金额</th><th></th></tr></thead><tbody>${list.map((x,index)=>{
    const cls=x.stage==='won'||x.stage==='lost'||x.stage==='paused'?'':(x.next_date<today()?'overdue':x.next_date===today()?'today':'');
    return `<tr><td class="nowrap">#${index+1}</td><td><b>${esc(x.contact_name||x.customer_name)}</b><div class="note">${esc(x.org_name||'')} ${x.region?'· '+esc(x.region):''}</div></td><td>${lineName(x.business_line)}</td><td>${priorityBadge(x.priority)}</td><td>${stageBadge(x.stage)}</td><td>${esc(x.need||'—')}</td><td><div class="action-text">${esc(x.next_action||'尚未设置')}</div><div class="note">${esc(x.last_note||'')}</div></td><td class="${cls}">${fmtDate(x.next_date)}</td><td>${money(x.expected_amount)}</td><td><button class="btn btn-ghost btn-sm edit-op" data-id="${esc(x.id)}">更新</button></td></tr>`;
  }).join('')}</tbody></table>`;
}

function renderWork(d){
  const list=d.items||[];document.getElementById('main').innerHTML=pageHead(state.me.role==='admin'?'全部机会':'我的工作池','招生、人才、伙伴、机构统一用一套“机会”管理。')+
    `<div class="card"><div class="card-head"><div class="filters"><button class="active">全部 ${list.length}</button></div><button class="btn btn-orange btn-sm" id="newOpBtn">+ 新增机会</button></div><div class="table-wrap">${workTable(list)}</div></div>`;
  document.getElementById('newOpBtn').onclick=()=>openEdit(null);bindEditButtons();
}
function bindEditButtons(){document.querySelectorAll('.edit-op').forEach(b=>b.onclick=()=>openEdit(b.dataset.id));}

async function openEdit(id){
  let x={business_line:state.me.role==='ops'?'talent':'sales',priority:'B',stage:'new',next_date:today(),owner_id:state.me.id};
  if(id){try{x=(await api('/api/opportunities/'+encodeURIComponent(id))).item;}catch(e){alert(e.message);return;}}
  const ownerField=state.me.role==='admin'?`<div class="field"><label>负责人</label><select id="f_owner">${(state.cache.users||[]).map(u=>`<option value="${u.id}" ${String(x.owner_id)===String(u.id)?'selected':''}>${esc(u.display_name)}</option>`).join('')}</select></div>`:'';
  if(state.me.role==='admin'&&!state.cache.users){try{state.cache.users=(await api('/api/admin/users')).items||[];return openEdit(id);}catch(e){alert(e.message);return;}}
  const mask=document.createElement('div');mask.className='modal-mask';mask.innerHTML=`<div class="modal"><div class="modal-head"><h3>${id?'更新机会':'新增机会'}</h3><button class="btn btn-ghost btn-sm" id="closeM">关闭</button></div><div class="modal-body"><div class="form-grid">
    <div class="field"><label>对象姓名/机构 *</label><input id="f_name" value="${esc(x.contact_name||x.customer_name||'')}" ${id?'disabled':''}></div>
    <div class="field"><label>业务线</label><select id="f_line">${opts({sales:'招生',talent:'人才',partner:'伙伴',institution:'机构'},x.business_line)}</select></div>
    <div class="field"><label>等级</label><select id="f_pri">${opts({A:'A｜30天内可能产生结果',B:'B｜有明确需求',C:'C｜长期培育',paused:'暂停'},x.priority)}</select></div>
    <div class="field"><label>阶段</label><select id="f_stage">${opts({new:'新机会',contacted:'已联系',qualified:'明确需求',proposal:'已发方案/报名',payment_pending:'待付款',won:'已成交/完成',lost:'未成交',paused:'暂缓'},x.stage)}</select></div>
    <div class="field span2"><label>当前需求</label><input id="f_need" value="${esc(x.need||'')}" placeholder="例：9月二级评估师报名 / 区域招生合作 / 评估质量改进"></div>
    <div class="field"><label>意向产品</label><input id="f_product" value="${esc(x.product||'')}"></div>
    <div class="field"><label>预计金额</label><input id="f_amount" type="number" min="0" value="${esc(x.expected_amount||'')}"></div>
    ${ownerField}
    <div class="field"><label>下次日期 *</label><input id="f_date" type="date" value="${esc(x.next_date||today())}"></div>
    <div class="field span2"><label>下一步动作 *</label><input id="f_action" value="${esc(x.next_action||'')}" placeholder="必须具体：确认2-3名名单和材料 / 约20分钟需求访谈"></div>
    <div class="field span2"><label>本次沟通结果</label><textarea id="f_note">${esc(x.last_note||'')}</textarea></div>
    <div class="field span2 ai-box"><div class="ai-title-row"><div><label>AI商业线索升级器</label><div class="note">粘贴最新微信/电话纪要，让AI判断真实需求、隐藏机会和下一步。</div></div><span class="ai-chip">销售能力加持</span></div><textarea id="ai_context" placeholder="粘贴客户最新回复或电话纪要。例：我们单位还有两个人也想考，但不知道三级能不能报，我的工作证明还没准备好……"></textarea><div class="ai-actions"><button type="button" class="btn btn-orange btn-sm" id="runAI">AI判断这条线索</button><span id="aiStatus" class="note"></span></div><div id="aiResult"></div></div>
  </div><div class="error" id="formErr"></div></div><div class="modal-foot">${id?'<button class="btn btn-danger" id="deleteM">移入回收站</button>':''}<button class="btn btn-ghost" id="cancelM">取消</button><button class="btn btn-primary" id="saveM">保存</button></div></div>`;
  document.body.appendChild(mask);const close=()=>mask.remove();closeM.onclick=close;cancelM.onclick=close;
  const deleteM=mask.querySelector('#deleteM');
  if(deleteM)deleteM.onclick=async()=>{
    if(!window.confirm(`确定将“${x.contact_name||x.customer_name||'这条机会'}”移入回收站吗？之后可在回收站恢复。`))return;
    deleteM.disabled=true;deleteM.textContent='移入回收站...';formErr.textContent='';
    try{await api('/api/opportunities/'+encodeURIComponent(id),{method:'DELETE'});close();renderView();}
    catch(e){deleteM.disabled=false;deleteM.textContent='移入回收站';formErr.textContent=e.message;}
  };
  let lastAI=null;
  runAI.onclick=async()=>{
    const text=ai_context.value.trim();if(!text){aiStatus.textContent='请先粘贴客户最新对话/电话纪要';return;}
    aiStatus.textContent='AI正在判断：真实需求、隐藏机会、下一步…';aiResult.innerHTML='';
    const snapshot={contact_name:f_name.value.trim(),business_line:f_line.value,priority:f_pri.value,stage:f_stage.value,need:f_need.value.trim(),product:f_product.value.trim(),last_note:f_note.value.trim()};
    try{
      const r=await api('/api/ai/lead-analyze',{method:'POST',body:JSON.stringify({opportunity_id:id||null,conversation:text,snapshot})});
      lastAI=r.analysis;aiStatus.textContent=(r.mode==='openai'?'AI智能判断':'规则备用判断')+' · '+(r.model||'');renderAIResult(lastAI,r.mode);
    }catch(e){aiStatus.textContent='判断失败：'+e.message;}
  };
  function renderAIResult(a,mode){
    const hidden=(a.hidden_opportunities||[]).map(h=>`<li><b>${lineName(h.type)}</b>：${esc(h.signal)}<div class="note">${esc(h.why_it_matters)}</div></li>`).join('')||'<li>暂未发现额外隐藏机会</li>';
    const qs=(a.questions_to_ask||[]).map(q=>`<li>${esc(q)}</li>`).join('');
    const no=(a.do_not_do||[]).map(q=>`<li>${esc(q)}</li>`).join('');
    aiResult.innerHTML=`<div class="ai-result"><div class="ai-summary"><div>${priorityBadge(a.priority)} <b>${lineName(a.primary_business_line)}</b> <span class="note">置信度 ${esc(a.confidence)}%</span></div><div class="ai-need">${esc(a.real_need)}</div></div><div class="ai-grid"><div><h5>隐藏机会</h5><ul>${hidden}</ul></div><div><h5>关键阻碍</h5><ul>${(a.blockers||[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>暂无明显阻碍</li>'}</ul></div><div><h5>下一步</h5><p class="action-text">${esc(a.next_action)}</p><div class="note">建议日期：${esc(a.next_date)}</div></div><div><h5>只问这3个问题</h5><ul>${qs||'<li>暂无</li>'}</ul></div><div><h5>不要这样做</h5><ul>${no||'<li>暂无</li>'}</ul></div><div><h5>AI教你怎么说</h5><div class="message-draft">${esc(a.message_draft)}</div></div></div><div class="coach-note">${esc(a.coach_note||'')}</div><div class="ai-result-actions"><button type="button" class="btn btn-primary btn-sm" id="applyAI">采用AI建议</button><button type="button" class="btn btn-ghost btn-sm" id="copyAI">复制建议微信</button></div></div>`;
    applyAI.onclick=()=>{f_line.value=a.primary_business_line;f_pri.value=a.priority;f_stage.value=a.lead_stage;f_need.value=a.real_need;f_product.value=(a.product_suggestions||[]).join(' / ');f_action.value=a.next_action;f_date.value=a.next_date;aiStatus.textContent='已把AI建议填入表单；请人工确认后保存。';};
    copyAI.onclick=async()=>{try{await navigator.clipboard.writeText(a.message_draft||'');aiStatus.textContent='建议微信已复制';}catch(e){aiStatus.textContent='复制失败，请手动复制';}};
  }
  let saving=false;
  saveM.onclick=async()=>{
    const action=f_action.value.trim();const terminal=['won','lost','paused'].includes(f_stage.value);if(!f_name.value.trim()&&!id){formErr.textContent='请填写对象名称';return;}if(!action||vague.test(action)){formErr.textContent='下一步动作必须具体，不能写“持续跟进/继续沟通”。';return;}if(!f_date.value&&!terminal){formErr.textContent='请设置下一次联系日期';return;}
    if(saving)return;saving=true;saveM.disabled=true;saveM.textContent='保存中...';formErr.textContent='';
    const payload={contact_name:f_name.value.trim(),business_line:f_line.value,priority:f_pri.value,stage:f_stage.value,need:f_need.value.trim(),product:f_product.value.trim(),expected_amount:Number(f_amount.value||0),next_action:action,next_date:f_date.value,last_note:f_note.value.trim()};
    if(state.me.role==='admin'&&document.getElementById('f_owner'))payload.owner_id=Number(f_owner.value);
    try{if(id)await api('/api/opportunities/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(payload)});else await api('/api/opportunities',{method:'POST',body:JSON.stringify(payload)});close();renderView();}catch(e){saving=false;saveM.disabled=false;saveM.textContent='保存';formErr.textContent=e.message;}
  };
}
function opts(map,val){return Object.entries(map).map(([k,v])=>`<option value="${k}" ${k===val?'selected':''}>${v}</option>`).join('');}

function renderRadar(d){
  const items=d.items||[];document.getElementById('main').innerHTML=pageHead('机会雷达','总库不开放；系统每天只给你一小批新的可经营对象。',`今日配额 ${d.quota||0}`)+
  `<div class="radar-banner">今天的新机会已经自动进入你的工作池。完成后，第二天系统再补充新的对象；你看不到历史总库。</div><div class="radar-grid">${items.length?items.map(x=>`<div class="radar-item"><div>${priorityBadge(x.priority)} <span class="badge B">${lineName(x.business_line)}</span></div><h4>${esc(x.contact_name)}</h4><div class="reason">${esc(x.radar_reason||'系统按你的岗位规则从总库中小批量分配。')}</div><div class="action-text" style="margin-top:10px">今天：${esc(x.next_action||'完成首次激活并判断需求')}</div><button class="btn btn-primary btn-sm edit-op" data-id="${esc(x.id)}" style="margin-top:12px">开始处理</button></div>`).join(''):'<div class="empty">今天没有新的雷达机会。</div>'}</div>`;bindEditButtons();
}

function renderResults(d){
  const m=d.metrics||{};document.getElementById('main').innerHTML=pageHead('我的成果','只看真实经营产出，不把发朋友圈、做海报当成交。','本周')+
  `<div class="kpis">${resultKpi(m.touched||0,'完成触达','touched')}${resultKpi(m.qualified||0,'明确需求','qualified')}${resultKpi(m.a||0,'A级机会','a','orange')}${resultKpi(m.won||0,'成交/完成','won','green')}${resultKpi(money(m.revenue||0),'已形成金额','revenue','purple')}</div>`+
  `<div class="card hidden" id="resultDetail"></div>`+
  `<div class="card"><div class="card-head"><h3>本周贡献</h3></div><div class="card-body"><p>新增人才：<b>${m.talent||0}</b>　新增伙伴：<b>${m.partner||0}</b>　机构机会：<b>${m.institution||0}</b>　转出机会：<b>${m.transferred||0}</b></p><p class="muted">平台记录好，就不需要再另写重复的招生周报。</p></div></div>`;
  document.querySelectorAll('.result-kpi').forEach(b=>b.onclick=()=>showResultDetails(b.dataset.metric,b.dataset.label));
}

function resultKpi(v,l,metric,cls=''){
  return `<button type="button" class="kpi kpi-button result-kpi ${cls}" data-metric="${esc(metric)}" data-label="${esc(l)}"><div class="v">${v}</div><div class="l">${esc(l)}</div></button>`;
}

async function showResultDetails(metric,label){
  const box=document.getElementById('resultDetail');if(!box)return;
  box.classList.remove('hidden');box.innerHTML=`<div class="card-head"><h3>${esc(label)}明细</h3><button class="btn btn-ghost btn-sm" id="closeResultDetail">收起</button></div><div class="card-body"><div class="empty">加载中…</div></div>`;
  document.getElementById('closeResultDetail').onclick=()=>box.classList.add('hidden');
  try{
    const d=await api('/api/results?range=week&metric='+encodeURIComponent(metric));
    box.innerHTML=`<div class="card-head"><h3>${esc(label)}明细</h3><button class="btn btn-ghost btn-sm" id="closeResultDetail">收起</button></div><div class="table-wrap">${workTable(d.items||[])}</div>`;
    document.getElementById('closeResultDetail').onclick=()=>box.classList.add('hidden');
    bindEditButtons();
  }catch(e){
    box.innerHTML=`<div class="card-head"><h3>${esc(label)}明细</h3><button class="btn btn-ghost btn-sm" id="closeResultDetail">收起</button></div><div class="card-body"><div class="error">${esc(e.message)}</div></div>`;
    document.getElementById('closeResultDetail').onclick=()=>box.classList.add('hidden');
  }
}

function renderRecycleBin(d){
  const list=d.items||[];
  document.getElementById('main').innerHTML=pageHead(state.me.role==='admin'?'回收站':'我的回收站','移入回收站的机会可恢复到原负责人和原阶段。')+
    `<div class="card"><div class="card-head"><div><h3>已移入回收站 ${list.length}</h3><span class="muted">回收站内的记录不会计入工作池或成果统计。</span></div></div><div class="table-wrap">${recycleTable(list)}</div></div>`;
  document.querySelectorAll('.restore-op').forEach(b=>b.onclick=()=>restoreFromRecycleBin(b.dataset.id,b.dataset.name));
}

function recycleTable(list){
  if(!list.length)return '<div class="empty">回收站目前为空。</div>';
  return `<table class="table"><thead><tr><th>#</th><th>对象</th><th>业务</th><th>等级</th><th>原阶段</th><th>原负责人</th><th>移入时间</th><th></th></tr></thead><tbody>${list.map((x,index)=>`<tr><td class="nowrap">#${index+1}</td><td><b>${esc(x.contact_name||x.customer_name)}</b><div class="note">${esc(x.org_name||'')} ${x.region?'· '+esc(x.region):''}</div></td><td>${lineName(x.business_line)}</td><td>${priorityBadge(x.priority)}</td><td>${stageBadge(x.stage)}</td><td>${esc(x.owner_id||'—')}</td><td>${fmtDate(x.deleted_at)}</td><td><button class="btn btn-primary btn-sm restore-op" data-id="${esc(x.id)}" data-name="${esc(x.contact_name||x.customer_name||'这条机会')}">恢复</button></td></tr>`).join('')}</tbody></table>`;
}

async function restoreFromRecycleBin(id,name){
  if(!window.confirm(`确定恢复“${name}”吗？它会回到原来的工作池。`))return;
  try{
    await api('/api/recycle-bin/'+encodeURIComponent(id)+'/restore',{method:'POST'});
    renderView();
  }catch(e){
    alert(e.message);
  }
}

function renderDashboard(d){
  const m=d.metrics||{},teams=d.team||[];document.getElementById('main').innerHTML=pageHead('经营驾驶舱','看结果、看卡点、补给任务；不靠反复开会推动。')+
    `<div class="kpis">${kpi(m.active||0,'活跃机会')}${kpi(m.a||0,'A级机会','orange')}${kpi(m.due||0,'今日/逾期')}${kpi(money(m.expected||0),'30天机会金额','green')}${kpi(money(m.won_amount||0),'本周成交金额','purple')}</div>`+
    `<div class="card"><div class="card-head"><h3>团队经营结果</h3></div><div class="card-body"><div class="team-grid">${teams.map(t=>`<div class="team-card"><div class="team-name"><h4>${esc(t.display_name)}</h4><span class="badge B">${roleName(t.role)}</span></div><div class="team-metrics"><div><b>${t.active||0}</b><span>活跃</span></div><div><b>${t.a||0}</b><span>A级</span></div><div><b>${t.due||0}</b><span>逾期/今日</span></div><div><b>${t.won||0}</b><span>本周成果</span></div></div><div class="note">工作池：${t.active||0}；${t.active<8?'建议补给新机会':'当前数量正常'}</div></div>`).join('')}</div></div></div>`+
    `<div class="card"><div class="card-head"><h3>系统提醒</h3></div><div class="card-body">${(d.alerts||[]).map(a=>`<p>• ${esc(a)}</p>`).join('')||'<p class="muted">暂无异常提醒。</p>'}</div></div>`;
}

function renderAssign(d){
  const users=d.users||[];document.getElementById('main').innerHTML=pageHead('分配中心','不开放总库给员工；管理员按岗位小批量补给。')+
    `<div class="card"><div class="card-head"><h3>一键补给</h3></div><div class="card-body"><div class="team-grid">${users.map(u=>`<div class="team-card"><div class="team-name"><h4>${esc(u.display_name)}</h4><span class="badge B">${roleName(u.role)}</span></div><p class="muted">当前活跃工作：${u.active||0} 条｜每日自动雷达：${u.daily_quota||0} 条</p><div class="filters"><button class="btn btn-primary btn-sm supply-btn" data-id="${u.id}" data-count="5">补给5条</button><button class="btn btn-ghost btn-sm supply-btn" data-id="${u.id}" data-count="10">补给10条</button></div></div>`).join('')}</div><div id="assignMsg"></div></div></div>`;
  document.querySelectorAll('.supply-btn').forEach(b=>b.onclick=async()=>{assignMsg.textContent='分配中…';try{const r=await api('/api/admin/supply',{method:'POST',body:JSON.stringify({owner_id:Number(b.dataset.id),count:Number(b.dataset.count)})});assignMsg.className='success';assignMsg.textContent='已补给 '+r.assigned+' 条。';setTimeout(renderView,700);}catch(e){assignMsg.className='error';assignMsg.textContent=e.message;}});
}

function renderImport(){
  document.getElementById('main').innerHTML=pageHead('导入总库','只有管理员可导入。员工不会看到总库，只会得到小批量工作。')+
  `<div class="card"><div class="card-head"><h3>CSV 导入</h3></div><div class="card-body"><div class="import-box"><input type="file" id="csvFile" accept=".csv,text/csv"><p>最小字段：name, phone, region, track, source, tags。track 可填 sales / talent / partner / institution / unknown。</p><button class="btn btn-primary btn-sm" id="importBtn">上传并导入</button><div id="importMsg"></div></div></div></div>`;
  importBtn.onclick=async()=>{const f=csvFile.files[0];if(!f){importMsg.className='error';importMsg.textContent='请选择CSV文件';return;}importMsg.className='';importMsg.textContent='读取中…';try{const text=await f.text();const rows=parseCSV(text);const r=await api('/api/admin/import',{method:'POST',body:JSON.stringify({rows})});importMsg.className='success';importMsg.textContent=`成功 ${r.inserted}，更新 ${r.updated}，跳过 ${r.skipped}`;}catch(e){importMsg.className='error';importMsg.textContent=e.message;}};
}
function parseCSV(text){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(lines.length<2)return[];
  const split=line=>{let a=[],s='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){s+='"';i++;}else q=!q;}else if(c===','&&!q){a.push(s);s='';}else s+=c;}a.push(s);return a.map(x=>x.trim());};
  const h=split(lines[0]).map(x=>x.toLowerCase());return lines.slice(1).map(line=>{const v=split(line),o={};h.forEach((k,i)=>o[k]=v[i]||'');return o;});
}

boot();
})();
