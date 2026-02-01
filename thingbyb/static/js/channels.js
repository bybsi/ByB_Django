var chSysName = 'System';
var pageTitle = document.title;

class ChannelsConnection {
	// Left display box (list of visible channels)
	channelList  = null;
	// Middle display box (chat messages / IO)
	chatBox      = null;
	// Right display box (list of users in the channel)
	userList     = null;
	
	messageCount = 0;

	constructor(channelList, chatBox, userList) {
		this.channelList = channelList;
		this.chatBox = chatBox;
		this.userList = userList;
	}

	connect() { this.wsConnect(); }

	wsConnect() {
		//this.websocket = new WebSocket("wss://192.168.11.103:6464", [], {
		this.websocket = new WebSocket("wss://192.168.11.103:5000/ws", [], {
			'headers': {}
		});
		this.websocket.onopen = (e) => {
			console.log("WS connected");
			this.wsConnected = true;
			this.chatBox.removeLoginMessage();
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
			if (!e.data)
				return;

			let data = JSON.parse(e.data);
			if ('m_id' in data) {
				$(`#${data.m_id} .m_text`).removeClass('pending_text');
				return;
			}
				
			if (data['text']) {
				this.chatBox.writeMessage({
				    'name':data['name'], 
				    'text': data['text'],
				    'time':'now',
				    'type': data['type']
				});
				this.messageCount++;
				document.title = `(${this.messageCount}) ${pageTitle}`;
			} else if (data['multi']) {
				for (const response of data['multi'])
					this.processResponse(response);
			} else if (data['type']) {
				this.processResponse(data);
			}
		};
	}

	processResponse(data) {
		const parts = data['type'].split('_');
		let methodName = 'response';
		for (let i = 0; i < parts.length; i++)
			methodName += parts[i][0].toUpperCase() + parts[i].slice(1);
		if (ChannelsConnection.prototype.hasOwnProperty(methodName)) {
			this[methodName](data);
		} else {
			console.log(`Invalid response: ${data['type']}`);
		}
	}

	responseChannelList(data) {
		this.channelList.clear();
		for (const channelArr of data['data'])
			this.channelList.addChannel(channelArr);
		
	}
	
	responseUserList(data) {
		this.userList.clear();
		this.chatBox.clear();
		for (const userArr of data['data'])
			this.userList.addUser(userArr);
	}

	responseMetaData(data) {
		this.chatBox.writeBanner(data['banner']);
		this.chatBox.writeMotd(data['motd']);
		this.chatBox.outputDefaultMessages(data['channel_name']);
		this.userList.setHeader(data['channel_name']);
	}

	responseUserJoined(data) {
		this.userList.addUser(data['user']);
	}

	responseUserLeft(data) {
		this.userList.delUser(data['user']);
	}

	responseNewChannel(data) {
		this.channelList.addChannel(data['channel']);
	}

	wsSendMessage(message) {
		if (!message)
			return;

		if (typeof message === 'string') 
			message = {'text':message,'type':'message'};

		// Write to GUI
		if (message.text) {
			let mId = this.chatBox.writePendingMessage({
				'name':_user.username,
				'text':message.text,
				'time':'now'
			});
			message.m_id = mId;
		}
		// Write to websocket
		if (this.wsConnected)
			this.websocket.send(JSON.stringify(message));
	}
}

class ChatBox 
{
	msgNumber    = 0;
	channel      = null;
	wsConnected  = false;
	elemId       = '';
	outputElemId = '';
	outputElem   = null;
	shouldScroll = true;
	connection = null;
	static uid   = 0;

	defaultMessages = {
		'Gateway': [
			'To create or join a channel, type /join channelname.',
			'Type /? to see a command list.',
			'Need more? See the [doc:1]channel documentation.',
			'Also, there is now /scrabble and /rpg.'
		],
		'Text RPG': [
			'See the [doc:3]text RPG documentation.'
		]
	};
	
