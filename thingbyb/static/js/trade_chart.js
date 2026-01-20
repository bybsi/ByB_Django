
export function ByBSVGChart(options) {
	let _options = {
		containerId: '',
		dataURL: '',
		title: '',
		initial_datapoints: 120,
		...options
	};

	const OPEN  = 1;
	const CLOSE = 2;
	const HIGH  = 4;
	const LOW   = 8;
	const CANDLE_INTERVAL = 900000; // 15 minutes
	
	const _clChart          = '_byb_trade_panel_chart';
	const _clLoadingOverlay = '_byb_trade_loading_overlay';

	let _data             = null;
	let _currentCandleIdx = 95;
	let _currentTime      = 0;
	let _lastPrice        = 0.0;
	let _loaded           = false;
	
	let _container;
	let _chart;
	let _layout;
	let _priceLabel       = null;
	let _range_start_idx;
	let _this;
	return {
		
		init: function() {
			_container = $(`<div id="${_options.containerId}" class="${_clChart}"></div>`);
			_container.append($(`<div id="${_options.containerId}_loading" class="${_clLoadingOverlay}">Loading...</div>`));
			_this = this;
		},

		render: function() {
			if (!_data) {
				console.log("No data found for chart render.");
				return;
			}
			
			
			let trace = {
				x: _data.x,
				open: _data.open,
				close: _data.close,
				high: _data.high,
				low: _data.low,
				line: {
					width:1
				},
				decreasing: {line: {color: '#0089bb'}},
				increasing: {line: {color: '#036400'}},
				type: 'candlestick',
				xaxis: 'x',
				yaxis: 'y',
			};

			_range_start_idx = Math.max(0, _data.x.length - _options.initial_datapoints);
			
			_layout = {
				datarevision:0,
				title: {
					text:_options.title,
					font: {
						family: 'Helvetica, Arial, sans-serif',
						weight:900,
						size:14,
						color:'#0167a5'
					},
					x:0.015,
					y:0.99,
					yanchor:'top',
					xanchor:'left',
				},
				dragmode:'pan', //'zoom'
				margin:{
					r:10, t:25, b:40, l:60
				},
				showlegend: false,
				xaxis:{
					//autorange:true,
					dtick:900000,
					ticklabelstep:8,
					tickformat:'%d %H:%M',
					showgrid:false,
					range:[_data.x[_range_start_idx], _data.x[_data.x.length - 1]],
					rangeslider: {
						//visible: false
					},
					title: {
					  text: ''
					},
					type: 'date',
					tickfont: {
						color:'#0167a5'
					},
					tickangle: -45
				},
				yaxis: {
					autorange: true,
					type: 'linear',
					showgrid:false,
					tickformat: '$.1f',
					tickfont: {
						color:'#0167a5'
					}
				},
				plot_bgcolor:'rgba(4,10,17,0.0)',
				paper_bgcolor:'rgba(4,10,17,0.85)',
			};

		
			_currentCandleIdx = _data.x.length - 1;
			_currentTime = _data.x[_currentCandleIdx];
			Plotly.newPlot(_options.containerId, [trace], _layout);
			
			_container.append(`<div class="_byb_chart_overlay"><span>10s update <br><span>15m candle</span></span> <span id="${_options.containerId}_byb_chart_price" class="_byb_chart_price">$${_data.close[_data.close.length -1]} -</span></div>`);
			_priceLabel = $(`#${_options.containerId}_byb_chart_price`);
			_loaded = true;
		},
  
		load: function() {
			if (!_options.dataURL) {
				console.log("Missing dataURL.");
				return;
			}
			//x,open,close,low,high
			fetchData(_options.dataURL, {}, {dataType:'json',method:'GET'})
				.done(function(data) {
					_data = data;
					_this.render();
					$("#"+_options.containerId+"_loading").hide();
				});
		},

		container: () => {return _container;},
		chart: () => {return _chart;},
		title: () => {return _options.title;},

		updatePrice: function(newPrice) {
			if (_priceLabel) {
				if (newPrice >= _lastPrice) {
					_priceLabel.css('color', '#388435');
					_priceLabel.html('$' + newPrice.toFixed(4) + ' &#x25B4');
				} else {
					_priceLabel.css('color', '#b30040');
					_priceLabel.html('$' + newPrice.toFixed(4) + ' &#x25BE');
				}
			}
			_lastPrice = newPrice;
		},

		newCandle: function(newPrice) {
			const chart = document.getElementById(_options.containerId);
			_currentTime += CANDLE_INTERVAL;
			_range_start_idx += 1;
			let newCandle = {
				x: [[_currentTime]],
				open: [[newPrice]],
				close: [[newPrice]],
				high: [[newPrice]],
				low: [[newPrice]]
			};
			const rangeUpdate = {
				xaxis: {
					range: [chart.data[0].x[_range_start_idx], _currentTime]
				}
			};
			Plotly.extendTraces(_options.containerId, newCandle, [0]);
			Plotly.relayout(_options.containerId, rangeUpdate);
			_currentCandleIdx++;
		},

		updateCandle: function(newPrice, flag) {
			const chart = document.getElementById(_options.containerId);
			if (!chart || !chart.data)
				return;

			let currentCandles = chart.data[0];
			let update = {
				x: [[currentCandles.x[_currentCandleIdx]]],
				close: [[currentCandles.close[_currentCandleIdx]]],
				open: [[currentCandles.open[_currentCandleIdx]]],
				low: [[currentCandles.low[_currentCandleIdx]]],
				high: [[currentCandles.high[_currentCandleIdx]]]
			};
			// open 1, close 2, high 4, low 8
			if (newPrice != currentCandles.close[_currentCandleIdx])
			{
				currentCandles.close[_currentCandleIdx] = newPrice;
				update.close = [[newPrice]];
			}
			if (newPrice > currentCandles.high[_currentCandleIdx]) {
				currentCandles.high[_currentCandleIdx] = newPrice;
				update.high = [[newPrice]];
			}
			if (newPrice < currentCandles.low[_currentCandleIdx]) {
				currentCandles.low[_currentCandleIdx] = newPrice;
				update.low = [[newPrice]];
			}
			Plotly.restyle(chart, 'data', update, [0]);
		},

		updateData: function(newPrice, flag) {
			// flag 
			// open 1, close 2, high 4, low 8
			this.updatePrice(newPrice);
			if (!_loaded)
				return;
			if (flag & OPEN)
				this.newCandle(newPrice);
			else
				this.updateCandle(newPrice, flag);
		}
	};
}

