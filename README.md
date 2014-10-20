socket-chart-room

step

1. npm install -g supervisor

2. cd /home/web/chatroom

3. npm install

4. nohup /usr/local/nodejs/bin/supervisor /home/web/chatroom/index.js >
/home/logs/chatroom.log 2>&1 &

