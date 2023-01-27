from django.http import JsonResponse
from django.core.cache import cache
import requests
from django.contrib.auth.models import User
from game.models.player.player import Player
from random import randint
from rest_framework_simplejwt.tokens import RefreshToken

def receive_code(request):
    data = request.GET

    if "errcode" in data:           # 判断有无错误并返回错误值，错误代码由acapp端提供
        return JsonResponse({
            'result': "apply failed",
            'errcode': data['errcode'],
            'errmsg': data['errmsg'],
            })

    code = data.get('code')
    state = data.get('state')

    if not cache.has_key(state):    # 如果acwing服务器返回的随机码和发出的随机码不一样，返回错误信息
        return JsonResponse({
            'result': "state not exist"
            })
    cache.delete(state)

    apply_access_token_url = "https://www.acwing.com/third_party/api/oauth2/access_token/"  # 申请授权令牌access_token和用户的openid
    params = {
            'appid': "4436",
            'secret': "817c19668e1a420583f96ead767ea281",
            'code': code
            }
    access_token_res = requests.get(apply_access_token_url, params=params).json()

    access_token = access_token_res['access_token']
    openid = access_token_res['openid']

    players = Player.objects.filter(openid=openid)
    if players.exists():    # 如果之前存过用户信息，直接login
        player = players[0]
        refresh = RefreshToken.for_user(player.user)
        return JsonResponse ({
            'result': "success",
            'username': player.user.username,
            'photo': player.photo,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            })

    get_userinfo_url = "https://www.acwing.com/third_party/api/meta/identity/getinfo/"  # 申请用户信息
    params = {
            "access_token": access_token,
            "openid": openid
            }
    userinfo_res = requests.get(get_userinfo_url, params=params).json()
    username = userinfo_res['username']     # 获得用户名和头像
    photo = userinfo_res['photo']

    while User.objects.filter(username=username).exists():  # 找到一个新用户名，每次添加一位随机数
        username += str(randint(0, 9))

    user = User.objects.create(username=username)
    player = Player.objects.create(user=user, photo=photo, openid=openid)

    refresh = RefreshToken.for_user(user)   # 如果没有user的话需要创建新user 和 jwt的token
    return JsonResponse({
        'result': "success",
        'username': player.user.username,
        'photo': player.photo,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        })
