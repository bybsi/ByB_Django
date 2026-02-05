from django.db import models
from core.models import TimeStampedModel
from users.models import User

class TradeOrder(TimeStampedModel):
    user = models.ForeignKey(
        User,
        related_name='trade_orders',
        on_delete=models.CASCADE)
    ticker = models.CharField(max_length=8)
    side = models.CharField(max_length=1)
    status = models.CharField(max_length=1)
    type = models.CharField(max_length=1)
    amount = models.BigIntegerField()
    price = models.BigIntegerField()
    filled_at = models.DateTimeField(verbose_name='Filled At', auto_now=True, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Trade Order({self.ticker}, {self.side}, {self.status}, {self.amount}, {self.price})"


class CurrencyHold(TimeStampedModel):
    user = models.ForeignKey(
        User,
        related_name='currency_hold',
        on_delete=models.CASCADE)
    order_id = models.OneToOneField(
        TradeOrder,
        related_name='trade_order',
        on_delete=models.CASCADE)
    ticker = models.CharField(max_length=8)
    amount = models.BigIntegerField()


