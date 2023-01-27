from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from game.models.player.player import Player

class PlayerView(APIView):
    def post(self, request):
        data = request.POST
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        password_confirm = data.get("password_confirm", "").strip()
        if not username or not password:
            return Response({
                'result': "User name cannot be empty when the password is specified"
                })
        if password != password_confirm:
            return Response({
                'result': "Your passwords do not match",
                })
        if User.objects.filter(username=username).exists():
            return Response({
                'result': "Username already exists"
                })
        user = User(username=username)
        user.set_password(password)
        user.save()
        Player.objects.create(user=user, photo="https://cdn-icons-png.flaticon.com/512/528/528098.png")   # django创建数据库
        return Response({
            'result': "success",
            })

