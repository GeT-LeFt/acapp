class AcGame {
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
