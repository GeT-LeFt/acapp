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