from django import forms

class RegisterForm(forms.Form):
    username = forms.CharField(max_length=32)
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'autocomplete':'off'})
    )
    password_verify = forms.CharField(
        max_length=32,
        widget=forms.TextInput(attrs={'autocomplete':'off'})
    )
    captcha = forms.CharField(max_length=5)

