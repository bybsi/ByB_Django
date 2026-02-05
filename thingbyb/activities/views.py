from django.shortcuts import render, redirect
from django.http import (
    JsonResponse, 
    HttpResponse,
    HttpResponseBadRequest
)
from core.db_forms import DBQueryForm, db_grid_query
from html import escape as html_encode
from .models import Activity

def index(request):
    return render(
        request,
        'templates/activities/content.html',
        context={})
    

def get_data(request):
    form = DBQueryForm(request.GET)
    if not form.is_valid():
        return JsonResponse(
            {'error': 'Invalid API call.'},
            status=500)

    return JsonResponse(db_grid_query(Activity.objects, form), status=200)


