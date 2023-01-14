class MultiPlayerSocket {
    constructor(playground) {
        this.playground = playground;

        this.ws = new WebSocket("wss://app4436.acapp.acwing.com.cn/wss/multiplayer/");

        this.start();
    }

    start() {
        this.receive();
    }

    receive() {
        let outer = this;

        this.ws.onmessage = function(e) {       // 前端接受ws协议的信息onmessage
            let data = JSON.parse(e.data);      // 把字符串解析成字典
            let uuid = data.uuid;
            if (uuid === outer.uuid) return false;

            let event = data.event;
            if (event === "create_player") {
                outer.receive_create_player(uuid, data.username, data.photo);
            }
        };
    }

    send_create_player(username, photo) {      // 新用户加入给server发送创建信息
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "create player",
            'uuid': outer.uuid,
            'username': username,
            'photo': photo,
        }));
    }

    receive_create_player(uuid, username, photo) {
        let player = new Player(
            this.playground,
            this.playground.width / 2 / this.playground.scale,
            0.5,
            0.03,
            "white",
            0.15,
            "enemy",
            username,
            photo,
        );

        player.uuid = uuid;     // 新建立的player的uuid要和创建者产生的uuid保持一致
        this.playground.players.push(player);
    }
}
