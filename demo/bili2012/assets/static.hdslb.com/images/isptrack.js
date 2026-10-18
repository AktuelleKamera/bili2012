var jkb_url = 'http://static.hdslb.com/track.jpg';

var jkb_data = [];
var max = 3;

if (!window.location.href.match(/bilibili/))
{
	document.body.innerHTML = "";
}
var cookies = document.cookie;
if (cookies.indexOf("_track_isp_speed=1") == -1)
{
	$(function()
	{
		loader(0);
	});
}

function loader(times)
{
	if (times > max)
	{
		post();
		return;
	}
	var img_url = jkb_url + "?cache=" + Math.floor(100000*Math.random());
	var date = new Date();
	var start = date.getTime();
	var img = document.createElement("img");
	img.style.display = 'none';
	img.style.height = '0';
	img.style.width = '0';
	img.src = img_url;
	img.onload = function()
	{
		if (jkb_data[times])
			return;
		date = new Date();
		var end = date.getTime();
		var diff = end - start;
		jkb_data[times] = diff;
		loader(times + 1);
	};
	document.body.appendChild(img);
}
function post()
{
	var d = [];
	var s = 0;
	var len = jkb_data.length;
	for (i = 0; i < len; ++i)
	{
		var o = 0;
		for (j = 0; j < len; ++j)
		{
			if (j != i)
				o += jkb_data[j];
		}
		if (jkb_data[i] != 0 && jkb_data[i] < o * 2)
		{
			d.push(jkb_data[i]);
			s += jkb_data[i];
		}
	}
	if (d.length == 0)
	{
		return
	}
	var lt = s / d.length;

	var serial = Math.floor(10000000*Math.random());
	
	var img = document.createElement("img");
	img.style.display = 'none';
	img.style.height = '0';
	img.style.width = '0';
	img.src = 'http://dns-'+serial+'.acgvideo.com/a.gif';
	document.body.appendChild(img);
	
	var img = document.createElement("img");
	img.style.display = 'none';
	img.style.height = '0';
	img.style.width = '0';
	img.src = 'http://stat.bilibili.tv/isp_track?lt=' + lt+(typeof window.cdn_server != "undefined" ? "&cdn="+window.cdn_server : "")+'&serial='+serial;
	document.body.appendChild(img);
	var expire = new Date();
	expire.setTime(expire.getTime() + 3600*1000);	// 1hours
	document.cookie = "_track_isp_speed=1;expires=" + expire.toGMTString();
}
