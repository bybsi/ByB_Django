from django.contrib.auth.backends import BaseBackend
from . import module as user_module
from .models import User
import re
import os
import hashlib

class UserBackend(BaseBackend):

    def authenticate(self, request, username=None, password=None):
        user = user_module.get_user(username)
        if user is None:
            return None
        if user_module.check_password_hash(password, user.password, user.salt):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

