
document.onerror=function(){return true;};var _index_rbox_bangumi_selectByUser=false;function imod_box_get3d_date()
{$d=new Date();$d.setTime($d.getTime()-86400*7000);return $d.toYMD()+","+(new Date()).toYMD();}
function imod_newsbox_render(frm,jsondata)
{var data_container=$("<ul></ul>").appendTo(frm);for(var i in jsondata.list)
{$('<li'+(i==0?' class="a1"':'')+'>'+(i==0&&jsondata.list[i].cover!=''?'<div class="imgbox"><img src="'+jsondata.list[i].cover+'" /></div>':'')+'<p class="t"><span class="c'+jsondata.list[i].typeid+'">'+jsondata.list[i].typename+'</span><a href="http://news.bilibili.tv/news/'+jsondata.list[i].news_id+'.html" target="_blank">'+jsondata.list[i].title+'</a></p>'+
(i==0?'<p class="info">'+jsondata.list[i].abstract+'</p>':'')+'</li>').appendTo(data_container);}
$('<div class="more"><span>部分国内的新闻信息</span><a href="http://news.bilibili.tv/" target="_blank">更多</a></div>').appendTo(data_container);}
function imod_stdvideo_sub_render(frm,list)
{var data_container=$("<ul></ul>").appendTo(frm);for(var i in list)
{l=list[i];$('<div class="po" gk="'+l.play+'" sc="'+l.favorites+'" pl="'+l.review+'" dm="'+l.video_review+'" lm="'+l.typename+'" tg="'+l.create+'" txt="'+l.description.replace(/"/g,"&quot;")+'" subtitle="'+l.subtitle+'" pf="'+l.credit+'" up="'+l.author+'" yb="'+l.coins+'">'+'<a href="/video/av'+l.aid+'/" target="_blank"><img _src="" src="'+l.pic+'"><div class="vbg"></div><div class="t">'+l.title+'</div></a>'+'<div class="z"><i>'+l.coins+' (+'+l.credit+')</i><b>'+l.duration+'</b></div>'+'<div class="i"><b class="c1">'+l.play+'</b><b class="c2">'+l.video_review+'</b></div>'+'</div>').appendTo(data_container);}
bindPOCoins(data_container.find(".po"));}
function imod_competition_main_render(frm,list)
{var data_container=$("<ul></ul>").appendTo(frm);var page_selector=$("<div class=\"lingo\"></div>").appendTo(frm);var current_page=0;var timer=null;var onFrame=false;var show=function(page)
{clearTimeout(timer);if(!onFrame)
{timer=setTimeout(function(){show((current_page+1)%5);},5000);}
current_page=page;$(data_container).fadeOut(200,function(){$(data_container).empty();$("a",page_selector).removeClass("on");$($("a",page_selector).get(page)).addClass("on");for(var i in list.list)
{if(i=="num")continue;if(i<page*5||i>=(page+1)*5)continue;l=list.list[i];$('<li gk="'+l.play+'" sc="'+l.favorites+'" pl="'+l.review+'" dm="'+l.video_review+'" lm="'+l.typename+'" tg="'+l.create+'" txt="'+l.description.replace(/"/g,"&quot;")+'" subtitle="'+l.subtitle+'" pf="'+l.credit+'" up="'+l.author+'" yb="'+l.coins+'"><a href="http://www.bilibili.tv/video/av'+l.aid+'/" target="_blank"><div class="img"><img src="'+l.pic+'"></div><div class="t">'+l.title+'</div></a></li>').appendTo(data_container);}
bindPOCoins(data_container.find("li"));$(data_container).fadeIn(200);});};for(var i=0;i<5;i++)
{(function(page)
{$("<a></a>").appendTo(page_selector).click(function(){show(page);});})(i);}
$(frm).unbind("mouseover");$(frm).unbind("mouseout");$(frm).bind("mouseover",function()
{onFrame=true;clearTimeout(timer);});$(frm).bind("mouseout",function()
{onFrame=false;timer=setTimeout(function(){show((current_page+1)%5);},5000);});show(0);}
function imod_slist_render(frm,jsonData)
{var data_container=$("<ul class=\"rlist\"></ul>").appendTo(frm);for(var i in jsonData.list)
{$('<li video_review="'+jsonData.list[i].video_review+'" favorites="'+jsonData.list[i].favorites+'" author="'+jsonData.list[i].author+'" description="'+jsonData.list[i].description.replace(/"/g,"&quot;")+'" create="'+jsonData.list[i].create+'" coins="'+jsonData.list[i].coins+'" subtitle="'+jsonData.list[i].subtitle+'"><a href="/video/av'+jsonData.list[i].aid+'/" target="_blank"><img src="'+jsonData.list[i].pic+'"><div class="title">'+jsonData.list[i].title+'</div></a><div class="i"><b class="c1">'+jsonData.list[i].play+'</b><b class="c2">'+jsonData.list[i].video_review+'</b></div></li>').appendTo(data_container);}}
function imod_catabox_main_render(frm,jsonData,smod)
{imod_stdvideo_sub_render(frm,jsonData[smod.dataindex]);}
Date.prototype.toYMD=Date_toYMD;function Date_toYMD(){var year,month,day;year=String(this.getFullYear());month=String(this.getMonth()+1);if(month.length==1){month="0"+month;}
day=String(this.getDate());if(day.length==1){day="0"+day;}
return year+"-"+month+"-"+day;}
function imod_catabox_topcredit_render(frm,jsonData,smod)
{var data_container=$("<ul class=\"right_box\"></ul>").appendTo(frm);for(var i in jsonData.credit[smod.dataindex].list)
{var l=jsonData.credit[smod.dataindex].list[i];$('<li><a href="/video/av'+l.aid+'/" target="_blank"><img src="'+l.pic+'" /><div class="t">'+l.title+'</div></a><div class="i"><b class="c1">'+l.play+'</b><b class="c2">'+l.video_review+'</b></div></li>').appendTo(data_container);}
$('<div class="more"><span>获得评分最高的视频</span><a href="/list/rank-'+smod.dataindex+'.html#comment,1,'+imod_box_get3d_date()+'" target="_blank">更多</a></div>').appendTo(data_container);}
http:function imod_catabox_new_render(frm,jsonData,smod)
{var data_container=$("<ul class=\"right_box new\"></ul>").appendTo(frm);for(var i in jsonData.newv[smod.dataindex].list)
{var l=jsonData.newv[smod.dataindex].list[i];$('<li><a href="/video/av'+l.aid+'/" target="_blank"><div class="t">'+l.title+'</div></a><i>'+l.create.substr(5,5)+'</i></li>').appendTo(data_container);}
$('<div class="more"><span>最新投稿的视频</span><a href="/video/'+smod.dataindex+'.html" target="_blank">更多</a></div>').appendTo(data_container);}
function imod_userbox_hot_tag_main_render(frm,hot_tag)
{var data_container=$("<ul class=\"tag\"></ul>").appendTo(frm);hot_tag.shuffle();for(var i=0;i<(25>hot_tag.length?hot_tag.length:25);i++)
{$("<li>"+(hot_tag[i][2]?'<a href="/sp/'+hot_tag[i][0]+'" target="_blank"><img src="/video-page/assets/static.hdslb.com/images/btn/btn_zhuan2.gif" title="专题" /></a>':"")+"<a href=\"/search?keyword="+hot_tag[i][0]+"\" target=\"_blank\">"+hot_tag[i][0]+"</a></li>").appendTo(data_container);}
$('<div class="more"><span>一周内搜索最多的关键字</span></div>').appendTo(data_container);}
function imod_userbox_recommend_main_render(frm,recommend)
{var data_container=$("<ul class=\"rlist\"></ul>").appendTo(frm);for(var i in recommend.list)
{var recommend_html="";for(var k in recommend.list[i].last_recommend)
{recommend_html+='<a card="'+recommend.list[i].last_recommend[k].uname+'" href="http://space.bilibili.tv/'+recommend.list[i].last_recommend[k].mid+'" target="_blank"><img src="'+recommend.list[i].last_recommend[k].face+'" /></a>'}
$('<li video_review="1390" favorites="424" author="小清水亜美" description="高清中文字幕 fan_sub EVA 新 劇場版 Q 冒頭6分" create="2012-11-17 03:14" coins="222" subtitle="">'+'<a href="/video/av'+recommend.list[i].aid+'/" target="_blank"><img src="'+recommend.list[i].pic+'"><div class="title">'+recommend.list[i].title+'</div></a>'+'<div class="tjr">'+recommend_html+'</div></li>').appendTo(data_container);}
$('<div class="more"><span>特别推荐的视频</span><a href="/list/recommend/1.html" target="_blank">更多</a></div>').appendTo(frm);}
function imod_userbox_dynamic_main_render(frm,jsonData)
{var data_container=$("<ul class=\"ruplist\"></ul>").appendTo(frm);for(var i in jsonData.list)
{var l=jsonData.list[i];var dynstr='添加了新视频';if(l.dyn_type=="REVIEW")
{dynstr='在视频 <a href="'+l.link+'">'+l.title+'</a> 发表了新评论';}else if(l.dyn_type=="NEWS_REVIEW")
{dynstr='在新闻 <a href="'+l.link+'">'+l.title+'</a> 发表了新评论';}else if(l.dyn_type=="SPECIAL_ADDSP")
{dynstr="添加了新专题"}
$('<li><a href="'+(l.dyn_type=="REVIEW"||l.dyn_type=="NEWS_REVIEW"?"http://space.bilibili.tv/"+l.mid:l.link)+'"><img src="'+l.cover+'" title="'+l.title+'" /><div class="name">'+(l.dyn_type=="REVIEW"||l.dyn_type=="NEWS_REVIEW"?l.author:l.title)+'</div></a><p class="i"><b>'+(l.dyn_type.substr(0,8)=="SPECIAL_"?"专题":date_format(l.timestamp))+'</b></p><div class="info">'+dynstr+'</div></li>').appendTo(data_container);}
$('<div class="more"><span>关注的最新信息</span><a href="/dynamic.html">更多</a></div>').appendTo(data_container);}
function imod_recommend_union_render(frm,jsondata)
{imod_stdvideo_sub_render(frm,jsondata.recommend.list);}
function imod_hot_union_render(frm,jsondata)
{imod_slist_render(frm,jsondata.hot);$('<div class="more"><span>本周播放数最高的视频</span><a href="/list/rank.html#hot,1,'+imod_box_get3d_date()+'" target="_blank">更多</a></div>').appendTo(frm);}
function imod_hot_bangumi_union_render(frm,jsondata)
{imod_slist_render(frm,jsondata.hot_bangumi);$('<div class="more"><span>本周播放数最高的视频</span><a href="/list/rank-bangumi.html#comment,1,'+imod_box_get3d_date()+'" target="_blank">更多</a></div>').appendTo(frm);}
function imod_userbox_bangumi_render(frm,data,smod,sub_mod)
{var data_container=$("<ul></ul>").appendTo(frm);var num=0;for(var i in data)
{if(data[i].weekday!=sub_mod.weekday)continue;$("<li"+(data[i]['new']?" class=\"new\"":"")+"><a href=\"/sp/"+encodeURIComponent(data[i].title)+"\" target=\"_blank\" title=\""+data[i].title+"\">"+data[i].title+"</a><b>"+data[i].bgmcount+"</b></a></li>").appendTo(data_container);}
$('<div class="more"><a href="/video/bangumi.html" target="_blank">新番放送表</a></div>').appendTo(data_container);}
var base_ads=3;var index_module={hotbox:{inewbox:{modName:'hotbox.inewbox',mainframe:".border-n",frame:'<div class="inewbox"><div class="border-n"><div class="hd"><div class="hdt"><a href="http://news.bilibili.tv/" target="_blank">新闻信息</a></div></div></div></div>',className:"newsbox",submenu:[{title:"国内",datasource:"/index/news-mainland.json",render:imod_newsbox_render},{title:"综合",datasource:"/index/news.json",render:imod_newsbox_render}]},recommend:{modName:'hotbox.recommend',frame:'<div class="hst_box right"><div class="hd"><div class="hdt"><a class="recommend" href="/list/rank.html#promote,1,'+imod_box_get3d_date()+'">强力推荐</a></div></div></div>',className:"pading5",submenu:[{title:"昨日",datasource:"/index/ranking.json",render:imod_recommend_union_render},{title:"三日",datasource:"/index/ranking-3day.json",render:imod_recommend_union_render},{title:"本周",datasource:"/index/ranking-week.json",render:imod_recommend_union_render}]}},largeleft:{douga:{modName:'catabox.douga',frame:'<div class="z-l iv"><div class="hd"><div class="hdt"><a class="douga" href="/video/douga.html" target="_blank">动画<b>Animation</b></a></div></div><div class="vidbox"><div class="left"></div></div></div>',mainframe:".vidbox",className:'right',mainDataContainer:'.left',datasource:"/index/ding.json",dataindex:'douga',render:imod_catabox_main_render,submenu:[{title:"<b>最</b>高评分",datasource:"/index/ranking-week.json",render:imod_catabox_topcredit_render},{title:"最新投稿",datasource:"/index/ranking.json",render:imod_catabox_new_render}]}},rbox:{hot:{modName:'rbox.hot',frame:'<div class="z-r"><div class="hd"><div class="hdt"><a class="xds" href="/list/rank.html#hot,1,'+imod_box_get3d_date()+'">热门视频</a></div><div class="vdate"><span>三日</span><ul><li val="yesterday">昨日</li><li val="threeday">三日</li><li val="week">一周</li></ul></div></div></div>',className:'center',submenu:[{title:"全站",datasource:"/index/ranking-3day.json",render:imod_hot_union_render},{title:"新番",datasource:"/index/ranking-3day.json",render:imod_hot_bangumi_union_render,click:function(main_frame){if(!_index_rbox_bangumi_selectByUser)main_frame.find(".vdate ul li[val=week]").click();}}],onload:function(main_frame,smod,sub_btn,sub_frame){main_frame.find(".vdate").css("cursor","pointer");main_frame.find(".vdate ul li").click(function(){var sub_btn=main_frame.find(".hd .swc li");if($(this).attr("val")=="yesterday")
{sub_btn.attr("datasource","/index/ranking.json");}else if($(this).attr("val")=="week")
{sub_btn.attr("datasource","/index/ranking-week.json");}else
{sub_btn.attr("datasource","/index/ranking-3day.json");}
main_frame.find(".vdate span").html(this.innerHTML);_index_rbox_bangumi_selectByUser=true;main_frame.find(".hd .swc .on").click();_index_rbox_bangumi_selectByUser=false;});}},adsc2:{modName:'rbox.c2',frame:'<div class="ad-c2"></div>'}},catabox:{ads:{modName:'catabox.ads',frame:'<div class="ad-b2"></div>',oninit:function(){index_module.catabox.ads.frame='<div class="ad-b'+(base_ads++)+'"></div>';return true;}},douga:{modName:'catabox.douga',frame:'<div class="z-l iv"><div class="hd"><div class="hdt"><a class="douga" href="/video/douga.html" target="_blank">动画<b>Animation</b></a></div></div><div class="vidbox"><div class="left"></div></div></div>',mainframe:".vidbox",className:'right',mainDataContainer:'.left',datasource:"/index/ding.json",dataindex:'douga',render:imod_catabox_main_render,submenu:[{title:"<b>最</b>高评分",datasource:"/index/ranking-week.json",render:imod_catabox_topcredit_render},{title:"最新投稿",datasource:"/index/ranking.json",render:imod_catabox_new_render}]},music:{modName:'catabox.music',frame:'<div class="z-l iv"><div class="hd"><div class="hdt"><a class="music" href="/video/music.html" target="_blank">音乐<b>Music</b></a></div></div><div class="vidbox"><div class="left"></div></div></div>',mainframe:".vidbox",className:'right',mainDataContainer:'.left',datasource:"/index/ding.json",dataindex:'music',render:imod_catabox_main_render,submenu:[{title:"<b>最</b>高评分",datasource:"/index/ranking-week.json",render:imod_catabox_topcredit_render},{title:"最新投稿",datasource:"/index/ranking.json",render:imod_catabox_new_render}]},bangumi:{modName:'catabox.bangumi',frame:'<div class="z-l iv"><div class="hd"><div class="hdt"><a class="bangumi" href="/video/bangumi.html" target="_blank">新番<b>Bangumi</b></a></div></div><div class="vidbox"><div class="left"></div></div></div>',mainframe:".vidbox",menuframe:".hd2",className:'right',mainDataContainer:'.left',datasource:"/index/ding.json",dataindex:'bangumi',render:imod_catabox_main_render,submenu:[{title:"<b>最</b>高评分",datasource:"/index/ranking-week.json",render:imod_catabox_topcredit_render},{title:"最新投稿",datasource:"/index/ranking.json",render:imod_catabox_new_render}]},game:{modName:'catabox.game',frame:'<div class="z-l iv"><div class="hd"><div class="hdt"><a class="game" href="/video/game.html" target="_blank">游戏<b>Game</b></a></div></div><div class="vidbox"><div class="left"></div></div></div>',mainframe:".vidbox",className:'right',mainDataContainer:'.left',datasource:"/index/ding.json",dataindex:'game',render:imod_catabox_main_render,submenu:[{title:"<b>最</b>高评分",datasource:"/index/ranking-week.json",render:imod_catabox_topcredit_render},{title:"最新投稿",datasource:"/index/ranking.json",render:imod_catabox_new_render}]},technology:{modName:'catabox.technology',frame:'<div class="z-l iv"><div class="hd"><div class="hdt"><a class="technology" href="/video/technology.html" target="_blank">科学·技术<b>Science·technology</b></a></div></div><div class="vidbox"><div class="left"></div></div></div>',mainframe:".vidbox",className:'right',mainDataContainer:'.left',datasource:"/index/ding.json",dataindex:'technology',render:imod_catabox_main_render,submenu:[{title:"<b>最</b>高评分",datasource:"/index/ranking-week.json",render:imod_catabox_topcredit_render},{title:"最新投稿",datasource:"/index/ranking.json",render:imod_catabox_new_render}]},ent:{modName:'catabox.ent',frame:'<div class="z-l iv"><div class="hd"><div class="hdt"><a class="ent" href="/video/ent.html" target="_blank">娱乐<b>Entertainment</b></a></div></div><div class="vidbox"><div class="left"></div></div></div>',mainframe:".vidbox",className:'right',mainDataContainer:'.left',datasource:"/index/ding.json",dataindex:'ent',render:imod_catabox_main_render,submenu:[{title:"<b>最</b>高评分",datasource:"/index/ranking-week.json",render:imod_catabox_topcredit_render},{title:"最新投稿",datasource:"/index/ranking.json",render:imod_catabox_new_render}]},competition:{modName:'catabox.competition',frame:'<div class="z-l iv"><div class="hd"><div class="hdt"><a href="/list/vote/1.html">弹幕大赛<b></b></a></div></div><div class="acti_box"></div></div>',mainDataContainer:'.acti_box',datasource:"/index/competition.json",dataindex:'competition',render:imod_competition_main_render}},userbox:{adsc3:{modName:'userbox.c3',frame:'<div class="ad-c3"></div>'},adsc4:{modName:'userbox.c4',frame:'<div class="ad-c4"></div>'},adsc5:{modName:'userbox.c5',frame:'<div class="ad-c5"></div>'},adsc6:{modName:'userbox.c6',frame:'<div class="ad-c6"></div>'},hot_tag:{modName:'userbox.hot_tag',frame:'<div class="z-r"><div class="hd"><div class="hdt"><a target="_blank">热门TAG</a></div></div><div class="center"></div></div>',mainDataContainer:'.center',datasource:"/html/js/hot_tag.json",render:imod_userbox_hot_tag_main_render},bangumi:{modName:'userbox.bangumi',submenu_class:"",submenu_frame:".bgmtts",className:"bgmmbox",frame:'<div class="z-r"><div class="bgmtts"><ul></ul></div><div class="center"></div></div>',mainframe:".center",submenu:[{title:"周日",datasource:"/index/bangumi.json?v=2",weekday:0,render:imod_userbox_bangumi_render},{title:"周一",datasource:"/index/bangumi.json?v=2",weekday:1,render:imod_userbox_bangumi_render},{title:"周二",datasource:"/index/bangumi.json?v=2",weekday:2,render:imod_userbox_bangumi_render},{title:"周三",datasource:"/index/bangumi.json?v=2",weekday:3,render:imod_userbox_bangumi_render},{title:"周四",datasource:"/index/bangumi.json?v=2",weekday:4,render:imod_userbox_bangumi_render},{title:"周五",datasource:"/index/bangumi.json?v=2",weekday:5,render:imod_userbox_bangumi_render},{title:"周六",datasource:"/index/bangumi.json?v=2",weekday:6,render:imod_userbox_bangumi_render}],oninitEvent:function(btn,box)
{buildop(btn,box,'userbox.bangumi',new Date().getDay());}},recommend:{modName:'userbox.recommend',frame:'<div class="z-r"><div class="hd"><div class="hdt"><a href="/list/recommend/1.html" target="_blank">特别推荐</a></div></div><div class="center"></div></div>',mainDataContainer:'.center',datasource:"/index/recommend.json",render:imod_userbox_recommend_main_render},my_attention:{modName:'userbox.my_attention',frame:'<div class="z-r"><div class="hd"><div class="hdt"><a href="/dynamic.html" target="_blank">我所关注的更新</a></div></div><div class="center"></div></div>',mainDataContainer:'.center',datasource:"/index/dynamic.json",render:imod_userbox_dynamic_main_render,oninit:function(){return __GetCookie("DedeUserID")?true:false;}}}};var bb_index_data_main_cache={};var bb_index_data_main_lock={};var bb_index_data_cache={};var bb_index_data_lock={};function buildop(btn,box,saveid,default_value){var $box_btn=$(btn);var $box=$(box);$box_btn.click(function(){var index=$box_btn.index($(this));if(typeof(saveid)!="undefined"){ChatSaveSettings(saveid,index);}
$box_btn.removeClass('on');$(this).addClass('on');$box.hide();$($box.get(index)).fadeIn(300);});var i=default_value||ChatGetSettings(saveid);if(i)
{$($box_btn.get(i)).trigger("click");}
else
{if($box_btn.length==3)
{$($box_btn.get(1)).trigger("click");}else
{$($box_btn.get(0)).trigger("click");}}}
function bb_index_load_module(area,mod){var imod=index_module[area];if(typeof(imod)=="undefined"){alert('index module: '+area+' is not exists.');return;}
var smod=imod[mod];if(!typeof(smod)=="undefined")
{alert('index module: '+area+'.'+mod+' is not exists.');return;}
if(typeof(smod.oninit)!='undefined')
{if(!smod.oninit(smod))return false;}
var main_frame=$(smod.frame).appendTo('#'+area);if(typeof(smod.mainframe)!="undefined"){main_container=main_frame.find(smod.mainframe);}else
{main_container=main_frame;}
var sub_btn=[];var sub_frame=[];if(typeof(smod.datasource)!='undefined')
{var m_sframe=main_container.find(smod.mainDataContainer);var m_sub_mod=smod;$("<div class=\"no_more\">数据正在载入中...</div>").appendTo(m_sframe);var jsfunc=function(jsondata)
{bb_index_data_main_cache[m_sub_mod.datasource]=jsondata;m_sframe.empty();if(jsondata.length){m_sub_mod.render(m_sframe,jsondata,m_sub_mod);}else if(typeof(jsondata.list)=="undefined")
{$('<div class=\"no_more\">系统错误</div>').appendTo(m_sframe);}else if(jsondata.results==0||jsondata.num==0)
{$('<div class=\"no_more\">沒有数据</div>').appendTo(m_sframe);}else
{m_sub_mod.render(m_sframe,jsondata,m_sub_mod);}
if(bb_index_data_main_lock[m_sub_mod.datasource].length>0)
{var nf=bb_index_data_main_lock[m_sub_mod.datasource].shift();m_sub_mod=nf[0];m_sframe=nf[1];m_sub_mod=nf[2];nf[3](jsondata);}};if(typeof(bb_index_data_main_cache[m_sub_mod.datasource])!="undefined"&&(typeof(m_sub_mod.focus_refresh)=="undefined"||!m_sub_mod.focus_refresh))
{jsfunc(bb_index_data_main_cache[m_sub_mod.datasource]);}else
{if(typeof(bb_index_data_main_lock[m_sub_mod.datasource])=="undefined")
{bb_index_data_main_lock[m_sub_mod.datasource]=[];$.getJSON(m_sub_mod.datasource,jsfunc);}else
{bb_index_data_main_lock[m_sub_mod.datasource].push([m_sub_mod,m_sframe,m_sub_mod,jsfunc]);}}}
if(typeof(smod.submenu)!="undefined"){var menu=$('<ul class="'+(smod.submenu_class===undefined?"swc":smod.submenu_class)+'"></ul>').appendTo(main_frame.find(smod.submenu_frame===undefined?'.hd':smod.submenu_frame));var zi;for(zi=0;zi<smod.submenu.length;zi++)
{var btn=$("<li datasource=\""+smod.submenu[zi].datasource+"\">"+smod.submenu[zi].title+"</li>").appendTo(menu);btn.attr('id',smod.modName+"-"+zi);sub_btn[zi]=btn;sub_frame[zi]=$("<div class=\""+smod.className+"\"><div class=\"no_more\">数据正在载入中...</div></div>").appendTo(main_container);if(typeof(smod.submenu[zi].datasource)!='undefined')
{(function(){var smod_index=zi;var sub_mod=smod.submenu[zi];var sframe=sub_frame[zi];var sub_mod_root=smod;$(btn).click(function(){var ele=this;var jsfunc=function(jsondata)
{bb_index_data_cache[$(ele).attr("datasource")]=jsondata;sframe.empty();if(jsondata.length){sub_mod.render(sframe,jsondata,sub_mod_root,sub_mod);}else if(typeof(jsondata.list)=="undefined")
{$('<div class=\"no_more\">系统错误</div>').appendTo(sframe);}else if(jsondata.results==0)
{$('<div class=\"no_more\">沒有数据</div>').appendTo(sframe);}else
{sub_mod.render(sframe,jsondata,sub_mod_root,sub_mod);}
if(bb_index_data_lock[$(ele).attr("datasource")].length>0)
{var nf=bb_index_data_lock[$(ele).attr("datasource")].shift();ele=nf[0];sub_mod=nf[1];sframe=nf[2];sub_mod_root=nf[3];nf[4](jsondata);}};if(typeof(sub_mod.click)!="undefined")sub_mod.click(main_frame);if(typeof(bb_index_data_cache[$(ele).attr("datasource")])!="undefined"&&(typeof(sub_mod.focus_refresh)=="undefined"||!sub_mod.focus_refresh))
{jsfunc(bb_index_data_cache[$(ele).attr("datasource")]);}else
{if(typeof(bb_index_data_lock[$(ele).attr("datasource")])=="undefined")
{bb_index_data_lock[$(ele).attr("datasource")]=[];$.getJSON($(ele).attr("datasource"),jsfunc);}else
{bb_index_data_lock[$(ele).attr("datasource")].push([ele,sub_mod,sframe,sub_mod_root,jsfunc]);}}});})();}}
if(typeof(smod.oninitEvent)=="undefined")
{buildop(menu.find("li"),main_frame.find("."+smod.className),smod.modName);}else
{smod.oninitEvent(menu.find("li"),main_frame.find("."+smod.className));}}
if(typeof(smod.onload)=="function")
{smod.onload(main_frame,smod,sub_btn,sub_frame);}}
if(typeof(document.ontouchstart)=="undefined")
{var tempScrollTop,currentScrollTop=0;$("<a href=\"javascript:void(function(){scrollActivate=true;goTop();}());\" class=\"bak_top\"></a>").appendTo("body > .z");$(window).scroll(function(){currentScrollTop=$('body').scrollTop();if(tempScrollTop<currentScrollTop)
{scrollActivate=false;}
tempScrollTop=currentScrollTop;if($('body').scrollTop()>$(window).height()/2){$('.bak_top').fadeIn(200);$(".bak_top").css("top",$('body').scrollTop()+$(window).height()/2);}else{$('.bak_top').fadeOut(200);}});}