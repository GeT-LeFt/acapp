#! /usr/bin/env python3

import glob
import sys
sys.path.insert(0, glob.glob('../../')[0])                  # django路径，这样才能引用django原项目里的包

from match_server.match_service import Match                # 引入Match.py

from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from thrift.server import TServer

from queue import Queue
from time import sleep
from threading import Thread

from acapp.asgi import channel_layer
from asgiref.sync import async_to_sync
from django.core.cache import cache

queue = Queue()     # 消息队列

class Player:
    def __init__(self, score, uuid, username, photo, channel_name):
        self.score = score
        self.uuid = uuid
        self.username = username
        self.photo = photo
        self.channel_name = channel_name
        self.waiting_time = 0       # 等待时间

class Pool:     # 匹配池
    def __init__(self):
        self.players = []

    def add_player(self, player):
        self.players.append(player)

    def check_match(self, a, b):
        dt = abs(a.score - b.score)
        a_max_dif = a.waiting_time * 50     # 匹配分差容忍度
        b_max_dif = b.waiting_time * 50
        return dt <= a_max_dif and dt <= b_max_dif

    def match_success(self, ps):
        print("Match Success: %s %s %s" % (ps[0].username, ps[1].username, ps[2].username))
        room_name = "room-%s-%s-%s" % (ps[0].uuid, ps[1].uuid, ps[2].uuid)
        players = []    # 要存到redis里的信息
        for p in ps:
            async_to_sync(channel_layer.group_add)(room_name, p.channel_name)
            players.append({
                'uuid': p.uuid,
                'username': p.username,
                'photo': p.photo,
                'hp': 100,
            })

        cache.set(room_name, players, 3600)     # 有效时间：1小时

        for p in ps:    # 广播信息
            async_to_sync(channel_layer.group_send)(
                    room_name,
                    {
                        'type': "group_send_event",
                        'event': "create_player",
                        'uuid': p.uuid,
                        'username': p.username,
                        'photo': p.photo,
                    }
                )

    def increase_waiting_time(self):
        for player in self.players:
            player.waiting_time += 1

    def match(self):
        while len(self.players) >= 3:
            self.players = sorted(self.players, key=lambda p: p.score)
            flag = False
            for i in range(len(self.players) - 2):
                a, b, c = self.players[i], self.players[i + 1], self.players[i + 2]
                if self.check_match(a, b) and self.check_match(a, c) and self.check_match(b, c):
                    self.match_success([a, b, c])
                    self.players = self.players[:i] + self.players[i + 3:]
                    flag = True
                    break
            if not flag:
                break

        self.increase_waiting_time()

class MatchHandler:
    def add_player(self, score, uuid, username, photo, channel_name):
        print("Add Player: %s %d" % (username, score))
        player = Player(score, uuid, username, photo, channel_name)
        queue.put(player)
        return 0        # 一定要返回0 不然会报错internal error

def get_player_from_queue():
    try:
        return queue.get_nowait()    # 如果没有元素返回异常，进入except返回空
    except:
        return None

def worker():       # 死循环，不断把queue里的玩家扔进pool里，类似c++实现里面的consume_task函数: https://github.com/GeT-LeFt/Thriftlearning/blob/master/match_system/src/main.cpp
    pool = Pool()
    while True:
        player = get_player_from_queue()
        if player:
            pool.add_player(player)     # 如果queue中有player，则将其加入匹配池
        else:
            pool.match()                # 如果没有，则每一秒匹配一遍
            sleep(1)

if __name__ == '__main__':
    handler = MatchHandler()
    processor = Match.Processor(handler)
    transport = TSocket.TServerSocket(host='127.0.0.1', port=9090)
    tfactory = TTransport.TBufferedTransportFactory()
    pfactory = TBinaryProtocol.TBinaryProtocolFactory()

    server = TServer.TThreadedServer(                 # 多线程，来一个请求开一个线程
        processor, transport, tfactory, pfactory)
    # server = TServer.TThreadPoolServer(               # 线程池，池子里的并行计算
    #     processor, transport, tfactory, pfactory)

    Thread(target=worker, daemon=True).start()          # deamon=True 杀掉主进程时，该进程(worker)也被杀掉

    print('Starting the server...')
    server.serve()
    print('done.')
