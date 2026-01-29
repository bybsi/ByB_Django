function loginAction(e, formId) {
	if (e)
		e.preventDefault(); 

	fetchData(
		"/users/login", 
		$("#"+formId).serialize(), 
		{dataType:'html'}
	).fail(function(jqXHR, textStatus, errorThrown) {
		pageError(jqXHR.responseText);
	}).done(function(data){
		if (data) {
			$("#_byb_bar_right").html(data);
			$("#"+chat.wrapperId).show();
		} else {
			console.log("Login error. (no data)");
		}
		if (formId == '_byb_login_form_modal') {
			$("#_byb_dialog").dialog("close");
		}
		chat.load();
	});
}

function googleSignInW(e) {
	$(".ghide").find('[role="button"]').click();
}

function googleSignIn(response) {
	if (!response) {
		console.log("Error with Google sign in.");
		return;
	}

	$("#jwt_token").val(response.credential);
	loginAction(null, '_byb_login_form_jwt');
}

$(function(){
	$("#help_button").on("click", function(){
		documentation();
	});
	$("#login_button").on("click", function(e){
		loginAction(e, "_byb_login_form");
	});
	$("#_byb_login_form").append('<input id="sid_login" type="hidden" name="sid_login">');
	$("#login_button").click();
	$("#sid_login").remove();
	$("#signin_button").on('click', function(evt){
		loadDialog({dialogId:"_byb_dialog", url:"forms/login_form.php?modal=1", evt:evt, position:{my:'right top',at:'bottom left',of:evt}, title:'Sign In',buttons:{
			"Login": {
				text:"Login",
				id:"login_button_modal",
				click:function(e) {
					loginAction(e, '_byb_login_form_modal');
				}
			}
		}});
	});

	$("#register_button").on("click", function(evt){
		loadDialog({
			dialogId: "_byb_dialog", 
			url: "/forms/register.php", 
			evt: evt, 
			position:{ my: 'right top', at: 'bottom left', of:evt }, 
			title: 'Register',
			buttons: { "Register": getRegisterButtonObj() }
		});
	});
});

function getRegisterButtonObj() {
	var registerCount = 0;
	return {
		text:"Register",
		id:"register_submit_button",
		click: function(e) {
			let user = $("#username").val();
			let pass = $("#password").val();
			let pass_verify = $("#password_verify").val();
			let captcha = $("#captcha").val();
			let csrf_token = $("#csrf_token").val();
			if (!(captcha && user && pass && pass_verify)) {
				registerStatus("All fields are required.");
				return false;
			}
			else if(pass != pass_verify) {
				registerStatus("Passwords do not match.");
				return false;
			}
			fetchData("/actions/register.php", {
				username:user,
				password:pass,
				password_verify:pass_verify,
				captcha:captcha,
				csrf_token:csrf_token
			})
			.fail(function(jqXHR, textStatus, errorThrown) {
				registerCount++;
				registerStatus(
					jqXHR.responseJSON.error + (
					registerCount >= 2 ? 
						" Reload the register form if this keeps happening" :
						""));
			})
			.done(function(data) {
				$("#_byb_dialog").dialog("close");
				$("#register_submit_button").remove();
				if (data.registered) {
					$("#login_username").val($("#username").val());
					$("#login_password").val($("#password").val());
					$("#csrf_token").val(data.csrf_token);
					$("#login_button").click();
				}
			}); 
		}
	};
}

function registerStatus(message) {
	$("#register_status").html(message).show();
}

