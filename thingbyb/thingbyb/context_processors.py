import time
from django.conf import settings

def global_vars(request):
    return {
        'version_str':int(time.time()),
        'timestamp':int(time.time()),
        'issues':'none',
        'css_files': settings.GLOBAL_FILES['css_files'],
        'js_files': settings.GLOBAL_FILES['js_files'],
        'icons': settings.GLOBAL_FILES['icons']
    }

