namespace py match_service

service Match {
    i32 add_player(1: i32 score, 2: string uuid, 3: string username, 4: string photo, 5: string channel_name),
        /** channel_name是用来提供给django channel的api，以此实现匹配成功后通知server */
}
