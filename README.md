nodejs-socket-redis-php-chatroom-2
================================
新升级的聊天室服务V2，支持多人多房间同时在线，项目测试过，支持2000人，2000房间的在线人数。基于nodejs和socket.io的架构。

[点击这里你可以链接到v1版本](https://github.com/iyangyi/nodejs-socket-php-redis-chatroom)

功能
================================
1. 支持多房间、多人的实时聊天，支持踢出房间，支持禁言15分钟，支持获取人员列表，支持发送全局系统消息

2. 聊天室服务与php业务完全分类，互不影响，可以在php代码中向聊天室推送各种消息，以达到实时响应的作用

本次升级更新
================================
1. 去掉了第一版用redis的pub/sub模式，仅用redis做后端数据分发到nodejs。对redis连接数的压力大大减轻。

2. 新加入了redis pool连接池，可根据自身配置配置最大连接数，再次减轻redis服务器的压力。

3. 用到了socket.io 的 socket.join(room), io.sockets.in(room).emit(msg), socket.leave(room)这3种模式来达到多房间的目的，且效率优于第一版的redis pub/sub，模式。

4. 采用在nodejs服务中，用每5秒定时的方式去读取 redis 队列的中的消息，发送给聊天室。

启动聊天服务器
================================

1. cd /home/web/chatroom #进入chat的代码目录

2. npm install #安装package依赖包

3. node index.js #运行

4. 浏览器打开这个链接试一下：127.0.0.1:8081（Welcome to socket.io.表示成功）

客户端连接/demo
================================

在demo/index.php 里有详细的使用，这里简单说下。

1. html头部加入socket.io的js：http://127.0.0.1:8080/socket.io/socket.io.js

2. 连接socket.io服务器： var socket = io.connect('http://127.0.0.1:8081');

3. 初始化传递数据 on_load 将房间号r_id,user_name,nick_name,level 等参数传递给chat服务器的on_load方法

4. 接受消息就用 socket.on('function_name', function (msg){});

5. 发送消息就用socket.emit('function_name', info); 

php端发送消息到聊天室服务器
================================
	
	// redis的队列，php往这个队列中发送数据。nodejs从这个队列中读取数据分发消息
    CONST REDIS_MESSAGE_LIST ='1717wan:chat_message_list';
    
    $send_info = array(
    		"id" => 30045, //向30056房间发送
			"title" => '这是系统消息的标题',
			"content" => '这是系统消息的内容',
			"link" => '这是系统消息的链接'
			"type" => 'system_message', // 这个很重要，nodejs 聊天服务就是靠这个分发给前端，前端也是监听这个functio_name
			"time" => date("H:i:s"),
	);
    $this->redis->rpush(self::REDIS_MESSAGE_LIST, json_encode($send_info));

注意
================================
1. config.js 里有各种可以自行配置，可以配置redis的各个配置，以及整个聊天室的名字等等。
2. 可以自行使用forever 或者 supervisor 来达到守护进程及其修改代码重启的作用。
3. index.js里io.set('authorization')，可以自行根据需要读取cook或者refer来安全校验。

使用
================================
使用请带上来源，开源的版权东西需要一起维护，谢谢。
