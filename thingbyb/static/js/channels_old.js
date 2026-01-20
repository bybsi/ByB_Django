var chSysName = 'System';
var pageTitle = document.title;
class Channel 
{
	chatBox = null;
	channelUsers = null;
	
	id = 0;
	name = '';

	whitelist = [];
	blacklist = [];
	admins = [];

	constructor(chatId, id, name) {
		this.id = id;
		this.name = name;
		this.chatBox = new ChatBox(chatId, this, false);
		this.channelUsers = new ChannelUsers(chatId, id, name);
	}

	load() {
		$.ajax({
			url:'api/index.php?r=channel',
			method: 'GET',
			dataType: 'json',
			context:this,
			data:{channel_id:this.id},
			async:true
		})
		.fail(function(jqXHR, textStatus, errorThrown) {
			//console.log(jqXHR);
			if (jqXHR.responseJSON?.error.indexOf("Invalid session") !== -1)
				return;
			this.chatBox.clear();
			this.chatBox.writeMessage({
				'name':chSysName,
				'text':jqXHR.responseJSON.error,
				'time':'now'
			});
		})
		.done(function(data) {
			let messages = data.messages?? [];
			this.chatBox.wsConnect();
			this.channelUsers.load();
			this.chatBox.clear();
			this.chatBox.writeBanner(data.banner ?? "No channel banner.");
			this.chatBox.writeMotd(data.motd ?? "No message of the day.");
			for (let message of messages) {
				this.chatBox.writeMessage(message);
			}

		})
		.always(function(){
			if (this.chatBox)
				this.chatBox.focusPrompt();
		});
	}

	destroy() {
		if (this.chatBox)
			this.chatBox.destroy();
		if (this.channelUsers)
			this.channelUsers.destroy();
	}
}

class ChatBox 
{
	msgNumber = 0;
	channel = null;
	wsConnected = false;
	elemId = '';
	outputElemId = '';
	outputElem = null;
	shouldScroll = true;
	messageCount = 0;
	static uid = 0;
	
	constructor(chatId, channel, connect=true) {
		let outputContainerId = '_byb_chat_box_output_container' + ChatBox.uid;
		this.elemId = '_byb_chat_box' + ChatBox.uid;
		this.outputElemId = '_byb_chat_box_output' + ChatBox.uid;
		this.scrollElemNum = 0;
		this.channel = channel;

		$(
`<div id="${this.elemId}" class="_byb_chat_box">
	<div id="${outputContainerId}" class="_byb_chat_box_output_container" class="_byb_top_rad">
		<div id="${this.outputElemId}" class="_byb_chat_box_output _byb_channel_scroll">Please login to use Channels. Registration is quick.<br></div>
	</div>
	<div class="_byb_chat_box_input">
		<form class="message_form" autocomplete="off">
			<input type="text" class="message_prompt" role="presentation" autocomplete="off" aria-haspopup="false">
			<button class="message_prompt_button _byb_button">Send</button>
		</form>
	</div>
</div>`
).appendTo('#'+chatId);
		ChatBox.uid++;

		this.outputElem = $('#'+this.outputElemId);
		$(".message_prompt_button").off().on('click', (evt) => {
			evt.preventDefault();
			this.processMessage();
			$(".message_prompt").focus();
		});
		this.outputElem.off().on('scroll', (evt) => {
			let el = $(evt.currentTarget);
			this.shouldScroll = (el[0].scrollHeight - el.scrollTop() - el.outerHeight() < 1);
		});

		if (connect)
			this.wsConnect();
	}

	wsConnect() {
		this.websocket = new WebSocket("ws://192.168.11.103:6464", [], {
			'headers': {}
		});
		this.websocket.onopen = (e) => {
			console.log("WS connected");
			this.wsConnected = true;
		};
		this.websocket.onclose = (e) => {
			console.log("WS disconnected");
			this.wsConnected = false;
		};
		this.websocket.onerror = (e) => {
			console.log("WS error");
			console.log(e);
		};
		this.websocket.onmessage = (e) => {
			if (e.data) {
				let data = JSON.parse(e.data);
				if ('m_id' in data) {
					$(`#${data.m_id} .m_text`).removeClass('pending_text');
				} else {
					//console.log("MSG DATA: ");
					//console.log(data);
					if (data['text']) {
						this.writeMessage({
						    'name':data['name'], 
						    'text': data['text'],
						    'time':'now',
						    'type': data['type']
						});
						this.messageCount++;
						document.title = `(${this.messageCount}) ${pageTitle}`;
					}
				}
			}
		};
	}

