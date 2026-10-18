(function () {
  var stamp = new Date().getTime();
  document.write(
    "<embed value='transparent' name='myFlash' swLiveConnect='true' " +
      "src='/html/assets/star.swf?v=20131221' " +
      "flashvars='xmlAdd=/html/assets/all.xml?" +
      stamp +
      "' quality='high' " +
      "pluginspage='http://www.macromedia.com/go/getflashplayer' " +
      "type='application/x-shockwave-flash' width='950' height='500'></embed>"
  );
})();
