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
            outer.root.playground.show();
        });
        this.$multi_mode.click(function() {
            console.log("2");
        });
        this.$settings.click(function() {
            console.log("3");
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
    }

    // 一个物体生命周期中，一般设计四个函数

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
        this.eps = 1;
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
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }
}
class Player extends AcGameObject {
    constructor(playground, x, y, radius, color, speed, is_me) {    // 玩家的各个参数，is_me是为了区分本地还是网络玩家，两者输入方式不一样(键盘和网络返回值)
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
        this.is_me = is_me;
        this.eps = 0.1;         // 最小误差，控制最小精度
        this.friction = 0.9;    // 被攻击后移速降低的摩擦力
        this.spent_time = 0;    // 经过的时间，用于开始无敌时间

        this.cur_skill = null;  // 记录当前技能
    }

    start() {
        if (this.is_me) {
            this.add_listening_events();    // 如果是本用户，添加监听函数
        } else {
            this.tx = Math.random() * this.playground.width;
            this.ty = Math.random() * this.playground.height;
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
                outer.move_to(e.clientX - rect.left, e.clientY - rect. top);                    // 这里要用outer不是this，因为用this的话，this指的是mousedown这个函数本身，所以用outer赋值this用户
            } else if (e.which === 1) {
                if (outer.cur_skill === "fireball") {
                    outer.shoot_fireball(e.clientX - rect.left, e.clientY - rect.top);         // 如果当前技能为fireball，执行shoot_fireball函数
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
        let radius = this.playground.height * 0.01;
        let angle = Math.atan2(ty - this.y, tx - this.x);
        let vx = Math.cos(angle), vy = Math.sin(angle);
        let color = "orange";
        let speed = this.playground.height * 0.5;
        let move_length = this.playground.height * 1;
        new FireBall(this.playground, this, x, y, radius, vx, vy, color, speed, move_length, this.playground.height * 0.005);
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
        if (this.radius < 10) {             // 判断是否碰撞
            this.destroy();
            return false;
        }
        this.damage_x = Math.cos(angle);    // 设置被攻击后的移动距离和速度
        this.damage_y = Math.sin(angle);
        this.damage_speed = damage * 80;
        this.speed *= 1.25;
    }

    update() {
        this.spent_time += this.timedelta / 1000;
        if (!this.is_me && this.spent_time > 5 && Math.random() < 1 / 180.0) {
            let player = this.playground.players[Math.floor(Math.random() * this.playground.players.length)];
            this.shoot_fireball(player.x, player.y);
        }

        if (this.damage_speed > 10) {     // 判断是否在被伤害
            this.vx = this.vy = 0;              // 被伤害时，不能移动速度为零
            this.move_length = 0;
            this.x += this.damage_x * this.damage_speed *this.timedelta / 1000;
            this.y += this.damage_y * this.damage_speed *this.timedelta / 1000;
            this.damage_speed *= this.friction;
        } else {
            if (this.move_length < this.eps) {  // 如果剩余距离小于最小精度，停止移动
                this.move_length = 0;
                this.vx = this.vy = 0;
                if (!this.is_me) {
                    this.tx = Math.random() * this.playground.width;
                    this.ty = Math.random() * this.playground.height;
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
        this.render();
    }

    render() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
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
        this.eps = 0.1;
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
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }
}
class AcGamePlayground {
    constructor(root) {
        this.root = root;
        this.$playground = $(`<div class="ac-game-playground"></div>`);

        this.hide();

        this.start();
    }

    get_random_color() {
        let colors = ["blue", "red", "pink", "grey", "green"];
        return colors[Math.floor(Math.random() * 5)];
    }

    start() {
    }

    show() {    // 打开playground界面
        this.$playground.show();
        this.root.$ac_game.append(this.$playground);
        this.width = this.$playground.width();
        this.height = this.$playground.height();
        this.game_map = new GameMap(this);
        this.players = [];
        this.players.push(new Player(this, this.width / 2, this.height / 2, this.height * 0.03, "white", this.height * 0.15, true));

        for (let i = 0; i < 5; i ++ ) {     //  六人一局
            this.players.push(new Player(this, this.width / 2, this.height / 2, this.height * 0.03, this.get_random_color(), this.height * 0.15, false));
        }

    }

    hide() {    // 关闭playground界面
        this.$playground.hide();
    }
}
export class AcGame {
    constructor(id) {
        this.id = id;
        this.$ac_game = $('#' + id);
        this.menu = new AcGameMenu(this);   // 创建菜单界面
        this.playground = new AcGamePlayground(this);   // 创建游戏界面

        this.start();
    }

    start() {
    }
}
