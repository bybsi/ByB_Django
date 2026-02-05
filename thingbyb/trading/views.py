from django.shortcuts import render, redirect
from django.http import (
    JsonResponse, 
    HttpResponse,
    HttpResponseBadRequest
)
from core.db_forms import DBQueryForm, db_grid_query
from html import escape as html_encode
from .models import TradeOrder, CurrencyHold


def index(request):
    return render(
        request,
        'templates/trading/content.html',
        context={})


def get_trade_orders(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {'error': 'Unauthorized.'},
            status=403)


    form = DBQueryForm(request.GET)
    if not form.is_valid():
        return JsonResponse(
            {'error': 'Invalid API call.'},
            status=500)

    return JsonResponse(
        db_grid_query(
            request.user.trade_orders, 
            form), 
        status=200)
   

