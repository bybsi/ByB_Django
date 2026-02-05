from django.shortcuts import render, redirect
from django.http import (
    JsonResponse, 
    HttpResponse,
    HttpResponseBadRequest
)
from core.db_forms import DBQueryForm, db_grid_query
from html import escape as html_encode
from .models import TradeOrder, CurrencyHold
from django.core.paginator import Paginator, EmptyPage
from django.db.models import Q, DateTimeField, CharField, TimeField
from django.db.models.functions import TruncSecond, Cast

def index(request):
    return render(
        request,
        'templates/trading/content.html',
        context={})


