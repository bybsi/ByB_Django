from django.shortcuts import render

# Create your views here.

def home(request):
    context = {
        'css_files':['jquery-ui.sructure.min.css', 'jquery-ui.theme.min.css', 'form.css', 'fonts.css', 'layout.css', ],
        'js_files':['jquery.min.js', 'jquery-ui.min.js','js/bs.js','js/LoginPanel.js','js/channels.js']
    }
    return render(request, 'templates/base.html', context)

