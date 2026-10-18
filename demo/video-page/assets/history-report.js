(function () {
  var lastSent = -1;
  var lastSentAt = 0;
  var timer = null;

  function player() {
    return (
      document.querySelector('#bofqi embed') ||
      document.querySelector('#bofqi object')
    );
  }

  function videoIds() {
    var embed = player();
    var flashvars = embed ? String(embed.getAttribute('flashvars') || '') : '';
    var idMatch = flashvars.match(/(?:^|&)id=(\d+)/);
    var aid = window.aid || (flashvars.match(/(?:^|&)aid=(\d+)/) || [])[1] || '';
    return {
      aid: String(aid || '').replace(/\D/g, ''),
      cid: idMatch ? idMatch[1] : '',
    };
  }

  function currentTime() {
    var embed = player();
    if (!embed) return 0;
    try {
      if (typeof embed.jwGetPosition === 'function') {
        return Number(embed.jwGetPosition()) || 0;
      }
    } catch (error) {}
    return 0;
  }

  function send(beacon) {
    var ids = videoIds();
    var position = currentTime();
    if (!ids.aid || !ids.cid || !isFinite(position) || position <= 0) return;
    if (position === lastSent && Date.now() - lastSentAt < 30000) return;

    lastSent = position;
    lastSentAt = Date.now();
    var body = JSON.stringify({
      aid: ids.aid,
      cid: ids.cid,
      progress: Math.floor(position),
    });

    if (beacon && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(
          '/api/history/report',
          new Blob([body], { type: 'application/json' })
        );
        return;
      } catch (error) {}
    }

    try {
      fetch('/api/history/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
      }).catch(function () {});
    } catch (error) {}
  }

  function tick() {
    send(false);
  }

  function start() {
    if (timer) clearInterval(timer);
    timer = setInterval(tick, 12000);
    setTimeout(tick, 3000);
  }

  window.addEventListener('load', start);
  window.addEventListener('pagehide', function () {
    send(true);
    if (timer) clearInterval(timer);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') send(true);
  });
})();
