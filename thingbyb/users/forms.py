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


class SettingsForm(forms.Form):
    display_name = forms.CharField(max_length=32, required=False)
    contact_data = forms.CharField(max_length=256, required=False)


