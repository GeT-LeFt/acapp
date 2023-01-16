class AcGamePlayground {
    constructor(root) {
        this.root = root;
        this.$playground = $(`<div class="ac-game-playground"></div>`);

        this.hide();
        this.root.$ac_game.append(this.$playground);    // 需要动态调正长宽比所以每次调用的时候append

        this.start();
    }

    get_random_color() {
        let colors = ["blue", "red", "pink", "grey", "green"];
        return colors[Math.floor(Math.random() * 5)];
    }

    start() {
        let outer = this;
        $(window).resize(function() {       // 窗口调整时会触发该函数
            outer.resize();
        });
    }

    resize() {
        this.width = this.$playground.width();
        this.height = this.$playground.height();
        let unit = Math.min(this.width / 16, this.height / 9);  // 长宽调整为16:9
        this.width = unit * 16;
        this.height = unit * 9;
        this.scale = this.height;   // 基准

        if (this.game_map) this.game_map.resize();              // 如果有game_map的话，调用game_map里的resize函数
    }

    show(mode) {    // 打开playground界面，传入mode参数判断是单人还是多人模式
        let outer = this;
        this.$playground.show();

        this.width = this.$playground.width();
        this.height = this.$playground.height();
        this.game_map = new GameMap(this);

        this.mode = mode;
        this.state = "waiting";                     // 状态机，游戏状态分别为waiting -> fighting -> over
        this.notice_board = new NoticeBoard(this);  // 创建状态显示栏
        this.player_count = 0;

        this.resize();

        this.players = [];
        this.players.push(new Player(this, this.width / 2 / this.scale, 0.5, 0.03, "white", 0.15, "me", this.root.settings.username, this.root.settings.photo));

        if (mode === "single mode") {
            for (let i = 0; i < 5; i ++ ) {     //  六人一局
                this.players.push(new Player(this, this.width / 2 / this.scale, 0.5, 0.03, this.get_random_color(), 0.15, "robot"));
            }
        } else if (mode === "multi mode") {
            this.mps = new MultiPlayerSocket(this);     // 创建socket链接
            this.mps.uuid = this.players[0].uuid;       // 自己永远是数组第一个

            this.mps.ws.onopen = function() {           // 事件函数，创建成功之后会回调的函数
                outer.mps.send_create_player(outer.root.settings.username, outer.root.settings.photo);  // 创建玩家时传入username和photo
            };
        }
    }

    hide() {    // 关闭playground界面
        this.$playground.hide();
    }
}
