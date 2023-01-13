from django.contrib import admin
from game.models.player.player import Player    # 引入新建立的player

# Register your models here.

admin.site.register(Player)