	wsSendMessage(message) {
		if (typeof message === 'string')
			message = {'text':message,'type':'message'};
		console.log(message);

		// Write to GUI
		let mId = this.writePendingMessage({
			'name':_user.username,
			'text':message.text,
			'time':'now'
		});
		// Write to websocket
		if (this.wsConnected)
			this.websocket.send(JSON.stringify({...message, m_id:mId}));
	}

	nextMessageId() {
		this.msgNumber++;
		return '_cm' + this.msgNumber;
	}

	processMessage() {
		let result = false;
		let message = $(".message_prompt").val();//.trim();
		if (message[0] == '/') {
			/* Handle command messages. Example:
				/join <channelname>
				/?
				/help
			*/
			let command = message.substring(1);
			let commandEndIdx = message.indexOf(' ');
			if (commandEndIdx > 0) {
				command = message.substring(1, commandEndIdx);
				message = message.substring(command.length + 1).trim();
			} else {
				message = "";
			}
	
			// Command shortcut cases.
			if (command[0] == '?')
				command = "help";

			let methodName = 'cmd' + (command[0].toUpperCase() + command.slice(1));
			if (ChatBox.prototype.hasOwnProperty(methodName)) {
				this[methodName](message);
			} else {
				console.log(`Invalid command: ${command}`);
			}

		} else {
			// Normal message to broadcast to the channel.
			if (this.wsConnected)
				this.wsSendMessage(message);
			else {
				let ai_name = 'ghost';
				let pm = this.messageWriter();
				pm({
					'text':'[span]whitespace                 [span]steam ~[/span][/span]',
					'name':ai_name
				});
				pm({
					'text':'Server down.  c|_|',
					'name':ai_name
				});
			}
		}
		//for(i in n)
		//for(todel in f(above))
		//O(n + f(n))

		$(".message_prompt").val("");
		// Scroll with the chat box.
		if (this.shouldScroll)
			this.outputElem.scrollTop(this.outputElem.prop("scrollHeight"));
	}

	cmdJoin(message = "") {
		chat.channels.joinChannel(message);
	}
	
	cmdHelp(message = "") {
		let now = Math.floor(new Date().getTime() / 1000);
		this.writeSystemMessage($(`<div id="${now}"></div>`).load('/common/channel_commands.php?print=1', () => {
			if (this.shouldScroll)
				this.outputElem.scrollTop($(this.writeScrollElem()).offset().top);
		}));
	}

	cmdBanner(message = "") {
		chat.channels.editChannel('banner', message);
	}

	cmdMotd(message = "") {
		chat.channels.editChannel('motd', message);
	}

	cmdPassword(message = "") {
		chat.channels.editChannel('password', message);
	}

	cmdWhitelist(message = "") {
		chat.channels.vilifyChannelUser('W', message);
	}

	cmdBlacklist(message = "") {
		chat.channels.vilifyChannelUser('B', message);
	}

	cmdVilify(message = "") {
		let [role, userIdentifier] = message.split(':');
		chat.channels.vilifyChannelUser(role, userIdentifier);
	}

	cmdRpg(command) {
		if (this.wsConnected) {
			if (command)
				this.wsSendMessage({
					type:'rpg',
					text:command,
					command:command
				});
			else
				this.writeMessage({
					'name':chSysName, 
					'text':`Try /rpg [start|stop|#]`,
					'time':'now'
				});
				
		} else {
			this.writeMessage({
				'name':chSysName, 
				'text':'The server is down, oh no.',
				'time':'now'
			});
		}
	}

	cmdScrabble(letters) {
		if (this.wsConnected) {
			if (letters)
				this.wsSendMessage({
					type:'scrabble',
					text:letters,
					letters:letters
				});
			else
				this.writeMessage({
					'name':chSysName, 
					'text':'Please input some letters!',
					'time':'now'
				});
				
		} else {
			this.writeMessage({
				'name':chSysName, 
				'text':'The server is down!',
				'time':'now'
			});
		}
	} 

	writeBanner(text) {
		this.outputElem.append(`<small class="m_banner">${htmlEnc(text)}</small>`);
	}

	writeMotd(text) {
		this.outputElem.append(`<small class="m_motd">${htmlEnc(text)}</small><br><br>`);
	}
	
