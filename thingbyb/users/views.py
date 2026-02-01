from django.contrib.auth import authenticate, login
from django.shortcuts import render
from django.http import (
    JsonResponse, 
    HttpResponse,
    HttpResponseBadRequest
)
from .forms import RegisterForm
from utils.captcha import get_captcha, validate_captcha
from . import module as user_module

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

def user_panel(request):
     return render(request, 'templates/users/user_panel.html')


def register(request): 

    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if not form.is_valid():
            return HttpResponse(
                "Invalid form inputs.", 
                content_type="text/plain",
                status=406)

        if user_module.get_user(form.cleaned_data['username']):
            return HttpResponse(
                "Invalid username, please choose another.",
                content_type="text/plain",
                status=406)

        if not validate_captcha(form.cleaned_data['captcha']):
            return HttpResponse(
                "Invalid captcha.",
                content_type="text/plain",
                status=406)

        user = user_module.create_user(
            form.cleaned_data['username'],
            form.cleaned_data['password'],
            request.META.get('REMOTE_ADDR'))
        if user is None:
            return HttpResponse(
                "Could not create user.",
                content_type="text/plain",
                status=406)
        if user.create_user_currency():
            pass
        
        return JsonResponse({'registered':True})
    
    return render(
        request, 
        'templates/users/register_form.html',
        context={
            'form': RegisterForm(),
            'captcha': get_captcha()
        }
    )












