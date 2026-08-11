(function () {
  "use strict";

  const API = (window.OPS_API_BASE || "").replace(/\/$/, "");
  const TOKEN_KEY = "ops_token";

  const ACTIVE_STAGES = [
    "new",
    "contacted",
    "qualified",
    "proposal",
    "payment_pending"
  ];

  const TERMINAL_STAGES = [
    "won",
    "lost",
    "paused"
  ];

  function esc(v) {
    return String(v ?? "").replace(/[&<>'"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[c]));
  }

  function money(v) {
    const n = Number(v || 0);
    return n
      ? "¥" + n.toLocaleString("zh-CN")
      : "—";
  }

  function cnDate(value) {
    if (!value) return "";

    try {
      const d = new Date(value);

      const parts = new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }
      ).formatToParts(d);

      const o = Object.fromEntries(
        parts.map(x => [x.type, x.value])
      );

      return `${o.year}-${o.month}-${o.day}`;
    } catch {
      return String(value).slice(0, 10);
    }
  }

  function todayCN() {
    return cnDate(new Date());
  }

  function roleFromToken() {
    const token = sessionStorage.getItem(TOKEN_KEY);

    if (!token) return "";

    try {
      const payload = token.split(".")[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const json = decodeURIComponent(
        Array.prototype.map.call(
          atob(
            payload +
            "=".repeat(
              (4 - payload.length % 4) % 4
            )
          ),
          c =>
            "%" +
            ("00" + c.charCodeAt(0).toString(16))
              .slice(-2)
        ).join("")
      );

      return JSON.parse(json).role || "";
    } catch {
      return "";
    }
  }

  async function api(path) {
    const token = sessionStorage.getItem(TOKEN_KEY);

    if (!API || !token) {
      throw new Error("尚未登录");
    }

    const r = await fetch(
      API + path,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        }
      }
    );

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      throw new Error(
        data.error || "请求失败"
      );
    }

    return data;
  }

  function stageName(v) {
    return ({
      new: "新机会",
      contacted: "已联系",
      qualified: "明确需求",
      proposal: "已发方案",
      payment_pending: "待付款",
      won: "已成交",
      lost: "未成交",
      paused: "暂停"
    })[v] || v || "—";
  }

  function lineName(v) {
    return ({
      sales: "招生",
      talent: "人才",
      partner: "伙伴",
      institution: "机构"
    })[v] || v || "—";
  }

  function isActive(x) {
    return ACTIVE_STAGES.includes(x.stage);
  }

  function isClosedToday(x, today) {
    if (cnDate(x.updated_at) !== today) {
      return false;
    }

    const hasResult =
      String(x.last_note || "").trim().length > 0;

    if (!hasResult) {
      return false;
    }

    if (TERMINAL_STAGES.includes(x.stage)) {
      return true;
    }

    return (
      String(x.next_action || "").trim().length > 0 &&
      String(x.next_date || "").trim().length > 0
    );
  }

  function needsAdmin(x, today) {
    if (!isActive(x)) {
      return false;
    }

    const nextDate =
      String(x.next_date || "").slice(0, 10);

    const overdue =
      nextDate &&
      nextDate < today;

    const noAction =
      !String(x.next_action || "").trim();

    const noDate =
      !nextDate;

    if (
      x.priority === "A" &&
      (
        overdue ||
        noAction ||
        noDate
      )
    ) {
      return true;
    }

    if (
      x.stage === "payment_pending" &&
      (
        overdue ||
        nextDate === today
      )
    ) {
      return true;
    }

    if (
      ["institution", "partner"]
        .includes(x.business_line) &&
      Number(x.expected_amount || 0) >= 5000 &&
      overdue
    ) {
      return true;
    }

    return false;
  }

  function injectStyles() {
    if (
      document.getElementById(
        "adminClosureStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "adminClosureStyles";

    style.textContent = `
      .closure-note {
        margin: -12px 0 22px;
        padding: 12px 16px;
        border-radius: 10px;
        background: #f6f8fb;
        color: #667085;
        font-size: 13px;
      }

      .closure-team-wrap {
        margin: 22px 0;
      }

      .closure-section-title {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin: 0 0 12px;
      }

      .closure-section-title h3 {
        margin:0;
        font-size:18px;
        color:#172033;
      }

      .closure-section-title span {
        color:#8a94a6;
        font-size:13px;
      }

      .closure-team-grid {
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(230px,1fr));
        gap:14px;
      }

      .closure-team-card {
        background:#fff;
        border:1px solid #e8edf3;
        border-radius:14px;
        padding:18px;
        box-shadow:
          0 6px 20px rgba(20,35,60,.05);
      }

      .closure-team-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:15px;
      }

      .closure-team-head strong {
        font-size:17px;
        color:#172033;
      }

      .closure-role {
        padding:4px 8px;
        border-radius:8px;
        background:#f1f5f9;
        color:#667085;
        font-size:12px;
      }

      .closure-mini-grid {
        display:grid;
        grid-template-columns:
          repeat(5,1fr);
        gap:7px;
      }

      .closure-mini {
        text-align:center;
        background:#f8fafc;
        border-radius:9px;
        padding:8px 3px;
      }

      .closure-mini b {
        display:block;
        font-size:18px;
        color:#203b5d;
        line-height:1.2;
      }

      .closure-mini span {
        display:block;
        margin-top:4px;
        font-size:11px;
        color:#8a94a6;
      }

      .closure-mini.warn b {
        color:#ef8b3c;
      }

      .closure-mini.good b {
        color:#27966f;
      }

      .closure-mini.purple b {
        color:#8556b5;
      }

      .closure-result-card {
        background:#fff;
        border:1px solid #e8edf3;
        border-radius:14px;
        margin:22px 0;
        overflow:hidden;
        box-shadow:
          0 6px 20px rgba(20,35,60,.04);
      }

      .closure-result-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:16px 20px;
        border-bottom:1px solid #eef1f5;
      }

      .closure-result-head h3 {
        margin:0;
        font-size:17px;
      }

      .closure-result-head span {
        font-size:13px;
        color:#8a94a6;
      }

      .closure-result-table {
        width:100%;
        border-collapse:collapse;
      }

      .closure-result-table th,
      .closure-result-table td {
        padding:12px 14px;
        border-bottom:1px solid #eef1f5;
        text-align:left;
        vertical-align:top;
        font-size:13px;
      }

      .closure-result-table th {
        color:#667085;
        background:#fafbfc;
        font-weight:600;
      }

      .closure-result-table td {
        color:#344054;
      }

      .closure-result {
        color:#172033;
        font-weight:600;
        line-height:1.55;
      }

      .closure-next {
        color:#667085;
        margin-top:4px;
      }

      .closure-chip {
        display:inline-block;
        padding:3px 7px;
        border-radius:7px;
        background:#eef4fa;
        color:#315374;
        font-size:12px;
        margin-right:4px;
      }

      .closure-intervene {
        display:inline-block;
        padding:3px 7px;
        border-radius:7px;
        background:#fff1e8;
        color:#d96d24;
        font-size:12px;
      }

      .closure-empty {
        padding:25px;
        text-align:center;
        color:#98a2b3;
      }

      .closure-owner {
        white-space:nowrap;
        font-weight:600;
        color:#315374;
      }

      @media(max-width:900px) {
        .closure-mini-grid {
          grid-template-columns:
            repeat(3,1fr);
        }

        .closure-result-card {
          overflow-x:auto;
        }

        .closure-result-table {
          min-width:850px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ownerMap(users) {
    const map = {};

    users.forEach(u => {
      map[String(u.id)] =
        u.display_name;
    });

    return map;
  }

  function roleName(v) {
    return ({
      admin: "管理员",
      sales: "招生运营",
      ops: "人才/伙伴运营"
    })[v] || v;
  }

  function buildTeamCards(
    users,
    work,
    dueItems,
    completed,
    intervene,
    today
  ) {
    return users.map(u => {
      const id =
        String(u.id);

      const myWork =
        work.filter(
          x =>
            String(x.owner_id || "") === id
        );

      const myActive =
        myWork.filter(isActive);

      const myDue =
        dueItems.filter(
          x =>
            String(x.owner_id || "") === id
        );

      const myDone =
        completed.filter(
          x =>
            String(x.owner_id || "") === id
        );

      const myA =
        myActive.filter(
          x =>
            x.priority === "A"
        );

      const myWon =
        myWork.filter(
          x =>
            x.stage === "won" &&
            cnDate(x.won_at || x.updated_at) === today
        );

      const myIntervene =
        intervene.filter(
          x =>
            String(x.owner_id || "") === id
        );

      return `
        <div class="closure-team-card">

          <div class="closure-team-head">
            <strong>${esc(u.display_name)}</strong>
            <span class="closure-role">
              ${esc(roleName(u.role))}
            </span>
          </div>

          <div class="closure-mini-grid">

            <div class="closure-mini warn">
              <b>${myDue.length}</b>
              <span>待处理</span>
            </div>

            <div class="closure-mini good">
              <b>${myDone.length}</b>
              <span>今日完成</span>
            </div>

            <div class="closure-mini">
              <b>${myA.length}</b>
              <span>A级</span>
            </div>

            <div class="closure-mini good">
              <b>${myWon.length}</b>
              <span>成交</span>
            </div>

            <div class="closure-mini purple">
              <b>${myIntervene.length}</b>
              <span>需介入</span>
            </div>

          </div>

        </div>
      `;
    }).join("");
  }

  function buildCompletedTable(
    completed,
    usersById,
    today
  ) {
    if (!completed.length) {
      return `
        <div class="closure-empty">
          今天还没有形成完整经营结果。
          员工更新“沟通结果 + 下一动作 + 日期”后，
          会自动出现在这里。
        </div>
      `;
    }

    const rows =
      completed
        .slice()
        .sort(
          (a, b) =>
            String(b.updated_at || "")
              .localeCompare(
                String(a.updated_at || "")
              )
        )
        .slice(0, 30)
        .map(x => {
          const owner =
            usersById[
              String(x.owner_id || "")
            ] || "未分配";

          const wonToday =
            x.stage === "won" &&
            cnDate(
              x.won_at || x.updated_at
            ) === today;

          return `
            <tr>

              <td class="closure-owner">
                ${esc(owner)}
              </td>

              <td>
                <b>${esc(x.contact_name || "—")}</b>
                ${
                  x.org_name
                    ? `<div style="color:#98a2b3;margin-top:3px;">
                         ${esc(x.org_name)}
                       </div>`
                    : ""
                }
              </td>

              <td>
                <span class="closure-chip">
                  ${esc(lineName(x.business_line))}
                </span>

                <span class="closure-chip">
                  ${esc(x.priority || "—")}
                </span>

                <span class="closure-chip">
                  ${esc(stageName(x.stage))}
                </span>
              </td>

              <td>
                <div class="closure-result">
                  ${esc(x.last_note || "—")}
                </div>

                ${
                  x.next_action
                    ? `
                      <div class="closure-next">
                        下一步：
                        ${esc(x.next_action)}
                        ${
                          x.next_date
                            ? ` · ${esc(
                                String(x.next_date)
                                  .slice(0,10)
                              )}`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
              </td>

              <td>
                ${
                  wonToday
                    ? `<b style="color:#27966f">
                         ${money(x.expected_amount)}
                       </b>`
                    : "—"
                }
              </td>

            </tr>
          `;
        })
        .join("");

    return `
      <div style="overflow-x:auto">
        <table class="closure-result-table">

          <thead>
            <tr>
              <th>负责人</th>
              <th>对象</th>
              <th>结果状态</th>
              <th>本次结果 / 下一步</th>
              <th>形成金额</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>

        </table>
      </div>
    `;
  }

  function addOwnerColumn(
    dueItems,
    usersById
  ) {
    const table =
      document.querySelector(
        "#main .table"
      );

    if (!table) return;

    if (
      table.dataset.ownerAdded === "1"
    ) {
      return;
    }

    table.dataset.ownerAdded = "1";

    const idMap = {};

    dueItems.forEach(x => {
      idMap[String(x.id)] = x;
    });

    const headRow =
      table.querySelector(
        "thead tr"
      );

    if (headRow) {
      const th =
        document.createElement("th");

      th.textContent =
        "负责人";

      if (
        headRow.children.length > 1
      ) {
        headRow.insertBefore(
          th,
          headRow.children[1]
        );
      }
    }

    table
      .querySelectorAll("tbody tr")
      .forEach(row => {

        const btn =
          row.querySelector(
            ".edit-op[data-id]"
          );

        if (!btn) return;

        const item =
          idMap[
            String(btn.dataset.id)
          ];

        const td =
          document.createElement("td");

        td.className =
          "closure-owner";

        td.textContent =
          item
            ? (
                usersById[
                  String(
                    item.owner_id || ""
                  )
                ] ||
                "未分配"
              )
            : "—";

        if (
          row.children.length > 1
        ) {
          row.insertBefore(
            td,
            row.children[1]
          );
        }
      });
  }

  async function enhanceToday() {
    const main =
      document.getElementById("main");

    if (!main) return;

    if (
      main.dataset.closureApplied === "1"
    ) {
      return;
    }

    const activeNav =
      document.querySelector(
        ".nav button.active"
      );

    if (
      !activeNav ||
      activeNav.dataset.view !== "today"
    ) {
      return;
    }

    if (
      roleFromToken() !== "admin"
    ) {
      return;
    }

    main.dataset.closureApplied = "1";

    try {
      const [
        todayData,
        workData,
        usersData
      ] = await Promise.all([
        api("/api/today"),
        api("/api/work"),
        api("/api/admin/users")
      ]);

      const today =
        todayCN();

      const work =
        workData.items || [];

      const dueItems =
        todayData.items || [];

      const users =
        usersData.items || [];

      const usersById =
        ownerMap(users);

      const completed =
        work.filter(
          x =>
            isClosedToday(
              x,
              today
            )
        );

      const active =
        work.filter(isActive);

      const currentA =
        active.filter(
          x =>
            x.priority === "A"
        );

      const wonToday =
        work.filter(
          x =>
            x.stage === "won" &&
            cnDate(
              x.won_at || x.updated_at
            ) === today
        );

      const wonAmount =
        wonToday.reduce(
          (sum, x) =>
            sum +
            Number(
              x.expected_amount || 0
            ),
          0
        );

      const intervene =
        work.filter(
          x =>
            needsAdmin(
              x,
              today
            )
        );

      injectStyles();

      const kpis =
        main.querySelector(
          ".kpis"
        );

      if (kpis) {
        kpis.innerHTML = `

          <div class="kpi">
            <div class="v">
              ${dueItems.length}
            </div>
            <div class="l">
              今天该做
            </div>
          </div>

          <div class="kpi green">
            <div class="v">
              ${completed.length}
            </div>
            <div class="l">
              今日已完成
            </div>
          </div>

          <div class="kpi orange">
            <div class="v">
              ${currentA.length}
            </div>
            <div class="l">
              当前A级
            </div>
          </div>

          <div class="kpi green">
            <div class="v">
              ${money(wonAmount)}
            </div>
            <div class="l">
              今日形成金额
            </div>
          </div>

          <div class="kpi purple">
            <div class="v">
              ${intervene.length}
            </div>
            <div class="l">
              建议我介入
            </div>
          </div>
        `;
      }

      const firstCard =
        main.querySelector(
          ".card"
        );

      if (!firstCard) return;

      const note =
        document.createElement("div");

      note.className =
        "closure-note";

      note.innerHTML = `
        <b>经营闭环规则：</b>
        只有留下“本次沟通结果 + 下一动作 + 日期”
        才计入今日完成；
        已成交、未成交或明确暂停也视为闭环。
        单纯点“更新”不算完成。
      `;

      firstCard.parentNode.insertBefore(
        note,
        firstCard
      );

      const team =
        document.createElement("div");

      team.className =
        "closure-team-wrap";

      team.innerHTML = `
        <div class="closure-section-title">
          <h3>今天每个人做到哪里</h3>
          <span>
            不看忙不忙，只看有没有形成结果
          </span>
        </div>

        <div class="closure-team-grid">
          ${buildTeamCards(
            users,
            work,
            dueItems,
            completed,
            intervene,
            today
          )}
        </div>
      `;

      firstCard.parentNode.insertBefore(
        team,
        firstCard
      );

      const resultCard =
        document.createElement("div");

      resultCard.className =
        "closure-result-card";

      resultCard.innerHTML = `

        <div class="closure-result-head">
          <h3>今天已经产生的结果</h3>
          <span>
            ${completed.length} 条完成闭环
            · ${wonToday.length} 条成交
          </span>
        </div>

        ${buildCompletedTable(
          completed,
          usersById,
          today
        )}
      `;

      firstCard.parentNode.insertBefore(
        resultCard,
        firstCard
      );

      const oldTitle =
        firstCard.querySelector(
          ".card-head h3"
        );

      if (oldTitle) {
        oldTitle.textContent =
          "今天还没完成";
      }

      const oldHint =
        firstCard.querySelector(
          ".card-head .muted"
        );

      if (oldHint) {
        oldHint.textContent =
          "按负责人逐条关单；需要田老师介入的事项优先处理";
      }

      addOwnerColumn(
        dueItems,
        usersById
      );

    } catch (err) {
      console.error(
        "管理员闭环视图加载失败：",
        err
      );

      main.dataset.closureApplied = "";
    }
  }

  function watch() {
    injectStyles();

    enhanceToday();

    const observer =
      new MutationObserver(() => {
        window.clearTimeout(
          window.__closureTimer
        );

        window.__closureTimer =
          window.setTimeout(
            enhanceToday,
            80
          );
      });

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      watch
    );
  } else {
    watch();
  }

})();