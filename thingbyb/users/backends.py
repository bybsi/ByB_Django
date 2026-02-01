from django.contrib.auth.backends import BaseBackend
from . import module as user_module
from .models import User
from utils.decrypt import DBCrypt
import re
import os
import hashlib

class UserBackend(BaseBackend):
    #client_id = DBCrypt(keyfile='.keys/gclid.key').decrypt('ieB1/9npI9J+SiyIwvapFlOqpqdAjV5WmzxfWszZcv5vAqqbNXP8jwhpoawEhbNvz7VXthwzUbF5ivj9303AUAKWPUtJNYB9zRG5zyrQXI0=')


    def authenticate(self, request, username=None, password=None):
        #user = UserBackend.get_user(username)
        user = user_module.get_user(username)
        if user is None:
            return None
#        if UserBackend.check_password_hash(password, user.password, user.salt):
        if user_module.check_password_hash(password, user.password, user.salt):
            return user
        return None


