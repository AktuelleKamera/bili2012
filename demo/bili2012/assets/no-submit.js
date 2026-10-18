(function () {
  function toast(message) {
    var box = document.createElement('div');
    box.innerHTML = message;
    box.style.cssText =
      'position:fixed;top:18px;left:50%;margin-left:-90px;z-index:999999;' +
      'background:#333;color:#fff;padding:8px 14px;border-radius:4px;' +
      'font:13px/1.5 "Microsoft YaHei","SimSun",sans-serif;text-align:center;';
    document.body.appendChild(box);
    setTimeout(function () {
      if (box.parentNode) box.parentNode.removeChild(box);
    }, 2000);
  }

  function block(form, button, message) {
    function stop(event) {
      event = event || window.event;
      if (event) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        } else if (event.stopPropagation) {
          event.stopPropagation();
        }
      }
      toast(message);
      return false;
    }
    if (form) form.addEventListener('submit', stop, true);
    if (button) button.addEventListener('click', stop, true);
  }

  block(document.getElementById('regUser'), document.getElementById('btnSignCheck'), '本地演示不支持注册');
})();
