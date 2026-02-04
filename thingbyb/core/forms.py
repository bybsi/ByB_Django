from django import forms
from django.core.validators import (
    RegexValidator,
    MinValueValidator,
    MaxValueValidator
)

class DBQueryForm(forms.Form):
    sortorder = forms.CharField(
        max_length=4,
        validators=[RegexValidator(regex='(?i)^(asc|desc)$')]
    )
    sortkey = forms.CharField(
        max_length=32,
        validators=[RegexValidator(regex=r'\w+')]
    )
    searchkey = forms.CharField(
        max_length=32,
        validators=[RegexValidator(regex=r'\w+')]
    )
    searchval = forms.CharField(
        max_length=32,
        validators=[RegexValidator(regex=r'[. \w.-]')]
    )
    page = forms.IntegerField(
        validators = [MinValueValidator(1), MaxValueValidator(1000)]
    )
    limit = forms.IntegerField(
        validators = [MinValueValidator(1), MaxValueValidator(1000)]
    )


