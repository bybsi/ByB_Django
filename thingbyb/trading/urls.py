from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='Trading'),
    path('trade_orders', views.get_trade_orders, name='Trade Orders'),
    path('create_trade_order', views.create_trade_order, name='Create Trade Order'),
    path('cancel_trade_order', views.cancel_trade_order, name='Cancel Trade Order'),
    path('trade_wallet', views.get_trade_wallet, name='Trade Wallet'),
    path('leaderboard', views.leaderboard, name='Trading Leaderboard'),
    path('order_book', views.order_book, name='Trade Order Book'),
    #path('leaderboard', views.get_data, name='Leaderboard'),
]


