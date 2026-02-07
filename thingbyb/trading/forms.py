from django import forms
from . import settings

class TradeOrderForm(forms.Form):
    #ORDER_TYPES = [
    #    ("L", "Limit"),
    #]
    #type = forms.ChoiceField(choices=ORDER_TYPES)
    ticker = forms.ChoiceField(choices=settings.TICKERS)
    side = forms.CharField(widget=forms.HiddenInput())
    price = forms.DecimalField()
    amount = forms.DecimalField()


class CancelOrderForm(forms.Form):
    order_id = forms.IntegerField(min_value=1)


class OrderBookForm(forms.Form):
    ticker = forms.CharField(max_length=8, min_length=1)
    current_price = forms.DecimalField()

