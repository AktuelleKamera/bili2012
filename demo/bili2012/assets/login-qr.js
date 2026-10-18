(function () {
  var overlay = null;
  var pollTimer = null;
  var currentKey = '';

  function request(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {}
      callback(xhr.status === 200 ? data : null);
    };
    xhr.send();
  }

  function hideOverlay() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
    currentKey = '';
  }

  function showOverlay(qr) {
    hideOverlay();
    overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;left:0;top:0;right:0;bottom:0;z-index:999999;' +
      'background:rgba(0,0,0,.55);text-align:center;';

    var panel = document.createElement('div');
    panel.style.cssText =
      'position:relative;display:inline-block;margin-top:8%;padding:18px 24px 16px;' +
      'background:#fff;border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,.35);' +
      'font:14px/1.6 "Microsoft YaHei","SimSun",sans-serif;color:#333;';

    var close = document.createElement('a');
    close.href = 'javascript:;';
    close.innerHTML = '&times;';
    close.style.cssText =
      'position:absolute;right:10px;top:4px;font:22px/1 Arial;color:#888;text-decoration:none;';
    close.onclick = hideOverlay;

    var title = document.createElement('div');
    title.innerHTML = '请使用 哔哩哔哩客户端扫码登录';
    title.style.cssText = 'font-size:15px;color:#00a1d6;margin-bottom:10px;';

    var img = document.createElement('img');
    img.src = qr;
    img.width = 220;
    img.height = 220;
    img.style.cssText = 'display:block;margin:0 auto;border:1px solid #eee;';

    var status = document.createElement('div');
    status.id = 'login-qr-status';
    status.innerHTML = '等待扫码...';
    status.style.cssText = 'margin-top:10px;color:#666;min-height:22px;';

    panel.appendChild(close);
    panel.appendChild(title);
    panel.appendChild(img);
    panel.appendChild(status);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  function setStatus(text, color) {
    var el = document.getElementById('login-qr-status');
    if (!el) return;
    el.innerHTML = text;
    if (color) el.style.color = color;
  }

  function poll() {
    if (!currentKey) return;
    request('/api/login/poll?key=' + encodeURIComponent(currentKey), function (data) {
      if (!data) return;
      if (data.login) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        setStatus('登录成功，正在返回...', '#4caf50');
        setTimeout(function () {
          window.location.href = '/';
        }, 800);
        return;
      }
      if (data.state === 86090) {
        setStatus('已扫描，请在手机上确认', '#00a1d6');
      } else if (data.state === 86038) {
        setStatus('二维码已过期，请重新点击登录', '#e53935');
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      } else if (data.state === 86101) {
        setStatus('等待扫码...', '#666');
      } else if (data.message) {
        setStatus(data.message, '#e53935');
      }
    });
  }

  function start() {
    request('/api/login/qr', function (data) {
      if (!data || data.code !== 0 || !data.qr) {
        alert('获取登录二维码失败，请稍后重试');
        return;
      }
      currentKey = data.key;
      showOverlay(data.qr);
      poll();
      pollTimer = setInterval(poll, 2000);
    });
  }

  var form = document.querySelector('form[name="userlogin"]');
  var button = document.querySelector('.btn-login');

  function stop(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    start();
    return false;
  }

  if (form) form.addEventListener('submit', stop, true);
  if (button) button.addEventListener('click', stop, true);
})();
