class AcGameMenu {
    constructor (root) {
        this.root = root;
        this.$menu = $(`
<div class="ac-game-menu">
    <div class="ac-game-menu-field">
        <div class="ac-game-menu-field-item ac-game-menu-field-item-single-mode">
            Single Mode
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-multi-mode">
            Multi Mode
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-settings">
            Settings
        </div>
    </div>
</div>
`);
        this.$menu.hide();     // 菜单界面先关闭，验证用户信息
        this.root.$ac_game.append(this.$menu);
        this.$single_mode = this.$menu.find('.ac-game-menu-field-item-single-mode');
        this.$multi_mode = this.$menu.find('.ac-game-menu-field-item-multi-mode');
        this.$settings = this.$menu.find('.ac-game-menu-field-item-settings');

        this.start();
    }

    start() {
        this.add_listening_events();
    }

    add_listening_events() {
        let outer = this;
        this.$single_mode.click(function() {
            outer.hide();
            outer.root.playground.show("single mode");
        });
        this.$multi_mode.click(function() {
            outer.hide();
            outer.root.playground.show("multi mode");
        });
        this.$settings.click(function() {
            console.log("click settings");
            outer.root.settings.logout_on_remote();
        });
    }

    show() {    // 显示menu界面
        this.$menu.show();  // jquery自带的api，下面同理
    }

    hide() {    // 关闭menu界面
        this.$menu.hide();
    }
}
let AC_GAME_OBJECTS = [];                   // 一个全局数组，每秒调用60次，以此实现动画效果

class AcGameObject {
    constructor() {
        AC_GAME_OBJECTS.push(this);         // 每次构造时，放入每秒调用的全局数组里
        this.has_called_start = false;      // 标记一下，检查该物体是否执行过start函数(因为start只能执行一次，update是后续的每帧都要执行)
        this.timedelta = 0;                 // 当前帧距离上一帧的时间间隔，单位：毫秒(由于不同浏览器刷新率不一样，我们通过统一帧的间隔时间，来统一物体的移动速度)
        this.uuid = this.create_uuid();
    }

    // 一个物体生命周期中，一般设计四个函数

    create_uuid() {       // 给每个object设定一个八位随机数，用来在联机对战中实现同步
        let res = "";
        for (let i = 0; i < 8; i ++ ) {
            let x = parseInt(Math.floor(Math.random() * 10));
            res += x;
        }
        return res;
    }

    start() {       // 1. 初始状态，只会在第一帧执行一次
    }

    update() {      // 2. 每一帧均执行一次
    }

    on_destroy() {  // 3. 在被销毁前执行一次
    }

    destroy() {     // 4. 删掉该物体
        this.on_destroy();

        for (let i = 0; i < AC_GAME_OBJECTS.length; i ++ ) {
            if (AC_GAME_OBJECTS[i] === this) {
                AC_GAME_OBJECTS.splice(i, 1);
                break;
            }
        }
    }
}

let last_timestamp;
let AC_GAME_ANIMATION = function(timestamp) {                // 传入新的时间戳timestamp

    for (let i = 0; i < AC_GAME_OBJECTS.length; i ++ ) {
        let obj = AC_GAME_OBJECTS[i];
        if (!obj.has_called_start) {                        // 如果没有执行start函数，执行start函数
            obj.start();
            obj.has_called_start = true;                    // 标记为已执行
        } else {
            obj.timedelta = timestamp - last_timestamp;     // 计算出新时间间隔
            obj.update();                                   // 执行update函数
        }
    }
    last_timestamp = timestamp;                             // 更新时间戳

    requestAnimationFrame(AC_GAME_ANIMATION);   // 通过递归实现每帧都会调用AC_GAME_ANIMATION函数
}

requestAnimationFrame(AC_GAME_ANIMATION);       // 下一帧(1/60秒每帧)渲染前会调用该函数
class GameMap extends AcGameObject { // GameMap是AcGameObject的基类，可以调用他的函数
    constructor (playground) { // 传入playground
        super(); // 调用基类的构造函数

        this.playground = playground;                     // 把playground存下来
        this.$canvas = $(`<canvas></canvas>`);            // 构建画布
        this.ctx = this.$canvas[0].getContext('2d');      // 未来在ctx中操作画布
        this.ctx.canvas.width = this.playground.width;    // 设置画布长宽
        this.ctx.canvas.height = this.playground.height;
        this.playground.$playground.append(this.$canvas); // 把canvas加入到playground里
    }

