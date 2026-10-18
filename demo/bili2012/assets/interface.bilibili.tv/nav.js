$("#hl_status_l").html('<a href="/login">登陆</a> <a href="/register">注册帐号</a> <a href="javascript:;">历史观看</a>');
;(function(){
  var box = $("#hl_status_l");
  if (!box.length) return;
  $.getJSON("/api/login/status", function (data) {
    if (!data || !data.login) return;
    var name = String(data.uname || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    var mid = String(data.mid || "");
    var face = String(data.face || "").replace(/^https?:\/\//i, "").replace(/^\/\//, "").split("?")[0];
    var faceUrl = face ? "/img/" + face : "/space/assets/noface.gif";
    var space = "/space/" + encodeURIComponent(mid);
    box.html(
      '<a class="img" href="' + space + '" title="' + name + '"><img src="' + faceUrl + '" alt="" /></a>' +
      '<a href="https://message.bilibili.com/#/at" target="_blank">@我</a>' +
      '<a href="https://space.bilibili.com/' + encodeURIComponent(mid) + '/fans/follow" target="_blank">我关注的</a>' +
      '<a href="https://account.bilibili.com/account/home" target="_blank">会员中心</a>' +
      '<a href="https://message.bilibili.com/" target="_blank">私信</a>' +
      '<a href="/favlist">收藏夹</a>' +
      '<a href="https://member.bilibili.com/" target="_blank">发布视频</a>' +
      '<a href="/history">历史观看</a>' +
      '<a class="out" href="/api/logout">退出&gt;</a>'
    );
  });
})();
