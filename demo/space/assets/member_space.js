var i = $('.u-rank').html();
if(i == 10000)
{$('#u-rank').append("普通会员");}
if(i == 20000)
{$('#u-rank').append("字幕君");}
if(i == 25000)
{$('#u-rank').append("VIP");}
if(i == 30000)
{$('#u-rank').append("真·职人");}
if(i == 32000)
{$('#u-rank').append("管理员");}

if($('.verify').html()==1)
{
$('.uname').append('<img src="http://static.hdslb.com/images/member/vertified-Ico.png" title="官方认证用户">');
}

$('.addfs').click(function(){
	$('.addfs').unbind("click");
	$.post("/friend?smod=attention&uid="+$('.h-mid').html()+"&act=add",
	function(data)
	{
		$('.s_friend').html('关注成功');
		$('.s_friend').addClass('ok');
	});
});
function sendpm(pm,title)
{
	$('.pmdiv').fadeIn(500);
	$('#pm_id').val(pm);
	if (title)
	{
		$('#pm_title').val(title);
		$('#pm_msg').focus();
	}else
	{
		$('#pm_title').focus();
	}
	return false;
}
function showjb()
{
    $('.jbdiv').fadeIn(500);
    $('#jb_msg').focus();
    return false;
}

function submitTheForm(formid)
    {
        var $form = $('#'+formid); 
        url = $form.attr('action');
        // 以 post 方式提交, 回调函数function 返回 data
        var i = $.post(url, $form.serialize(), function(data)
        {
            alert(data);
        });
    } 
function ajaxgetdata(urlx)
{
	$.get(urlx, function(result){
    if (result.indexOf("成功")!=-1)
	{alert("操作成功");}
	});
}