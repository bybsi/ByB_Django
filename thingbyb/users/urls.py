from django.urls import path
from . import views

urlpatterns = [
    path('login', views.login, name='Login'),
    path('logout', views.logout, name='Logout'),
    path('register', views.register, name='Register'),
    path('settings', views.settings, name='Settings'),
    path('login_form', views.login_form, name='Login Form'),
]

