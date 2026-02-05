from django.db import models
from django.contrib.auth.models import AbstractUser
from core.models import TimeStampedModel
from . import settings

class User(AbstractUser, TimeStampedModel):
    username = models.CharField(max_length=32, unique=True)
    password = models.CharField(max_length=256)
    salt = models.CharField(max_length=8)
    display_name = models.CharField(max_length=32)
    contact_data = models.CharField(max_length=256)
    first_name = models.CharField(max_length=32)
    last_name = models.CharField(max_length=32)
    ip4 = models.BigIntegerField(null=True)
    settings_json = models.JSONField(default=dict)
    last_login = models.DateTimeField(verbose_name='Last Login', auto_now=True, null=True, blank=True)
    # Not a JWT token but a unique ID from auth provider such as
    # google auth: response['sub']
    jwt_id = models.CharField(max_length=32)
    
    def __str__(self):
        return self.username

    
    def create_user_currency(self):
        '''
        Sets up the users paper trading account wallet.
        '''
        try:
            UserCurrency.objects.create(user=self)
        except Exception as e:
            # TODO logging
            print(f"Could not create user currency {e}")
            return False
        # TODO
        return True


class UserCurrency(models.Model):
    user = models.OneToOneField(
        User,
        related_name='currency',
        on_delete=models.CASCADE,
        primary_key=True)
    bybs = models.BigIntegerField(
        default=settings.INITIAL_CURRENCY_BYBS, null=False)
    andthen = models.BigIntegerField(
        default=settings.INITIAL_CURRENCY_OTHER, null=False)
    foris4 = models.BigIntegerField(
        default=settings.INITIAL_CURRENCY_OTHER, null=False)
    zilbian = models.BigIntegerField(
        default=settings.INITIAL_CURRENCY_OTHER, null=False)
    spark = models.BigIntegerField(
        default=settings.INITIAL_CURRENCY_OTHER, null=False)
    
    class Meta:
        verbose_name_plural = 'User Wallet'

    def __str__(self):
        return f"{self.user.username} {self.bybs}"

