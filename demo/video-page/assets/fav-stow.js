(function () {
  if (!window.jQuery) return;

  var style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(
    document.createTextNode(
      '.viewbox .stowbox .fav-stow-head{padding-bottom:8px;color:#333;font-size:14px;border-bottom:1px solid #eee;margin-bottom:8px;}' +
        '.viewbox .stowbox .fav-stow-list{max-height:220px;overflow:auto;min-width:210px;margin-bottom:10px;}' +
        '.viewbox .stowbox .fav-stow-list label{display:block;padding:4px 0;cursor:pointer;white-space:nowrap;}' +
        '.viewbox .stowbox .fav-stow-list input{margin-right:5px;vertical-align:middle;}' +
        '.viewbox .stowbox .fav-stow-list em{font-style:normal;color:#999;margin-left:4px;}' +
        '.viewbox .stowbox .fav-stow-actions{text-align:right;padding-top:8px;border-top:1px solid #eee;}' +
        '.viewbox .stowbox .fav-stow-actions .button{margin-left:8px;}' +
        '.viewbox .stowbox .fav-stow-msg{padding:12px 0;color:#666;}'
    )
  );
  document.getElementsByTagName('head')[0].appendChild(style);

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMessage(box, html) {
    box.html('<div class="box"><div class="fav-stow-head">收藏到</div><div class="fav-stow-msg">' + html + '</div></div>');
    box.slideDown(250);
  }

  window.showStow = function (aid, obj) {
    var box = jQuery('.stowbox');
    if (!box.length) return false;
    if (box.is(':visible')) {
      box.slideUp(250);
      return false;
    }

    box.html('<div class="box"><div class="fav-stow-msg">正在读取收藏夹...</div></div>').slideDown(250);

    jQuery.ajax({
      url: '/api/fav/folders?aid=' + encodeURIComponent(aid),
      type: 'GET',
      dataType: 'json',
      success: function (data) {
        if (!data || !data.login) {
          renderMessage(box, '请先<a href="/login">登录</a>后再收藏。');
          return;
        }
        if (data.code !== 0) {
          renderMessage(box, escapeHtml(data.message || '收藏夹读取失败'));
          return;
        }
        var folders = data.folders || [];
        if (!folders.length) {
          renderMessage(box, '还没有收藏夹，请先在网页端创建。');
          return;
        }

        var html = '<div class="box"><div class="fav-stow-head">收藏到</div><div class="fav-stow-list">';
        for (var i = 0; i < folders.length; i++) {
          var folder = folders[i];
          html +=
            '<label><input type="checkbox" data-id="' +
            escapeHtml(folder.id) +
            '" data-checked="' +
            (folder.checked ? '1' : '0') +
            '"' +
            (folder.checked ? ' checked="checked"' : '') +
            ' />' +
            escapeHtml(folder.title) +
            '<em>(' +
            escapeHtml(folder.count) +
            ')</em></label>';
        }
        html +=
          '</div><div class="fav-stow-actions">' +
          '<a class="button fav-stow-save" href="javascript:;">确定</a>' +
          '<a class="button fav-stow-cancel" href="javascript:;">取消</a>' +
          '</div></div>';
        box.html(html);

        box.find('.fav-stow-cancel').click(function () {
          box.slideUp(250);
          return false;
        });

        box.find('.fav-stow-save').click(function () {
          var add = [];
          var del = [];
          box.find('.fav-stow-list input[type="checkbox"]').each(function () {
            var input = jQuery(this);
            var id = input.attr('data-id');
            var was = input.attr('data-checked') === '1';
            var now = input.is(':checked');
            if (now && !was) add.push(id);
            if (!now && was) del.push(id);
          });
          if (!add.length && !del.length) {
            box.slideUp(250);
            return false;
          }

          var save = jQuery(this);
          save.text('保存中...').addClass('disabled');
          jQuery.ajax({
            url: '/api/fav/deal',
            type: 'POST',
            dataType: 'json',
            data: {
              aid: aid,
              add: add.join(','),
              del: del.join(','),
            },
            success: function (result) {
              if (!result || result.code !== 0) {
                save.text('确定').removeClass('disabled');
                renderMessage(box, escapeHtml((result && result.message) || '收藏失败'));
                return;
              }
              box.slideUp(200);
              setTimeout(function () {
                window.location.reload();
              }, 300);
            },
            error: function () {
              save.text('确定').removeClass('disabled');
              renderMessage(box, '请求失败，请稍后重试。');
            },
          });
          return false;
        });
      },
      error: function (xhr) {
        var data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) {}
        if (xhr.status === 401 || (data && data.login === false)) {
          renderMessage(box, '请先<a href="/login">登录</a>后再收藏。');
          return;
        }
        renderMessage(box, '请求失败，请稍后重试。');
      },
    });
    return false;
  };
})();