	constructor(chatId, channel) {
		let outputContainerId = '_byb_chat_box_output_container' + ChatBox.uid;
		this.elemId = '_byb_chat_box' + ChatBox.uid;
		this.outputElemId = '_byb_chat_box_output' + ChatBox.uid;
		this.scrollElemNum = 0;
		this.channel = channel;

		$(
`<div id="${this.elemId}" class="_byb_chat_box">
	<div id="${outputContainerId}" class="_byb_chat_box_output_container" class="_byb_top_rad">
		<div id="${this.outputElemId}" class="_byb_chat_box_output _byb_channel_scroll"><span id="channel_login_message">Please login to use Channels. Registration is quick.<br></span></div>
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
	}
	
	setConnection(connection) {
		this.connection = connection;
	}

	removeLoginMessage() {
		$("#channel_login_message").html("");
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

			const methodName = 'cmd' + (command[0].toUpperCase() + command.slice(1));
			if (ChatBox.prototype.hasOwnProperty(methodName)) {
				this[methodName](message);
			} else {
				console.log(`Invalid command: ${command}`);
			}

		} else {
			// Normal message to broadcast to the channel.
			if (this.connection.wsConnected)
				this.connection.wsSendMessage(message);
			else {
				const ai_name = 'ghost';
				const pm = this.messageWriter();
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
		this.connection.wsSendMessage({'type':'join', 'channel_name':message});
	}
	
	cmdRejoin(message = "") {
		this.clear();
		this.connection.wsSendMessage({'type':'rejoin'});
	}
	
	cmdHelp(message = "") {
		const now = Math.floor(new Date().getTime() / 1000);
		this.writeSystemMessage($(`<div id="${now}"></div>`).load('/common/channel_commands.php?print=1', () => {
			if (this.shouldScroll)
				this.outputElem.scrollTop($(this.writeScrollElem()).offset().top);
		}));
	}

	cmdBanner(message = "") {
		this.connection.wsSendMessage({'type':'banner','banner':message});
	}

	cmdMotd(message = "") {
		this.connection.wsSendMessage({'type':'motd','motd':message});
	}

	cmdPassword(message = "") {
	}

	cmdWhitelist(message = "") {
	}

	cmdBlacklist(message = "") {
	}

	cmdVilify(message = "") {
	}

	cmdRpg(command) {
		if (this.connection.wsConnected) {
			if (command)
				this.connection.wsSendMessage({
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
		if (this.connection.wsConnected) {
			if (letters)
				this.connection.wsSendMessage({
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

	outputDefaultMessages(channelName) {
		if (!this.defaultMessages.hasOwnProperty(channelName))
			return;
		const messages = this.defaultMessages[channelName];
		for (let i = 0; i < messages.length; i++)
			this.writeMessage({
				'name':chSysName,
				'text':messages[i],
				'time':'now'
			});
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
		const mId = this.nextMessageId();
		this.outputElem.append(`
<div id="${mId}">
	<span class="m_time">[${time}]</span> 
	<span class="m_name">${htmlEnc(name)}</span>: 
	<span class="m_text pending_text">${htmlEnc(text)}</span>
</div>`);
		return mId;
	}

	writeMessage({name, text, time, type}) {
		if (time == 'now')
			time = (new Date()).toISOString().replace("T"," ").substring(0, 19);
		const display_text = type === "pre" ?
			`<pre>${htmlEnc(text)}</pre>` :
			htmlEnc(text);
		this.outputElem.append(`
<span class="m_time">[${time}]</span> 
<span class="m_name">${htmlEnc(name)}</span>: 
<span class="m_text">${display_text}</span><br>`);
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
<span class="m_name whitespace">${name}</span>${colon} 
<span class="m_text">${htmlEnc(text)}</span><br>`);
		};
	}

	writeSystemMessage(elem) {
		this.outputElem.append(`
<span class="m_time">[now]</span> 
<span class="m_name">${chSysName}</span>:`);
		this.outputElem.append(elem);
	}

	writeScrollElem() {
		const id = 'scr_' + this.scrollElemNum;
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
	}
	
	nextMessageId() {
		this.msgNumber++;
		return '_cm' + this.msgNumber;
	}
}

class ChannelList
{
	chatId     = '';
	elemId     = '';
	container  = null;
	statusText = {'U':'[UP]','D':'[DN]'};
	
	static uid = 0;

