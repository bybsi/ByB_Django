from django import forms
from django.core.validators import (
    RegexValidator,
    MinValueValidator,
    MaxValueValidator
)
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator, EmptyPage
import re

# Temporary
int_gt_fields = {
    'distance','heart_rate','ascent','descent',
    'amount','price',
}

class DBGridQueryForm(forms.Form):
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
            if s1 == 'date' and not re.search(r'^\d{4}-\d{2}-\d{2}', s2):
                raise ValidationError("Invalid date search parameter.")
            if s1 in int_gt_fields:
                try:
                    test_int = int(s2)
                except ValueError:
                    raise ValidationError("Invalid integer value.")
            if re.search(r'[^ \w.-]', s1+s2):
                raise ValidationError("Invalid search parameter.")
                

        cleaned_data['searchkey'] = skeys
        cleaned_data['searchval'] = svals
        
        return cleaned_data


def db_grid_query_filter(column_names, values):
    '''
    Creates a DB filter for searching on multiple fields.
    It is assumed that len(column_names) must equal len(values),
    which should be handled in a validator before calling this.
    :param column_names:The names of the columns.
    :param values:The values of the corresponding column name.
    :returns:A dict where the column name is the django db filter key
    and the value is the search value.
    '''
    filters = {}
    for idx, col_name in enumerate(column_names):
        key = col_name.lower()
        if col_name in int_gt_fields:
            key += '__gt'
        elif col_name == 'date':
            key += '__gt'
        else:
            key += '__icontains'
        filters[key] = values[idx]
    return filters


def db_grid_query(model_manager, form, annotations={}):
    '''
    Queries the databases for paginated data for grids
    .
    :param model_manager:The model manager to use from appname/models.py
    :param form:The validated form data/query string
    :returns: A dict object with the total row count and the
    rows for the current page
    '''
    data = form.cleaned_data
    if data['sortorder'] == 'desc':
        order = '-' + data['sortkey']
    else:
        order = data['sortkey']

    query_set = model_manager.filter(
        **db_grid_query_filter(data['searchkey'], data['searchval'])
    ).annotate(**annotations).order_by(order)

    paginator = Paginator(query_set, data['limit'])
    try:
        page_obj = paginator.page(data['page'])
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages)
    
    return {
        'numRows':paginator.count, 
        'rows': list(page_obj.object_list.values())
    }







