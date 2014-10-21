<?php $user_name = rand(1,5);?>
<?php $rid = @$_REQUEST['r'] ? @$_REQUEST['r'] : 123;?>

<?php echo '第'. $rid. '直播室<br>'; echo $user_name;?>
<html>
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <head>
        <meta content="text/html; charset=UTF-8" http-equiv="content-type" />
        <script src="jquery.min.js"></script>
        <script src="http://127.0.0.1:8080/socket.io/socket.io.js"></script>
        <style>
            .name {color:#E93CA6;text-decoration: none;}
        </style>

        <script>

            $(function(){

                var socket = io.connect('http://127.0.0.1',{port:8080});
                var r_id = <?php echo $rid; ?> //房间ID
                var user_name = <?php echo $user_name; ?> //用户ID
                var nick_name = user_name + '凤';
                var level = user_name;
                // var info = {"user_name":$("#erfdf").val(),"r_id":r_id,"nick_name":nick_name,"level":level};
                var info = {"user_name":user_name,"r_id":r_id,"nick_name":nick_name,"level":level};
                socket.emit('on_load', info);

                //发送消息
                var sendmessage = function() {
                    var msg = $.trim($('#content').val());
                    if(msg.length===0){
                        return;
                    }
                    $('#content').val('');
                    var to = $("#onlinelist").val();
                    switch(to) {
                        case '0':
                            //发送消息
                            msg = {content:msg};
                            socket.emit('message', msg);
                            break;
                        case '1':
                            //发送公共信息
                            msg = {content:msg};
                            socket.emit('public_message', msg);
                            break;
                        default:
                            //发送私信
                            to_name = '哈哈';
                            msg = {"to":to,"to_name":to_name,"content":msg};
                            socket.emit('kick_out',msg, function(data){
                                if(data) {
                                    alert(to_name+ '被你提出');
                                }
                            });
                    }
                }
                //欢迎
                socket.on('welcome', function (msg)
                {
                    var json = $.parseJSON(msg);
                    console.log(msg);
                    var info = '欢迎 <a href="#" class="name">' + json.nick_name + '</a> 进入直播间。<br>';
                    $("#message").append(info);
                });

                //接收消息
                socket.on('message', function (msg)
                {
                    var json = $.parseJSON(msg);
                    console.log(msg);
                    var info = '<a href="#" class="name">' + json.nick_name + '</a>说: ' + json.content +'<br>';
                    $("#message").append(info);
                });

                // 接收到公共消息
                socket.on('public_message', function(msg){
                    
                    var json = $.parseJSON(msg);
                    console.log(msg);
                    var info = '<a href="#" class="name">' + json.nick_name + '</a>发布公共消息,说: ' + json.content +'<br>';
                    $("#message").append(info);
                });

                // 接收到系统消息
                socket.on('system_message', function(msg){
                    
                    var json = $.parseJSON(msg);
                    console.log(msg);
                    var info = '系统消息：<a href="'+ json.link +'" class="name">' + json.content + '</a><br>';
                    $("#message").append(info);
                });
                
                // 接收到私人信息
                socket.on('private_message', function(msg){
                    console.log(msg);
                    var json = $.parseJSON(msg);
                    if(json.user_name == user_name) {
                        var info = '你对 <a href="#" class="name">' + json.to_name + '</a>私聊说: ' + json.content + '<br>';
                    }else {
                        var info = '<a href="#" class="name">' + json.nick_name + '</a>对你私聊说: ' + json.content +'<br>';
                    }
                    $("#message").append(info);
                });
                
                //踢出房间
                socket.on('Kick_out', function(msg)
                {
                    alert('由于您的言论不当，已被管理员踢出15分钟!');
                    location.href='http://www.baidu.com';
                })

                //禁言
                socket.on('forbidden_talk', function(msg)
                {
                    var info = '由于您的言论不当，已被管理员禁言3分钟!<br>';
                    $("#message").append(info);
                })

                // 刷新在线列表
                socket.on('online_list', function(ns){
                   var html = "<option value='0' selected>本聊天室</option><option value='1'>公共消息</option>";
                    console.log(ns);
                    ns.forEach(function(v){
                        var d = $.parseJSON(v);
                        if (d.user_name!=user_name) {
                            html += '<option value="' + d.user_name + '">' + d.nick_name+ '</option>';
                        }
                    });
                    $('#onlinelist').html(html);
                });

                $("#send").click(sendmessage);
                $('#content').keypress(function(e){
                    if (e.keyCode === 13) {
                        sendmessage();
                        return false;
                    }
                });
            })          
        </script>
    </head>
    <body>
        <table>
            <tr>
                
                <td></td>
            </tr>
            <tr>
                <td>
                    <select id="onlinelist">
                        <option value='0' selected>本聊天室</option>
                        <option value='1'>公共消息</option>
                    </select>
                </td>
                <td><input type="text" id="content"></td>
                <td><input type="button" id="send" value="发送" /></td>
            </tr>
            <tr>
                <td colspan='2'>
                    <div id='message'>
                    </div>
                </td>
            </tr>
        </table>
    </body>
</html>