(function () {
  'use strict';

  var gigGrid = document.getElementById('gigGrid');
  var modalBackdrop = document.getElementById('modalBackdrop');
  var btnCloseModal = document.getElementById('btnCloseModal');
  var modalGigTitle = document.getElementById('modalGigTitle');
  var modalGigMeta = document.getElementById('modalGigMeta');
  var modalGigDesc = document.getElementById('modalGigDesc');
  var modalMsg = document.getElementById('modalMsg');
  var claimForm = document.getElementById('claimForm');
  var workerNameInput = document.getElementById('workerNameInput');
  var phoneInput = document.getElementById('phoneInput');
  var lookupForm = document.getElementById('lookupForm');
  var lookupPhoneInput = document.getElementById('lookupPhoneInput');
  var lookupResult = document.getElementById('lookupResult');

  var data = GigworkData.load();
  var currentGigId = null;

  var CATEGORY_ICON = {
    '跑腿代办': '🏃', '家政临时工': '🧹', '活动兼职': '🎪', '同城搬运': '📦',
  };

  function renderGrid() {
    var openGigs = data.gigs.filter(function (g) { return g.status === 'open'; });
    gigGrid.innerHTML = openGigs.map(function (g) {
      return '<div class="gig-card" data-id="' + g.id + '">' +
        '<div class="gig-card__top">' +
        '<span class="gig-card__cat">' + (CATEGORY_ICON[g.category] || '💼') + ' ' + g.category + '</span>' +
        '<span class="gig-card__reward">¥' + g.reward + '</span>' +
        '</div>' +
        '<h3>' + g.title + '</h3>' +
        '<div class="gig-card__meta">📍 ' + g.location + ' · 预计 ' + g.estimatedHours + ' 小时</div>' +
        '<p class="gig-card__desc">' + g.description + '</p>' +
        '<button class="btn btn-primary btn-block btn-sm" data-claim="' + g.id + '">立即接单</button>' +
        '</div>';
    }).join('') || '<div class="empty-state">暂时没有可接的任务，稍后再来看看吧。</div>';

    gigGrid.querySelectorAll('[data-claim]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openModal(btn.dataset.claim);
      });
    });
  }

  function openModal(gigId) {
    var g = data.gigs.find(function (x) { return x.id === gigId; });
    if (!g) return;
    currentGigId = gigId;

    modalGigTitle.textContent = g.title;
    modalGigMeta.textContent = g.category + ' · ' + g.location + ' · ¥' + g.reward + ' · 预计 ' + g.estimatedHours + ' 小时';
    modalGigDesc.innerHTML = '<strong>任务说明：</strong>' + g.description;

    modalMsg.innerHTML = '';
    claimForm.reset();
    modalBackdrop.classList.add('show');
  }

  function closeModal() {
    modalBackdrop.classList.remove('show');
    currentGigId = null;
  }

  btnCloseModal.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBackdrop) closeModal();
  });

  claimForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentGigId) return;

    var name = workerNameInput.value.trim();
    var phone = phoneInput.value.trim();

    if (!name) return showMsg('请填写姓名。', true);
    if (!/^1\d{10}$/.test(phone)) return showMsg('请填写正确的 11 位手机号。', true);

    // CRITICAL: re-read fresh data straight from localStorage right now,
    // rather than trusting the in-memory `data` snapshot taken at page
    // load / modal open — another tab/user may have claimed this gig in
    // the meantime. This is the only correct place to guard against the
    // "someone else already took it" race.
    var freshData = GigworkData.load();
    var freshGig = freshData.gigs.find(function (g) { return g.id === currentGigId; });

    if (!freshGig || freshGig.status !== 'open') {
      return showMsg('手慢了，这个任务刚刚被其他人接走了，请选择其他任务。', true);
    }

    freshGig.status = 'claimed';
    var claim = {
      id: GigworkData.uid('c'),
      gigId: freshGig.id,
      workerName: name,
      phone: phone,
      claimedAt: new Date().toISOString(),
      completedAt: null,
    };
    freshData.claims.push(claim);
    GigworkData.save(freshData);
    data = freshData; // keep in-memory copy in sync with what we just saved

    showMsg('接单成功！请留意雇主联系你安排具体时间。', false);
    claimForm.reset();
    renderGrid();
    setTimeout(closeModal, 1100);
  });

  function showMsg(text, isError) {
    modalMsg.innerHTML = '<div class="msg ' + (isError ? 'error' : 'success') + '">' + text + '</div>';
  }

  // ---------- 我的接单 lookup ----------
  function statusLabel(s) {
    return { open: '待接单', claimed: '进行中', completed: '已完成', cancelled: '已取消' }[s] || s;
  }

  lookupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var phone = lookupPhoneInput.value.trim();
    if (!phone) {
      lookupResult.innerHTML = '<div class="msg error">请输入手机号。</div>';
      return;
    }

    var freshData = GigworkData.load();
    var myClaims = freshData.claims.filter(function (c) { return c.phone === phone; });

    if (!myClaims.length) {
      lookupResult.innerHTML = '<div class="msg error">没有找到与该手机号相关的接单记录。</div>';
      return;
    }

    lookupResult.innerHTML = '<table class="lookup-table"><thead><tr><th>任务</th><th>报酬</th><th>接单时间</th><th>状态</th></tr></thead><tbody>' +
      myClaims.map(function (c) {
        var g = freshData.gigs.find(function (x) { return x.id === c.gigId; });
        var title = g ? g.title : '（任务已删除）';
        var reward = g ? '¥' + g.reward : '-';
        var status = g ? g.status : 'cancelled';
        return '<tr><td>' + title + '</td><td>' + reward + '</td><td>' + new Date(c.claimedAt).toLocaleString('zh-CN') + '</td>' +
          '<td><span class="badge ' + status + '">' + statusLabel(status) + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  });

  renderGrid();
})();
