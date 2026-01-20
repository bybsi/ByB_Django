import { ByBDynamicDataList } from './dynamic_data_list.js';

export function ByBFillPanel(options) {
	let _options = {
		containerId:'',
		dataURL:'',
		...options
	};

	const _clFill           = '_byb_trade_panel_fill';
	const _clLoadingOverlay = '_byb_trade_loading_overlay';
	const _clLoadingText    = '_byb_trade_panel_fill_overlay';
	let _container        = null;
	let _initialLoad      = true;

	let _maxFills  = 50;
	let _overlay   = null;
	let _fillList  = null;

	return {

		init: function() {
			let _amountFormatter = (val, row) => { 
				const side = row['side'];
				if (side == 'S')
					return `<span class="_byb_fill_${side}">${val}</span>`;
				return val;
			};
			let _priceFormatter = (val, row) => { 
				const side = row['side'];
				if (side == 'S')
					return `<span class="_byb_fill_${side}">$${parseFloat(val).toFixed(4)}</span>`;
				return "$"+parseFloat(val).toFixed(4);
			};
			let _timeFormatter = (val, row) => { 
				const side = row['side'];
				if (side == 'S')
					return `<span class="_byb_fill_${side}">${val}</span>`;
				return val;
			};
			
			_overlay = $(`<div id="${_options.containerId}_loading" class="${_clLoadingOverlay} ${_clLoadingText}"></div>`);
			_container = $(`<div id="${_options.containerId}" class="${_clFill}"></div>`);
			_container.append(_overlay);
			_fillList = new ByBDynamicDataList({
				container:_container, 
				header:'Fill History',
				scrollToBottom:false,
				colorClass:'_byb_ddl_fill',
				columns: [ 
					{key:'amount', label:'Amount', formatter:_amountFormatter},
					{key:'price', label:'Price', formatter:_priceFormatter},
					{key:'filled_at', label:'Time', formatter:_timeFormatter},
					{key:'side', hidden:true},
				]
			});
			_fillList.init();
		},

		container: function() { return _container; },

		update: function(fillData) {
			if (_initialLoad)
				_overlay.hide();

			let rows = [];
			let reloadWallet = false;
			for (const fill of fillData) {
				let fillArr = fill.split('|');
				rows.push({
					'side':fillArr[1],
					'amount':fillArr[2],
					'price':fillArr[3],
					'filled_at':fillArr[4]
				});
				if (_user && _rand_id && _rand_id == fillArr[0])
					reloadWallet = true;
			}
			_fillList.update(rows, _maxFills);
			let wallet = _options.tradeContext.getWallet();
			if (!_initialLoad && reloadWallet && wallet) {
				wallet.load();
			}
			_initialLoad = false;
		},
		
		load: function(currentPrice) {
			// No longer pre-loading, datastream_v3
			// takes care of this now.
			return;


			if (!_options.dataURL) {
				console.log("Missing dataURL.");
				return;
			}
			fetchData(
				_options.dataURL, 
				{}, 
				{dataType:'json',method:'GET'})
				.done(function(data) {
					_fillList.update(data.data);
					_overlay.hide();
				});
		}
	};
}
