from functools import wraps
from django.core.cache import cache


def redis_client(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            kwargs['client'] = cache.client.get_client()
            return func(*args, **kwargs)
        except Exception as e:
            printf(f"Could not get redis client {e}")
            raise e
    return wrapper


@redis_client
def redis_get(key, client=None):
    try:
        return client.get(key).decode('utf-8')
    except Exception as e:
        print(f"{key} could not be read from cache.")
    return None


@redis_client
def redis_rpush(key, data, client=None):
    try:
        client.rpush(key, data)
        return True
    except Exception as e:
        print(f"Could not push data to {key}")
    return False


