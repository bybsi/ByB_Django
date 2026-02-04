from django.shortcuts import render, redirect
from django.http import (
    JsonResponse, 
    HttpResponse,
    HttpResponseBadRequest
)
from core.forms import DBQueryForm
from html import escape as html_encode

# Create your views here.
def index(request):
    return render(
        request,
        'templates/activities/content.html',
        context={
#            'form': SettingsForm(initial={
#                'display_name':html_encode(request.user.display_name),
#                'contact_data':html_encode(request.user.contact_data),
#            }),
        })
    

def get_data(request):
    print(request.GET)
    form = DBQueryForm(request.GET)
    if not form.is_valid():
        return JsonResponse(
            {'error': 'Invalid API call.'},
            status=406)
    
    data = form.cleaned_data
    return JsonResponse(
        {'error', 'Invalid API call.'},
        status=406)







