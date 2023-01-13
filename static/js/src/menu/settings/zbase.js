class Settings {
    constructor(root) {
        this.root = root;
        this.platform = "WEB";
        if (this.root.AcWingOS) this.platform = "ACAPP";
        this.username = "";
        this.photo = "";

        this.$settings = $(`
<div class="ac-game-settings">
123
</div>
`);
        this.root.$ac_game.append(this.$settings);

        this.start();
    }

    start() {
        this.getinfo();
        console.log("settings logged");
    }

    register() {    // 打开注册界面
    }

    login() {       // 打开登陆界面
    }

    getinfo() {     // 从服务器端获取用户信息
        let outer = this;

        $.ajax({
            url: "https://app4436.acapp.acwing.com.cn/settings/getinfo/",   // 执行顺序：向后端发送请求，urls下settings路由指示，找到views里的getinfo函数，进一步调用getinfo_web返回json信息
            type: "GET",
            data: {
                platform: outer.platform,   // 不能用this.platform，防止this调用ajax函数本身，用outer保险
                // 后端getinfo函数里需要platform参数，就传它
            },
            success: function(resp) {       // 调用成功的回调函数
                console.log(resp);
                if (resp.result === "success") {
                    outer.username = resp.username;
                    outer.photo = resp.photo;
                    outer.hide();           // 如果获取信息成功，隐藏当前界面，打开菜单界面
                    outer.root.menu.show();
                } else {
                    outer.login();          // 如果获取失败，打开login界面
                }
            },
        });
    }

    hide() {
        this.$settings.hide();
    }

    show() {
        this.$settings.show();
    }
}
