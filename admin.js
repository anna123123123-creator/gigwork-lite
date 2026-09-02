(function () {
  'use strict';

  var data = GigworkData.load();

  var sideLinks = document.querySelectorAll('.side-link[data-view]');
  var views = document.querySelectorAll('.admin-view');

  function switchView(name) {
    sideLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.view === name); });
    views.forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    if (name === 'dashboard') renderDashboard();
    if (name === 'gigs') renderGigs();
    if (name === 'settlements') renderSettlements();
  }

  sideLinks.forEach(function (l) {
    l.addEventListener('click', function () { switchView(l.dataset.view); });
  });

  document.getElementById('btnResetData').addEventListener('click', function () {
    if (!confirm('确定要重置成示例数据吗？这会清空你新增/修改的所有内容。')) return;
    data = GigworkData.reset();
    switchView('dashboard');
  });

  // ---------- shared helpers ----------
  function gigById(id) {
    return data.gigs.find(function (g) { return g.id === id; });
  }

  function claimsForGig(gigId) {
    return data.claims.filter(function (c) { return c.gigId === gigId; });
  }

  // Most recent claim for a gig (a gig is only ever claimable while
  // status === 'open', so in normal use there is at most one active
  // claim per gig; this picks the newest if the admin manually re-opened
  // and re-claimed a gig).
  function latestClaimForGig(gigId) {
    var cs = claimsForGig(gigId);
    if (!cs.length) return null;
    return cs.slice().sort(function (a, b) { return a.claimedAt < b.claimedAt ? 1 : -1; })[0];
  }

  function statusLabel(s) {
    return { open: '待接单', claimed: '进行中', completed: '已完成', cancelled: '已取消' }[s] || s;
  }

  function fmt(iso) {
    return iso ? new Date(iso).toLocaleString('zh-CN') : '-';
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    var openCount = data.gigs.filter(function (g) { return g.status === 'open'; }).length;
    var claimedCount = data.gigs.filter(function (g) { return g.status === 'claimed'; }).length;

    var now = new Date();
    var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    var monthPayout = data.gigs
      .filter(function (g) { return g.status === 'completed'; })
      .reduce(function (sum, g) {
        var claim = latestClaimForGig(g.id);
        if (claim && claim.completedAt && claim.completedAt.slice(0, 7) === ym) {
          return sum + g.reward;
        }
        return sum;
      }, 0);

    var stats = [
      { label: '任务总数', value: data.gigs.length },
      { label: '待接单任务', value: openCount },
      { label: '进行中任务', value: claimedCount },
      { label: '本月已完成收入', value: '¥' + monthPayout },
    ];
    document.getElementById('statGrid').innerHTML = stats.map(function (s) {
      return '<div class="stat-card"><div class="num">' + s.value + '</div><div class="label">' + s.label + '</div></div>';
    }).join('');

    // Top-earning workers: group completed gigs' claims by workerName+phone.
    var earners = {};
    data.gigs.filter(function (g) { return g.status === 'completed'; }).forEach(function (g) {
      var claim = latestClaimForGig(g.id);
      if (!claim) return;
      var key = claim.workerName + '|' + claim.phone;
      if (!earners[key]) earners[key] = { workerName: claim.workerName, phone: claim.phone, count: 0, total: 0 };
      earners[key].count += 1;
      earners[key].total += g.reward;
    });
    var earnerList = Object.keys(earners).map(function (k) { return earners[k]; })
      .sort(function (a, b) { return b.total - a.total; });

    document.getElementById('topWorkersBody').innerHTML = earnerList.map(function (e) {
      return '<tr><td>' + e.workerName + '</td><td>' + e.phone + '</td><td>' + e.count + '</td><td>¥' + e.total + '</td></tr>';
    }).join('') || '<tr><td colspan="4" style="color:var(--muted)">暂无已完成任务</td></tr>';

    var recentClaims = data.claims.slice().sort(function (a, b) { return a.claimedAt < b.claimedAt ? 1 : -1; }).slice(0, 5);
    document.getElementById('recentClaimsBody').innerHTML = recentClaims.map(function (c) {
      var g = gigById(c.gigId);
      var status = g ? g.status : 'cancelled';
      return '<tr><td>' + c.workerName + '</td><td>' + (g ? g.title : '（任务已删除）') + '</td><td>' + fmt(c.claimedAt) + '</td>' +
        '<td><span class="badge ' + status + '">' + statusLabel(status) + '</span></td></tr>';
    }).join('') || '<tr><td colspan="4" style="color:var(--muted)">暂无接单记录</td></tr>';
  }

  // ---------- Gig management ----------
  var gigModalBackdrop = document.getElementById('gigModalBackdrop');
  var gigModalTitle = document.getElementById('gigModalTitle');
  var gigModalMsg = document.getElementById('gigModalMsg');
  var gigForm = document.getElementById('gigForm');
  var gigIdInput = document.getElementById('gigIdInput');
  var gigTitleInput = document.getElementById('gigTitleInput');
  var gigCategoryInput = document.getElementById('gigCategoryInput');
  var gigLocationInput = document.getElementById('gigLocationInput');
  var gigRewardInput = document.getElementById('gigRewardInput');
  var gigHoursInput = document.getElementById('gigHoursInput');
  var gigDescInput = document.getElementById('gigDescInput');
  var gigStatusInput = document.getElementById('gigStatusInput');

  function renderGigs() {
    document.getElementById('gigsBody').innerHTML = data.gigs.map(function (g) {
      return '<tr><td>' + g.title + '</td><td>' + g.category + '</td><td>' + g.location + '</td><td>¥' + g.reward + '</td><td>' + g.estimatedHours + ' 小时</td>' +
        '<td><span class="badge ' + g.status + '">' + statusLabel(g.status) + '</span></td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit="' + g.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + g.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="7" style="color:var(--muted)">暂无任务</td></tr>';

    document.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openGigModal(btn.dataset.edit); });
    });
    document.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteGig(btn.dataset.delete); });
    });
  }

  function openGigModal(id) {
    gigModalMsg.innerHTML = '';
    gigForm.reset();
    if (id) {
      var g = gigById(id);
      gigModalTitle.textContent = '编辑任务';
      gigIdInput.value = g.id;
      gigTitleInput.value = g.title;
      gigCategoryInput.value = g.category;
      gigLocationInput.value = g.location;
      gigRewardInput.value = g.reward;
      gigHoursInput.value = g.estimatedHours;
      gigDescInput.value = g.description || '';
      gigStatusInput.value = g.status;
    } else {
      gigModalTitle.textContent = '发布任务';
      gigIdInput.value = '';
      gigStatusInput.value = 'open';
    }
    gigModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddGig').addEventListener('click', function () { openGigModal(null); });
  document.getElementById('btnCloseGigModal').addEventListener('click', function () { gigModalBackdrop.classList.remove('show'); });
  gigModalBackdrop.addEventListener('click', function (e) { if (e.target === gigModalBackdrop) gigModalBackdrop.classList.remove('show'); });

  gigForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = gigTitleInput.value.trim();
    var location = gigLocationInput.value.trim();
    var reward = parseFloat(gigRewardInput.value);
    var hours = parseFloat(gigHoursInput.value);
    if (!title || !location || !(reward >= 0) || !(hours >= 0)) {
      gigModalMsg.innerHTML = '<div class="msg error">请完整填写所有必填项，报酬和工时需为非负数。</div>';
      return;
    }

    var id = gigIdInput.value;
    if (id) {
      var g = gigById(id);
      g.title = title; g.category = gigCategoryInput.value; g.location = location;
      g.reward = reward; g.estimatedHours = hours; g.description = gigDescInput.value.trim();
      g.status = gigStatusInput.value;
    } else {
      data.gigs.push({
        id: GigworkData.uid('g'), title: title, category: gigCategoryInput.value, location: location,
        reward: reward, estimatedHours: hours, description: gigDescInput.value.trim(),
        postedAt: new Date().toISOString(), status: gigStatusInput.value,
      });
    }
    GigworkData.save(data);
    gigModalBackdrop.classList.remove('show');
    renderGigs();
  });

  function deleteGig(id) {
    if (!confirm('确定删除这个任务吗？关联的接单记录会保留，但会显示"任务已删除"。')) return;
    data.gigs = data.gigs.filter(function (g) { return g.id !== id; });
    GigworkData.save(data);
    renderGigs();
  }

  // ---------- Settlements ----------
  var currentFilter = 'all';
  document.querySelectorAll('#settlementFilters .filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentFilter = btn.dataset.status;
      document.querySelectorAll('#settlementFilters .filter-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
      renderSettlements();
    });
  });

  function renderSettlements() {
    var list = data.claims.filter(function (c) {
      if (currentFilter === 'all') return true;
      var g = gigById(c.gigId);
      return g && g.status === currentFilter;
    }).slice().sort(function (a, b) { return a.claimedAt < b.claimedAt ? 1 : -1; });

    document.getElementById('settlementsBody').innerHTML = list.map(function (c) {
      var g = gigById(c.gigId);
      var status = g ? g.status : 'cancelled';
      var reward = g ? '¥' + g.reward : '-';
      var actions = (g && g.status === 'claimed')
        ? '<button class="btn btn-sm btn-primary" data-complete="' + c.id + '">标记完成</button>'
        : '<span style="color:var(--muted);font-size:12px">-</span>';
      return '<tr><td>' + (g ? g.title : '（任务已删除）') + '</td><td>' + c.workerName + '</td><td>' + c.phone + '</td><td>' + reward + '</td>' +
        '<td>' + fmt(c.claimedAt) + '</td>' +
        '<td><span class="badge ' + status + '">' + statusLabel(status) + '</span></td>' +
        '<td class="table-actions">' + actions + '</td></tr>';
    }).join('') || '<tr><td colspan="7" style="color:var(--muted)">暂无接单记录</td></tr>';

    document.querySelectorAll('[data-complete]').forEach(function (btn) {
      btn.addEventListener('click', function () { markCompleted(btn.dataset.complete); });
    });
  }

  function markCompleted(claimId) {
    var claim = data.claims.find(function (c) { return c.id === claimId; });
    if (!claim) return;
    var g = gigById(claim.gigId);
    if (!g || g.status !== 'claimed') return;
    g.status = 'completed';
    claim.completedAt = new Date().toISOString();
    GigworkData.save(data);
    renderSettlements();
  }

  switchView('dashboard');
})();