    start() {
    }

    resize() {
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    update() {
        this.render();
    }

    render() {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";                               // 填充黑色
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);  // 绘制矩形，左上坐标是0, 0
    }
}
class Particle extends AcGameObject {
    constructor(playground, x, y, radius, vx, vy, color, speed, move_length) {
        super();
        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.speed = speed;
        this.move_length = move_length;
        this.friction = 0.9;
        this.eps = 0.01;
    }

    start() {
    }

    update() {
        if (this.move_length < this.eps || this.speed < this.eps) {
            this.destroy();
            return false;
        }

        let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
        this.x += this.vx * moved;
        this.y += this.vy * moved;
        this.speed *= this.friction;
        this.move_length -= moved;
        this.render();
    }

    render() {
        let scale = this.playground.scale;

        this.ctx.beginPath();
        this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }
}
class Player extends AcGameObject {
    constructor(playground, x, y, radius, color, speed, character, username, photo) {    // 玩家的各个参数，is_me是为了区分本地还是网络玩家，两者输入方式不一样(键盘和网络返回值)
        console.log(character, username, photo);

        super();
        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.vx = 0;            // x轴移速
        this.vy = 0;            // y轴移速
        this.damage_x = 0;      // 被攻击后移动距离
        this.damage_y = 0;
        this.damage_speed = 0;  // 被攻击后移动速度
        this.move_length = 0;   // 点击鼠标后要移动的距离
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.character = character;
        this.username = username;
        this.photo = photo;
        this.eps = 0.01;         // 最小误差，控制最小精度
        this.friction = 0.9;    // 被攻击后移速降低的摩擦力
        this.spent_time = 0;    // 经过的时间，用于开始无敌时间

        this.cur_skill = null;  // 记录当前技能

        if (this.character !== "robot") {       // 如果是自己，渲染头像
            this.img = new Image();
            this.img.src = this.photo;
        }
    }

    start() {
        if (this.character === "me") {
            this.add_listening_events();    // 如果是本用户，添加监听函数
        } else {
            this.tx = Math.random() * this.playground.width / this.playground.scale;
            this.ty = Math.random() * this.playground.height / this.playground.scale;
            this.move_to(this.tx, this.ty);
        }
    }

    add_listening_events() {
        let outer = this;
        this.playground.game_map.$canvas.on("contextmenu", function() {
            return false;                                               // 禁止右键打开菜单
        });
        this.playground.game_map.$canvas.mousedown(function(e) {        // 获取鼠标事件
            const rect = outer.ctx.canvas.getBoundingClientRect();
            if (e.which === 3) {                                        // 判断是否为右键(左键为1，右键为3，滚轮为2)
                outer.move_to((e.clientX - rect.left) / outer.playground.scale, (e.clientY - rect. top) / outer.playground.scale);    // 这里要用outer不是this，因为用this的话，this指的是mousedown这个函数本身，所以用outer赋值this用户
            } else if (e.which === 1) {
                if (outer.cur_skill === "fireball") {
                    outer.shoot_fireball((e.clientX - rect.left) / outer.playground.scale, (e.clientY - rect.top) / outer.playground.scale);         // 如果当前技能为fireball，执行shoot_fireball函数
                }

                outer.cur_skill = null;
            }
        });

        $(window).keydown(function(e) {                                 // 获取键盘事件，具体值可以查询keycode表
            if (e.which === 81) {                                       // q键
                outer.cur_skill = "fireball";
                return false;
            }
        });
    }

    shoot_fireball(tx, ty) {
        let x = this.x, y = this.y;
        let radius = 0.01;
        let angle = Math.atan2(ty - this.y, tx - this.x);
        let vx = Math.cos(angle), vy = Math.sin(angle);
        let color = "orange";
        let speed = 0.5;
        let move_length = 1;
        new FireBall(this.playground, this, x, y, radius, vx, vy, color, speed, move_length, 0.005);
    }