	constructor(chatId) {
		this.elemId = '_byb_chat_channels' + ChannelList.uid;
		this.chatId = chatId;
		const cHTextId = "_chnl_list_header"+ChannelList.uid;
		const cHId = "_chnl_list"+ChannelList.uid;
		$(`
<div id="${this.elemId}" class="_byb_chat_channels _byb_channel_list_box _bsclb45">
	<div id="${cHTextId}" class="_byb_channel_list_header">Channels: </div>
	<div id="${cHId}" class="_byb_channel_list _byb_channel_scroll"></div>
</div>`).appendTo('#'+chatId);
		this.container = $("#"+cHId);

		ChannelList.uid++;
	}
	
	addChannel(channelArr) {
		this.container.append(`
<div class="_byb_chat_channel_item" onClick="chat.chatBox.cmdJoin('${channelArr[0]}');">
	<span class="_byb_channel_status _byb_chat_channel_${channelArr[1]}">${this.statusText[channelArr[1]]}</span> ${channelArr[0]}
</div>`);
	}

	clear() {
		this.container.empty();
	}
}

class UserList
{
	elemId     = '';
	container  = null;
	users      = [];
	statusText = {
		'W':'[W]',
		'A':'[A]',
		'B':'[B]',
		'C':'[C]',
		'G':'[G]'};
	headerElem = null;
	static uid = 0;

	constructor(chatId) {
		this.elemId = '_byb_chat_users'+UserList.uid;
		const cUTextId = "_user_list_header"+UserList.uid;
		const cUId = "_user_list"+UserList.uid;
		$(`
<div id="${this.elemId}" class="_byb_chat_users _byb_channel_list_box _bsclb315">
	<div id="${cUTextId}" class="_byb_channel_list_header"></div>
	<div id="${cUId}" class="_byb_channel_list _byb_channel_scroll"></div>
</div>`).appendTo('#'+chatId);
		this.container = $('#'+cUId);
		this.users = [];
		this.headerElem = $('#'+cUTextId);
		UserList.uid++;
	}
	
	addUser(user) {
		this.users.push(user)
		this.container.append(
`<div class="_byb_chat_channel_item" data-userid="${user[0]}" id="chat_user_${user[0]}">
	<span class="_byb_channel_status _user_${user[2]}">${this.statusText[user[2]]}</span> ${user[1]} 
	<small>#${user[0]}</small>
</div>`);
	}

	delUser(user) {
		$(`#chat_user_${user[0]}`).remove();
	}
	
	setHeader(channelName) {
		this.headerElem.html(channelName + ':');
	}

	clear() {
		this.users = [];
		this.container.empty();
	}

	destroy() {
		$('#'+this.elemId).remove();
	}
}

class ByBChat 
{
	container          = null;
	channelsConnection = null;
	wrapperId = '';
	chatId    = '';

	_resizeMouseY     = 0;
	_resizeOldHeight  = 0;
	_resizingVertical = false;

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
	<img src="static/images/icons/chat.png" alt="Chat">Channels<br>( toggle )
</div>`).appendTo("body");

		this.channels = new ChannelList(this.chatId);
		this.chatBox = new ChatBox(this.chatId);
		this.channelUsers = new UserList(this.chatId);
		this.channelsConnection = new ChannelsConnection(
			this.channels,
			this.chatBox,
			this.channelUsers);
		this.chatBox.setConnection(this.channelsConnection)

		$(`#${this.wrapperId}_vr`).on('mousedown', (evt) => {
			this._resizeMouseY = evt.pageY;
			this._resizeOldHeight = $("#"+this.chatId+" ._byb_chat_box_output").height();
			this._resizingVertical = true;
		}); 
		$(document).on('mouseup', (evt) => {
			if (!this._resizingVertical)
				return;
		
			this._resizingVertical = false;
			this._resizeMouseY = 0;
		})  
		.on('mousemove', (evt) => {
			if (!this._resizingVertical)
				return;
			
			let delta = evt.pageY - this._resizeMouseY;
			let newHeight = this._resizeOldHeight - delta;
			if (newHeight > 135) 
				$("._byb_channel_list")
					.css('max-height', newHeight + 'px')
					.css('height', newHeight + 'px');
			if (newHeight > 100)
				$("#"+this.chatId+" ._byb_chat_box_output")
					.height(newHeight);
		});
	}

	load() {
		this.channelsConnection.connect();
	}
}

