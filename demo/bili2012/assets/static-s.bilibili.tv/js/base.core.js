
var type_offset={1:121,3:188,4:258,5:424,11:490,13:584,36:0};var lastPage="";var lastTime=new Date(-300);function __GetCookie(cookieName)
{var theCookie=""+document.cookie;var ind=theCookie.indexOf(cookieName+"=");if(ind==-1||cookieName=="")
return"";var ind1=theCookie.indexOf(';',ind);if(ind1==-1)
ind1=theCookie.length;return unescape(theCookie.substring(ind+cookieName.length+1,ind1));};function __SetCookie(name,value){var Days=365;var exp=new Date();exp.setTime(exp.getTime()+Days*24*60*60*1000);document.cookie=name+"="+escape(value)+";expires="+exp.toGMTString()+"; path=/; domain=.bilibili.tv";};function ChatGetSettings(key)
{if(typeof(localStorage)!="undefined")
{return localStorage.getItem(key)}else
{return __GetCookie(key);}}
function ChatSaveSettings(key,val)
{if(typeof(localStorage)!="undefined")
{return localStorage.setItem(key,val)}else
{return __SetCookie(key,val);}}
var lastMessageBoxLayer=10000;function MessageBox(params){if(typeof(params)=="undefined")
{this.evType="over";this.Overlap=false;this.focusShowPos=false;this.zIndex=10000;return;}else if(typeof(params)=='string')
{this.evType=params;}else
{this.evType=typeof(params.evType)=='undefined'?'over':params.evType;}
this.Overlap=typeof(params.Overlap)=='undefined'?false:params.Overlap;this.focusShowPos=typeof(params.focusShowPos)=='undefined'?false:params.focusShowPos;if(typeof(params.position)!='undefined'){this.sp_position={left:params.position.left,top:params.position.top};}
if(typeof(params.zIndex)!='undefined'){this.zIndex=params.zIndex;}else
{this.zIndex=10000;}};MessageBox.prototype={timer:null,msgbox:null,bindobj:null,incomingTimer:null,position:{},show:function(obj,msg,timeout,icon,onclick)
{if(this.Overlap==false&&$(obj).attr('hasMessageBox')=='yes')return;$(obj).attr('hasMessageBox','yes');if(typeof(timeout)=="undefined")timeout=1000;if(typeof(icon)=="undefined")icon="msg";if(timeout=="button")
{onclick=icon;icon=timeout;timeout=1000;}
var vtimeout=timeout;if(timeout==0)vtimeout=50;var ricon=icon;if(icon=="button")ricon="question";var self=this;self.leftTimer=function()
{if(icon=='button')return;clearTimeout(self.timer);self.timer=setTimeout(function(){clearTimeout(self.timer);self.close(self);},vtimeout);};self.incomingTimer=function(){clearTimeout(self.timer);}
this.bindobj=obj;this.msgbox=$('<div class="m_layer"><div class="bg"><div class="content"><div class="mini"><b class="'+ricon+'"></b>'+msg+(icon=='button'?'<div class="btnbox"><a class="button ok">确认</a><a class="button cancel">取消</a></div>':'')+'</div></div></div></div>').prependTo("body");this.msgbox.css("z-index",self.zIndex);if(this.evType=='over')
{$(obj).bind('mouseout',self.leftTimer);$(obj).bind('mouseover',self.incomingTimer);this.msgbox.bind('mouseover',function(){clearTimeout(self.timer);});this.msgbox.bind('mouseout',self.leftTimer);}else
{$(obj).bind('blur',self.leftTimer);}
var effDirection="down";if(this.focusShowPos!="down"&&($(obj).offset().top+$(obj).outerHeight()+this.msgbox.outerHeight()-$('body').scrollTop()>$(window).height()||this.focusShowPos=='up'))
{effDirection="up";self.position.top=($(obj).offset().top-this.msgbox.outerHeight());}else
{self.position.top=$(obj).offset().top+$(obj).outerHeight();}
self.position.left=$(obj).offset().left;if(typeof(self.sp_position)!="undefined"){self.position=self.sp_position;}
this.msgbox.css("left",self.position.left+"px");this.msgbox.css("top",self.position.top+"px");this.msgbox.css("z-index",lastMessageBoxLayer++);this.msgbox.hide();if(icon=="button")
{this.msgbox.find(".ok").click(function(){if(typeof(onclick)=="undefined"||onclick(self)!=false)
{self.close();}});this.msgbox.find(".cancel").click(function(){self.close();});}
if(timeout!=0)self.leftTimer();if(typeof(jQuery.ui)!='undefined'&&effDirection=="up")
{this.msgbox.show("slide",{direction:"up"},200);}else
{this.msgbox.slideDown(200);}
return this.msgbox;},close:function()
{var self=this;$(self.bindobj).attr('hasMessageBox','');this.msgbox.slideUp(200);setTimeout(function(){self.msgbox.remove();if(self.evType=='over')
{$(self.bindobj).unbind('mouseover',self.incomingTimer);}
$(self.bindobj).unbind(self.evType=='over'?'mouseout':'blur',self.leftTimer);},200);}};function pagelist(target,page,pages,results,callback,unit,listsize)
{var list_len=listsize?listsize:3;page=parseInt(page);pages=parseInt(pages);results=parseInt(results);if(pages<=1&&results>0)
{return false;}
if(results==0)
{return false;}
var j;var listdd="";var total_list=list_len*2+1;if(page>=total_list)
{j=page-list_len;total_list=page+list_len;if(total_list>pages)
{total_list=pages;}}
else
{j=1;if(total_list>pages)
{total_list=pages;}}
$("<span>共 "+pages+" 页/ "+results+" 个"+unit+" </span>").appendTo(target);if(page!=1&&j!=1)
{$("<a class=\"indexPage\" href=\"javascript:;\" page=\"1\">首页 </a>").appendTo(target).click(function(){callback($(this).attr("page"));});}
else
{$("<a class=\"indexPage\" href=\"javascript:;\" page=\"1\">首页 </a>").appendTo(target).click(function(){callback($(this).attr("page"));});}
for(;j<=total_list;j++)
{if(j==page)
{$("<strong>"+j+"</strong>").appendTo(target);}
else
{$("<a href=\"javascript:;\" page=\""+j+"\">"+j+"</a>").appendTo(target).click(function(){callback($(this).attr("page"));});}}
if(page!=pages&&pages>1)
{$("<a class=\"nextPage\" href=\"javascript:;\" page=\""+(page+1)+"\">下页</a>").appendTo(target).click(function(){callback($(this).attr("page"));});}
if(page!=pages&&pages>1)
{$("<a class=\"endPage\" href=\"javascript:;\" page=\""+pages+"\">末页</a>").appendTo(target).click(function(){callback($(this).attr("page"));});}
else
{$("<strong class=\"endPage\">末页</strong>").appendTo(target);}}
var evCardTimer=null;function loadFB(aid,page,callback)
{var curPage="/feedback/arc-"+aid+"\-"+page+".html?r="+Math.random();if(curPage==lastPage)return;lastPage=curPage;$(".comm > .loading").remove();$('<div class="loading"></div>').prependTo(".comm");var startTime=new Date();$.ajax(lastPage,{success:function(data){var dur=new Date().getTime()-startTime.getTime();if(dur<500)
{setTimeout(function(){$(".comm").html(data);if(typeof(callback)!="undefined")callback();bindCardEvent();},300-dur<=0?10:300-dur);}else
{$(".comm").html(data);if(typeof(callback)!="undefined")callback();bindCardEvent();}}});}
function loadTopicFB(aid,page,callback)
{var curPage="/feedback/topic-"+aid+"\-"+page+".html?r="+Math.random();if(curPage==lastPage)return;lastPage=curPage;$(".comm > .loading").remove();$('<div class="loading"></div>').prependTo(".comm");var startTime=new Date();$.ajax(lastPage,{success:function(data){var dur=new Date().getTime()-startTime.getTime();if(dur<500)
{setTimeout(function(){$(".comm").html(data);if(typeof(callback)!="undefined")callback();bindCardEvent();},300-dur<=0?10:300-dur);}else
{$(".comm").html(data);if(typeof(callback)!="undefined")callback();bindCardEvent();}}});}
var searchKW="";function searchAT()
{searchKW=$("#search_key").val();loadAT(1);}
function loadAT(page)
{var curPage="/feedback/at-"+page+".html?search="+searchKW+"&att="+($(".ms-btn.addinfo").hasClass("on")?1:0)+"&r="+Math.random();if(curPage==lastPage)return;lastPage=curPage;$("#atme.atlist > .loading").remove();$('<div class="loading"></div>').prependTo("#atme.atlist");var startTime=new Date();$.ajax(lastPage,{success:function(data){var dur=new Date().getTime()-startTime.getTime();if(dur<500)
{setTimeout(function(){$("#atme.atlist").html(data);bindCardEvent();},300-dur<=0?10:300-dur);}else
{$("#atme.atlist").html(data);bindCardEvent();}}});}
function searchDyn()
{searchKW=$("#search_key").val();loadDyn(1);}
function loadDyn(page)
{var curPage="/dynamic/dyn-"+page+".html?search="+searchKW+"&fb="+($(".ms-btn.comm").hasClass("on")?1:0)+"&r="+Math.random();if(curPage==lastPage)return;lastPage=curPage;$("#dynlist.atlist > .loading").remove();$('<div class="loading"></div>').prependTo("#dynlist.atlist");var startTime=new Date();$.ajax(lastPage,{success:function(data){var dur=new Date().getTime()-startTime.getTime();if(dur<500)
{setTimeout(function(){$("#dynlist.atlist").html(data);bindCardEvent();},300-dur<=0?10:300-dur);}else
{$("#dynlist.atlist").html(data);bindCardEvent();}}});}
function agFB(obj,aid,mode,rid)
{var param="";switch(mode)
{case"arc":param="aid="+aid;break;case"news":param="news_id="+aid;break;case"topic":param="tp_id="+aid;break;}
$.ajax({type:"get",url:"http://interface.bilibili.tv/feedback/agreement?mode="+mode+"&"+param+"&rid="+rid+"&callback=?",dataType:"jsonp",success:function(data)
{if(data!="OK")
{(new MessageBox()).show(obj,data,2000,"warning");}else
{var h=$(obj).children("b").html();h=h.substr(2);h=h.substr(0,h.length-1);$(obj).children("b").html("(+"+(parseInt(h)+1)+")");(new MessageBox()).show(obj,"赞同成功",500,"info");}},error:function()
{(new MessageBox()).show(obj,"发送失败，请检查您的网络或发送邮件至 orz#hdslb.com",2000,"error");}});return false;}
function dagFB(obj,aid,mode,rid)
{var param="";switch(mode)
{case"arc":param="aid="+aid;break;case"news":param="news_id="+aid;break;case"topic":param="tp_id="+aid;break;}
$.ajax({type:"get",url:"http://interface.bilibili.tv/feedback/disagreement?mode="+mode+"&"+param+"&rid="+rid+"&callback=?",dataType:"jsonp",success:function(data)
{if(data!="OK")
{(new MessageBox()).show(obj,data,2000,"warning");}else
{var h=$(obj).children("b").html();h=h.substr(2);h=h.substr(0,h.length-1);$(obj).children("b").html("(+"+(parseInt(h)+1)+")");(new MessageBox()).show(obj,"反对成功",500,"info");}},error:function()
{(new MessageBox()).show(obj,"发送失败，请检查您的网络或发送邮件至 orz#hdslb.com",2000,"error");}});return false;}
function adDropFB(obj,mobj,aid,mode,rid)
{var param="";switch(mode)
{case"arc":param="aid="+aid;break;case"news":param="news_id="+aid;break;case"topic":param="tp_id="+aid;break;}
$.ajax({type:"get",url:"http://interface.bilibili.tv/m/hideFeedback?"+param+"&drop=1&rid="+rid+"&callback=?",dataType:"jsonp",success:function(data)
{if(data!="OK")
{(new MessageBox({Overlap:true,position:mobj.position})).show(obj,data,2000,"warning");}else
{(new MessageBox({Overlap:true,position:mobj.position})).show(obj,"删除成功",500,"info");setTimeout(function(){$(obj).closest("li").slideUp(500);},500);}},error:function()
{(new MessageBox({Overlap:true,position:mobj.position})).show(obj,"发送失败，请检查您的网络或发送邮件至 orz#hdslb.com",2000,"error");}});return false;}
function adHideFB(obj,aid,mode,rid)
{if(obj=="undefined")obj=this;var param="";switch(mode)
{case"arc":param="aid="+aid;break;case"news":param="news_id="+aid;break;case"topic":param="tp_id="+aid;break;}
$.ajax({type:"get",url:"http://interface.bilibili.tv/m/hideFeedback?"+param+"&rid="+rid+"&callback=?",dataType:"jsonp",success:function(data)
{if(data!="OK")
{(new MessageBox()).show(obj,data,2000,"warning");}else
{(new MessageBox()).show(obj,"隐藏成功",500,"info");$(obj).parent().find(".showfb").show();$(obj).hide();}},error:function()
{(new MessageBox()).show(obj,"发送失败，请检查您的网络或发送邮件至 orz#hdslb.com",2000,"error");}});return false;}
function adShowFB(obj,aid,mode,rid)
{if(obj=="undefined")obj=this;var param="";switch(mode)
{case"arc":param="aid="+aid;break;case"news":param="news_id="+aid;break;case"topic":param="tp_id="+aid;break;}
$.ajax({type:"get",url:"http://interface.bilibili.tv/m/showFeedback?"+param+"&rid="+rid+"&callback=?",dataType:"jsonp",success:function(data)
{if(data!="OK")
{(new MessageBox()).show(obj,data,2000,"warning");}else
{(new MessageBox()).show(obj,"显示成功",500,"info");$(obj).parent().find(".hidefb").show();$(obj).hide();}},error:function()
{(new MessageBox()).show(obj,"发送失败，请检查您的网络或发送邮件至 orz#hdslb.com",2000,"error");}});return false;}
function insertAtCursor(myField,myValue)
{if(document.selection)
{myField.focus();sel=document.selection.createRange();sel.text=myValue;sel.select();}
else if(myField.selectionStart||myField.selectionStart=='0')
{var startPos=myField.selectionStart;var endPos=myField.selectionEnd;var restoreTop=myField.scrollTop;myField.value=myField.value.substring(0,startPos)+myValue+myField.value.substring(endPos,myField.value.length);if(restoreTop>0)
{myField.scrollTop=restoreTop;}
myField.focus();myField.selectionStart=startPos+myValue.length;myField.selectionEnd=startPos+myValue.length;}else{myField.value+=myValue;myField.focus();}}
function reportFB(obj,fbid)
{(new MessageBox()).show(obj,'<h3>请输入举报理由</h3><form action="http://interface.bilibili.tv/m/report_feedback?fbid='+fbid+'" method="post" target="_blank" id="reportfb_form"><textarea name="message"></textarea></form>','button',function(){$('#reportfb_form').submit();});return false;}
function set_qure(fsid){;$('._qure .t').html($('#l_id_'+fsid+' .t').html());$('._qure').show();}
function replyFB(fbid)
{$("#quoteID").val(fbid);$("#comment_text").focus();}
function commitFeedback()
{if('请在这里输入您要发表的评论信息'==$('#comment_text').val())
{$('#comment_text').focus();return false;}
if($('#comment_text').val().length>1000||$('#comment_text').val().length<4)
{alert("评论字数必须在4到1000个之间！");$('#comment_text').focus();return false;}
$.post("/feedback/post","msg="+encodeURIComponent($('#comment_text').val().replace(/%/g,"%25")).replace(/\+/g,"%2B")+($("#fb_aid").length>0?"&aid="+$("#fb_aid").val():($("#fb_tp_id").length>0?"&tp_id="+$("#fb_tp_id").val():"&news_id="+$("#fb_news_id").val()))+"&action=send&quoteID="+$("#quoteID").val()+($("#fb_vcode").length>0?"&vcode="+$("#fb_vcode").val():""),function(data){if(data=="OK")
{reloadFeedback();}else
{alert(data);}});}
function human_date(t)
{var now=Math.floor(new Date().getTime()/1000);var td_start=new Date();td_start.setHours(0);td_start.setMinutes(0);td_start.setSeconds(0);td_start=Math.floor(td_start.getTime()/1000);if(t>td_start&&now-t>=0)
{if(now-t<=50)
{var _t=Math.floor((now-t)%60/10)*10;return(t>10?_t:10)+"秒前";}else if(now-t<3600)
{return Math.ceil((now-t)/60)+"分钟前";}else
{return Math.ceil((now-t)/3600)+"小时前";}}else
{var n_d=new Date();n_d.setTime(t*1000);var m=n_d.getMonth();var d=n_d.getDate();var H=n_d.getHours();var M=n_d.getMinutes();if(m<10)m="0"+m;if(d<10)d="0"+d;if(H<10)H="0"+H;if(M<10)M="0"+M;return n_d.getFullYear()+"-"+m+"-"+d+" "+H+":"+M;}}
function bbFeedback(target,type)
{this.type=type?type:"arc";this.target=target;$("<style>#dcmp_textarea_container .ui-autocomplete{ margin-top: 5px; margin-left: -10px; max-width: 150px; }</style>").appendTo("head");}
bbFeedback.prototype={quoteID:0,isAdmin:-1,recordToObject:function(c_Content,_r)
{if(_r.ad_check==1)
{$("<a href=\"javascript:;\">[此楼层已被用户隐藏 点击查看]</a>").appendTo(c_Content).click(function(){$(this).next().slideToggle(200);});$("<div style=\"display:none\" class=\"quote\">"+_r.msg+"</div>").appendTo(c_Content);}else if(_r.ad_check==2)
{$("<a href=\"javascript:;\">[此楼层已被管理员删除]</a>").appendTo(c_Content);}else if(_r.ad_check==3)
{$("<a href=\"javascript:;\">[此楼层已被举报并被管理员删除]</a>").appendTo(c_Content);}else
{c_Content.html(_r.msg);}},show:function(id,page)
{if(typeof(page)==="undefined")page=1;var self=this;var id_name="aid";switch(self.type)
{case"topic":id_name="tp_id";break;case"news":id_name="news_id";break;}
$.ajax({dataType:"json",url:"http://api.bilibili.tv/feedback?type=jsonp&ver=2&callback=?&mode="+self.type+"&"+id_name+"="+id+"&pagesize=10&page="+page,success:function(data)
{var _target=self.target;if(data.code===-503)
{var sav_pos=$(_target).css("position");$(_target).css("position","relative");$("<div style=\"opacity: 0.3;z-index: 1000;background-color: #ccc;width: 100%;height: 100%;display: block;position: absolute;\"></div>").prependTo(_target);setTimeout(function(){$(_target).css("position",sav_pos);self.show(id,page);},2000);return;}
if(typeof(data.list)!="object")return;self.isAdmin=data.isAdmin;$(_target).empty();var c_UL=$("<ul></ul>").appendTo(_target);var c_PL=$("<div class=\"pagelistbox\"></div>").appendTo(_target);pagelist(c_PL,page,data.pages,data.results,function(_page){self.show(id,_page);},"评论",5);if(data.results==0)
{$("<div class=\"no_more\">没有更多信息</div>").appendTo(_target);}
for(var i in data.list)
{if(typeof(data.list[i])!="object")continue;(function(_r)
{var li=$("<li id=\"l_id_"+_r.fbid+"\"><div class=\"facebox\"><img src=\""+_r.face+"\" class=\"face\"><div class=\"face_bg s"+_r.rank+"\"></div></div>"+"<div class=\"t\">#"+_r.lv+"<a href=\"http://space.bilibili.tv/"+_r.mid+"\" target=\"_blank\" card=\""+$('<div/>').text(_r.nick).html()+"\">"+$('<div/>').text(_r.nick).html()+"</a></div>"+"<div class=\"content\"></div><div class=\"elinfo\">"+human_date(_r.create)+(_r.device!="Web"?" 来自 <a class=\"ico "+_r.device+"\">"+_r.device+"</a>":"")+"<i class=\"report\">"+"</i></div>"+"</li>").appendTo(c_UL);var c_Content=li.find(".content");self.recordToObject(c_Content,_r);if(_r.quote!=null)
{var c_Quote=$("<div class=\"quote\"><div class=\"t\">#"+_r.quote.lv+"<a href=\"http://space.bilibili.tv/"+_r.quote.mid+"\" target=\"_blank\" card=\""+$('<div/>').text(_r.quote.nick).html()+"\">"+$('<div/>').text(_r.quote.nick).html()+"</a></div>"+"<div class=\"content\"></div>"+"</div>").prependTo(c_Content);var c_QuoteContent=c_Quote.find(".content");self.recordToObject(c_QuoteContent,_r.quote);}
var _rpt_btn=li.find(".report");if(self.isAdmin>=3){$("<a href=\"javascript:;\" title=\"被移除后，其他用户会默认不显示该评论\" class=\"no hidefb\">移除该评论</a>").appendTo(_rpt_btn).click(function(){var obj=this;new MessageBox().show(this,'确认删除此内容?','button',function(mobj){adDropFB(obj,mobj,id,self.type,_r.fbid);});return false;});}
if(self.isAdmin>=1){var btn_hidefb=$("<a href=\"javascript:;\" title=\"被隐藏后，其他用户会默认不显示该评论\" class=\"no hidefb\">"+(self.isAdmin>=2?"删除":"隐藏")+"该评论</a>").appendTo(_rpt_btn).click(function(){var obj=this;adHideFB(obj,id,self.type,_r.fbid);return false;});var btn_showfb=$("<a href=\"javascript:;\" class=\"yes showfb\">显示该评论</a>").appendTo(_rpt_btn).click(function(){var obj=this;adShowFB(obj,id,self.type,_r.fbid);return false;});if(_r.ad_check==0)
{btn_showfb.hide();}else
{btn_hidefb.hide();}}
if(self.isAdmin>=0)
{$("<a href=\"javascript:;\" class=\"yes\">赞同<b>(+"+_r.good+")</b></a>").appendTo(_rpt_btn).click(function(){return agFB(this,id,self.type,_r.fbid);});$("<a href=\"javascript:;\" class=\"no\">反对<b>(+"+_r.bad+")</b></a>").appendTo(_rpt_btn).click(function(){return dagFB(this,id,self.type,_r.fbid);});$("<a href=\"javascript:;\" class=\"huifu\">回复</a>").appendTo(_rpt_btn).click(function(){self.quoteID=_r.fbid;$('._qure .t',_target).html($('#l_id_'+_r.fbid+' .t').html());$('._qure',_target).show();$("#comment_text",_target).focus();});}})(data.list[i]);}
var c_CommSend=$("<div class=\"comm_send\"></div>").appendTo(_target);if(self.isAdmin>=0)
{var c_TG=$('<div class="tg_send_post"><div class="dcmp_title"> <small id="ajaxBackMsg">请自觉遵守互联网相关的政策法规，严禁发布色情、暴力、反动的言论。</small> </div><a class="ywz">(・∀・)颜文字</a>'+'<div class="biaoqing_box" style="display:none;"><a>(⌒▽⌒)</a><a>（￣▽￣）</a><a>(=・ω・=)</a><a>(｀・ω・´)</a><a>(〜￣△￣)〜</a><a>(･∀･)</a><a>(°∀°)ﾉ</a><a>(￣3￣)</a><a>╮(￣▽￣)╭</a><a>( ´_ゝ｀)</a><a>←_←</a><a>→_→</a><a>(&lt;_&lt;)</a><a>(&gt;_&gt;)</a><a>(;¬_¬)</a><a>("▔□▔)/</a><a>(ﾟДﾟ≡ﾟдﾟ)!?</a><a>Σ(ﾟдﾟ;)</a><a>Σ( ￣□￣||)</a><a>(´；ω；`)</a><a>（/TДT)/</a><a>(^・ω・^ )</a><a>(｡･ω･｡)</a><a>(●￣(ｴ)￣●)</a><a>ε=ε=(ノ≧∇≦)ノ</a><a>(´･_･`)</a><a>(-_-#)</a><a>（￣へ￣）</a><a>(￣ε(#￣) Σ</a><a>ヽ(`Д´)ﾉ</a><a>(╯°口°)╯(┴—┴</a><a>（\#-_-)\┯━┯</a><a>_(:3」∠)_</a><a>(笑)</a><a>(汗)</a><a>(泣)</a><a>(苦笑)</a></div>'+'<div class="dcmp_content" style="width:612px;height:107px;position:relative"><div id="dcmp_textarea_container" style="z-index:999;position:absolute"><textarea cols="80" name="msg" rows="5" id="comment_text"  placeholder="请在这里输入您要发表的评论信息" class="ipt-txt" style="width:600px;height:95px;font-family: Arial,Helvetica;"></textarea></div>'+'<div id="textarea_size_tester" style="max-width:600px;max-height:95px;z-index:-999;position:absolute;font-family: Arial,Helvetica;border: 1px none;opacity:0;font-size: 14px; padding:6px -2px 0px 6px;"></div></div>'+'<div class="dcmp_post"><div class="dcmp_userinfo"><div class="_qure"><div class="t"></div></div></div></div>'+'</div>').appendTo(c_CommSend);if(data.needCode)
{$('验证码︰<input type="text" id="fb_vcode" value="" size="6" /><img src="/captcha" onclick="this.src=\'/captcha?r=\'+Math.random()" />').appendTo(c_TG.find(".dcmp_post .dcmp_userinfo"));}
$('<button type="submit" class="pink button">发表评论</button>').appendTo(c_TG.find(".dcmp_post .dcmp_userinfo")).click(function(){if('请在这里输入您要发表的评论信息'==$('#comment_text',_target).val())
{$('#comment_text',_target).focus();return false;}
if($('#comment_text',_target).val().length>1000||$('#comment_text',_target).val().length<4)
{new MessageBox().show(this,'评论字数必须在4到1000个之间！',3000,'error');$('#comment_text',_target).focus();return false;}
var btn=this;$.ajax({url:"http://interface.bilibili.tv/feedback/post?callback=?&msg="+encodeURIComponent($('#comment_text',_target).val().replace(/%/g,"%25")).replace(/\+/g,"%2B")+
(self.type=="arc"?"&aid="+id:(self.type=="topic"?"&tp_id="+id:"&news_id="+id))+"&action=send&quoteID="+self.quoteID+($("#fb_vcode",_target).length>0?"&vcode="+$("#fb_vcode",_target).val():""),type:"get",dataType:"jsonp",success:function(data){if(data=="OK")
{self.show(id,1);}else
{new MessageBox().show(btn,data,3000,'error');}}});});var _oda=0;$('.ywz',c_CommSend).click(function(){if(_oda==0){$(this).addClass('on');$('.biaoqing_box',c_CommSend).fadeIn(100);_oda=1;}else
{$(this).removeClass('on');$('.biaoqing_box',c_CommSend).fadeOut(100);_oda=0;}});$('.biaoqing_box a',c_CommSend).click(function(){insertAtCursor($('#comment_text').get(0),$(this).html());_oda=0;$('.biaoqing_box',c_CommSend).fadeOut(100);$(".ywz",c_CommSend).removeClass("on");});var ac={source:function(request,response){if(!(m=request.term.match(/@([^\s]+)$/)))
{return false;}
var term=m[1];$.getJSON("http://interface.bilibili.tv/m/friend_suggest?jsoncallback=?",{term:term.replace(/　/g,""),rnd:Math.random()},response);},search:function(){if(!(m=this.value.match(/@([^\s]+)$/)))
{return false;}
var term=m[1];if(term.charCodeAt(0)<255&&term.length<1||term.length>10){return false;}},focus:function(){return false;},select:function(event,ui){this.value=this.value.replace(/@([^\s]*)$/,'@'+ui.item.value);return false;},appendTo:"#dcmp_textarea_container",position:{my:"left top",using:function(){$(this).css("top",$("#textarea_size_tester").outerHeight()+3+"px");$(this).css("left",$("#textarea_size_tester").outerWidth()+"px");}}};if($(".ipt-txt",c_CommSend).length>0)
{$(".ipt-txt",c_CommSend).bind('keyup',function(event){if(m=this.value.match(/@([^\s]*)$/))
{$(".ipt-txt",c_CommSend).autocomplete(ac).data("autocomplete")._renderItem=function(ul,item){return $("<li></li>").data("item.autocomplete",item).append("<a style=\"text-align:left\"><img src=\""+item.face+"\" style=\"border: none;height:20px;width: 20px;vertical-align: bottom;padding-right: 5px;}\" />"+item.value+"</a>").appendTo(ul);};$("#textarea_size_tester",c_CommSend).get(0).innerText=this.value.substr(0,this.value.length-m[1].length);}else
{$(".ipt-txt",c_CommSend).autocomplete("destroy");}});}}else
{$("<a style=\"cursor:help\"><img src=\"http://static.hdslb.com/images/nologininfo.gif\" /></a>").appendTo(c_CommSend).click(function(){goTop();return false;});}
bindCardEvent(_target);}});}};function InitCardEvent()
{if($(card_obj).attr("direction")=="top")
{$(".a_layer").css("top",$(card_obj).offset().top-$(".a_layer").outerHeight()+40+"px");$(".a_layer > .bg > .arrow").addClass("arrow_t");}else
{$(".a_layer").css("top",$(card_obj).offset().top+$(card_obj).outerHeight()/2-20+"px");}
if($(card_obj).offset().left+$(".a_layer").outerWidth()+$(card_obj).width()+5>$(window).width())
{$(".a_layer").css("left",$(card_obj).offset().left-5-$(".a_layer").outerWidth()+"px");$(".a_layer > .bg > .arrow").removeClass("arrow_l");$(".a_layer > .bg > .arrow").addClass("arrow_r");}else
{$(".a_layer").css("left",$(card_obj).offset().left+$(card_obj).width()+5+"px");}
$(".a_layer").mouseover(function(){clearTimeout(evCardTimer);});$(".a_layer").mouseout(CardEventOut);}
var tmrCardError=null;function ShowCardMsg(msg)
{clearTimeout(tmrCardError);$('.a_layer').remove();$('<div class="a_layer"><div class="bg"><div class="content"><div class="msg">'+msg+'</div></div><div class="arrow arrow_l" style=""></div></div></div>').appendTo("body");InitCardEvent();}
function attentionUser(obj,uid)
{var msgbox=new MessageBox();$.ajax({type:"post",url:"/m/attention",data:{"uid":uid},dataType:"html",success:function(data){if(data=='OK')window.AttentionList.push(uid);msgbox.show(obj,data=='OK'?'关注成功!':data,data=='OK'?500:2000,data=='OK'?'ok':'warning');},error:function(){msgbox.show(obj,'系统错误，请稍后重试!',2000,'error');}});}
function unattentionUser(obj,uid)
{var msgbox=new MessageBox();$.ajax({type:"post",url:"/m/unattention",data:{"uid":uid},dataType:"html",success:function(data){var index=window.AttentionList.indexOf(uid);if(index!=-1&&data=='OK')
{delete window.AttentionList[index];}
msgbox.show(obj,data=='OK'?'取消关注成功!':data,data=='OK'?500:2000,data=='OK'?'ok':'warning');},error:function(){msgbox.show(obj,'系统错误，请稍后重试!',2000,'error');}});}
var card_obj=null;function ShowCard(obj)
{clearTimeout(tmrCardError);if(typeof(obj.mid)=="undefined")
{ShowCardMsg("抱歉，该昵称目前不存在哦(*^__^*)");return;}
$('.a_layer').remove();var attention_me=false;var follow_him=false;if(typeof(window.AttentionList)!="undefined"&&typeof(window.AttentionList)!="null")
{for(var i=0;i<window.AttentionList.length;i++)
{if(window.AttentionList[i]==obj.mid)
{follow_him=true;break;}}}
if(typeof(obj.attentions)!="undefined"&&typeof(obj.attentions)!="null")
{for(var j=0;j<obj.attentions.length;j++)
{if(obj.attentions[j]==window.uid)
{attention_me=true;break;}}}
var atthtml='';if(follow_him&&attention_me)
{atthtml='<img class="icon_add addbtn_b" title="加关注" src="http://static.hdslb.com/images/common/transparent.8x7.gif">互相关注<span class="W_vline">|</span><a href="javascript:;" onclick="unattentionUser(this,'+obj.mid+')" class="W_linkb"><em>取消</em></a>';}else if(!follow_him)
{atthtml='<a href="javascript:;" onclick="attentionUser(this,'+obj.mid+')"><img class="icon_add addbtn_a" title="加关注" src="http://static.hdslb.com/images/common/transparent.8x7.gif">加关注</a>';}else if(!attention_me)
{atthtml='<img class="icon_add addbtn_c" title="已关注" src="http://static.hdslb.com/images/common/transparent.8x7.gif">已关注<span class="W_vline">|</span><a href="javascript:;" onclick="unattentionUser(this,'+obj.mid+')" class="W_linkb"><em>取消</em></a>';}
$('<div class="a_layer"><div class="bg"><div class="content"><div class="card">'+'<img src="'+obj.face+'" class="face"><div class="t">'+'<a href="http://space.bilibili.tv/'+obj.mid+'" target="_blank">'+obj.name+'</a>'+
(obj.approve?'<a href="http://www.bilibili.tv/html/certified.html" target="_blank" title="哔哩哔哩认证" class="approve"></a>':'')+'</div><div class="address" style="width:150px">'+'<img class="small_icon '+(obj.sex=='男'?'male':(obj.sex=='女'?'female':''))+'" title="'+obj.sex+'" src="http://static.hdslb.com/images/common/transparent.8x7.gif"'+'alt=""> '+(obj.place?obj.place:"未知")+'</div><ul class="userdata" style="clear:top"><li><a href="http://space.bilibili.tv/'+obj.mid+'/follow.html" target="_blank">关注</a> '+obj.attention+'</li><li class="W_vline">|</li><li><a href="http://space.bilibili.tv/'+obj.mid+'/fans.html" target="_blank">粉丝</a> '+obj.fans+'</li>'+'<li class="W_vline">|</li><li><a href="http://space.bilibili.tv/'+obj.mid+'" target="_blank">投稿</a> '+obj.article+'</li></ul></div>'+'<div class="cardinfo">'+(obj.approve?'<div class="approve">认证资料</div>':"")+obj.description+'</div>'+'<div class="links"><p><a href="http://member.bilibili.tv/#msg&act=new&mid='+obj.mid+'" target="_blank">私信</a></p><div class="W_addbtn_even">'+
atthtml+'</div></div></div><div class="arrow arrow_l" style=""></div></div></div>').appendTo("body");InitCardEvent();}
function ShowLoadCardFail(){clearTimeout(tmrCardError);ShowCardMsg('<span class="loading">加载失败</span>');}
function LoadCard(obj,user)
{card_obj=obj;ShowCardMsg('<span class="loading">正在加载中,请稍候..</span>');$('<script type="text/javascript" src="http://interface.bilibili.tv/card/'+user+'.js" onerror="ShowLoadCardFail()"><'+'/script>').appendTo('body');clearTimeout(tmrCardError);tmrCardError=setTimeout(ShowLoadCardFail,5000);}
function CardEventOver(obj,user)
{clearTimeout(evCardTimer);evCardTimer=setTimeout(function(){clearTimeout(evCardTimer);LoadCard(obj,user);},300);}
function CardEventOut()
{clearTimeout(evCardTimer);evCardTimer=setTimeout(function(){clearTimeout(evCardTimer);$('.a_layer').remove();},100);}
function bindCardEvent(ele)
{if(typeof(ele)!="undefined")
{$(ele).find('a[card]').mouseover(function(){CardEventOver(this,$(this).attr('card'));}).mouseout(CardEventOut);}else
{$('a[card]').mouseover(function(){CardEventOver(this,$(this).attr('card'));}).mouseout(CardEventOut);}}
var last_sug_user_start=0;function createSuggestUserList(start){var i;var k=0;var n=0;$("#rup_user").empty();if(start+5>suggest_user.length)start=0;for(i in suggest_user)
{k++;if(typeof(start)!="undefined"&&k<=start)continue;var vo=suggest_user[i];var follow_him=false;if(typeof(window.AttentionList)!="undefined"&&typeof(window.AttentionList)!="null")
{for(var j=0;j<window.AttentionList.length;j++)
{if(window.AttentionList[j]==vo[0])
{follow_him=true;break;}}}
if(follow_him)
{continue;}
$('<li><a href="http://space.bilibili.tv/'+vo[0]+'" target="_blank" card="'+vo[1]+'"><img src="'+vo[2]+'"><div class="name">'+vo[1]+'</div></a><p class="i"><a href="http://member.bilibili.tv/friend?act=add&smod=attention&uid='+vo[0]+'" class="gz">关注</a></p><div class="info">'+vo[3]+'</div></li>').appendTo("#rup_user");last_sug_user_start=k;if(++n>=5)break;}
bindCardEvent();}
function createSuggestSpList(start){var i;var k=0;var n=0;$("#rup_sp").empty();if(suggest_sp.length==0){$('<div class="no_more">没有更多信息</div>').appendTo("#rup_sp");return;}
if(start+5>suggest_sp.length)start=0;for(i in suggest_sp)
{k++;if(typeof(start)!="undefined"&&k<=start)continue;var vo=suggest_sp[i];if(typeof(vo)=="undefined"||typeof(vo[0])=="undefined")continue;$('<li><a href="/sp/'+vo[0]+'"><img src="'+vo[1]+'" title="'+vo[0]+'"><div class="name">'+vo[0]+'</div></a><p class="i"><b>'+vo[3]+'</b>个视频</p>'+(vo[2]?'<div class="info">同义词:'+vo[2]+'</div>':'')+'</li>').appendTo("#rup_sp");if(++n>=5)break;}}
function bindPOCoins($po,bindCoins){var ind_n;if(typeof(bindCoins)==="undefined"||bindCoins!==false)
{for(var ind_i=0;ind_i<$po.length;ind_i++)
{ind_n=parseInt($($po[ind_i]).attr('yb'));if(ind_n>=20&&ind_n<60)
{$($po[ind_i]).find("img").css("background","url(http://static.hdslb.com/images/po-img-bg.png) no-repeat -72px -26px");}
if(ind_n>=60&&ind_n<120)
{$($po[ind_i]).find("img").css("background","url(http://static.hdslb.com/images/po-img-bg.png) no-repeat -402px -26px");}
if(ind_n>=120)
{$($po[ind_i]).find("img").css("background","url(http://static.hdslb.com/images/po-img-bg.png) no-repeat -572px -26px");}}}
if($.browser.msie){$po.addClass('snti');}
var mousein=0;var mouInterval;var mouOutInterval;mouseOutFunc=function(){mousein=0;clearInterval(mouInterval);mouOutInterval=setTimeout(function(){if(mousein)return;clearTimeout(mouOutInterval);$('.ov-box').remove();},100);};$po.mouseover(function(){var self=this;mousein=1;mouInterval=setTimeout(function(){if(mousein==1){$('.ov-box').remove();$('<div class="ov-box" style="display: none; "><div class="ov"><div class="title"></div><div class="subtitle"></div><img src=""><a class="gk">播放:'+$(self).attr('gk')+'</a><a class="sc">收藏:'+$(self).attr('sc')+'</a><a class="pl">评论:'+$(self).attr('pl')+'</a><a class="pf">(+'+$(self).attr('pf')+')</a><p class="txt"></p><p class="tg-date"></p><p class="lm"></p></div></div>').prependTo('body');$('.ov-box').css({left:$(self).offset().left,top:$(self).offset().top-120});$('.ov-box > .ov > .txt').html($(self).attr('txt'));$('.ov-box > .ov > .title').html($(self).find('.t').html());$('.ov-box > .ov > .subtitle').html($(self).attr('subtitle'));$('.ov-box > .ov > .tg-date').html("日期:"+$(self).attr('tg'));$('.ov-box > .ov > .lm').html("UP主:"+$(self).attr('up'));$('.ov-box > .ov > img').attr('src',$(self).find('img').attr('src'));$('.ov-box').fadeIn(300);$('.ov-box').mouseover(function(){mousein=1;clearTimeout(mouOutInterval);});$('.ov-box').mouseout(mouseOutFunc);clearTimeout(mouInterval);}},500);});$po.mouseout(mouseOutFunc);}
function date_format(ts)
{var n=new Date();var ngt=n.getTime()/1000*ts;if(ngt<86400&&ngt>0)
{if(ngt<60)
{return ngt+"秒前";}else if(ngt<3600)
{return Math.floor(ngt/60)+"分钟前";}else if(ngt<86400)
{return Math.floor(ngt/3600)+"小时前";}}else
{var t=new Date();t.setTime(ts*1000);return t.getFullYear()+"/"+(t.getMonth()+1)+"/"+t.getDate();}}
var mouIntervals=null;var timi=0;$(document).ready(function(){$num=$(".num li");$num.mouseover(function(){var index=$num.index($(this));if(index==32)
{return;timi=1;clearInterval(mouIntervals);$('.nums').css({left:175});$('#nums').html($(this).find('ul').html());$('.nums').slideDown(300);$('#zt-minibox').show();}
if(index!=0)
{timi=1;clearInterval(mouIntervals);$('.nums').css({left:90});$('#zt-minibox').hide();$('#nums').html($(this).find('ul').html());$('.nums').slideDown(300);return;}});$('.nums').mouseover(function(){timi=1;clearInterval(mouIntervals);});$('.nums').mouseout(numsout);$num.mouseout(numsout);$("#sp_order_alpha").click(function(){$('.s-alpha').slideDown(300);});$(".float_window .close").click(function(){$('.float_window').fadeOut(300);});});function numsout(){timi=0;mouIntervals=setTimeout(function(){if(timi==0){clearInterval(mouIntervals);$('.nums').slideUp(100);}},200);}
function alertCharNums(content){var MaxLength=1000;if(content.value.length>MaxLength){content.value=content.value.substring(0,MaxLength);}
$('#ajaxBackMsg').html('字符统计:'+content.value.length+'/1000');}
function showGlobalAlert(msg)
{tips_str="<div class=\"ui-widget\" id=\"announce_alerts\" style=\"margin: 0px; position: fixed; top: 0px; width: 980px; z-index: 100;\">"+" <div class=\"ui-state-error ui-corner-all\" style=\"padding: 0 .7em;\"> "+"  <p><span class=\"ui-icon ui-icon-alert\" style=\"float: left; margin-right: .3em;margin-top:.1em;\"></span>"+msg+"</p>"+" </div>"+"</div>";fc=$($(".z")[0].firstChild);fc.before(tips_str);};function showGlobalTips(msg)
{tips_str="<div class=\"ui-widget\" id=\"announce_tips\" style=\"margin: 0px; position: fixed; top: 0px; width: 980px; z-index: 100;\">"+" <div class=\"ui-state-highlight ui-corner-all\" style=\"padding: 3px .7em;\"> "+"  <p><span class=\"ui-icon ui-icon-info\" style=\"float: left; margin-right: .3em;\"></span>"+msg+"</p>"+" </div>"+"</div>";fc=$($(".z")[0].firstChild);fc.before(tips_str);};function insertFlash(elm,url,w,h){if(!document.getElementById(elm))return;var str='<embed height="'+h+'" width="'+w+'" id="'+elm+'_flash" pluginspage="http://www.adobe.com/shockwave/download/download.cgi?P1_Prod_Version=ShockwaveFlash" allowscriptaccess="always" style="visibility:hidden"  src="'+url+'" type="application/x-shockwave-flash" allowfullscreen="true" quality="high">';document.getElementById(elm).innerHTML=str;}
var cb_controler;function cb_initOnlineInfo(){}
function cb_packet(index,data){}
function cb_getOnline(online){$("#wait_online").html(online);}
function cb_chatlog(p1,p2,msg){}
function cb_onconnect(cid,uid){if(typeof(window.connect_cid)!="undefined")
{setInterval(function(){cb_controler.getChatRoom();},30000);}}
function cb_initok(){cb_controler.setConnectParam(window.connect_cid?window.connect_cid:1,__GetCookie("DedeUserID")?__GetCookie("DedeUserID"):0,"");}
var scrollActivate=true;function goTop(acceleration,time,callback){if(!scrollActivate)
{scrollActivate=true;return;}
acceleration=acceleration||0.1;time=time||16;var x1=0;var y1=0;var x2=0;var y2=0;var x3=0;var y3=0;if(document.documentElement){x1=document.documentElement.scrollLeft||0;y1=document.documentElement.scrollTop||0;}
if(document.body){x2=document.body.scrollLeft||0;y2=document.body.scrollTop||0;}
var x3=window.scrollX||0;var y3=window.scrollY||0;var x=Math.max(x1,Math.max(x2,x3));var y=Math.max(y1,Math.max(y2,y3));var speed=1+acceleration;window.scrollTo(Math.floor(x/speed),Math.floor(y/speed));if(x>0||y>0){var invokeFunction="goTop("+acceleration+", "+time+")";window.setTimeout(invokeFunction,time);}else
{if(typeof(callback)!="undefined")
{callback();}}}
if(!Array.prototype.shuffle){Array.prototype.shuffle=function(){for(var j,x,i=this.length;i;j=parseInt(Math.random()*i),x=this[--i],this[i]=this[j],this[j]=x);return this;};}
function loadNotify()
{if('http:'==document.location.protocol)
{$("<div id=\"cb_controler\"></div>").appendTo("body");insertFlash("cb_controler","http://static.hdslb.com/images/bili_notify.swf",0,0);cb_controler=$("#cb_controler_flash").get(0);}}
function reloadFeedback()
{if($("#fb_tp_id").length>0)
{loadTopicFB($("#fb_tp_id").val(),1);}else if($("#fb_aid").length>0)
{loadFB($("#fb_aid").val(),1);}else
{loadFB($("#fb_news_id").val(),1);}}
function CallPlayerAction(code)
{switch(code)
{case 1:if($("#review_comments_tips").length==0)
{$("<div class=\"ui-widget\" style=\"margin:0px;\"><div class=\"ui-state-highlight ui-corner-all\" style=\"padding: 3px;line-height:15px;background:#FFFB9C;margin: 0 7px 0 7px;\"> <span class=\"ui-icon ui-icon-info\" style=\"float: left; margin-right: .3em;margin-top:.1em;\"></span> <span id=\"review_comments_tips\" tag=\"0\"></span></div></div>").prependTo(".comm > ul");}
num=parseInt($("#review_comments_tips").attr("tag"))+1;$("#review_comments_tips").attr("tag",num);$("#review_comments_tips").html("有 <b>"+num+"</b> 条新的评论信息，<a href=\"javascript:reloadFeedback()\" style=\"color:#666699; font-weight:bold\">刷新</a>看看。");break;}}
$(function(){if(typeof(countInfo)!="undefined")
{for(i in type_offset)
{if(typeof(countInfo["c"+i])!="undefined"&&countInfo["c"+i])
{if(countInfo["c"+i]!=0)
{$('.addnew_'+i).html('+'+countInfo["c"+i]);$('.addnew_'+i).fadeIn(500);}}}}
if($(".search-keyword").length>0)
{var ac={source:function(request,response){var tmp_term_lst=request.term.split(" ");$.getJSON("/suggest?jsoncallback=?",{term:tmp_term_lst[tmp_term_lst.length-1].replace(/　/g,""),rnd:Math.random()},response);},search:function(){var term=this.value;var tmp_term_lst=term.split(" ");if(tmp_term_lst[tmp_term_lst.length-1].length<1)return false;if(term.charCodeAt(0)<255&&term.length<1||term.length>40){return false;}},focus:function(){return false;},select:function(event,ui){this.value=ui.item.value;$("#searchform").submit();return false;}};$(".search-keyword").attr("autocomplete","off");$(".search-keyword").autocomplete(ac).data("autocomplete")._renderItem=function(ul,item){return $("<li></li>").data("item.autocomplete",item).append("<a style=\"text-align:left\">"+item.value+"<em style=\"float:right;font-size:10px;\""+(item.match?" title=\"(Match Token: "+item.match+")\"":"")+">"+(item.desc?item.desc:item.ref+"个")+"</em></a>").appendTo(ul);};}
bindCardEvent();bindPOCoins($('.po'));});