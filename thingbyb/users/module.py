'''
Helper functions related to Users.
'''

from .models import User
from utils.decrypt import DBCrypt
import re
import os
import hashlib
import ipaddress

client_id = DBCrypt(keyfile='.keys/gclid.key').decrypt('ieB1/9npI9J+SiyIwvapFlOqpqdAjV5WmzxfWszZcv5vAqqbNXP8jwhpoawEhbNvz7VXthwzUbF5ivj9303AUAKWPUtJNYB9zRG5zyrQXI0=')

def create_user(username, password, ip4, jwt_data=None):
    '''
    Creates a new user.
    jwt_data is set if Google auth is being used to login.
    Returns the new user on success, or None on failure.
    '''
    hash_data = make_password_hash(password)
    new_user = User(
        username=username,
        password=hash_data['hash'],
        salt=hash_data['salt'],
        display_name=username,
        settings_json={},
        ip4=int(ipaddress.IPv4Address(ip4 or '22.22.22.22')))

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


def make_password_hash(password, salt=None):
    if not salt:
        # abcd1234
        salt = os.urandom(4).hex()
    h = hashlib.sha384((password + salt).encode('utf-8'))
    return {'hash':h.hexdigest(), 'salt':salt}


def check_password_hash(password, db_hash, db_salt):
    return make_password_hash(password, db_salt)['hash'] == db_hash


def get_user(username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        # TODO logging
        print(f"User does not exit")
        return None
    return user


def get_jwt_user(jwt_data):
    try:
        user = User.objects.get(jwt_id=jwt_data['sub'])
    except User.DoesNotExist:
        # TODO logging
        print(f"JWT user does not exist")
        return None
    return user


def jwt_login(jwt_token):
    if jwt_token is None:
        return None
    jwt_data = jwt_decode(jwt_token)
    if jwt_data is None:
        return None
    user = get_jwt_user(jwt_data)
    if user is None:
        user = create_user("", "", None, jwt_data)
        if user is not None:
            if user.create_user_currency():
                pass
    if user is None:
        pass
        # TODO logging everywhere
    return user


def jwt_decode(jwt_data):
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
            jwt_data, requests.Request(), client_id)
    except Exception as e:
        print(f"Token verification failed: {e}")
        # TODO logging
        return None
    return claims

