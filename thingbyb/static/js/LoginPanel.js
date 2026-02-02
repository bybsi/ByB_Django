function loginAction(e, formId) {
	if (e)
		e.preventDefault(); 

	fetchData(
		"/users/login", 
		$("#"+formId).serialize(), 
		{dataType:'html'}
	).fail(function(jqXHR, textStatus, errorThrown) {
		if (jqXHR.responseText) 
			pageError(jqXHR.responseText);
		else
			$("#_byb_bar_error").hide();
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
			url: "/users/register", 
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
			const user = $("#id_username").val();
			const pass = $("#id_password").val();
			const pass_verify = $("#id_password_verify").val();
			const captcha = $("#id_captcha").val();
			const csrf_token = $("#_byb_dialog_form [name='csrfmiddlewaretoken']").val();
			console.log(user + pass + pass_verify + captcha);
			if (!(captcha && user && pass && pass_verify)) {
				registerStatus("All fields are required.");
				return false;
			}
			else if(pass != pass_verify) {
				registerStatus("Passwords do not match.");
				return false;
			}
			fetchData("/users/register", {
				username:user,
				password:pass,
				password_verify:pass_verify,
				captcha:captcha,
				csrfmiddlewaretoken:csrf_token
			})
			.fail(function(jqXHR, textStatus, errorThrown) {
				registerCount++;
				registerStatus(
					jqXHR.responseText + (
					registerCount >= 3 ? 
						" Reload the register form." 
						: ""));
			})
			.done(function(data) {
				$("#_byb_dialog").dialog("close");
				$("#register_submit_button").remove();
				if (data.registered) {
					$("#login_username").val($("#username").val());
					$("#login_password").val($("#password").val());
					//$("#csrf_token").val(data.csrf_token);
					$("#login_button").click();
				}
			}); 
		}
	};
}

function registerStatus(message) {
	$("#register_status").html(message).show();
}

