// User data object.
// Redefined here on successful login.
var _user = {
    username: $("#user_avatar .user_display_name").html(),
    settings: user_settings, // components/user_panel.php
    set: function(key, value) {
        this.settings[key] = value;
    },
    save: function(extra="") {
        fetchData("/actions/settings.php",{
            settings:this.settings
        }).done(function(data) {
            try {
                if (data.saved) {
                    pageOkay("Settings saved. " + extra);
                    //_styleWidget.display(_user.settings['style_widget'] == 'enabled');
                } else {
                    pageError("Could not save settings.");
                    console.log(data);
                }
            } catch (error) {
                console.log(error);
            }
        });
    },
    applyStyles: function() {
        if (_styleWidget == null)
            return;
        _styleWidget.enableButtons();
        _styleWidget.setContentLayout(_user.settings.lyt);
        _styleWidget.setContentHeaderColor(_user.settings.hcolor);
        _styleWidget.setBodyBackground(_user.settings.bg);
        _styleWidget.display(_user.settings.style_widget == 'enabled' ? true : false);
        _styleWidget.setContentHeaderTextColor(_user.settings.tcolor);
        _styleWidget.setContentHeaderOpacity(_user.settings.opa);
    },
    logout: function() {
        fetchData("/actions/logout.php").done(function(data) {
            try {
                if (data.logged_out) {
                    window.location.href = '/index.php';
                } else {
                    console.log(data);
                }
            } catch (error) {
                console.log(error);
            }
        });
    },
    profile: function(evt) {
        loadDialog({dialogId:"_byb_dialog", url:"/forms/profile.php", title:"Settings", evt:evt, position:{my:'right top',at:'bottom left',of:evt}, buttons:{
          "Save": {
            text:"Save",
            id:"save_profile_button",
            click: function() {
                let contact_data = $("#contact_data").val();
                let display_name = $("#display_name").val();
                let display_sw = $("#show_style_widget").is(':checked') ? 'enabled' : 'disabled';
                if (!display_name) {
                    profileStatus("Display name can't be empty.");
                }
                let data = {
                    display_name:display_name,
                    contact_data:contact_data,
                    style_widget:display_sw
                };
                fetchData("/actions/profile.php", data)
                .fail(function(jqXHR, textStatus, errorThrown) {
                    if (jqXHR.responseJSON?.error?.indexOf('ession') != -1){
                        pageError(jqXHR.responseJSON);
                        $("#_byb_dialog").dialog('close');
                    } else {
                        profileStatus(jqXHR.responseJSON.error, '_byb_error');
                    }
                })
                .done(function(data) {
                    if (data.saved) {
                        _user.set('style_widget', display_sw);
                        profileStatus("Settings saved.", '_byb_okay');
                        updateUserPanel(data);
                        //_styleWidget.display(_user.settings['style_widget'] == 'enabled');
                    } else {
                        console.log("All kinds of what.");
                    }
                }); 
            },
            onload: function(){
                $("#display_name").focus();
                $(document).on('keypress', function(evt) {
                    if (evt.key == 'Enter' && $("#save_profile_button").length){
                        $("#save_profile_button").click();
                        $("#close_dialog_button").focus();
                        $(document).off('keypress');
                    }
                });
            }
          }
        }});
    }
};

$(function() {
    //_user.applyStyles();

    $(".user_panel_icon").off().on('click', function(evt) {
        var action = $(this).data('user-action');
        switch (action) {
            case 'logout':
                _user.logout();
                break;
            case 'profile':
                _user.profile(evt);
                break;
            default:
                console.log("Invalid action: " + action);
                break;
        }
    });

    if (whereAmI == 'trading')
    {
        _trade.reloadCart();
        _trade.reloadOrderHistory();
    }
});

function updateUserPanel(userData)
{
    $("#user_avatar .user_display_name").html(userData.display_name);
}

function profileStatus(message, className) 
{
    $("#profile_status")
        .removeClass('_byb_okay')
        .removeClass('_byb_error')
        .addClass(className)
        .html(message).show();
}