	writePendingMessage({name, text, time}) {
		if (time == 'now')
			time = (new Date()).toISOString().replace("T"," ").substring(0, 19);
		let mId = this.nextMessageId();
		this.outputElem.append(`
<div id="${mId}">
	<span class=\"m_time\">[${time}]</span> 
	<span class=\"m_name\">${htmlEnc(name)}</span>: 
	<span class=\"m_text pending_text\">${htmlEnc(text)}</span>
</div>`);
		return mId;
	}

	writeMessage({name, text, time, type}) {
		if (time == 'now')
			time = (new Date()).toISOString().replace("T"," ").substring(0, 19);
		if (type === "pre")
			this.outputElem.append(`
<span class=\"m_time\">[${time}]</span> 
<span class=\"m_name\">${htmlEnc(name)}</span>: 
<span class=\"m_text\"><pre>${htmlEnc(text)}</pre></span><br>`);
		else
			this.outputElem.append(`
<span class=\"m_time\">[${time}]</span> 
<span class=\"m_name\">${htmlEnc(name)}</span>: 
<span class=\"m_text\">${htmlEnc(text)}</span><br>`);
		if (this.shouldScroll)
			this.outputElem.scrollTop(this.outputElem.prop("scrollHeight"));
	}
	
	messageWriter() {
		let n = 1;
		let colon = '';
		return ({name, text}) => { 
			if (n-- > 0) {
				const s = ' ';
				name = s.repeat(name.length);
			} else {
				colon = ':';
			}
			this.outputElem.append(`
<span class="whitespace">					 </span> 
<span class=\"m_name whitespace\">${name}</span>${colon} 
<span class=\"m_text\">${htmlEnc(text)}</span><br>`);
		};
	}

	writeSystemMessage(elem) {
		this.outputElem.append(`
<span class=\"m_time\">[now]</span> 
<span class=\"m_name\">${chSysName}</span>:`);
		this.outputElem.append(elem);
	}

	writeScrollElem() {
		let id = 'scr_' + this.scrollElemNum;
		this.outputElem.append(`<div id="${id}"></div>`);
		this.scrollElemNum++;
		return '#'+id;
	}

	clear() {
		this.outputElem.empty();
	}

	focusPrompt() {
		$(".message_prompt").focus();
	}

	destroy() {
		$('#'+this.elemId).remove();
		if (this.wsConnected) {
			this.websocket.send(JSON.stringify({type:'close'}));
			this.websocket.close();
		}
	}
}

class CountDown
{
	constructor(parent_elem_id, seconds, autoReset=false) {
		this.currentSeconds = seconds;
		this.initialSeconds = seconds;
		this.autoReset = autoReset;
		this.visible = false;
		this.elem = $("<span class=\"_byb_channels_countdown\"></span>");
		$('#'+parent_elem_id).append(this.elem);
		this.counter = setInterval(() => {
			this.currentSeconds -= 1;
			if (this.visible)
				this.elem.html(this.currentSeconds.toString().padStart(3," "));
			else
				this.elem.html("");
			if (this.autoReset && this.currentSeconds == 0)
				this.currentSeconds = this.initialSeconds;
		}, 1000);
	}

	show() {
		this.visible = true;
	}
   
	destroy() {
		clearInterval(this.counter);
		this.elem.remove();
	}

	reset() {
		this.currentSeconds = this.initialSeconds;
	}
}

class Channels
{
	chatId		  = '';
	elemId		  = '';
	container	   = null;
	selectedChannel = null;
	channels		= [];
	statusText	  = {'U':'[UP]','D':'[DN]'};

	static uid = 0;

	constructor(chatId) {
		this.elemId = '_byb_chat_channels' + Channels.uid;
		this.chatId = chatId;
		let cHTextId = "_chnl_list_header"+Channels.uid;
		let cHId = "_chnl_list"+Channels.uid;
		$(`
<div id="${this.elemId}" class="_byb_chat_channels _byb_channel_list_box _bsclb45">
	<div id="${cHTextId}" class="_byb_channel_list_header">Channels: </div>
	<div id="${cHId}" class="_byb_channel_list _byb_channel_scroll"></div>
</div>`).appendTo('#'+chatId);
		this.container = $("#"+cHId);
		this.pollInterval = 15000;
		this.pollCountDown = new CountDown(cHTextId, this.pollInterval / 1000, true);
		this.poller = null;

		Channels.uid++;
	}
	
	stopPoller() {
		if (this.poller) {
			clearTimeout(this.poller);
			this.poller = null;
		}
	}

