(function (global) {
  'use strict';
  var STORAGE_KEY = 'gigwork_lite_data_v1';

  function shiftDays(base, days) {
    var d = new Date(base.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  // Returns a date `daysAgo` days before `now`, but clamped so it never
  // slips into the previous calendar month (used for seed data that must
  // land "this month" no matter what day-of-month `now` happens to be).
  function withinThisMonth(now, daysAgo) {
    var d = shiftDays(now, -daysAgo);
    var firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (d < firstOfMonth) d = firstOfMonth;
    return d;
  }

  function seed() {
    var now = new Date();
    // Guaranteed to land in the calendar month BEFORE the current one,
    // regardless of what day of the month "now" is.
    var firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    var lastMonthDate = new Date(firstOfThisMonth.getTime() - 5 * 86400000);

    return {
      gigs: [
        { id: 'g1', title: '帮取快递并送到公司前台', category: '跑腿代办', location: '朝阳区', reward: 35, estimatedHours: 1, description: '快递柜取 3 件包裹，步行送到写字楼前台，全程不到 20 分钟路程。', postedAt: shiftDays(now, -2).toISOString(), status: 'open' },
        { id: 'g2', title: '三室两厅搬家搬运工（2人）', category: '同城搬运', location: '海淀区', reward: 280, estimatedHours: 4, description: '周末从老小区搬到新小区，需要 2 人配合搬运家具家电，有电梯。', postedAt: shiftDays(now, -1).toISOString(), status: 'open' },
        { id: 'g3', title: '新房开荒保洁 4 小时', category: '家政临时工', location: '西城区', reward: 120, estimatedHours: 4, description: '新装修两居室开荒保洁，需自带基础清洁工具。', postedAt: shiftDays(now, -5).toISOString(), status: 'claimed' },
        { id: 'g4', title: '车展礼仪引导（一天）', category: '活动兼职', location: '顺义区', reward: 300, estimatedHours: 8, description: '周末车展现场引导观众、发放物料，需形象气质佳，提供工作餐。', postedAt: shiftDays(now, -6).toISOString(), status: 'claimed' },
        { id: 'g5', title: '代排队购买网红奶茶', category: '跑腿代办', location: '东城区', reward: 25, estimatedHours: 1, description: '帮忙在商场排队买 3 杯奶茶送到公司，高峰期约排队 40 分钟。', postedAt: shiftDays(now, -9).toISOString(), status: 'completed' },
        { id: 'g6', title: '沙发家电搬运上楼（无电梯）', category: '同城搬运', location: '丰台区', reward: 150, estimatedHours: 2, description: '一张三人沙发和一台冰箱，从一楼搬到六楼，无电梯，需要力气。', postedAt: shiftDays(now, -8).toISOString(), status: 'completed' },
        { id: 'g7', title: '老人居家深度保洁', category: '家政临时工', location: '通州区', reward: 200, estimatedHours: 5, description: '独居老人家中深度保洁，包含厨房油污和玻璃清洁。', postedAt: shiftDays(lastMonthDate, -3).toISOString(), status: 'completed' },
        { id: 'g8', title: '展会签到引导员', category: '活动兼职', location: '大兴区', reward: 260, estimatedHours: 6, description: '三天展会期间负责观众签到引导，需普通话标准，提供培训。', postedAt: shiftDays(now, -1).toISOString(), status: 'open' },
      ],
      claims: [
        { id: 'c1', gigId: 'g3', workerName: '王芳', phone: '13800000001', claimedAt: shiftDays(now, -4).toISOString(), completedAt: null },
        { id: 'c2', gigId: 'g4', workerName: '李强', phone: '13800000002', claimedAt: shiftDays(now, -5).toISOString(), completedAt: null },
        { id: 'c3', gigId: 'g5', workerName: '张伟', phone: '13800000003', claimedAt: shiftDays(now, -9).toISOString(), completedAt: withinThisMonth(now, 2).toISOString() },
        { id: 'c4', gigId: 'g6', workerName: '张伟', phone: '13800000003', claimedAt: shiftDays(now, -8).toISOString(), completedAt: withinThisMonth(now, 1).toISOString() },
        { id: 'c5', gigId: 'g7', workerName: '赵敏', phone: '13800000004', claimedAt: shiftDays(lastMonthDate, -3).toISOString(), completedAt: lastMonthDate.toISOString() },
      ],
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var s = seed();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        return s;
      }
      return JSON.parse(raw);
    } catch (e) {
      return seed();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  global.GigworkData = {
    load: load,
    save: save,
    uid: uid,
    reset: function () { var s = seed(); save(s); return s; },
  };
})(window);
