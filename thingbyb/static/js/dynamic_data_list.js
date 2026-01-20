
export function ByBDynamicDataList(options) {

	let _amountFormatter = (amount, row) => { 
		return parseFloat(amount).toFixed(4).replace(/0+$/,'0');
	};
	let _priceFormatter = (price, row) => { 
		return '$' + parseFloat(price).toFixed(4).replace(/0+$/,'0');
	};

	let _options = {
		container: null,
		header: '',
		colorClass: '',
		capacity: 50,
		// dynamic:
		// Elements added to the top and popped from bottom
		// in the GUI, uses the update method.
		//
		// static:
		// Keeps a list of capacity elements, keeping the values
		// up to date using thee fill method.
		type:'dynamic',
		scrollToBottom:true,
		columns: [
			{key:'amount', label:'Amount', formatter:_amountFormatter},
			{key:'price', label:'Price', formatter:_priceFormatter},
		],
		...options
	};

	const _clHeader            = '_byb_orders_header _byb_top_rad_5';
	const _clGrid              = '_byb_ddl_grid';
	const _clGridHeader        = '_byb_ddl_header_cell';
	const _clGridCell          = '_byb_ddl_data_cell';
	const _clGridScroll        = '_byb_ddl_scrollbar';
	let _cells = [];
	let _numCells            = 0;
	let _columnsLength       = 0;
	let _visibleColumnLength = 0;
	let _lastHeaderElem      = null;
	let _firstLoad           = true;
	let _grid;
	let _id;

	return {
		init: function() {
			if (!_options.container) {
				console.log("ByBDynamicDataList expects a jQuery element");
				return;
			}

			_columnsLength = _options.columns.length;
			for (const col of _options.columns)
				if  (!col.hidden) 
					_visibleColumnLength++;
			
			_id = 'ddlid' + Date.now().toString() + (Math.floor(Math.random() * 1000001) + 1); // bug^^
			_grid = $(`<div id="${_id}" class="${_clGrid} ${_options.colorClass} ${_clGridScroll}"></div>`);
			_grid.css('grid-template-columns', `repeat(${_visibleColumnLength}, 1fr)`);
			_options.container.append(`<div class="${_clHeader}">${_options.header}</div>`, _grid);
			this.createHeader();
			if (_options.type == 'static')
				this.createList();
		},

		createHeader: function() {
			for (const col of _options.columns) {
				if (!col.hidden)
					_grid.append(`<div class="${_clGridHeader}">${col.label}</div>`);
			}
			_lastHeaderElem = _grid.find(`div:nth-child(${_visibleColumnLength})`);
		},

		createList: function() {
			for (let i = 0; i < _options.capacity; i++) {
				for (const col of _options.columns) {
					if (col.hidden)
						continue;
					let el = document.createElement('div');
					el.classList.add(_clGridCell);
					_grid.append(el);
					_cells.push(el);

				}
			}
			_numCells = _cells.length;
		},

		fill: function(rows, clear = false) {
			if (_options.type != 'static') {
				console.log("ByBDynamicDataList.fill() requires 'static' list type.");
				return;
			}
			let i = 0;
			for (const row of rows) {
				for (const col of _options.columns) {
					if (col.hidden)
						continue;
					let val = col.formatter ? col.formatter(row[col.key], row) : row[col.key];
					_cells[i++].innerHTML = val;
				}
				if (i >= _numCells)
					break;
			}
			
			if (_firstLoad && _options.scrollToBottom) {
				_grid[0].scrollTop = _grid[0].scrollHeight;
				_firstLoad = false;
			}
		},

		update: function(rows, maxRows = 0) {
			if (_options.type != 'dynamic') {
				console.log("ByBDynamicDataList.update() requires 'dynamic' list type.");
				return;
			}
			for (const row of rows) {
				for (let i = _columnsLength - 1; i >= 0; i--) {
					const col = _options.columns[i];
					if (col.hidden)
						continue;

					let val = col.formatter ? col.formatter(row[col.key], row) : row[col.key];
					_lastHeaderElem.after(`<div class="${_clGridCell}">${val}</div>`);
				}
			}
		   
			if (maxRows)
				_grid.children().slice(maxRows*_visibleColumnLength).remove();
		
			if (_firstLoad && _options.scrollToBottom) {
				_grid[0].scrollTop = _grid[0].scrollHeight;
				_firstLoad = false;
			}
		}
	};
}

