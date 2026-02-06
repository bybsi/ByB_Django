import json
from django.http import JsonResponse
from functools import wraps

def ajax_login_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user.is_authenticated:
            return view_func(request, *args, **kwargs)
        return JsonResponse(
            {'error': 'Authentication required'}, 
            status=401
        )
    return wrapper


