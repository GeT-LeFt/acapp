from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.conf import settings
from django.core.cache import cache

from thrift import Thrift
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol

from match_system.src.match_server.match_service import Match
from game.models.player.player import Player
from channels.db import database_sync_to_async

class MultiPlayer(AsyncWebsocketConsumer):
    async def connect(self):                        # 创建连接
        self.room_name = None

        for i in range(1000):
            name = "room-%d" % (i)
            if not cache.has_key(name) or len(cache.get(name)) < settings.ROOM_CAPACITY:    # redis里如果没有存该房间或者房间人数大于设定的最大值，break
                self.room_name = name
                break
        if not self.room_name:                      # 如果房间不够，不进入房间，排队 章节7.1 - 时间01:54
            return

        await self.accept()

        if not cache.has_key(self.room_name):       # 如果没有该房间，创建房间
            cache.set(self.room_name, [], 3600)     # 创建空列表，有效期一小时

        for player in cache.get(self.room_name):    # server将房间信息传给本地
            await self.send(text_data=json.dumps({  # dump:将字典变成字符串
                'event': "create_player",
                'uuid': player['uuid'],
                'username': player['username'],
                'photo': player['photo'],
                }))

        await self.channel_layer.group_add(self.room_name, self.channel_name)
        # 建立组，可以广播消息

    async def disconnect(self, close_code):         # 断开连接，但不一定执行，比如突然断电
        if self.room_name:
            print('disconnect')
            await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def create_player(self, data):
        # 初始化
        self.room_name = None
        self.uuid = data['uuid']

        # Make socket
        transport = TSocket.TSocket('127.0.0.1', 9090)

        # Buffering is critical. Raw sockets are very slow
        transport = TTransport.TBufferedTransport(transport)

        # Wrap in a protocol
        protocol = TBinaryProtocol.TBinaryProtocol(transport)

        # Create a client to use the protocol encoder
        client = Match.Client(protocol)

        def db_get_player():
            return Player.objects.get(user__username=data['username'])

        player = await database_sync_to_async(db_get_player)()

        # Connect!
        transport.open()

        client.add_player(player.score, data['uuid'], data['username'], data['photo'], self.channel_name)

        # close!
        transport.close()

    async def group_send_event(self, data):
        if not self.room_name:
            keys = cache.keys('*%s*' % (self.uuid))
            if keys:
                self.room_name = keys[0]
        await self.send(text_data=json.dumps(data))

    async def move_to(self, data):              # 广播更新后的移动坐标以及uuid，发送给group内的所有人
        await self.channel_layer.group_send(
                self.room_name,
                {
                    'type': "group_send_event",
                    'event': "move_to",
                    'uuid': data['uuid'],
                    'tx': data['tx'],
                    'ty': data['ty'],
                }
            )

    async def shoot_fireball(self, data):
        await self.channel_layer.group_send(
                self.room_name,
                {
                    'type': "group_send_event",
                    'event': "shoot_fireball",
                    'uuid': data['uuid'],
                    'tx': data['tx'],
                    'ty': data['ty'],
                    'ball_uuid': data['ball_uuid'],
                }
            )

    async def attack(self, data):
        await self.channel_layer.group_send(
                self.room_name,
                {
                    'type': "group_send_event",
                    'event': "attack",
                    'uuid': data['uuid'],
                    'attackee_uuid': data['attackee_uuid'],
                    'x': data['x'],
                    'y': data['y'],
                    'angle': data['angle'],
                    'damage': data['damage'],
                    'ball_uuid': data['ball_uuid'],
                }
            )

    async def blink(self, data):
        await self.channel_layer.group_send(
                self.room_name,
                {
                    'type': "group_send_event",
                    'event': "blink",
                    'uuid': data['uuid'],
                    'tx': data['tx'],
                    'ty': data['ty'],
                }
            )

    async def message(self, data):
        await self.channel_layer.group_send(
                self.room_name,
                {
                    'type': "group_send_event",
                    'event': "message",
                    'uuid': data['uuid'],
                    'username': data['username'],
                    'text': data['text'],
                }
            )

    async def receive(self, text_data):             # 接收前端向后端发送的请求
        data = json.loads(text_data)
        event = data['event']                       # 提取出socket传到server的event信息
        if event == "create_player":
            await self.create_player(data)
        elif event == "move_to":
            await self.move_to(data)
        elif event == "shoot_fireball":
            await self.shoot_fireball(data)
        elif event == "attack":
            await self.attack(data)
        elif event == "blink":
            await self.blink(data)
        elif event == "message":
            await self.message(data)
