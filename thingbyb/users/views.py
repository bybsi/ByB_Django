from django.contrib.auth import (
    authenticate, 
    login as auth_login, 
    logout as auth_logout
)
from django.shortcuts import render, redirect
from django.http import (
    JsonResponse, 
    HttpResponse,
    HttpResponseBadRequest
)
from .forms import RegisterForm, SettingsForm
from utils.captcha import get_captcha, validate_captcha
from . import module as user_module
from html import escape as html_encode

def login(request):
    if request.method != 'POST':
        return HttpResponseBadRequest(f"Invalid method: {request.method}")

    if request.user.is_staff:
        return HttpResponse(
            "Log out of admin panel first.",
            content_type="text/plain",
            status=406)

    if 'sid_login' in request.POST:
        if request.user.is_authenticated:
            return user_panel(request)
        return HttpResponse("", content_type="text/plain",status=500)

    user = authenticate(
        request, 
        username=request.POST['login_username'], 
        password=request.POST['login_password'])

    if user is not None:
        auth_login(request, user)
        return user_panel(request)

    return HttpResponse(
        "Invalid Credentials",
        content_type="text/plain",
        status=406)


def logout(request):
    if request.method == "POST":
        auth_logout(request)
        return redirect('/')
    
    return HttpResponse(
        "Invalid Logout Method",
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
        })


def settings(request):
    if request.method == 'POST':
        form = SettingsForm(request.POST)
        if not form.is_valid():
            return JsonResponse(
                {'error': 'Invalid input.'},
                status=406)

        user = request.user
        user.display_name = form.cleaned_data['display_name'] or user.username
        user.contact_data = form.cleaned_data['contact_data']
        try:
            user.save()
        except Exception as e:
            # TODO logging.
            print(f"Error saving user {e}")
            return JsonResponse(
                {'error': 'Could not save data.'},
                status=500)

        return JsonResponse(
            {'saved':True, 'display_name':user.display_name},
            status=200)

    return render(
        request,
        'templates/users/settings_form.html',
        context={
            'form': SettingsForm(initial={
                'display_name':html_encode(request.user.display_name),
                'contact_data':html_encode(request.user.contact_data),
            }),
        })


def login_form(request):
    return render(
        request,
        'templates/core/forms/login_form.html',
        # TODO it would make more sense to make this a bool
        # and then create the label appropriately in the template.
        context={'modal': '_modal'})







