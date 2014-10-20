exports.config = {
        redis : {
                host : '127.0.0.1',
                port : 6381,
                timeout: 30,
                maxConnections: 1000
        },
        socket: {
        	port: 8081
        },
        app: {
        	name: 'chat-2',
        	kick_out_time : 900,
        	forbidden_talk_time: 180,
        	return_list_num: 100,
                url : 'http://127.0.0.1'
        }
}
