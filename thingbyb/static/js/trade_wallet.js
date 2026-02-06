
export function ByBTradeWallet(options) {
	let _options = {
		containerId:'',
		dataURL:'',
		...options
	};

	let _clLoadingOverlay = '_byb_trade_loading_overlay';
	let _clLoadingText    = '_byb_trade_wallet_overlay';
	let _clBalances       = '_byb_trade_balances';

	let _container        = null;
	let _balanceContainer = null;

	let _overlay   = null;
	let _buyList   = null;
	let _sellList  = null;

	let _this;

	return {
		init: function() {
			_container = $(`<div id="${_options.containerId}"></div>`);
			_overlay = $(`<div class="${_clLoadingOverlay} ${_clLoadingText}"></div>`);
			_balanceContainer = $(`<div class="${_clBalances}"></div>`);
			_container.append(
				_overlay,
				$('<div class="_byb_orders_header">Balances</div>'),
				_balanceContainer
			);
			_container.append(_overlay);
			_this = this;
		},

		container: function() { return _container; },
		
		load: function(currentPrice) {
			if (!_options.dataURL)
				return;
			
			fetchData(
				_options.dataURL, 
				{}, 
				{dataType:'json',method:'GET'},
				false)
				.done(function(data) {
					_balanceContainer.empty();
					for (let [ticker, amount] of Object.entries(data)) {
						if (ticker == 'bybs')
							amount /= 1000000;
						_balanceContainer.append($(
`<div class="_byb_market_row _byb_market_row_${ticker}">
	<span class="_byb_cart_label">${ticker.toUpperCase()}</span>
	<span class="_byb_cart_money" id="balance_${ticker}">${_this.formatAmount(ticker, amount)}</span>
</div>`
						));
					}
				})
				.fail(function() {
					_balanceContainer.html(`<div class="_byb_market_row"><span class="_byb_cart_label">&nbsp;Please login to place a trade.</span></div>`);
				})
				.always(function() {
					_overlay.hide();
				});
		},
		
		formatAmount: function(ticker, amount) {
			amount = parseFloat(amount).toFixed(6).toString();
			if (ticker == 'bybs')
				amount = '$' + amount;
			return amount.padStart(15, ' ');
		},
	};
}

