from django import forms
from django.core.validators import (
    RegexValidator,
    MinValueValidator,
    MaxValueValidator
)
from django.core.exceptions import ValidationError
import re

class DBQueryForm(forms.Form):
    sortorder = forms.CharField(
        max_length=4,
        validators=[RegexValidator(regex='(?i)^(asc|desc)$')],
    )
    sortkey = forms.CharField(
        max_length=32,
        validators=[RegexValidator(regex=r'\w+')],
    )
    page = forms.IntegerField(
        validators = [MinValueValidator(1), MaxValueValidator(1000)],
    )
    limit = forms.IntegerField(
        validators = [MinValueValidator(1), MaxValueValidator(1000)],
    )

    def clean(self):
        cleaned_data = super().clean()
        skeys = self.data.getlist('searchkey[]')
        svals = self.data.getlist('searchval[]')

        if len(skeys) != len(svals):
            raise ValidationError("Search key count != search val count.")

        for s1,s2 in zip(skeys, svals):
            if re.search(r'[^ \w.-]', s1+s2):
                raise ValidationError("Invalid search parameter.")

        cleaned_data['searchkey'] = skeys
        cleaned_data['searchval'] = svals
        
        return cleaned_data











