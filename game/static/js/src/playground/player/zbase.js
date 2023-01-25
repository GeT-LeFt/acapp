class Player extends AcGameObject {
    constructor(playground, x, y, radius, color, speed, character, username, photo) {    // 玩家的各个参数，is_me是为了区分本地还是网络玩家，两者输入方式不一样(键盘和网络返回值)
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
        this.eps = 0.01;        // 最小误差，控制最小精度
        this.friction = 0.9;    // 被攻击后移速降低的摩擦力
        this.spent_time = 0;    // 经过的时间，用于开始无敌时
        this.fireballs = [];    // 把每个人发出的火球记录下来

        this.cur_skill = null;  // 记录当前技能

        if (this.character !== "robot") {       // 如果是自己，渲染头像
            this.img = new Image();
            this.img.src = this.photo;
        }

        if (this.character === "me") {
            this.fireball_coldtime = 3;         // 火球cd时间：单位秒
            this.fireball_img = new Image();
            this.fireball_img.src = "https://cdn.acwing.com/media/article/image/2021/12/02/1_9340c86053-fireball.png";

            this.blink_coldtime = 5;
            this.blink_img = new Image();
            this.blink_img.src = "https://cdn.acwing.com/media/article/image/2021/12/02/1_daccabdc53-blink.png";
        }
    }

    start() {
        this.playground.player_count ++ ;   // 记录player数量
        this.playground.notice_board.write("Joined Players: " + this.playground.player_count);  // 在上方更新玩家数量

        if (this.playground.player_count >= 3) {
            this.playground.state = "fighting";
            this.playground.notice_board.write("Fighting!");
        }

        if (this.character === "me") {
            this.add_listening_events();    // 如果是本用户，添加监听函数
        } else if (this.character === "robot") {
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
            if (outer.playground.state !== "fighting")                  // 不往外传鼠标事件
                return true;

            const rect = outer.ctx.canvas.getBoundingClientRect();
            if (e.which === 3) {                                        // 判断是否为右键(左键为1，右键为3，滚轮为2)
                let tx = (e.clientX - rect.left) / outer.playground.scale;
                let ty = (e.clientY - rect. top) / outer.playground.scale;
                outer.move_to(tx, ty);

                if (outer.playground.mode === "multi mode") {
                    outer.playground.mps.send_move_to(tx, ty);
                }
            } else if (e.which === 1) {
                let tx = (e.clientX - rect.left) / outer.playground.scale;
                let ty = (e.clientY - rect.top) / outer.playground.scale;
                if (outer.cur_skill === "fireball") {
                    if (outer.fireball_coldtime > outer.eps)                // 如果技能没冷却完成，不能放技能
                        return false;

                    let fireball = outer.shoot_fireball(tx, ty);         // 如果当前技能为fireball，执行shoot_fireball函数

                    if (outer.playground.mode === "multi mode") {
                        outer.playground.mps.send_shoot_fireball(tx, ty, fireball.uuid);   // 广播函数
                    }
                } else if (outer.cur_skill === "blink") {
                    if (outer.blink_coldtime > outer.eps)
                        return false;

                    outer.blink(tx, ty);

                    if (outer.playground.mode === "multi mode") {
                        outer.playground.mps.send_blink(tx, ty);        // 广播函数
                    }
                }

                outer.cur_skill = null;
            }
        });

        this.playground.game_map.$canvas.keydown(function(e) {          // 获取键盘事件，具体值可以查询keycode表，绑定到canvas上，只读取窗口内的鼠标键盘事件
            if (e.which === 13) {                                       // 如果监听到enter键
                if (outer.playground.mode === "multi mode") {           // 多人模式下，回车键打开聊天框
                    outer.playground.chat_field.show_input();
                    return false;
                }
            } else if (e.which === 27) {                                // 如果监听到esc键
                if (outer.playground.mode === "multi mode") {
                    outer.playground.chat_field.hide_input();
                }
            }

            if (outer.playground.state !== "fighting")                  // 如果不是战斗阶段，不获取键盘事件
                return true;

            if (e.which === 81) {                                       // q键
                if (outer.fireball_coldtime > outer.eps)
                    return true;                                        // 技能为冷却好，不能放技能

                outer.cur_skill = "fireball";
                return false;
            } else if (e.which === 70) {                                // f键
                if (outer.blink_coldtime > outer.eps)
                    return true;

                outer.cur_skill = "blink";
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
        let fireball = new FireBall(this.playground, this, x, y, radius, vx, vy, color, speed, move_length, 0.005);
        this.fireballs.push(fireball);

        this.fireball_coldtime = 3;         // 火球放完后，cd重置为3秒

        return fireball;
    }

    destroy_fireball(uuid) {                // 联机中删除火球
        for (let i = 0; i < this.fireballs.length; i ++ ) {
            let fireball = this.fireballs[i];
            if (fireball.uuid === uuid) {
                fireball.destroy();
                break;
            }
        }
    }

    blink(tx, ty) {
        let d = this.get_dist(this.x, this.y, tx, ty);
        d = Math.min(d, 0.8);
        let angle = Math.atan2(ty - this.y, tx - this.x);
        this.x += d * Math.cos(angle);
        this.y += d * Math.sin(angle);

        this.blink_coldtime = 5;
        this.move_length = 0;               // 闪现过后体停止移动
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

    receive_attack(x, y, angle, damage, ball_uuid, attacker) {
        attacker.destroy_fireball(ball_uuid);       // 删除攻击者的火球
        this.x = x;
        this.y = y;
        this.is_attacked(angle, damage);
    }

    update() {
        this.spent_time += this.timedelta / 1000;

        this.update_win();

        if (this.character === "me" && this.playground.state === "fighting") {
            this.update_coldtime();
        }
        this.update_move();

        this.render();
    }

    update_win() {
        if (this.playground.state === "fighting" && this.character === "me" && this.playground.players.length === 1) {
            this.playground.state === "over";
            this.playground.score_board.win();
        }
    }

    update_coldtime() {
        this.fireball_coldtime -= this.timedelta / 1000;
        this.fireball_coldtime = Math.max(this.fireball_coldtime, 0);

        this.blink_coldtime -= this.timedelta / 1000;
        this.blink_coldtime = Math.max(this.blink_coldtime, 0);
    }

    update_move() {                              // 更新玩家移动
        if (this.character === "robot" && this.spent_time > 5 && Math.random() < 1 / 180.0) {
            let player = this.playground.players[Math.floor(Math.random() * this.playground.players.length)];
            let tx = player.x + player.speed * this.vx * this.timedelta / 1000 * 0.3;
            let ty = player.y + player.speed * this.vy * this.timedelta / 1000 * 0.3;
            this.shoot_fireball(tx, ty);
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

        if (this.character === "me" && this.playground.state === "fighting") {
            this.render_skill_coldtime();
        }
    }

    render_skill_coldtime() {

        // 渲染火球技能图标
        let scale = this.playground.scale;
        let x = 1.5, y = 0.9, r = 0.04;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.fireball_img, (x - r) * scale, (y - r) * scale, r * 2 * scale, r * 2 * scale);
        this.ctx.restore();

        if (this.fireball_coldtime > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * scale, y * scale);
            this.ctx.arc(x * scale, y * scale, r * scale, 0 - Math.PI / 2, Math.PI * 2 * (1 - this.fireball_coldtime / 3) - Math.PI / 2, false);
            this.ctx.lineTo(x * scale, y * scale);
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
            this.ctx.fill();
        }

        // 渲染闪现技能图标
        x = 1.62, y = 0.9, r = 0.04;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.blink_img, (x - r) * scale, (y - r) * scale, r * 2 * scale, r * 2 * scale);
        this.ctx.restore();

        if (this.blink_coldtime > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * scale, y * scale);
            this.ctx.arc(x * scale, y * scale, r * scale, 0 - Math.PI / 2, Math.PI * 2 * (1 - this.blink_coldtime / 5) - Math.PI / 2, false);
            this.ctx.lineTo(x * scale, y * scale);
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
            this.ctx.fill();
        }
    }

    on_destroy() {
        if (this.character === "me") {
            if (this.playground.state === "fighting") {
                this.playground.state = "over";
                this.playground.score_board.lose();
            }
        }

        for (let i = 0; i < this.playground.players.length; i ++ ) {
            if (this.playground.players[i] === this) {
                this.playground.players.splice(i, 1);
                break;
            }
        }
    }
}
