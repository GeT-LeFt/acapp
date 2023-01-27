from django.shortcuts import redirect, reverse
from django.core.cache import cache
import requests
from django.contrib.auth.models import User
from game.models.player.player import Player
from random import randint
from rest_framework_simplejwt.tokens import RefreshToken

def receive_code(request):
    data = request.GET
    code = data.get('code')
    state = data.get('state')

    if not cache.has_key(state):    # 如果acwing服务器返回的随机码和发出的随机码不一样，重定向到主页
        return redirect("index")
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
        refresh = RefreshToken.for_user(players[0].user)
        return redirect(reverse("index") + "?access=%s&refresh=%s" % (str(refresh.access_token), str(refresh)))

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

    return redirect(reverse("index") + "?access=%s&refresh=%s" % (str(refresh.access_token), str(refresh)))    # "index"是urls的urlpatterns里面定义的名字
