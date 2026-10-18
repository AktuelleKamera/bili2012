url=["http://moremoe.taobao.com/","http://moremoe.taobao.com/","http://moremoe.taobao.com/"];
banner=["/video-page/assets/static.hdslb.com/ad-images/video/E1/2012-09-25-01.jpg","/video-page/assets/static.hdslb.com/ad-images/video/E1/2012-09-25-02.jpg","/video-page/assets/static.hdslb.com/ad-images/video/E1/2012-09-25-03.jpg"];
ad_id = new Date().getSeconds() % banner.length;$("<a href=\"" + url[ad_id] + "\" target=\"_blank\"><img src=\"" + banner[ad_id] + "\" border=\"0\" /></a>").appendTo('.ad-e1');
var ads = "/video-page/assets/www.bilibili.tv/bdad.html";
var ads2 = "/video-page/assets/www.bilibili.tv/bdad2.html";
if (window.location.href.match(/bilibili.kankanews.com/i)){
  ads = "http://bilibili.kankanews.com/bdad-kankan-468.html";
  ads2 = "http://bilibili.kankanews.com/bdad-kankan-468-2.html";
}
var f1 = (ad_id + 1) % banner.length;var f2 = (ad_id + 2) % banner.length;$(".ad-f").css({display:"flex",justifyContent:"space-between"}).html('<div class="left"><a href="'+url[f1]+'" target="_blank"><img src="'+banner[f1]+'" style="display:block;width:468px;height:60px;object-fit:cover;border-radius:5px;" /></a></div><div class="right"><a href="'+url[f2]+'" target="_blank"><img src="'+banner[f2]+'" style="display:block;width:468px;height:60px;object-fit:cover;border-radius:5px;" /></a></div>');
$(function(){
if ($('kengdie').size()){
	$('#alistads').html( "<span style=\"color:red; font-size:20px; font-weight:bold;\">广告是目前能维持本站持续运作的唯一途径，病态的发展只会导致网站逐渐失去运作的能力！</span>");
	$('#BiliAdFilter1').html( "<span style=\"color:red; font-size:20px; font-weight:bold;\">广告是目前能维持本站持续运作的唯一途径，病态的发展只会导致网站逐渐失去运作的能力！</span>");
	$('#contgg1').html( "<span style=\"color:red; font-size:20px; font-weight:bold;\">广告是目前能维持本站持续运作的唯一途径，病态的发展只会导致网站逐渐失去运作的能力！</span>");
}
setTimeout(function(){ bindAdElement(); }, 1000);
});
