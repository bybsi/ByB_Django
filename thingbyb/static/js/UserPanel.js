// User data object.
// Redefined here on successful login.
var _user = {
	username: $("#user_avatar .user_display_name").html(),
	
	set: function(key, value) {
		this.settings[key] = value;
	},

	save: function(extra="") {
		fetchData("/users/settings",{
			settings:this.settings
		}).done(function(data) {
			try {
				if (data.saved) {
					pageOkay("Settings saved. " + extra);
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
		_styleWidget.setContentHeaderTextColor(_user.settings.tcolor);
		_styleWidget.setContentHeaderOpacity(_user.settings.opa);
	},

	logout: function() {
		$("#logout_form").submit();
	},

	profile: function(evt) {
		loadDialog({
			dialogId:"_byb_dialog", 
			url:"/users/settings", 
			title:"Settings", 
			evt:evt, position:{my:'right top',at:'bottom left',of:evt}, 
			buttons:{
				"Save": getUserSaveButton() 
			}
		});
	}
};

$(function() {

	$(".user_panel_icon").off().on('click', function(evt) {
		const action = $(this).data('user-action');
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

function getUserSaveButton() {
	return {
		text:"Save",
		id:"save_profile_button",
		click: function() {
			const contact_data = $("#id_contact_data").val();
			const display_name = $("#id_display_name").val();
			const csrf_token = $("#_byb_dialog_form [name='csrfmiddlewaretoken']").val();
			
			if (!display_name) {
				profileStatus("Display name can't be empty.");
			}
			
			const data = {
				display_name:display_name,
				contact_data:contact_data,
				csrfmiddlewaretoken:csrf_token
			};

			fetchData("/users/settings", data)
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
					profileStatus("Settings saved.", '_byb_okay');
					updateUserPanel(data);
				} else {
					console.log("All kinds of what.");
				}
			}); 
		}
	};
}


