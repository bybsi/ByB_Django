
from django.urls import path
from . import views

urlpatterns = [
    path('', views.posts, name='Content Posts'),
]

