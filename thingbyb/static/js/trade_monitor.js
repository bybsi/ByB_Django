
export function ByBSVGTradeMonitor(options) {
	let _options = {
		// SSE data stream.
		monitorURL:'',
		...options
	};

	let _sse;
	// Currently updated in the order added
	// and the order data is received which is
	// comma separated.
	let _charts = [];

	// TODO rework to object;
	let _books  = [];
	//let _bookIdentities = ["ANDTHEN", "FORIS4", "SPARK", "ZILBIAN"];
	let _bookIdentities = [];

	let _fills = {};

	let _initialLoad = true;


	return {
		init: function() {
			if (!_options.monitorURL) {
				console.log("Missing monitorURL.");
			}
		},

		addChart: function(bybSvgChart) {
			_charts.push(bybSvgChart);
		},

		addBook: function(bybOrderBook, ticker) {
			/* TODO rework this to an object */
			_books.push(bybOrderBook);
			_bookIdentities.push(ticker);
		},

		updateBook: function(ticker, amount, price, side) {
			const book = _books[_bookIdentities.indexOf(ticker)];
			let added = false;
			if (side == 'B') {
				added = book.addBuyOrders([{'amount':amount,'price':price}], false);
			} else if (side == 'S') {
				added = book.addSellOrders([{'amount':amount,'price':price}], false);
			}
			if (added)
				book.pushDataToUI();
		},

		addFill: function(bybFillPanel, ticker) {
			_fills[ticker] = bybFillPanel;
		},

		updateFill: function(fills) {
			// "SPARK":["1|S|2|5|0:0:0"],"ZILBIAN":[2|"B|3|100|12:12:12"]}
			for (const ticker in fills)
			   _fills[ticker].update(fills[ticker]);
		},

		monitor: function() {
			if (_charts.length != 4){
				console.log("There should be four charts.");
				return;
			}

			_sse = new EventSource(_options.monitorURL);
			_sse.addEventListener("Y", this.sseY.bind(this), {passive:true});
			_sse.addEventListener("BI", this.sseBI, {passive:true});
			_sse.addEventListener("F", this.sseF, {passive:true});
			_sse.addEventListener("BU", this.sseBU, {passive:true});
		},

		sseY: function(event) {
			// Chart events
			// Y = [Y]andle data. (Yaxis data)
			let newPoints = event.data.split(',');
			this.processY(newPoints, 0);
		},

		processY: function(newPoints, i) {
			// This could result in longer (200/300 ms run times)
			// probably due to updating the chart.
			// So it's split into a more "asynchronous" implementation
			// allowing processY to end quckly.
			setTimeout(() => {
				let chart = _charts[i];
				// price:candle_state -- candle_state kind of unused
				//	now, or will be, TODO remove candle states.
				let [newPrice, flag] = newPoints[i].split(':');
				newPrice = parseFloat(newPrice);
				chart.updateData(newPrice, flag);
				_books[i].updateBuckets(newPrice);
				if (i < newPoints.length - 1)
					this.processY(newPoints, i+1);
			}, 0);
		},

		sseBI: (event) => {
			// Book events
			// BI = Book Initial price
			if (_initialLoad) {
				let currentPrices = event.data.split(',');
				for (let i = 0; i < currentPrices.length; i++) {
					let book = _books[i];
					book.load(currentPrices[i].substring(0, currentPrices[i].indexOf(':')));
				}
			}
		},
		
		sseF: (event) => {
				// Fill events
				// F = fill data
				// uid|side|amount_price|timestamp
				//  "SPARK":["1|S|2|5|0:0:0"],"ZILBIAN":["2|B|3|100|12:12:12"]}
				if (event.data.length <3)
					return;
				let fills = JSON.parse(event.data);
				for (const ticker in fills)
					_fills[ticker].update(fills[ticker]);
		},

		sseBU: (event) => {
			// Book update
			// BU = Book Update
			// {"ANDTHEN":[[2,0.900118,5,2.178285],[2,0.898622,5,2.174665]],"FORIS4":[[2,42.357895,0,56.298466]],"SPARK":[[3,14116.656250,3,42349.968750],[3,14110.604492,3,42331.812500],[3,14104.551758,3,42313.656250],[3,14098.499023,3,42295.500000],[3,14092.447266,3,42277.339844],[3,14086.394531,3,42259.183594]],"ZILBIAN":[[2,1.795428,5,1.905352],[2,1.791474,5,1.901156],[2,1.787520,5,1.896960],[4,1.863420,5,3.105700]]}
			// [ buy amount, buy price, sell amount, sell price ] 
			if (event.data.length <3) // {}
				return;
			let orders = JSON.parse(event.data);
			for (const [idx, ticker] of _bookIdentities.entries()) {
				let book = _books[idx];
				let buys  = [];
				let sells = [];
				for (const order of orders[ticker]) {
					buys.push({'amount':order[0], 'price':order[1]});
					sells.push({'amount':order[2], 'price':order[3]});
				}
				if (book.addOrders(buys, sells)) {
					book.pushDataToUI();
				}
			}
		},
		
		stop: function() {
			console.log("Disconnection EventStream");
			_sse.close();
		}
	};
}

