from django.contrib.auth.backends import BaseBackend
from .models import User, UserCurrency
import re
import os
import hashlib

class UserBackend(BaseBackend):
    client_id = "***"


    def authenticate(self, request, username=None, password=None):
        user = self.get_user(username)
        if user is None:
            return None
        if self.check_password_hash(password, user.password, user.salt):
            return user
        return None


    def create_user(self, username, password, ip4, jwt_data=None):
        '''
        Creates a new user.
        jwt_data is set if Google auth is being used to login.
        Returns the new user on success, or None on failure.
        '''
        hash_data = self.make_password_hash(password)
        new_user = User(
            username=username,
            password=hash_data['hash'],
            salt=hash_data['salt'],
            display_name=username,
            settings_json={},
            ip4=ip4)

        if jwt_data is not None:
            new_user.jwt_id = jwt_data['sub']
            at_idx = jwt_data['email'].find('@')
            if at_idx <= 0: # Should be at least one character
                # TODO log
                return None
            new_user.username = re.sub(
                r'[^A-Za-z0-9]', '',
                jwt_data['email'][:at_idx])
            new_user.password = '.JWT.ONLY.'
            new_user.display_name = new_user.username
            
        try:
            new_user.save()
        except Exception as e:
            # TODO LOG
            print(f"create user exc {e}")
            return None

        return new_user


    def make_password_hash(self, password, salt=None):
        if not salt:
            # abcd1234
            salt = os.urandom(4).hex()
        h = hashlib.sha384(password + salt)
        return {'hash':h.hexdigest(), 'salt':salt}


    def check_password_hash(self, password, db_hash, db_salt):
        return make_password_hash(password, db_salt)['hash'] == db_hash


    def get_user(self, username):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # TODO logging
            print(f"User does not exit")
            return None
        return user


    def get_jwt_user(self, jwt_data):
        try:
            user = User.objects.get(jwt_id=jwt_data['sub'])
        except User.DoesNotExist:
            # TODO logging
            print(f"JWT user does not exist")
            return None
        return user


    def jwt_decode(self, jwt_data):
        '''
        [sub] => 123456789123456789123
        [email] => email@gmail.com
        [email_verified] => 1
        [name] => first last
        [given_name] => asdf
        [family_name] => asdf
        [iat] => 1769012051
        [exp] => 1769015651
        [jti] => aaaaaaaaaabbbbbbbbbbccccccccccdddddddddd
        '''
        from google.oauth2 import id_token
        from google.auth.transport import requests

        try:
            claims = id_token.verify_oauth2_token(
                jwt_data, requests.Request(), self.client_id)
        except Exception as e:
            print(f"Token verification failed: {e}")
            # TODO logging
            return None
        return claims


    def create_user_currency(self, user):
        '''
        Sets up the users paper trading account wallet.
        '''
        try:
            UserCurrency.objects.create(user)
        except Exception as e:
            # TODO logging
            print(f"Could not create user currency {e}")
            return None
        # TODO
        return None