    get_dist(x1, y1, x2, y2) {              // 构造一个计算距离的函数
        let dx = x1 - x2;
        let dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    move_to(tx, ty) {
        this.move_length = this.get_dist(this.x, this.y, tx, ty);
        let angle = Math.atan2(ty - this.y, tx - this.x);
        this.vx = Math.cos(angle);
        this.vy = Math.sin(angle);
    }

    is_attacked(angle, damage) {
        for (let i = 0; i < 10 + Math.random() * 5; i ++ ) {
            let x = this.x, y = this.y;
            let radius = this.radius * Math.random() * 0.3;
            let angle = Math.PI * 2 * Math.random();
            let vx = Math.cos(angle), vy = Math.sin(angle);
            let color = this.color;
            let speed = this.speed * 5;
            let move_length = this.radius * Math.random() * 4;
            new Particle(this.playground, x, y, radius, vx, vy, color, speed, move_length);
        }

        this.radius -= damage;
        if (this.radius < this.eps) {             // 判断是否碰撞
            this.destroy();
            return false;
        }
        this.damage_x = Math.cos(angle);    // 设置被攻击后的移动距离和速度
        this.damage_y = Math.sin(angle);
        this.damage_speed = damage * 80;
        this.speed *= 1.25;
    }

    update() {
        this.update_move();
        this.render();
    }

    update_move() {                              // 更新玩家移动
        this.spent_time += this.timedelta / 1000;
        if (this.character === "robot" && this.spent_time > 5 && Math.random() < 1 / 180.0) {
            let player = this.playground.players[Math.floor(Math.random() * this.playground.players.length)];
            this.shoot_fireball(player.x, player.y);
        }

        if (this.damage_speed > this.eps) {            // 判断是否在被伤害
            this.vx = this.vy = 0;               // 被伤害时，不能移动速度为零
            this.move_length = 0;
            this.x += this.damage_x * this.damage_speed *this.timedelta / 1000;
            this.y += this.damage_y * this.damage_speed *this.timedelta / 1000;
            this.damage_speed *= this.friction;
        } else {
            if (this.move_length < this.eps) {    // 如果剩余距离小于最小精度，停止移动
                this.move_length = 0;
                this.vx = this.vy = 0;
                if (this.character === "robot") {
                    this.tx = Math.random() * this.playground.width / this.playground.scale;
                    this.ty = Math.random() * this.playground.height / this.playground.scale;
                    this.move_to(this.tx, this.ty);
                }
            } else {
                let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
                // moved是实际移动距离，取move_length和计算出来的最小值
                this.x += this.vx * moved;
                this.y += this.vy * moved;
                this.move_length -= moved;

            }
        }

    }

    render() {
        let scale = this.playground.scale;
        if (this.character !== "robot") {           // 如果不是机器人，渲染自己的头像
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
            this.ctx.stroke();
            this.ctx.clip();
            this.ctx.drawImage(this.img, (this.x - this.radius) * scale, (this.y - this.radius) * scale, this.radius * 2 * scale, this.radius * 2 * scale);
            this.ctx.restore();
        } else {
            this.ctx.beginPath();   // 如果不是自己，机器人进行渲染
            this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
            this.ctx.fillStyle = this.color;
            this.ctx.fill();
        }
    }

    on_destroy() {
        for (let i = 0; i < this.playground.players.length; i ++ ) {
            if (this.playground.players[i] === this) {
                this.playground.players.splice(i, 1);
            }
        }
    }
}
class FireBall extends AcGameObject {
    constructor(playground, player, x, y, radius, vx, vy, color, speed, move_length, damage) {   // 传player因为需要知道是谁发的火球
        super();
        this.playground = playground;
        this.player = player;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.vx= vx;
        this.vy = vy;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.move_length = move_length; // 火球的射程
        this.damage = damage;
        this.eps = 0.01;
    }

    start() {
    }

    update() {
        if (this.move_length < this.eps) {
            this.destroy();
            return false;
        }

        let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
        this.x += this.vx * moved;
        this.y += this.vy * moved;
        this.move_length -= moved;

        for (let i = 0; i < this.playground.players.length; i ++ ) {
            let player = this.playground.players[i];
            if (this.player !== player && this.is_collision(player)) {                    // 攻击逻辑
                this.attack(player);
            }
        }

        this.render();
    }