	selectChannel(channelId, channelName) {
		if (this.selectedChannel)
			this.selectedChannel.destroy();
		this.selectedChannel = new Channel(this.chatId, channelId, channelName);
		this.selectedChannel.load();
	}

	joinChannel(channelName, password=null) {
		let existingChannel = this.channels.find((channel) => channelName === channel.name);
		if (existingChannel) {
			this.selectChannel(existingChannel.id, existingChannel.name);
		} else {
			this.createChannel(channelName);
		}
	}

	createChannel(channelName) {
		$.ajax({
			url:'api/index.php?r=channel_create',
			method: 'POST',
			dataType: 'json',
			data:{channel_name:channelName},
			context:this,
			async:true
		})
		.fail(function(jqXHR, textStatus, errorThrown) {
				console.log("Create channel error " + jqXHR.responseText);
				console.log(jqXHR);
		})
		.done(function(data) {
			if (data.existing) {
				console.log("Channel exists");
				return;
			}
			console.log("create channel done");
			console.log(data);
			this.channels.push(data);
			this.addChannelElem(data);
			this.selectChannel(data.id, data.name);
		});
		return true;
	}
	
	vilifyChannelUser(role, user_identifier) {
		if (!this.selectedChannel) {
			return false;
		}
		$.ajax({
			url:'api/index.php?r=channel_vilify',
			method: 'POST',
			dataType: 'json',
			data:{
				role:role,
				user_identifier:user_identifier,
				channel_id:this.selectedChannel.id
			},
			context:this,
			async:true
		})
		.fail(function(jqXHR, textStatus, errorThrown) {
			console.log("Vilify error " + jqXHR.responseText);
			console.log(jqXHR);
			if (this.selectedChannel) {
				this.selectedChannel.chatBox.writeMessage({
					'name':chSysName,
					'text':jqXHR.responseJSON.error,
					'time':'now'
				});
			}
		})
		.done(function(data) {
			console.log("Edit channel done");
			console.log(data);
			this.selectedChannel.chatBox.writeMessage(data);
		});
		return true;
	}

	
	editChannel(setting, value) {
		if (!this.selectedChannel) {
			return false;
		}
		$.ajax({
			url:'api/index.php?r=channel_edit',
			method: 'POST',
			dataType: 'json',
			data:{
				setting:setting,
				value:value,
				channel_id:this.selectedChannel.id
			},
			context:this,
			async:true
		})
		.fail(function(jqXHR, textStatus, errorThrown) {
			console.log("Edit channel error " + jqXHR.responseText);
			console.log(jqXHR);
			if (this.selectedChannel) {
				this.selectedChannel.chatBox.writeMessage({
					'name':chSysName,
					'text':jqXHR.responseJSON.error,
					'time':'now'
				});
			}
		})
		.done(function(data) {
			console.log("Edit channel done");
			console.log(data);
			this.selectedChannel.chatBox.writeMessage(data);
		});
		return true;
	}

	load() {
		this.stopPoller();
		this.loader();
		this.pollCountDown.show();
	}

	loader() {   
		$.ajax({
			url:'api/index.php?r=channels',
			method: 'GET',
			dataType: 'json',
			context:this,
			async:true
		})
		.fail(function(jqXHR, textStatus, errorThrown) {
				console.log("Channel error " + jqXHR.responseText);
				console.log(jqXHR);
		})
		.done(function(data) {
			const numChannels = data?.length ?? 0;
			if (numChannels) {
				this.container.empty();
				this.channels = [];
				let channel = null;
				for (let i = 0; i < numChannels; i++) {
					//channel = data.channels[i];
					channel = data[i];
					this.channels.push(channel);
					this.addChannelElem(channel);
				}
			} else {
				console.log("No channel data found");
			}
			this.pollCountDown.reset();
			this.poller = setTimeout(()=>{this.load()}, this.pollInterval);
		});
	}

	addChannelElem(channelObj) {
		this.container.append(`
<div class="_byb_chat_channel_item" onClick="chat.channels.selectChannel(${channelObj['id']}, '${channelObj['name']}');">
	<span class="_byb_channel_status _byb_chat_channel_${channelObj['status']}">${this.statusText[channelObj['status']]}</span> ${channelObj['name']}
</div>`);
	}
}

class ChannelUsers
{
	elemId	  = '';
	container   = null;
	channelId   = 0;
	users	   = [];
	statusText  = {'W':'[W]','A':'[A]','Z':'[G]','B':'[B]','M':'[M]','C':'[C]','':'[G]'};

