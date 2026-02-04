from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='Activities'),
    path('data', views.get_data, name='Activities Data')
]

