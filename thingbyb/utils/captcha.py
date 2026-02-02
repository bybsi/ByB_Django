import os
import shutil
import base64
from django.conf import settings
from django.core.cache import cache

def get_captcha():
    try:
        client = cache.client.get_client()
        captcha = client.lpop("captcha-queue").decode('utf-8') + '.png'
        captcha_filepath = os.path.join(settings.CAPTCHA_PENDING_DIR, captcha)
        shutil.move(
            os.path.join(settings.CAPTCHA_DIR, captcha),
            captcha_filepath
        )
        with open(captcha_filepath, 'rb') as fh:
            return base64.b64encode(fh.read()).decode('utf-8')
    except Exception as e:
        print(f"Captcha could not be retrieved {e}")
    return None


def validate_captcha(captcha):
    filepath = os.path.join(settings.CAPTCHA_PENDING_DIR, captcha.lower()) + '.png'
    if not os.path.isfile(filepath):
        return False

    try:
        os.unlink(filepath)
    except Exception as e:
        print(f"Could not unlink captcha file {e}")

    return True


