
import { ByBFillPanel } from './fill_panel.js?10';
import { ByBOrderBook } from './order_book.js?7';
import { ByBTradeWallet } from './trade_wallet.js?8';
import { ByBSVGTradeMonitor } from './trade_monitor.js?7';
import { ByBSVGChart } from './trade_chart.js?7';

var _ByBTradeUsage = (reqParam) => { return `
Hello, missing a required option: ${reqParam}.
Try this:
	ByBTrade({
		containerId:"divId",
		markets:[
			{key:'mkt1',label:'Market1',dataFeed:"/data.php?m=a"},
			{key:'mkt2',label:'Market2',dataFeed:"/data.php?m=b"}
		]
	});
`};

var _wallet = null; // TODO make this user scoped

export function ByBTrade(options) {

	let _options = {
		containerId:'',
		orderHistoryId:'',
		cartId:'',
		leaderboardId:'',
		markets:[],
		csrfToken:'',
		...options
	};

	const _clTrade            = '_byb_trade';
	const _clPanel            = '_byb_trade_panel';
	const _clMarketPanel      = '_byb_market_panel_container';
	const _clLoadingOverlay   = '_byb_trade_loading_overlay';
	const _clMarketResize     = '_byb_market_resize';
	const _ordersId           = '_byb_trade_orders';
	const _checkoutId         = '_byb_trade_checkout';
	const _leaderboardId      = '_byb_trade_leaderboard';
	let _container          = null;
	let _leaderBoard        = null;
	let _orderHistory       = null;
	let _marketPanel        = null;
	let _orders             = null;
	let _checkout           = null;
	let _orderHistoryGrid   = null;
	let _leaderBoardGrid    = null;
	let _tradeMonitor	= null;
	let _cart		= null;
	let _balanceElems       = [];
	let _resizeOldWidth     = 0;
	let _resizingHorizontal = false;
	let _id;
	let _this;

	let _resizeMouseX = 0;
	let _orderCooldown = false;
	return {
		
		init: function() {
			for (const reqOption of ['markets','containerId']) {
				if (!_options[reqOption].length == 0) {
					_ByBTradeUsage(reqOption);
				}
			}
			
			_id = _options.containerId;
			_this = this;
			_container = $('#' + _options.containerId).addClass(_clTrade);
			_marketPanel = $('#' + _clMarketPanel);
			_tradeMonitor = new ByBSVGTradeMonitor({
				monitorURL:'/api/datastream_v3.php',
			});
			
			for (const market of _options.markets) {
				
				const chartId = market.key + '_chart';
				const bookId = market.key + '_book';
				const fillId = market.key + '_fill';
				market.container = $(`<div id="${market.key}" class="${_clPanel}">`);
				market.chart = new ByBSVGChart({
					dataURL:`/api/graph.php?ticker=${market.key.toUpperCase()}&period=15m`,
					containerId:chartId,
					title:market.label
				});
				market.book = new ByBOrderBook({
					dataURL:`/api/index.php?r=trade_order_book&ticker=${market.key.toUpperCase()}`,
					containerId:bookId
				});
				market.fill = new ByBFillPanel({
					dataURL:`/api/index.php?r=trade_order_fills&ticker=${market.key.toUpperCase()}`,
					containerId:fillId,
					tradeContext:this
				});

				market.chart.init();
				market.book.init();
				market.fill.init();
				_container.append(
					market.container.append(
						market.chart.container(), 
						market.book.container(), 
						market.fill.container()
					)
				);
				market.chart.load();
				market.fill.load();
				_tradeMonitor.addChart(market.chart);
				_tradeMonitor.addBook(market.book, market.key.toUpperCase());
				_tradeMonitor.addFill(market.fill, market.key.toUpperCase());
			}

			$('#'+_clMarketResize).on('mousedown', function(evt) {
				_resizeMouseX = evt.pageX;
				_resizeOldWidth = _marketPanel.width();
				_resizingHorizontal = true;
			});
			$(document).on('mouseup', function(evt) {
				if (_resizingHorizontal) {
					_resizingHorizontal = false;
					_resizeMouseX = 0;
				}
			})
			.on('mousemove', function(evt) {
				if (_resizingHorizontal) {
					const deltaX = evt.pageX - _resizeMouseX;
					_marketPanel.width(_resizeOldWidth - deltaX);
				}
			});
			this.createCart();
			this.createLeaderBoard();
			this.createOrderHistory();
			_tradeMonitor.monitor();
			if (_user)
				_user.applyStyles();

			setTimeout( function (){
				// Width of 1st chart + order panel + fill panel
				let leftPanelWidth = $("#andthen").width();
				// Width of user order panel
				let rightPanelWidth = _container.width() - leftPanelWidth;
				_marketPanel.width(rightPanelWidth > 300 ? rightPanelWidth : 300);
			}, 0);
		},

		getWallet: function() {
			return _wallet;
		},

		createCart: function() {
			_cart = $("#"+_options.cartId);
			_wallet = new ByBTradeWallet({
				containerId:'_byb_trade_wallet',
				dataURL:'/api/index.php?r=trade_wallet',
			});
			_wallet.init();
			_wallet.load();

			_cart.append(_wallet.container());

			_cart.append($(`
<div id="_byb_buy_sell" class="_byb_cart_tab_container">
	<div id="_byb_buy" class="_byb_cart_tab _byb_cart_tab_buy">Buy</div>
	<div id="_byb_sell" class="_byb_cart_tab _byb_cart_tab_sell">Sell</div>
</div>
`));
			let amountInput = $('<input id="_byb_cart_amount" value="0.0" class="order_input">');
			let priceInput = $('<div style="align-items:center;display:inline-flex;"><input id="_byb_cart_price" value="0.0" class="order_input"><span style="color:#ccc;padding:0px 5px;height:19px;"><small> BYBS</small></span></div>');
			let typeSelect = $('<select><option name="type_limit">Limit</option></select>');
			let marketSelect = $('<select id="_byb_cart_market_select"></select>');
			marketSelect.append('<option value="0">-- Select Market --</option>');
			for (const market of _options.markets) {
				marketSelect.append($(`<option value="${market.key.toUpperCase()}">${market.label}</option>`));
			}
			
			_cart.append(
				$('<div class="_byb_cart_order_container"></div>')
				.append(
					$(`<div id="_byb_cart_order_overlay" class="${_clLoadingOverlay}"></div>`),
					$('<div class="_byb_cart_order_grid"></div>').append(
						$('<span>Type </span>'), typeSelect,
						$('<span>Ticker </span>'), marketSelect,
						$('<span>Price </span>'), priceInput,
						$('<span>Amount </span>'), amountInput
					),
					$('<input type="hidden" value="" id="_byb_order_side">'),
					$(`<input type="hidden" name="csrf_token" id="csrf_token" value="${_options.csrfToken}">`),
					//amount_number_modifier.container(),
					$('<div class="_byb_order_button_bar"><div id="_byb_cart_order_status" class="_byb_cart_order_status"></div><div id="_byb_cart_order_button" class="_byb_cart_order_button">Place Order</div></div>')
				)
			);
		
			$(".order_input").on('input', function() {
				let value = $(this).val().replace(/[^0-9.]/g, '');
				const parts = value.split('.');
				if (parts.length > 2)
					value = parts[0] + '.' + parts[1];
				$(this).val(value);
			});

			$(".order_input").on('click', function() {
				if ($(this).val() == '0.0')
					$(this).val('');
			});
			$(".order_input").on('blur', function() {
				if (!$(this).val())
					$(this).val('0.0');
			});

			$("#_byb_buy").off().on('click', () => {
				if (!_user)
					return;
				$("#_byb_cart_order_overlay").hide();
				$("#_byb_buy").addClass('_byb_cart_tab_buy_on');
				$("#_byb_sell").removeClass('_byb_cart_tab_sell_on');
				$("#_byb_order_side").val("B");
			});
			$("#_byb_sell").off().on('click', () => {
				if (!_user)
					return;
				$("#_byb_cart_order_overlay").hide();
				$("#_byb_sell").addClass('_byb_cart_tab_sell_on');
				$("#_byb_buy").removeClass('_byb_cart_tab_buy_on');
				$("#_byb_order_side").val("S");
			});

			$("#_byb_cart_order_button").on('click', function() {
				if (_orderCooldown)
					return;

				if (!_user)
					return;
				
				let ticker = $("#_byb_cart_market_select").val();
				let amount = $("#_byb_cart_amount").val();
				let price = $("#_byb_cart_price").val();
				let side = $("#_byb_order_side").val();

				if (ticker == "0") {
					pageError("Select a market.");
					$("#_byb_cart_order_status").html("Select a market.");
					return false;
				}
				if (amount <= 0) {
					pageError("Invalid amount.");
					$("#_byb_cart_order_status").html("Invalid amount.");
					return false;
				}
				if (price <= 0)  {
					pageError("Invalid price.");
					$("#_byb_cart_order_status").html("Invalid price.");
					return false;
				}

				_orderCooldown = true;
				$(this).html("Wait...");
				setTimeout(()=>{
					_orderCooldown = false;
					$(this).html("Place Order");
				}, 1000);
				
				fetchData("/api/index.php?r=trade_order_create", {
					ticker:ticker,
					amount:amount,
					price:price,
					side:side
				})
				.fail(function(jqXHR, textStatus, errorThrown) {
					pageError("Error placing order, see F12");
					console.log(jqXHR + ':' + textStatus + ':' + errorThrown);
				})
				.done(function(data) {
					if (data.id) {
						// Order was not instantly filled.
						pageOkay("Order placed. " + (data.extra ? data.extra : ""));
						$("#_byb_cart_order_status").html("Order placed.");
						_wallet.load();
						_orderHistoryGrid.load();
						_tradeMonitor.updateBook(
							data.ticker, data.amount, 
							data.price, data.side);
					} else if (Object.keys(data).length == 1) {
						// Order was instantly filled.
						if (data.error) {
							pageError(data.error);
							$("#_byb_cart_order_status").html("Error filling order.");
							return;
						}
						pageOkay("Order filled.");
						_wallet.load();
						// This is now handled by datastream_v3
						//_tradeMonitor.updateFill(data);
						_orderHistoryGrid.load();
					} else {
						console.log("All kinds of what.");
					}
				}); 
			});
		},

		createOrderHistory() {
			_orderHistory = $("#"+_options.orderHistoryId);
			var columns = [
				{key:'id',label:'Actions',width:'25px',searchable:false,formatter:this.buttonFormatter},
				{key:'created_at',label:'Date',width:'150px',searchable:false},
				{key:'status',label:'Status',width:'90px',searchOptions:{'':'','O':'Open','X':'Canceled','F':'Filled'},formatter:this.statusFormatter},
				{key:'ticker',label:'Ticker',width:'75px',searchOptions:{'':'','ANDTHEN':'ANDTHEN','FORIS4':'FORIS4','SPARK':'SPARK','ZILBIAN':'ZILBIAN'}},
				{key:'side',label:'Side',width:'50px',searchOptions:{'':'','B':'Buy','S':'Sell'},formatter:this.sideFormatter},
				{key:'amount',label:'Amount',width:'70px',align:'right',searchType:'>'},
				{key:'price',label:'Price',width:'70px',align:'right',searchType:'>',formatter:this.moneyFormatter},
				{key:'total',label:'Total',width:'75px',align:'center',searchable:false,formatter:this.moneyFormatter}
			];
				
			_orderHistoryGrid = new BybGrid({
				containerId:_options.orderHistoryId,
				loadingClass:'_byb_dialog_loading',
				dataUrl:'/api/index.php?r=data_trade_order',
				columns:columns,
				autoColumnWidth:true,
				layoutType:'table',
				sortOrder:'desc',
				sortKey:'created_at',
				searchBar:true,
				pager:true,
				pagerPosition:'top',
				pagerStretch:true,
				rowCount:15,
				height:'auto',
				headerFontSize:'13px',
				dataFontSize:'11px'
			});
			_orderHistoryGrid.init();
			_orderHistory.prepend('<div class="_byb_orders_header">My Order History</div>');
			_orderHistoryGrid.load();
						
		},
		
		createLeaderBoard() {
			_leaderBoard = $("#"+_options.leaderboardId);
			var columns = [
				{key:'display_name',label:'User',width:'125px'},
				{key:'value',label:'Value (BYBS)',width:'125px',searchType:'>',formatter:this.moneyFormatter},
			];

			_leaderBoardGrid = new BybGrid({
				containerId:_options.leaderboardId,
				loadingClass:'_byb_dialog_loading',
				dataUrl:'/api/index.php?r=data_trade_leaderboard',
				columns:columns,
				autoColumnWidth:true,
				sortOrder:'desc',
				sortKey:'value',
				layoutType:'table',
				searchBar:true,
				pager:false,
				rowCount:100,
				height:'auto',
				headerFontSize:'13px',
				dataFontSize:'11px'
			});
			_leaderBoardGrid.init();
			_leaderBoardGrid.load();
			_leaderBoard.prepend($('<div class="_byb_leaderboard_header"><span>Leaderboard</span></div>'));
		},

		reloadCart() {
			_cart.empty();
			this.createCart();
		},

		reloadLeaderBoard() {
			_leaderBoard.empty();
			this.createLeaderBoard();
		},

		reloadOrderHistory() {
			_orderHistory.empty();
			this.createOrderHistory();
		},

		_cancelOrder(orderId) {
			fetchData("/api/index.php?r=trade_order_cancel", {
				order_id:orderId,
			})
			.fail(function(jqXHR, textStatus, errorThrown) {
				pageError("Error canceling order, see F12");
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
			})
			.done(function(data) {
				if (data.success) {
					pageOkay(data.message);
					$("#_byb_cart_order_status").html(data.message);
					_wallet.load();
					_orderHistoryGrid.load();
					_tradeMonitor.updateBook(
						data.ticker, -data.amount, 
						data.price, data.side); 
				} else if (data.error) {
					pageError(data.error);
					$("#_byb_cart_order_status").html(data.error);
				}
				else {
					console.log("All kinds of what.");
				}
			}); 
		},

		statusFormatter: (row, val) => { 
			if (val == 'F')
				return 'filled';
			if (val == 'O')
				return 'open';
			if (val == 'X')
				return 'canceled';
			return 'unknown';
		},

		moneyFormatter: (row, val) => { return '$' + parseFloat(val).toFixed(4).replace(/0+$/,'0');},

		buttonFormatter: (row, val) => {
			// TODO - see bybgrid wrappingObject
			// replace _trade with the wrappingObject formatter
			if (row.status == 'O')
				return `<a href="#/" onClick="_trade._cancelOrder(${row.id});" class="order_cancel">Cancel</a>`;
			return val;
		},

		sideFormatter: function(row, val) {
			if (val == 'B')
				return 'Buy';
			if (val == 'S')
				return 'Sell';
			return 'Cancel';
		},

		destroy() {
			_cart.empty();
			_leaderBoard.empty();
			_container.empty();
			_tradeMonitor.stop();
		}
	};
}


