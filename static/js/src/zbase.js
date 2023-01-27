export class AcGame {
    constructor(id, AcWingOS, access, refresh) {
        this.id = id;
        this.$ac_game = $('#' + id);
        this.AcWingOS = AcWingOS;           // 用acwing app打开的时候会保存一些函数接口
        // 有这个参数说明在acapp里面执行的，没有这个参数说明在web里执行的

        this.access = access;           // 用于JWT验证
        this.refresh = refresh;

        this.settings = new Settings(this); // 创建settings界面
        this.menu = new AcGameMenu(this);   // 创建菜单界面
        this.playground = new AcGamePlayground(this);   // 创建游戏界面

        this.start();
    }

    start() {
    }
}
