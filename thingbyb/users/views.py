from django.contrib.auth import authenticate, login
from django.shortcuts import render
from django.http import (
    JsonResponse, 
    HttpResponse,
    HttpResponseBadRequest
)

def login(request):
    if request.method != 'POST':
        return HttpResponseBadRequest(f"Invalid method: {request.method}")

    if 'sid_login' in request.POST and request.user.is_authenticated:
        return user_panel(request)

    user = authenticate(
        request, 
        username=request.POST['login_username'], 
        password=request.POST['login_password'])

    if user is not None:
        login(request, user)
        return user_panel(request)

    return HttpResponse(
        "Invalid Credentials",
        content_type="text/plain",
        status=406)
    #return JsonResponse({'data':'somdata'})

def user_panel(request):
     return render(request, 'templates/users/user_panel.html')
