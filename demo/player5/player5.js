(function () {
  var query = new URLSearchParams(location.search);
  var aid = (query.get('aid') || '385609').replace(/\D/g, '') || '385609';
  if (query.get('embed') === '1') {
    document.body.className += ' p5-embed';
  }
  var root = document.getElementById('player5');
  var stage = document.getElementById('stage');
  var video = document.getElementById('video');
  var canvas = document.getElementById('danmaku');
  var ctx = canvas.getContext('2d');
  var playBtn = document.getElementById('playBtn');
  var progress = document.getElementById('progress');
  var progressInner = document.getElementById('progressInner');
  var progressThumb = document.getElementById('progressThumb');
  var timeText = document.getElementById('timeText');
  var muteBtn = document.getElementById('muteBtn');
  var volume = document.getElementById('volume');
  var volumeInner = document.getElementById('volumeInner');
  var volumeThumb = document.getElementById('volumeThumb');
  var dmBtn = document.getElementById('dmBtn');
  var loopBtn = document.getElementById('loopBtn');
  var wideBtn = document.getElementById('wideBtn');
  var fullBtn = document.getElementById('fullBtn');
  var bigPlay = document.getElementById('bigPlay');
  var notice = document.getElementById('notice');
  var noticeMsg = document.getElementById('noticeMsg');
  var loginBox = document.getElementById('loginBox');
  var rowsViewport = document.getElementById('rowsViewport');
  var rows = document.getElementById('rows');
  var scrollThumb = document.getElementById('scrollThumb');
  var scrollTrack = document.getElementById('scrollTrack');
  var scrollUp = document.getElementById('scrollUp');
  var scrollDown = document.getElementById('scrollDown');
  var clock = document.getElementById('clock');

  var dmList = [];
  var dmIndex = 0;
  var activeDm = [];
  var lanes = [];
  var laneCount = 15;
  var dmVisible = true;
  var scrollTop = 0;
  var lastVideoTime = 0;
  var hideTimer = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var info = null;
  var fallbackDuration = 0;

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  }

  function formatDate(seconds) {
    var d = new Date(Number(seconds) * 1000);
    if (isNaN(d.getTime())) {
      return '';
    }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function setClock() {
    var d = new Date();
    clock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  setClock();
  setInterval(setClock, 1000);

  function proxyImage(url) {
    try {
      var parsed = new URL(url);
      return '/img/' + parsed.hostname + parsed.pathname + parsed.search;
    } catch (error) {
      return url;
    }
  }

  function loadLogin() {
    fetch('/api/login/status', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.login) {
          return;
        }
        loginBox.className = 'p5-login p5-logged';
        loginBox.innerHTML = '';
        var line = document.createElement('div');
        line.className = 'p5-userline';
        var face = document.createElement('img');
        face.src = data.face ? proxyImage(data.face) : '/player5/assets/user.png';
        face.alt = '';
        var name = document.createElement('b');
        name.textContent = data.uname || '';
        line.appendChild(face);
        line.appendChild(name);
        var meta = document.createElement('div');
        meta.className = 'p5-user-meta';
        meta.textContent = '硬币:' + (data.money == null ? 0 : data.money) + ' 积分:' + (data.scores == null ? 0 : data.scores);
        loginBox.appendChild(line);
        loginBox.appendChild(meta);
      })
      .catch(function () {});
  }
  loadLogin();

  function loadNotice() {
    fetch('/dm00/msg.xml', { cache: 'no-store' })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var xml = new DOMParser().parseFromString(text, 'text/xml');
        var item = xml.querySelector('item');
        if (!item) {
          return;
        }
        var message = (item.textContent || '').trim();
        if (message) {
          noticeMsg.textContent = message;
          notice.className = 'p5-notice has-message';
        }
      })
      .catch(function () {});
  }
  loadNotice();

  function setStat(id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = String(value == null ? 0 : value);
    }
  }

  function updateInfo(data) {
    info = data;
    fallbackDuration = Number(data.duration) || 0;
    var stat = data.stat || {};
    setStat('statView', stat.view);
    setStat('statFav', stat.favorite);
    setStat('statDm', stat.danmaku);
    setStat('statScore', stat.like);
    setStat('statCoin', stat.coin);
    if (data.pic && aid !== '385609') {
      video.poster = data.pic;
    }
    if (data.playUrl) {
      video.src = data.playUrl;
      video.load();
    }
    loadDanmaku(data.dmUrl);
  }

  function addSampleRows() {
    var sample = [
      ['00:00', 'bb...', '2026-07-12 09:42:49'],
      ['00:24', '之前的小米手机，为发烧而生。已经很久了', '2026-07-11 13:13:16'],
      ['00:29', '我是安卓二能看到我的弹幕吗？', '2026-07-14 21:38:29'],
      ['00:12', '如果需要下载的话，也可以直接在安卓', '2026-07-11 09:54:09'],
      ['00:07', '明治十七年的上海爱丽丝', '2026-07-11 00:21:13'],
      ['00:31', '《为发烧而生》', '2026-07-12 08:58:07'],
      ['00:12', '安卓夺少？', '2026-07-10 22:41:06'],
      ['01:52', '确实是老设备了，就这样', '2026-07-12 03:09:21'],
      ['01:30', '好怀念的加载画面。。。', '2026-07-12 02:58:47'],
      ['00:07', '红米就是BGM！', '2026-07-11 22:24:15'],
      ['00:08', '还有高手', '2026-07-11 10:26:20'],
      ['01:08', '好怀念的界面', '2026-07-11 08:34:41'],
      ['00:00', '系统还不如路边售货新呢', '2026-07-10 23:57:48'],
      ['00:27', '以前的MIUI为发烧而生，现在的小米高', '2026-07-10 22:52:22'],
      ['00:10', '干杯', '2026-10-12 12:26:58'],
      ['00:08', '回忆的角度看', '2026-10-12 12:25:56']
    ];
    renderRows(sample.map(function (row) {
      return { time: row[0], text: row[1], date: row[2] };
    }));
  }

  function renderRows(list) {
    var frag = document.createDocumentFragment();
    list.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'p5-row';
      var time = document.createElement('div');
      time.className = 'p5-col-time';
      time.textContent = item.time || '00:00';
      var text = document.createElement('div');
      text.className = 'p5-col-text';
      text.textContent = item.text || '';
      text.title = item.text || '';
      var date = document.createElement('div');
      date.className = 'p5-col-date';
      date.textContent = item.date || '';
      row.appendChild(time);
      row.appendChild(text);
      row.appendChild(date);
      frag.appendChild(row);
    });
    rows.innerHTML = '';
    rows.appendChild(frag);
    scrollTop = 0;
    updateScrollbar();
  }

  function loadDanmaku(url) {
    if (!url) {
      addSampleRows();
      return;
    }
    fetch(url, { cache: 'no-store' })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var xml = new DOMParser().parseFromString(text, 'text/xml');
        var nodes = xml.querySelectorAll('d');
        var list = [];
        var rowsList = [];
        for (var i = 0; i < nodes.length; i++) {
          var p = (nodes[i].getAttribute('p') || '').split(',');
          var mode = Number(p[1] || 0);
          var time = Number(p[0] || 0);
          var color = Number(p[3] || 16777215);
          var size = Number(p[2] || 25);
          var content = nodes[i].textContent || '';
          if (!content || isNaN(time)) {
            continue;
          }
          var entry = {
            time: time,
            mode: mode,
            size: size,
            color: color,
            text: content,
            date: formatDate(p[4])
          };
          list.push(entry);
          if (rowsList.length < 1800) {
            rowsList.push({
              time: formatTime(time),
              text: content,
              date: entry.date
            });
          }
        }
        list.sort(function (a, b) { return a.time - b.time; });
        dmList = list;
        dmIndex = 0;
        activeDm = [];
        lanes = [];
        setStat('statDm', list.length);
        renderRows(rowsList);
        resetDanmakuIndex(video.currentTime || 0);
      })
      .catch(function () {
        addSampleRows();
      });
  }

  function updateScrollbar() {
    var maxScroll = Math.max(0, rows.offsetHeight - rowsViewport.clientHeight);
    scrollTop = Math.max(0, Math.min(scrollTop, maxScroll));
    rows.style.transform = 'translateY(' + (-scrollTop) + 'px)';
    var trackHeight = Math.max(1, scrollTrack.clientHeight);
    var thumbHeight = maxScroll ? Math.max(24, Math.round(trackHeight * rowsViewport.clientHeight / rows.offsetHeight)) : trackHeight;
    scrollThumb.style.height = thumbHeight + 'px';
    var maxThumb = Math.max(0, trackHeight - thumbHeight);
    var offset = maxScroll ? Math.round((scrollTop / maxScroll) * maxThumb) : 0;
    scrollThumb.style.top = offset + 'px';
    scrollThumb.style.display = maxScroll ? 'block' : 'none';
  }

  function scrollBy(delta) {
    var maxScroll = Math.max(0, rows.offsetHeight - rowsViewport.clientHeight);
    scrollTop = Math.max(0, Math.min(maxScroll, scrollTop + delta));
    updateScrollbar();
  }

  rowsViewport.addEventListener('wheel', function (event) {
    event.preventDefault();
    scrollBy(event.deltaY || 0);
  }, { passive: false });
  scrollUp.addEventListener('click', function () { scrollBy(-25); });
  scrollDown.addEventListener('click', function () { scrollBy(25); });
  scrollTrack.addEventListener('click', function (event) {
    if (event.target === scrollThumb) {
      return;
    }
    var rect = scrollTrack.getBoundingClientRect();
    var maxScroll = Math.max(0, rows.offsetHeight - rowsViewport.clientHeight);
    var ratio = (event.clientY - rect.top) / rect.height;
    scrollTop = ratio * maxScroll;
    updateScrollbar();
  });
  scrollThumb.addEventListener('mousedown', function (event) {
    event.preventDefault();
    var startY = event.clientY;
    var startTop = scrollTop;
    var maxScroll = Math.max(0, rows.offsetHeight - rowsViewport.clientHeight);
    var maxThumb = Math.max(0, scrollTrack.clientHeight - scrollThumb.offsetHeight);
    function move(e) {
      if (!maxThumb) {
        return;
      }
      scrollTop = startTop + ((e.clientY - startY) / maxThumb) * maxScroll;
      updateScrollbar();
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
  window.addEventListener('resize', updateScrollbar);

  function resizeCanvas() {
    var width = stage.clientWidth || 543;
    var height = stage.clientHeight || 410;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lanes = [];
    laneCount = Math.max(5, Math.floor((height - 8) / 23));
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function commentColor(value) {
    var color = '#' + ('000000' + (value >>> 0).toString(16)).slice(-6);
    return color;
  }

  function resetDanmakuIndex(time) {
    activeDm = [];
    lanes = [];
    var lo = 0;
    var hi = dmList.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (dmList[mid].time < time - 0.8) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    dmIndex = lo;
  }

  function pickLane(now) {
    var oldestLane = 0;
    var oldestTime = Infinity;
    for (var i = 0; i < laneCount; i++) {
      if (!lanes[i] || lanes[i] <= now) {
        lanes[i] = now + 1.8;
        return i;
      }
      if (lanes[i] < oldestTime) {
        oldestTime = lanes[i];
        oldestLane = i;
      }
    }
    lanes[oldestLane] = now + 1.8;
    return oldestLane;
  }

  function addDanmaku(item, now) {
    if (item.mode < 1 || item.mode > 6) {
      return;
    }
    var content = item.text;
    ctx.font = 'bold ' + Math.max(16, Math.min(30, item.size || 25)) + 'px "SimHei", "微软雅黑", sans-serif';
    var width = ctx.measureText(content).width;
    var lane = pickLane(now);
    var top = 4 + lane * 23;
    if (item.mode === 4) {
      top = canvas.height / dpr - 28 - lane * 23;
    } else if (item.mode === 5) {
      top = 4 + lane * 23;
    }
    if (top < 0) {
      top = 4;
    }
    activeDm.push({
      text: content,
      mode: item.mode,
      color: commentColor(item.color),
      size: Math.max(16, Math.min(30, item.size || 25)),
      width: width,
      y: top,
      start: now
    });
  }

  function drawDanmaku() {
    var width = canvas.width / dpr;
    var height = canvas.height / dpr;
    ctx.clearRect(0, 0, width, height);
    if (!dmVisible) {
      return;
    }
    var now = video.currentTime || 0;
    if (now < lastVideoTime - 1 || now > lastVideoTime + 2) {
      resetDanmakuIndex(now);
    }
    lastVideoTime = now;
    while (dmIndex < dmList.length && dmList[dmIndex].time <= now) {
      if (dmList[dmIndex].time >= now - 0.8) {
        addDanmaku(dmList[dmIndex], now);
      }
      dmIndex++;
    }
    ctx.textBaseline = 'top';
    for (var i = activeDm.length - 1; i >= 0; i--) {
      var item = activeDm[i];
      var elapsed = now - item.start;
      var x = 0;
      var show = true;
      if (item.mode === 4 || item.mode === 5) {
        x = (width - item.width) / 2;
        show = elapsed < 4;
      } else if (item.mode === 6) {
        x = -item.width + (elapsed / 8) * (width + item.width);
        show = elapsed < 8;
      } else {
        x = width - (elapsed / 8) * (width + item.width);
        show = elapsed < 8;
      }
      if (!show || (item.mode !== 4 && item.mode !== 5 && (x > width + 10 || x + item.width < -10))) {
        activeDm.splice(i, 1);
        continue;
      }
      ctx.font = 'bold ' + item.size + 'px "SimHei", "微软雅黑", sans-serif';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.82)';
      ctx.fillStyle = item.color;
      ctx.strokeText(item.text, x, item.y);
      ctx.fillText(item.text, x, item.y);
    }
  }

  function tick() {
    drawDanmaku();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function updatePlayState() {
    var playing = !video.paused && !video.ended;
    stage.classList.toggle('p5-playing', playing);
    if (playing) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!stage.matches(':hover')) {
          stage.classList.add('p5-hide-controls');
        }
      }, 2200);
    } else {
      clearTimeout(hideTimer);
      stage.classList.remove('p5-hide-controls');
    }
  }

  function togglePlay() {
    if (video.paused) {
      video.play().catch(function () {});
    } else {
      video.pause();
    }
  }

  playBtn.addEventListener('click', togglePlay);
  bigPlay.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);
  video.addEventListener('play', updatePlayState);
  video.addEventListener('pause', updatePlayState);
  video.addEventListener('ended', updatePlayState);
  stage.addEventListener('mousemove', function () {
    stage.classList.remove('p5-hide-controls');
    if (!video.paused) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!stage.matches(':hover')) {
          stage.classList.add('p5-hide-controls');
        }
      }, 2200);
    }
  });

  function updateTime() {
    var duration = isFinite(video.duration) && video.duration > 0 ? video.duration : fallbackDuration;
    var current = isFinite(video.currentTime) ? video.currentTime : 0;
    var percent = duration ? Math.max(0, Math.min(1, current / duration)) * 100 : 0;
    timeText.textContent = formatTime(current) + ' / ' + formatTime(duration);
    progressInner.style.width = percent + '%';
    progressThumb.style.left = percent + '%';
  }
  video.addEventListener('timeupdate', updateTime);
  video.addEventListener('loadedmetadata', function () {
    updateTime();
    resetDanmakuIndex(0);
  });
  video.addEventListener('durationchange', updateTime);
  updateTime();

  progress.addEventListener('mousedown', function (event) {
    event.preventDefault();
    function seek(e) {
      var rect = progress.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (isFinite(video.duration)) {
        video.currentTime = ratio * video.duration;
        updateTime();
      }
    }
    seek(event);
    function up() {
      document.removeEventListener('mousemove', seek);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', seek);
    document.addEventListener('mouseup', up);
  });

  function setVolume(value) {
    value = Math.max(0, Math.min(1, value));
    video.volume = value;
    video.muted = value === 0;
    volumeInner.style.width = (value * 100) + '%';
    volumeThumb.style.left = (value * 100) + '%';
    stage.classList.toggle('p5-muted', value === 0 || video.muted);
  }
  muteBtn.addEventListener('click', function () {
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) {
        video.volume = 0.8;
      }
    } else {
      video.muted = true;
    }
    setVolume(video.muted ? 0 : video.volume);
  });
  volume.addEventListener('mousedown', function (event) {
    event.preventDefault();
    function set(e) {
      var rect = volume.getBoundingClientRect();
      setVolume((e.clientX - rect.left) / rect.width);
    }
    set(event);
    function up() {
      document.removeEventListener('mousemove', set);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', set);
    document.addEventListener('mouseup', up);
  });

  dmBtn.addEventListener('click', function () {
    dmVisible = !dmVisible;
    stage.classList.toggle('p5-dm-off', !dmVisible);
    if (!dmVisible) {
      activeDm = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
  loopBtn.addEventListener('click', function () {
    video.loop = !video.loop;
    stage.classList.toggle('p5-loop-on', video.loop);
  });
  function relayoutPlayer() {
    setTimeout(function () {
      resizeCanvas();
    }, 60);
  }
  wideBtn.addEventListener('click', function () {
    root.classList.toggle('p5-wide');
    relayoutPlayer();
  });
  function toggleFauxFullscreen() {
    root.classList.toggle('p5-faux-full');
    relayoutPlayer();
  }
  fullBtn.addEventListener('click', function () {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    } else if (root.classList.contains('p5-faux-full')) {
      root.classList.remove('p5-faux-full');
      relayoutPlayer();
    } else if (root.requestFullscreen) {
      root.requestFullscreen().catch(toggleFauxFullscreen);
    } else {
      toggleFauxFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', relayoutPlayer);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && root.classList.contains('p5-faux-full')) {
      root.classList.remove('p5-faux-full');
      relayoutPlayer();
    }
  });

  setVolume(0.8);
  addSampleRows();

  fetch('/api/player5?aid=' + encodeURIComponent(aid), { cache: 'no-store' })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.code === 0) {
        updateInfo(data);
      }
    })
    .catch(function () {});
})();
