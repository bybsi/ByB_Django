import time

def unix_timestamp(request):
    return {'timestamp':int(time.time())}