    get_dist(x1, y1, x2, y2) {
        let dx = x1 - x2;
        let dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    is_collision(player) {
        let distance = this.get_dist(this.x, this.y, player.x, player.y);
        if (distance < this.radius + player.radius)
            return true;
        return false;
    }

    attack(player) {
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        player.is_attacked(angle, this.damage);
        this.destroy();
    }

    render() {
        let scale = this.playground.scale;
        this.ctx.beginPath();
        this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }
}
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
            'event': "create_player",
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
class Settings {
    constructor(root) {
        this.root = root;
        this.platform = "WEB";
        if (this.root.AcWingOS) this.platform = "ACAPP";
        this.username = "";
        this.photo = "";

        this.$settings = $(`
<div class="ac-game-settings">
    <div class="ac-game-settings-login">
        <div class="ac-game-settings-title">
            User Login
        </div>

        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="Username">
            </div>
        </div>

        <div class="ac-game-settings-password">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="Password">
            </div>
        </div>

        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>LOGIN</button>
            </div>
        </div>

        <div class="ac-game-settings-error-message">
        </div>

        <div class="ac-game-settings-option">
            Register
        </div>
        <br>
        <div class="ac-game-settings-acwing">
            <img width="30" src="https://app4436.acapp.acwing.com.cn/static/image/settings/acwing_logo.png">
            <br>
            <div>
                Login in with AcWing
            </div>
        </div>
    </div>

    <div class="ac-game-settings-register">
        <div class="ac-game-settings-title">
            Register
        </div>
        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="Username">
            </div>
        </div>
        <div class="ac-game-settings-password ac-game-settings-password-first">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="Password">
            </div>
        </div>
        <div class="ac-game-settings-password ac-game-settings-password-second">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="Re-enter password">
            </div>
        </div>
        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>Register</button>
            </div>
        </div>
        <div class="ac-game-settings-error-message">
        </div>
        <div class="ac-game-settings-option">
            Login
        </div>
        <br>
        <div class="ac-game-settings-acwing">
            <img width="30" src="https://app165.acapp.acwing.com.cn/static/image/settings/acwing_logo.png">
            <br>
            <div>
                Login in with AcWing
            </div>
        </div>
    </div>
</div>
`);
        this.$login = this.$settings.find(".ac-game-settings-login");
        this.$login_username = this.$login.find(".ac-game-settings-username input");
        this.$login_password = this.$login.find(".ac-game-settings-password input");
        this.$login_submit = this.$login.find(".ac-game-settings-submit button");
        this.$login_error_message = this.$login.find(".ac-game-settings-error-message");
        this.$login_register = this.$login.find(".ac-game-settings-option");

        this.$login.hide();

        this.$register = this.$settings.find(".ac-game-settings-register");
        this.$register_username = this.$register.find(".ac-game-settings-username input");
        this.$register_password = this.$register.find(".ac-game-settings-password-first input");
        this.$register_password_confirm = this.$register.find(".ac-game-settings-password-second input");
        this.$register_submit = this.$register.find(".ac-game-settings-submit button");
        this.$register_error_message = this.$register.find(".ac-game-settings-error-message");
        this.$register_login = this.$register.find(".ac-game-settings-option");

        this.$register.hide();

        this.$acwing_login = this.$settings.find('.ac-game-settings-acwing img');

        this.root.$ac_game.append(this.$settings);

        this.start();
    }

    start() {
        if (this.platform === "ACAPP") {
            this.getinfo_acapp();
        } else {
            this.getinfo_web();
            this.add_listening_events();
        }
    }

    add_listening_events() {
        let outer = this;

        this.add_listening_events_login();
        this.add_listening_events_register();

        this.$acwing_login.click(function() {
            outer.acwing_login();
        });
    }

    add_listening_events_login() {
        let outer = this;

        this.$login_register.click(function() {
            outer.register();                       // 点击时跳转到注册界面
        });
        this.$login_submit.click(function() {
            outer.login_on_remote();
        });
    }

    add_listening_events_register() {
        let outer = this;
        this.$register_login.click(function() {
            outer.login();                          // 点击时跳转到登陆界面
        });
        this.$register_submit.click(function() {
            outer.register_on_remote();
        });
    }

    acwing_login() {
        $.ajax({
            url: "https://app4436.acapp.acwing.com.cn/settings/acwing/web/apply_code/",
            type: "GET",
            success: function(resp) {
                if (resp.result === "success") {
                    window.location.replace(resp.apply_code_url);   // apply_code.py中return的是apply_code_url
                }
            }
        });
    }

