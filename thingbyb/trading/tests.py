from django.test import SimpleTestCase
from utils.redis import redis_get, redis_rpush

class TradingTests(SimpleTestCase):
    
    def test_redis(self):
        ex = redis_get('testkey')
        print(f"{ex}")
        ne = redis_get('nokey')
        print(f"{ne}")
        if redis_rpush('testq', 'testdata'):
            print(f"pushed elem")
        else:
            print(f"didn't  push elem")

        
