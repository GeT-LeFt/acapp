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
