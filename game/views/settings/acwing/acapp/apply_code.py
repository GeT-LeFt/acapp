# 申请授权码
from django.http import JsonResponse
from urllib.parse import quote
from random import randint
from django.core.cache import cache     # 引入redis记录state随机数

def get_state():
    res = ""
    for i in range(8):
        res += str(randint(0, 9))
    return res

def apply_code(request):
    appid = "4436"              # 在acwing网站的app设置中查看
    redirect_uri = quote("https://app4436.acapp.acwing.com.cn/settings/acwing/acapp/receive_code/")
    # quote是为了去掉特殊字符防止有bug
    scope = "userinfo"
    state = get_state()         # 产生随机数

    cache.set(state, True, 7200)# set函数用于存入redis，有效期设为2:小时

    # acwing网站授权码的请求地址
    return JsonResponse({
        'result': "success",
        'appid': appid,
        'redirect_uri': redirect_uri,
        'scope': scope,
        'state': state,
        })
