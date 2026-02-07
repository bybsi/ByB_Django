from django.shortcuts import render, redirect
from django.http import (
    JsonResponse, 
    HttpResponse,
    HttpResponseBadRequest
)
from core.decorators import ajax_login_required
from core.grid_query_form import DBGridQueryForm, db_grid_query
from utils.redis import redis_get, redis_rpush
from utils.currency import Currency
from html import escape as html_encode
from users.models import UserCurrency
from .models import TradeOrder, CurrencyHold
from .forms import TradeOrderForm, CancelOrderForm, OrderBookForm
from . import settings
from datetime import datetime
from django.core import serializers
from django.db.models import F, FloatField, ExpressionWrapper, Sum
from django.forms.models import model_to_dict
from django.core.cache import cache
import time

def index(request):
    return render(
        request,
        'templates/trading/content.html',
        context={
        })


@ajax_login_required
def place_trade_order(request):

    form = TradeOrderForm(request.POST)
    if not form.is_valid():
        return JsonResponse(
            {'error': 'Invalid API call (invalid inputs).'}, 
            status=500)
    
    data      = form.cleaned_data
    #ask_price = Currency.decimal_to_currency(data['price'])
    ask_price = data['price']
    side      = data['side']
    ticker    = data['ticker']

    current_price = float(redis_get(ticker + '-price').replace(':',''))
    #current_price = Currency.decimal_to_currency(current_price)
    if current_price is None:
        return JsonResponse({'error': 'Current price unknown.'}, status=500)

    if ((side == 'B' and ask_price >= current_price) or
        (side == 'S' and ask_price <= current_price)):
        return fill_order_right_away(request.user, data)
    
    wallet = request.user.currency
    amount = data['amount']
    total_cost = Currency.multiply(amount, ask_price)
    
    order = create_order(
        request.user, 'O', ticker, side, 'L', amount, ask_price)
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
        hold = CurrencyHold(
            user=request.user, 
            order=order, 
            ticker=ch_ticker, 
            amount=ch_amount)
        hold.save()
    except Exception as e:
        #TODO logging
        print(f"Could not create currency hold, lucky! {e}")
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
    #ask_price = Currency.decimal_to_currency(data['price'])
    ask_price = data['price']
    side      = data['side']
    ticker    = data['ticker']
    amount    = data['amount']
    
    auto_filled = False
    total_cost = Currency.multiply(amount, ask_price)
    if side == 'B': # Buy
        if total_cost >= wallet.bybs:
            return JsonResponse(
                {'error': 'Not enough fake money.'},
                status=200)
        auto_filled = adjust_wallet(wallet, -total_cost, ticker, amount)
    elif side == 'S': # Sell
        if amount > getattr(wallet, ticker.lower()):
            return JsonResponse(
                {'error': f"Not enough {ticker}."},
                status=200)
        auto_filled = adjust_wallet(wallet, total_cost, ticker, -amount)

    if not auto_filled:
        return JsonResponse(
            {'error':"Could not adjust wallet amounts"},
            status=200)

    dt_now = datetime.now()
    order = create_order(
        user, 'F', ticker, side, 'L', amount, ask_price, dt_now)
    if order is None:
        return JsonResponse(
            {'error': 'Error creating auto fill record'}, 
            status=200)

    fmt_now = dt_now.strftime("%H:%M:%S")
    fill_data = [
        str(int(time.time())), 
        str(order.id), 
        str(user.id),
        side, 
        str(amount), 
        str(ask_price), 
        fmt_now
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
    
    form = CancelOrderForm(request.POST)
    if not form.is_valid():
        return JsonResponse(
            {'error':'Invalid request params.'},
            status=200)

    data = form.cleaned_data
    try:
        order = TradeOrder.objects.get(pk=data['order_id'])
    except TradeOrder.DoesNotExist:
        print(f"Trade order doesn't exist")
        return JsonResponse(
            {'error':'Order no longer exists.'},
            status=200)

    ch = order.currency_hold
    if ch:
        wallet = request.user.currency
        setattr(
            wallet, 
            ch.ticker.lower(), 
            getattr(wallet, ch.ticker.lower()) + ch.amount)
        try:
            wallet.save()
            ch.delete()
        except Exception as e:
            print(f"Error saving wallet {e}")
            return JsonResponse(
                {'error':'Order could not be canceled.'},
                status=200)
    else:
        print(f"Should have been a currency hold...")
       

    order.status = 'X'
    try:
        order.save()
    except Exception as e:
        print(f"Order status could not be updated. {e}")
        return JsonResepon(
            {'error':'Order status could not be updated.'},
            status=200)
            
    return JsonResponse({
        'success':1,
        'message':'Order canceled.',
        'amount':order.amount,
        'price':order.price,
        'ticker':order.ticker,
        'side':order.side
    }, status=200)


@ajax_login_required
def get_trade_orders(request):

    form = DBGridQueryForm(request.GET)
    if not form.is_valid():
        return JsonResponse(
            {'error': 'Invalid API call.'},
            status=400)

    
    return JsonResponse(
        db_grid_query(
            request.user.trade_orders, 
            form,
            # annotations
            {
                'total':ExpressionWrapper(
                    (F('amount') * (F('price') * Currency.SCALE_FACTOR)) / Currency.SCALE_FACTOR,
                    output_field=FloatField()
                ),
            }
        ),
        status=200)


@ajax_login_required
def get_trade_wallet(request):
    # Just in case, but this is currently done in the front end.
    #wallet = request.user.currency
    #wallet = model_to_dict(request.user.currency, exclude=['id'])
    #wallet = UserCurrency(**wallet)
    #wallet.bybs = Currency.currency_to_decimal(wallet.bybs)
    try:
        return JsonResponse(
            serializers.serialize(
                "python", 
                [request.user.currency]
                )[0]['fields'],
            status=200)
    except Exception as e:
        #TODO logging
        print(f"Could not load user wallet {e}")
    return JsonResponse({'error':'Invalid API call (wallet)'}, status=500)


def leaderboard(request):
    '''
    Fetches the top 50 users (by trade value) to be displayed
    in a grid. The results are cached for 5 minutes before
    the next request generates the list again.
    :param request:The HTTP GET request
    :returns:A JSON response containing the top 50 users
    display name and value.
    '''
    cache_key = 'trading_leaderboard'
    timeout = 300
    data = cache.get(cache_key)
    if data is not None:
        return JsonResponse(data, status=200)

    annotations = {
        'value':0,
        'display_name':F('user__display_name')
    }
    for ticker in settings.TICKERS:
        current_price = float(redis_get(ticker[0] + '-price').replace(':',''))
        annotations['value'] += (F(ticker[0].lower()) * current_price)
    annotations['value'] += F('bybs') / Currency.SCALE_FACTOR
   
    data = {
        'numRows':50,
        'rows':list(
            UserCurrency.objects.select_related('user').annotate(
                **annotations
            ).values('display_name', 'value')[:50]
        )
    }

    cache.set(cache_key, data, timeout)
    
    return JsonResponse(data, status=200)


def order_book(request):

    if request.method != 'GET':
        return JsonResponse(
            {'error':'Couldn''t load order book.'},
            status=400)

    form = OrderBookForm(request.GET)
    if not form.is_valid():
        return JsonResponse(
            {'error':'Invalid request params.'},
            status=400)
    
    results = {'buy':[], 'sell':[]}

    limit = 25
    data = form.cleaned_data
    
    orders = TradeOrder.objects.filter(
            ticker=data['ticker'].upper(),
            side='B',
            status='O',
            price__lte=data['current_price']
        ).values('price').annotate(
            amount=Sum('amount')
        ).order_by('price')[:limit]
    for row in orders:
        results['buy'].append(row)
    
    orders = TradeOrder.objects.filter(
            ticker=data['ticker'].upper(),
            side='S',
            status='O',
            price__gte=data['current_price']
        ).values('price').annotate(
            amount=Sum('amount')
        ).order_by('price')[:limit]
    for row in orders:
        results['sell'].append(row)

    return JsonResponse(results, status=200)










