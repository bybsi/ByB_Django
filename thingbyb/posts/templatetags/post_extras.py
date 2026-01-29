from django import template
from django.conf import settings
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter
@stringfilter
def add_static_sources(html_str):
    return html_str.replace('src="', f'src="{settings.STATIC_URL}')
