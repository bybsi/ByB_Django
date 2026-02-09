var _user = null;
var _styleWidget = null;
var _trade = null;

// TODO Separate out the markdown.
function htmlEnc(str) {
	if (!str)
		return "";
	return str
		.replaceAll('&','&amp;')
		.replaceAll('<','&lt;')
		.replaceAll('>','&gt;')
		.replace(/\[doc:(\d+)]([\w\s]+)/gi, "<a href=\"#/\" onClick=\"documentation($1);return false;\">$2</a>")
		.replace(/\[link\](.*?\s)/gi, "<a href=\"$1\" target=\"_blank\">$1</a>")
		.replace(/\[span\](.*?\s)/gi, "<span class=\"$1\">")
		.replace(/\[\/span\]/gi, "</span>")
		.replace(/\[sec\]([\d.]+)/gi, " [<span class=\"seconds\">Execution time: $1 seconds</span>]");
}

function fetchData(url, data, opts={}, resetStatuses=true)
{
	if (resetStatuses)
		$("#_byb_bar_error, #_byb_bar_okay").hide();
	$("#_byb_bar_loader").show();
	return response = $.ajax({
		url: url || 'notexists.php', // prevent empty URL from messing up my page!
		method: 'POST',
		dataType: 'json',
		data: data,
		async:true,
		...opts
	})
	.always(function(data) {
		$("#_byb_bar_loader").hide();
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		if (jqXHR?.hasOwnProperty('responseJSON'))
			$("#_byb_bar_error").html(jqXHR.responseJSON.error);
		else if (jqXHR?.hasOwnProperty('responseText'))
			$("#_byb_bar_error").html(jqXHR.responseText.replace('<br>',''));
		$("#_byb_bar_error").show();
		$("#_byb_bar_okay").hide();
	});
}

function loadDialog({
	dialogId, 
	url, 
	title    = '', 
	evt      = null, 
	position = {my:'center', at:'center', of:window},
	logo     = null,
	buttons  = {},
	width    = null,
	load     = null})
{
	let dialogIdH = '#' + dialogId;
	let contentId = `${dialogIdH}_content`;
	$(contentId).html("");
	$(dialogIdH).dialog('open');
	$(dialogIdH).dialog('option','position',position);
	let thisDialog = `.ui-dialog[aria-describedby=${dialogId}]`;
	if (logo) {
		$(dialogIdH).dialog('option','title','');
		$(`${thisDialog} .ui-dialog-title`).css('height','5px');
		$(`#${dialogId}_logo`).remove();
		$(`${thisDialog} .ui-dialog-titlebar`).append(`<span id="${dialogId}_logo"><img src="${logo}">${title}</span>`);
	} else {
		$(`${thisDialog} .ui-dialog-title`).css('height','25px');
		$(`#${dialogId}_logo`).remove();
		$(dialogIdH).dialog('option','title',title);
	}
	$(contentId).addClass('_byb_dialog_loading');
	$(contentId).load(url, function(data) {
		if (data?.indexOf('ession') != -1) {
			pageError("Expired session, please re-log.");
			$('#'+dialogId).dialog('close');
			return;
		}
		$(contentId).removeClass('_byb_dialog_loading');
		$(dialogIdH).dialog('option','maxHeight',$(window).height() - 100);
		$(dialogIdH).dialog('option','position',position);
		$(dialogIdH).dialog('option','buttons', {
			...buttons,
			"Close": {
				text:"Close",
				id:"close_dialog_button",
				click: function() { 
					$(this).dialog('close');
				}
			}
		});
		if (load)
			load();
	});
}

function pageError(message) {
	$("#_byb_bar_error").html(message);
	$("#_byb_bar_error").show();
}

function pageOkay(message) {
	$("#_byb_bar_okay").html(message);
	$("#_byb_bar_okay").show();
}

var whereAmIMap = {'bs':0,'music':4,'trading':7};
function documentation(activeIndex = 0) {
	if (!activeIndex && whereAmI in whereAmIMap)
		activeIndex = whereAmIMap[whereAmI];
	loadDialog({
		dialogId:"_byb_documentation", 
		//url:`/documentation.php?ai=${activeIndex}&v=${Date.now()}`, 
		url:`https://thingbyb.com/documentation.php?ai=${activeIndex}&v=${Date.now()}`, 
		title:"Interactive Documentation"
	});
}
	
function enableTogglers() {
	$(".toggler").off().on('click', function(){
		if ($(this).data('docid'))
			documentation($(this).data('docid'));
		else if ($(this).data('type') == 'nav') 
			$("#" + $(this).data('target')).click();
		else
			$("#" + $(this).data('target')).toggle();
	});
}

function test(){}

function dialog_init(id, title, isModal = true, dlgClass = '') {
	$(id).dialog({
		autoOpen:false,
		modal:isModal,
		dialogClass:dlgClass,
		resizable:true,
		height:'auto',
		width:'auto',
		create: function(event,ui){
			$(this).css("maxWidth", "600px");
		},
		title:title
	});
}

var whereAmI = 'bs';
var chat = null;
$(function(){
	dialog_init("#_byb_dialog", "The Dialog", true, "no-close");
	dialog_init("#_byb_documentation", "Documentation", false);
	dialog_init("#_byb_float_dialog", "");

	// Left side nav handler.
	$(".nav_item_icon,#logo").on('click', function(){
		// Don't save whereAmI on external links since those
		// icons are not left highlighted after being clicked.
		let project = $(this).data('project');
		if (project == 'bs') {
			window.location.href = '/';
			whereAmI = project;
		} else if (project == 'code') {
			window.open("https://github.com/bybsi/", "_blank");
		} else if (project == 'reactjs'){
			window.open("http://thingbyb.com/reacttest/index.html?1", "_bank");
		} else {
			// TODO look into and enable memory improvements
			if (whereAmI != project) {
				if (whereAmI == 'trading' && _trade) {
					_trade.destroy();
					_trade = null;
				}
				let projectUrl = project;
				if (project == 'running')
					projectUrl = 'activities';
				$("#_byb_content_main").load(`/` + projectUrl, function() {
					console.log('Project ' + projectUrl + ' loaded');
				});
				$('#_byb_'+whereAmI).removeClass('nav_item_icon_on');
				$(this).addClass('nav_item_icon_on');
				$('#_byb_sub_title').html(' - ' + $(this).data('title'));
			}
			whereAmI = project;
		}
	});

	enableTogglers();
	chat = new ByBChat();
});