	static uid  = 0;

	constructor(chatId, channelId, channelName) {
		this.elemId = '_byb_chat_users'+ChannelUsers.uid;
		let cUTextId = "_user_list_header"+ChannelUsers.uid;
		let cUId = "_user_list"+ChannelUsers.uid;
		$(`
<div id="${this.elemId}" class="_byb_chat_users _byb_channel_list_box _bsclb315">
	<div id="${cUTextId}" class="_byb_channel_list_header">${channelName} users: </div>
	<div id="${cUId}" class="_byb_channel_list _byb_channel_scroll"></div>
</div>`).appendTo('#'+chatId);
		this.container = $("#"+cUId);
		this.users = [];
		this.channelId = channelId;
		this.pollInterval = 10000;
		this.poller = null;
		this.pollCountDown = new CountDown(cUTextId, this.pollInterval / 1000, true);

		ChannelUsers.uid++;
	}
	
	stopPoller() {
		if (this.poller) {
			clearTimeout(this.poller);
			this.poller = null;
		}
	}

	load() {
		this.stopPoller();
		this.loader();
		this.pollCountDown.show();
	}

	loader() {   
		$.ajax({
			url:'api/index.php?r=channel_users',
			method: 'GET',
			dataType: 'json',
			context:this,
			data:{channel_id:this.channelId},
			async:true
		})
		.fail(function(jqXHR, textStatus, errorThrown) {
			console.log("Channel users error " + jqXHR.responseText);
			console.log(jqXHR);
		})
		.done(function(data) {
			const numUsers = data?.length ?? 0;
			if (numUsers) {
				this.container.empty();
				this.users = [];
				let user = null;
				for (let i = 0; i < numUsers; i++) {
					user = data[i];
					this.users.push(user);
					// TODO only modify the list according to what changed.
					this.container.append(
`<div class="_byb_chat_channel_item" data-userid="${user['user_id']}" id="chat_user_${user['user_id']}">
	<span class="_byb_channel_status _user_${user['status']}">${this.statusText[user['status'] ?? 'Z']}</span> ${user['uname']} 
	<small>#${user['user_id']}</small>
<div>`);
				}
			} else {
				console.log("No channel user data found");
			}
			this.pollCountDown.reset();
			this.poller = setTimeout(()=>{this.load()}, this.pollInterval);
		});
	}

	destroy() {
		this.stopPoller();
		this.pollCountDown.destroy();
		$('#'+this.elemId).remove();
	}
}

class ByBChat 
{
	container   = null;
	channels	= null;
	wrapperId   = '';
	chatId	  = '';

	_resizeMouseY	   = 0;
	_resizeOldHeight	= 0;
	_resizingVertical   = false;

	constructor() {
		this.wrapperId = 'cid' + Date.now().toString() + (Math.floor(Math.random() * 1000001) + 1);
		this.chatId = this.wrapperId + '_byb_chat';

		this.container = $(`
<div id="${this.wrapperId}" class="_byb_chat_wrapper">
	<div id="${this.wrapperId}_vr" class="_byb_chat_resize_v"></div>
	<div id="${this.chatId}" class="_byb_chat"></div>
</div>`);
		this.container.appendTo("body");
		$(`
<div id="_byb_chat_icon" onClick="$('#${this.wrapperId}').toggle();">
	<img src="images/icons/chat.png" alt="Chat">Channels<br>( toggle )
</div>`).appendTo("body");

		this.channels = new Channels(this.chatId);

		$(`#${this.wrapperId}_vr`).on('mousedown', (evt) => {
			this._resizeMouseY = evt.pageY;
			this._resizeOldHeight = $("#"+this.chatId+" ._byb_chat_box_output").height();
			this._resizingVertical = true;
		}); 
		$(document).on('mouseup', (evt) => {
			if (this._resizingVertical) {
				this._resizingVertical = false;
				this._resizeMouseY = 0;
			}   
		})  
		.on('mousemove', (evt) => {
			if (this._resizingVertical) {
				let delta = evt.pageY - this._resizeMouseY;
				let newHeight = this._resizeOldHeight - delta;
				if (newHeight > 135)
					$("._byb_channel_list").css('max-height', newHeight + 'px');
				if (newHeight > 100)
					$("#"+this.chatId+" ._byb_chat_box_output").height(newHeight);
			}   
		});
	}

	load() {
		this.channels.load();
		this.channels.selectChannel(1, 'Global');
	}
}

