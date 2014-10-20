var config = require('./config.js').config,
    io = require('socket.io').listen(config.socket.port),
    poolRedis = require('pool-redis')({
        'host': config.redis.host,
        'port':  config.redis.port,
        'connect_timeout' : config.redis.timeout,
        'maxConnections': config.redis.maxConnections
    });
var hash = {};

//level log
io.set('log level', 1);

//authorization
io.set('authorization', function (handshakeData, callback) 
{
    //referer
    var referer = handshakeData.headers.referer;
    if (referer == '' || referer == undefined || referer.indexOf(config.app.url) == '-1') {
        return callback('not authorization', false);
    } else {
        return callback(null, true);
    }
});

//connect
io.sockets.on('connection', function (socket) 
{
    //过滤HTML
    var removeHTMLTag = function (str) {
        str = str.replace(/<\/?[^>]*>/g,''); //去除HTML tag
        str = str.replace(/[ | ]*\n/g,'\n'); //去除行尾空白
        str = str.replace(/\n[\s| | ]*\r/g,'\n'); //去除多余空行
        str = str.replace(/&nbsp;/ig,'');//去掉&nbsp;
        return str;
    }

    var checkTime = function(i) {
        if (i<10) {
            i = "0" + i;
        }
        return i;
    }

    var getServerTime = function() {
        var a = new Date();
        var time = checkTime(a.getHours())+":"+checkTime(a.getMinutes())+":"+checkTime(a.getSeconds());
        return time;
    }

    var addHash = function() {
        if (!hash[socket.r_id]) {
            hash[socket.r_id] = true;
        }
    }

    var isExistHash = function(id) {
        if (hash[id]) {
            return true;
        } else {
            return false;
        }
    }

    //传递user_name 和 r_id
    socket.on('on_load',function(info)
    {
        //数据初始化
        socket.user_name = info.user_name;
        socket.r_id = info.r_id || 1;
        socket.nick_name = info.nick_name || info.user_name;
        socket.level = info.level || 0;
        socket.json_info = JSON.stringify(info);
        socket.sub_r_id = config.app.name + '-' + info.r_id;
        socket.kick_out = config.app.name + ':room:' + socket.r_id + ':kick_out:';
        socket.online_list = config.app.name + ':room:' + socket.r_id + ':online_list';
        socket.forbidden_talk = config.app.name + ':room:' + socket.r_id + ':forbidden_talk:';
        socket.kick_out_time = config.app.kick_out_time || 900;
        socket.forbidden_talk_time = config.app.forbidden_talk_time || 180;
        socket.return_list_num = config.app.return_list_num || 100;
        socket.redis_message_list = config.app.name + ':chat_message_list';

        //判断是否已被踢出
        poolRedis.getClient(function(client, done) {
            client.get(socket.kick_out + socket.user_name, function(err, reply) {
                poolRedis.release(client);
                if(reply == 1) {
                    socket.emit('kick_out',1);
                }else {
                    sendWelcome(info);
                }
             });
        });
    });

    //发送欢迎信
    var sendWelcome = function (info) {
        //订阅房间 
        socket.join(socket.sub_r_id);
        //加入队列
        addHash();
        //已经登陆
        if (info.user_name && info.user_name!= undefined) {
            //加入在线列表
            poolRedis.getClient(function(client, done) {
                client.zadd(socket.online_list, socket.level, socket.json_info);
                poolRedis.release(client);
            });
            //订阅自己
            socket.join(socket.sub_r_id + '-' + socket.user_name);
            //发送欢迎
            info.type = 'welcome';
            io.sockets.in(socket.sub_r_id).emit('welcome', JSON.stringify(info));
            onlineList();
        } else {
            //没登陆,只发送online list
            onlineList();
        }
    }

    //online list 在线人员列表
    var onlineList = function()
    {
        poolRedis.getClient(function(client, done) {
            client.zrevrange(socket.online_list, 0, socket.return_list_num, function(error, reply){
                io.sockets.in(socket.sub_r_id).emit('online_list', reply);
                poolRedis.release(client);
            });
        });
    }

    //读取redis信息,发到聊天室
    var getRedisListInfo = function()
    {
        poolRedis.getClient(function(client, done) {
            client.lpop(socket.redis_message_list, function(err, reply) {
                poolRedis.release(client);
                if (reply) {
                    //如果不是自己的成员，就再放回去
                    var mobj = JSON.parse(reply);
                    if (isExistHash(mobj.id)) {
                        io.sockets.in(config.app.name + '-' + mobj.id).emit(mobj.type, reply);
                    } else {
                        //设置过期时间
                        if (mobj.retry_time == 'undefined' || !mobj.retry_time) {
                            mobj.retry_time = Math.round(new Date().getTime()/1000);
                            var info = JSON.stringify(mobj);
                            poolRedis.getClient(function(client, done) {
                                client.rpush(socket.redis_message_list, info);
                                poolRedis.release(client);
                            });
                        } else {
                            //没过期就放进去，过期就作废丢掉
                            //5秒过期
                            var now_time = Math.round(new Date().getTime()/1000);
                            if ((now_time - mobj.retry_time) < 5) {
                                poolRedis.getClient(function(client, done) {
                                    client.rpush(socket.redis_message_list, reply);
                                    poolRedis.release(client);
                                });
                            }
                        }
                    }
                } else {
                    // console.log(hash);
                }
            });
        });
    }

    //定时取消息
    var stopTimer = setInterval(getRedisListInfo,5000);

    //接收消息
    socket.on('message', function(msg)
    {  
        //判断是否被禁言
        poolRedis.getClient(function(client, done) {
            client.get(socket.forbidden_talk + socket.user_name, function(err, reply) {
                poolRedis.release(client);
                if(reply == 1) {
                    socket.emit('forbidden_talk',1);
                }else {
                    //正常发送
                    msg.type = 'message';
                    msg.time = getServerTime();
                    msg.user_name = socket.user_name;
                    msg.nick_name = socket.nick_name;
                    msg.content = removeHTMLTag(msg.content);
                    io.sockets.in(socket.sub_r_id).emit('message', JSON.stringify(msg));
                }
            });
        });
    });
    
    //公共信息
    socket.on('public_message',function(msg){
        msg.type = 'public_message';
        msg.time = getServerTime();
        msg.user_name = socket.user_name;
        msg.nick_name = socket.nick_name;
        msg.content = removeHTMLTag(msg.content);
        io.sockets.emit('public_message', JSON.stringify(msg));
    });

    //私人信息
    socket.on('private_message',function(msg){
        msg.type = 'private_message';
        msg.time = getServerTime();
        msg.content = removeHTMLTag(msg.content);
        msg.user_name = socket.user_name;
        msg.nick_name = socket.nick_name;
        socket.emit('private_message',JSON.stringify(msg));
        io.sockets.in(socket.sub_r_id + '-' + msg.to).emit('private_message', JSON.stringify(msg));
    });


     //踢出房间
    socket.on('kick_out', function(msg,fn)
    {
        msg.type = 'kick_out';
        msg.time = getServerTime();
        msg.user_name = socket.user_name;
        msg.nick_name = socket.nick_name;
        poolRedis.getClient(function(client, done) {
            client.setex(socket.kick_out + msg.to, socket.kick_out_time, 1);
            poolRedis.release(client);
        });
        io.sockets.in(socket.sub_r_id + '-' + msg.to).emit('kick_out', JSON.stringify(msg));
        fn(true);
    })

     //禁言
    socket.on('forbidden_talk', function(msg,fn)
    {   
        msg.type = 'forbidden_talk';
        msg.time = getServerTime();
        msg.user_name = socket.user_name;
        msg.nick_name = socket.nick_name;
        poolRedis.getClient(function(client, done) {
            client.setex(socket.forbidden_talk + msg.to, socket.forbidden_talk_time, 1);
            poolRedis.release(client);
        });
        io.sockets.in(socket.sub_r_id + '-' + msg.to).emit('forbidden_talk', JSON.stringify(msg));
        fn(true);
    })

    //发送礼物
    socket.on('gift',function(msg){
        msg.type = 'gift';
        msg.time = getServerTime();
        msg.user_name = socket.user_name;
        msg.nick_name = socket.nick_name;
        io.sockets.in(socket.sub_r_id).emit('gift', JSON.stringify(msg));
    });

    //监听退出
    socket.on('disconnect',function()
    {   
        //删除退出的用户信息
        poolRedis.getClient(function(client, done) {
            client.zrem(socket.online_list, socket.json_info, function(data){});
            poolRedis.release(client);
        });
        //退订
        socket.leave(socket.sub_r_id);
        if (socket.user_name && socket.user_name!= undefined) {
            socket.leave(socket.sub_r_id + '-' + socket.user_name);
        }

        //退出hash
        try {
            var room_length = io.sockets.manager.rooms['/' + socket.sub_r_id].length;
        } catch(e) {
            if(!room_length || room_length == 'undefined') {
                delete hash[socket.r_id];
            }
        }
    });
});