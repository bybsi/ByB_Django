from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='Trading'),
    path('trade_orders', views.get_trade_orders, name='Trade Orders'),
    #path('leaderboard', views.get_data, name='Leaderboard'),
]
