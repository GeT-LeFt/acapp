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
