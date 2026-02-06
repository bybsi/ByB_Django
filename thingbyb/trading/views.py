from django.shortcuts import render, redirect
from django.http import (
    JsonResponse, 
    HttpResponse,
    HttpResponseBadRequest
)
from core.decorators import ajax_login_required
from core.grid_query_form import DBGridQueryForm, db_grid_query
from utils.redis import redis_get, redis_rpush
from html import escape as html_encode
from .models import TradeOrder, CurrencyHold
from .forms import TradeOrderForm
from django.utils import timezone
import time

def index(request):
    return render(
        request,
        'templates/trading/content.html',
        context={
        })


@ajax_login_required
def create_trade_order(request):

    form = TradeOrderForm(request.POST)
    if not form.is_valid():
        return JsonResponse(
            {'error': 'Invalid API call (invalid inputs).'}, 
            status=500)
    
    data      = form.cleaned_data
    ask_price = data['price']
    side      = data['side']
    ticker    = data['ticker']

    # TODO this will be _v2 and in bigint format
    current_price = float(redis_get(ticker + '-price').replace(':',''))
    if current_price is None:
        return JsonResponse({'error': 'Current price unknown.'}, status=500)

    if ((side == 'B' and ask_price >= current_price) or
        (side == 'S' and ask_price <= current_price)):
        return fill_order_right_away(request.user, data)
    
    wallet = request.user.currency
    amount = data['amount']
    total_cost = amount * ask_price
    
    order = create_order(
        request.user, 'O', ticker, side, 'L', amount, ask_price, tz_now)
    if order is None:
        return JsonResponse(
            {'error': 'Error creating order record'}, 
            status=500)

    
    if side == 'B':
        ch_ticker = 'bybs'
        ch_amount = total_cost
    elif side == 'S':
        ch_ticker = ticker.lower()
        ch_amount = amount

    try:
        hold = CurrencyHold(request.user, order, ch_ticker, ch_amount)
        hold.save()
    except Exception as e:
        #TODO logging
        print(f"Could not create currency hold, lucky!")
        return JsonResponse(
            {'id': order.id,
             'extra':'Could not create currency hold, lucky!'},
            status=200)
    
    try:
        setattr(wallet, ch_ticker, getattr(wallet, ch_ticker) - ch_amount)
        wallet.save()
    except Exception as e:
        return JsonResponse(
            {'id': order.id, 
             'extra':'Could not update currency, you placed an order for free!'},
            status=200)

    return JsonResponse({
        'id': order.id,
        'ticker': ticker,
        'side': side,
        'amount': amount,
        'price': ask_price},
        status=200)


def fill_order_right_away(user, data):
    
    wallet    = user.currency
    ask_price = data['price']
    side      = data['side']
    ticker    = data['ticker']
    amount    = data['amount']
    
    auto_filled = False
    total_cost = amount * ask_price
    if side == 'B': # Buy
        if total_cost >= wallet.bybs:
            return JsonResponse(
                {'error': 'Not enough fake money.'},
                status=403)
        auto_filled = adjust_wallet(wallet, -total_cost, ticker, amount)
    elif side == 'S': # Sell
        if amount > getattr(wallet, ticker.lower()):
            return JsonResponse(
                {'error': f"Not enough {ticker}."},
                status=403)
        auto_filled = adjust_wallet(wallet, total_cost, ticker, -amount)

    if not auto_filled:
        return JsonResponse(
            {'error':"Could not adjust wallet amounts"},
            status=500)

    tz_now = timezone.now()
    order = create_order(
        user, 'F', ticker, side, 'L', amount, ask_price, tz_now)
    if order is None:
        return JsonResponse(
            {'error': 'Error creating auto fill record'}, 
            status=500)

    fmt_now = tz_now.strftime("%H:%M:%S")
    fill_data = [
        int(time.time()), order.id, user.id,
        side, amount, ask_price, fmt_now
    ]
    if redis_rpush(ticker + '-fills', '|'.join(fill_data)):
        # TODO logging
        print(f"Could not push auto fill to redis")
    return JsonResponse(
        {ticker: [f"0|{side}|{amount}|{ask_price}|{fmt_now}"]},
        status=200)


def adjust_wallet(wallet, bybs_amount, ticker, ticker_amount):
    wallet.bybs += bybs_amount
    setattr(wallet, ticker.lower(), 
        getattr(wallet, ticker.lower()) + ticker_amount)
    try:
        wallet.save()
    except Exception as e:
        print(f"Error trying to save wallet {e}")
        return False
    return True


def create_order(user, status, ticker, side, type, amount, price, dt_now=None):
    try:
        new_order = TradeOrder(
            user=user,
            ticker=ticker,
            side=side,
            status=status,
            type=type,
            amount=amount,
            price=price,
            filled_at=dt_now
        )
        new_order.save()
    except Exception as e:
        print(f"Error saving new order {e}")
        return None
    return new_order


@ajax_login_required
def cancel_trade_order(request):
    pass


@ajax_login_required
def get_trade_orders(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {'error': 'Unauthorized.'},
            status=403)


    form = DBGridQueryForm(request.GET)
    if not form.is_valid():
        return JsonResponse(
            {'error': 'Invalid API call.'},
            status=500)

    return JsonResponse(
        db_grid_query(
            request.user.trade_orders, 
            form), 
        status=200)
   

