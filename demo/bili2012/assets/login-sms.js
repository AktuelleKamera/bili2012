(function () {
  var toastTimer = null;
  var toastEl = null;
  var busy = false;
  var captchaLoading = false;

  function toast(text, isError) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText =
        'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);z-index:999999;' +
        'max-width:80%;padding:10px 18px;border-radius:4px;background:rgba(0,0,0,.82);' +
        'color:#fff;font:14px/1.6 "Microsoft YaHei","SimSun",sans-serif;text-align:center;' +
        'box-shadow:0 2px 10px rgba(0,0,0,.3);display:none;';
      document.body.appendChild(toastEl);
    }
    if ('textContent' in toastEl) {
      toastEl.textContent = text;
    } else {
      toastEl.innerText = text;
    }
    toastEl.style.background = isError ? 'rgba(198,40,40,.92)' : 'rgba(0,0,0,.82)';
    toastEl.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.style.display = 'none';
    }, 4200);
  }

  function post(url, body, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {}
      callback(data);
    };
    xhr.send(body);
  }

  function encode(value) {
    return encodeURIComponent(value == null ? '' : String(value));
  }

  function extend(target, source) {
    if (source) {
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
      }
    }
    return target;
  }

  function loadScript(src, onload, onerror) {
    var script = document.createElement('script');
    script.src = src;
    script.onload = onload;
    script.onerror = onerror;
    var head = document.head || document.getElementsByTagName('head')[0];
    head.appendChild(script);
  }

  function getLoginButton() {
    return document.getElementById('loginBtn') || document.querySelector('.btn-login');
  }

  function getLoginForm() {
    return (
      document.getElementById('loginForm') ||
      document.forms['userlogin'] ||
      document.querySelector('form[name="userlogin"]')
    );
  }

  function finish() {
    busy = false;
    var button = getLoginButton();
    if (button) button.disabled = false;
  }

  function startBusy() {
    busy = true;
    var button = getLoginButton();
    if (button) button.disabled = true;
  }

  function focusCodeInput() {
    var codeInput = document.getElementById('_vdcodes');
    if (codeInput) {
      codeInput.value = '';
      codeInput.focus();
    }
  }

  function smsSent() {
    toast('验证码已发送，请填入下方验证码框后再次点击登录');
    focusCodeInput();
  }

  function sendWithGee(tel, data, challenge, validate, seccode) {
    if (!challenge || !validate || !seccode) {
      toast('人机验证结果无效，请重试', true);
      return;
    }
    startBusy();
    var body =
      'tel=' + encode(tel) +
      '&gee_challenge=' + encode(challenge) +
      '&gee_validate=' + encode(validate) +
      '&gee_seccode=' + encode(seccode) +
      '&recaptcha_token=' + encode(data.recaptchaToken);
    post('/api/login/sms/send', body, function (res) {
      finish();
      if (!res) {
        toast('请求失败，请稍后重试', true);
        return;
      }
      if (res.code === 0) {
        smsSent();
        return;
      }
      if (res.code === -105 && res.geeGt && res.geeChallenge && res.recaptchaToken) {
        showCaptcha(tel, res);
        return;
      }
      if (res.code === -105) {
        toast(res.message || '哔哩哔哩要求人机验证', true);
        return;
      }
      toast(res.message || '验证码发送失败', true);
    });
  }

  function showCaptcha(tel, data) {
    if (captchaLoading) return;
    captchaLoading = true;
    toast('正在加载人机验证...');

    function fail() {
      captchaLoading = false;
      toast('人机验证加载失败，请重试', true);
    }

    function ready() {
      var callbackName =
        'geetest_' + (Date.now ? Date.now() : new Date().getTime());
      var finished = false;

      window[callbackName] = function (result) {
        if (!result || result.status !== 'success') {
          captchaLoading = false;
          toast('人机验证初始化失败', true);
          return;
        }
        if (typeof window.Geetest !== 'function') {
          captchaLoading = false;
          toast('人机验证加载失败，请重试', true);
          return;
        }
        var config = extend(
          {
            gt: data.geeGt,
            challenge: data.geeChallenge,
            offline: false,
            new_captcha: true,
            product: 'bind',
            width: '100%',
            https: true,
            protocol: 'https://',
          },
          result.data
        );

        function done() {
          if (finished) return false;
          finished = true;
          captchaLoading = false;
          return true;
        }

        var captcha;
        try {
          captcha = window
            .Geetest(config)
            .onSuccess(function () {
              if (!done()) return;
              var value = captcha.getValidate() || {};
              sendWithGee(
                tel,
                data,
                value.geetest_challenge || value.challenge || '',
                value.geetest_validate || value.validate || '',
                value.geetest_seccode || value.seccode || ''
              );
            })
            .onError(function () {
              if (done()) toast('人机验证失败，请重试', true);
            })
            .onClose(function () {
              if (done()) toast('已取消人机验证', true);
            });
          captcha.onReady(function () {
            captcha.verify();
          });
        } catch (error) {
          if (done()) toast('人机验证加载失败，请重试', true);
        }
      };

      loadScript(
        'https://api.geetest.com/gettype.php?gt=' + encode(data.geeGt) + '&callback=' + callbackName,
        null,
        fail
      );
    }

    if (window.Geetest) {
      ready();
    } else {
      loadScript('https://static.geetest.com/static/js/fullpage.0.0.0.js', ready, fail);
    }
  }

  function sendSms(tel) {
    startBusy();
    post('/api/login/sms/send', 'tel=' + encode(tel), function (data) {
      finish();
      if (!data) {
        toast('请求失败，请稍后重试', true);
        return;
      }
      if (data.code === 0) {
        smsSent();
        return;
      }
      if (data.code === -105 && data.geeGt && data.geeChallenge && data.recaptchaToken) {
        showCaptcha(tel, data);
        return;
      }
      if (data.code === -105) {
        toast(data.message || '哔哩哔哩要求人机验证', true);
        return;
      }
      toast(data.message || '验证码发送失败', true);
    });
  }

  function login(tel, code) {
    startBusy();
    post('/api/login/sms/login', 'tel=' + encode(tel) + '&code=' + encode(code), function (data) {
      finish();
      if (!data) {
        toast('请求失败，请稍后重试', true);
        return;
      }
      if (data.login) {
        toast('登录成功，正在返回...');
        setTimeout(function () {
          window.location.href = '/';
        }, 700);
        return;
      }
      if (data.code === -400) {
        toast('验证码错误或已失效', true);
        return;
      }
      if (data.code === -105) {
        toast('哔哩哔哩要求人机验证，请稍后再试', true);
        return;
      }
      toast(data.message || '登录失败', true);
    });
  }

  function onSubmit(event) {
    event = event || window.event;
    if (event) {
      if (event.preventDefault) event.preventDefault();
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      } else if (event.stopPropagation) {
        event.stopPropagation();
      }
    }
    if (busy || captchaLoading) return false;

    var idInput = document.getElementById('_userid');
    var codeInput = document.getElementById('_vdcodes');
    var tel = idInput ? String(idInput.value || '').replace(/\D/g, '') : '';
    var code = codeInput ? String(codeInput.value || '').replace(/\D/g, '') : '';

    if (!/^1[3-9]\d{9}$/.test(tel)) {
      toast('请输入手机号', true);
      if (idInput) idInput.focus();
      return false;
    }
    if (/^\d{4,8}$/.test(code)) {
      login(tel, code);
    } else {
      sendSms(tel);
    }
    return false;
  }

  function bind(element, type, handler) {
    if (!element) return;
    if (element.addEventListener) {
      element.addEventListener(type, handler, true);
    } else if (element.attachEvent) {
      element.attachEvent('on' + type, handler);
    } else {
      element['on' + type] = handler;
    }
  }

  bind(getLoginForm(), 'submit', onSubmit);
  bind(getLoginButton(), 'click', onSubmit);
})();
