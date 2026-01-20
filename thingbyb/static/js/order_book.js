import { ByBDynamicDataList } from './dynamic_data_list.js?7';
import { ByBLeakyList } from './leaky_list.js?7';
import { ByBBinaryTree } from './binary_tree.js?7';

export function ByBOrderBook(options) {
	let _options = {
		containerId:'',
		dataURL:'',
		numBuckets:30,
		...options
	};

	const _clBook           = '_byb_trade_panel_book';
	const _clLoadingOverlay = '_byb_trade_loading_overlay';
	const _clLoadingText    = '_byb_trade_panel_book_overlay';
	let _container = null;

	let _overlay   = null;
	let _buyList   = null;
	let _sellList  = null;
	let _lastPrice = null;
	let _llBuy, _llSell;
	let _buyOrders, _sellOrders;

	let _nonSimulatedBuys = [];
	let _nonSimulatedSells = [];
	let _this;

	let _loaded = false;

	return {
		init: function() {
			_overlay = $(`<div id="${_options.containerId}_loading" class="${_clLoadingOverlay} ${_clLoadingText}"></div>`);
			_container = $(`<div id="${_options.containerId}" class="${_clBook}"></div>`);
			_container.append(_overlay);
			_sellList = new ByBDynamicDataList({
				container:_container,
				header:'Sell Orders',
				type:'static',
				capacity:_options.numBuckets,
				colorClass:'_byb_ddl_sell',
			});
			_buyList = new ByBDynamicDataList({
				container:_container,
				header:'Buy Orders',
				type:'static',
				capacity:_options.numBuckets,
				colorClass:'_byb_ddl_buy',
				scrollToBottom:false,
			});
			_sellList.init();
			_buyList.init();
			_llBuy = new ByBLeakyList(_options.numBuckets);
			_llSell = new ByBLeakyList(_options.numBuckets);
			_this = this;
			_buyOrders = new ByBBinaryTree();
			_sellOrders = new ByBBinaryTree();
		},

		container: function() { return _container; },
		
		createBuckets: function(price) {
			const quotient = price*0.75 / _options.numBuckets;
			let bPrice = price;
			let sPrice = price;
			for (let i = 0; i < _options.numBuckets; i++) {
				_llBuy.insert(0, bPrice);
				_llSell.insert(0, sPrice);
				bPrice -= quotient;
				sPrice += quotient;
			}
		},

		resetBuckets: function() {
			_llSell.reset();
			_llBuy.reset();
		},

		updateBuckets: function(newPrice) {
			if (!_loaded)
				return;
			this.createBuckets(newPrice);
			this.pushDataToUI();
		},

		addOrders: function(buyData, sellData, simulated = true) {
			if (simulated && !_loaded)
				return false;
			this.addSellOrders(sellData, simulated);
			this.addBuyOrders(buyData, simulated);
			return true;
		},

		addSellOrders: function(data, simulated = true) {
			if (simulated && !_loaded)
				return false;
			for (const pair of data) {
				if (pair.amount == 0)
					continue;
				_sellOrders.insert(parseFloat(pair.price), parseFloat(pair.amount));
			}
			return true;
		},
		// SIMULATED means not from ajax load. TODO
		addBuyOrders: function(data, simulated = true) {
			if (simulated && !_loaded)
				return false;
			for (const pair of data) {
				if (pair.amount == 0)
					continue;
				_buyOrders.insert(parseFloat(pair.price), parseFloat(pair.amount));
			}
			return true;
		},
		
		insertBuyFn: function(price, amount) {
			_llBuy.updateAfter(price, amount);
		},

		insertSellFn: function(price, amount) {
			_llSell.updateBefore(price, amount);
		},

		pushDataToUI: function() {
			this.resetBuckets();
			_buyOrders.inOrder(this.insertBuyFn);
			_sellOrders.inOrder(this.insertSellFn);
			this.pushBuyDataToUI();
			this.pushSellDataToUI();
		},

		pushBuyDataToUI: function(){
			let orderData = [];
			let iter = _llBuy.reverseIterator();
			for (const node of iter) {
				orderData.push({'amount':node._data, 'price':node._key});
			}
			_buyList.fill(orderData, true);
		},

		pushSellDataToUI: function() {
			let orderData = [];
			let iter = _llSell.iterator();
			for (const node of iter) {
				if (node._data == null)
					break;
				orderData.push({'amount':node._data, 'price':node._key});
			}
			_sellList.fill(orderData, true);
		},

		isLoaded: function() {
			return _loaded;
		},

		load: function(currentPrice) {
			// Initial load only.
			_lastPrice = parseFloat(currentPrice);
			this.createBuckets(_lastPrice);
			if (!_options.dataURL) {
				console.log("Missing dataURL.");
				return;
			}

			fetchData(
				_options.dataURL+"&current_price="+_lastPrice, 
				{}, 
				{dataType:'json',method:'GET'})
				.done(function(data) {
					_this.addOrders(data.buy, data.sell, false);
					_this.pushDataToUI();
					_overlay.hide();
					_loaded = true;
				});
		},
	};
}