    login_on_remote() {  // 在远程服务器上登录
        let outer = this;
        let username = this.$login_username.val();
        let password = this.$login_password.val();
        this.$login_error_message.empty();

        $.ajax({
            url: "https://app4436.acapp.acwing.com.cn/settings/login/",
            type: "GET",
            data: {
                username: username,
                password: password,
            },
            success: function(resp) {
                if (resp.result === "success") {
                    location.reload();
                } else {
                    outer.$login_error_message.html(resp.result);
                }
            }
        });
    }

    register_on_remote() {  // 在远程服务器上注册
        let outer = this;
        let username = this.$register_username.val();
        let password = this.$register_password.val();
        let password_confirm = this.$register_password_confirm.val();
        this.$register_error_message.empty();

        $.ajax({
            url: "https://app4436.acapp.acwing.com.cn/settings/register/",
            type: "GET",
            data: {
                username: username,
                password: password,
                password_confirm: password_confirm,
            },
            success: function(resp) {
                if (resp.result === "success") {
                    location.reload();  // 刷新页面
                } else {
                    outer.$register_error_message.html(resp.result);
                }
            }
        });
    }

    logout_on_remote() {  // 在远程服务器上登出
        if (this.platform === "ACAPP") return false;

        $.ajax({
            url: "https://app4436.acapp.acwing.com.cn/settings/logout/",
            type: "GET",
            success: function(resp) {
                if (resp.result === "success") {
                    location.reload();
                }
            }
        });
    }

    register() {    // 打开注册界面
        this.$login.hide();
        this.$register.show();
    }

    login() {       // 打开登陆界面
        this.$register.hide();
        this.$login.show();
    }

    acapp_login(appid, redirect_uri, scope, state) {
        let outer = this;

        this.root.AcWingOS.api.oauth2.authorize(appid, redirect_uri, scope, state, function(resp) {
            console.log(resp);
            if (resp.result === "success") {
                outer.username = resp.username;      // 和getinfo_web中success后的一样，保存用户信息并关掉登陆界面打开菜单界面
                outer.photo = resp.photo;
                outer.hide();
                outer.root.menu.show();
            }
        });     // acapp网站提供的api，见第一步：https://www.acwing.com/blog/content/12467/
    }

    getinfo_acapp() {   // 从acapp获取用户信息
        let outer = this;

        $.ajax({
            url: "https://app4436.acapp.acwing.com.cn/settings/acwing/acapp/apply_code/",
            type: "GET",
            success: function(resp) {
                if (resp.result === "success") {
                    outer.acapp_login(resp.appid, resp.redirect_uri, resp.scope, resp.state);
                }
            }
        });
    }

    getinfo_web() {     // 从服务器端获取用户信息
        let outer = this;

        $.ajax({
            url: "https://app4436.acapp.acwing.com.cn/settings/getinfo/",   // 执行顺序：向后端发送请求，urls下settings路由指示，找到views里的getinfo函数，进一步调用getinfo_web返回json信息
            type: "GET",
            data: {
                platform: outer.platform,   // 不能用this.platform，防止this调用ajax函数本身，用outer保险
                // 后端getinfo函数里需要platform参数，就传它
            },
            success: function(resp) {       // 调用成功的回调函数
                if (resp.result === "success") {
                    outer.username = resp.username;
                    outer.photo = resp.photo;
                    outer.hide();           // 如果获取信息成功，隐藏当前界面，打开菜单界面
                    outer.root.menu.show();
                } else {
                    outer.login();          // 如果获取失败(未登录状态)，打开login界面
                }
            }
        });
    }

    hide() {
        this.$settings.hide();
    }

    show() {
        this.$settings.show();
    }
}
export class AcGame {
    constructor(id, AcWingOS) {
        this.id = id;
        this.$ac_game = $('#' + id);
        this.AcWingOS = AcWingOS;           // 用acwing app打开的时候会保存一些函数接口
        // 有这个参数说明在acapp里面执行的，没有这个参数说明在web里执行的

        this.settings = new Settings(this); // 创建settings界面
        this.menu = new AcGameMenu(this);   // 创建菜单界面
        this.playground = new AcGamePlayground(this);   // 创建游戏界面

        this.start();
    }

    start() {
    }
}
