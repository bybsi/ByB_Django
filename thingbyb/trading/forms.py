from django import forms
from . import settings

class TradeOrderForm(forms.Form):
    #ORDER_TYPES = [
    #    ("L", "Limit"),
    #]
    #type = forms.ChoiceField(choices=ORDER_TYPES)
    ticker = forms.ChoiceField(choices=settings.TICKERS)
    side = forms.CharField(widget=forms.HiddenInput())
    price = forms.IntegerField()
    amount = forms.IntegerField()


