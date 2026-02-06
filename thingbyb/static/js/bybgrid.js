/*
- jQuery no longer used as of 5/13/2025
@author Brian Stull
@date   April 18, 2025
*/

var _BybGridUsage = (reqParam) => { return `
Hello, you are missing a required option: ${reqParam}.
Try this:
	BybGrid({
		containerId:"divId",
		dataUrl:"/getmydata.php",
		columns:[
			{key:'name',label:'Column Name'},
			{key:'amount',label:'Amount $'}
		]
	});
`};
var _BybGridSubgridUsage = () => { return `
Hello, invalid subgrid use.
Try this:
	BybGrid({
		parentContainerId:"parentGridContainerId",
		parentRowId:dataIdOfParentRow,
		dataUrl:"/getmoredata.php",
		columns:[
			{key:'name',label:'Column Name'},
			{key:'description',label:'Description'}
		]
	});
`};
var _BybGridAlert = "See console! ( Press F12 or Ctrl + Shift + i )";
function BybGrid(options) {
	let _options = {
		containerId:'',
		dataUrl:'',
		columns:null,
		columnOrder:null,
		// TODO  - fix true option, it extends the containing div to far to the right
		autoColumnWidth:false,
		height:'auto',
		buttonColumnWidth:'',
		subGrid:0,
		sortKey:null,
		sortOrder:'desc',
		mode:'remote',
		pager:true,
		pagerPosition:'bottom',
		page:1,
		pagerOrientation:'horizontal',
		pagerStretch:false,
		rowCount:15,
		loadingClass:'_byb_dialog_loading',
		scrollbarClass:'_byb_grid_scrollbar',
		resizeVertical:false,
		dataFontSize:'13px',
		headerFontSize:'16px',
		eventOnReady:null,
		gridShadow:false,
		hPagerOverlap:false,
		layoutType:'grid',
		enableRefreshButton:true,
		...options
	};
	let _columnsLength  = _options.columns.length;
	let _container      = null;
	let _innerContainer = null;
	let _dataGrid       = null;
	let _rowCountInput  = null;
	let _pagerElem      = null;
	let _pagerIndexElem = null;
	let _selectedPagerIndexElem = null;
	const _clGHeaderCell    = '_byb_grid_header_cell';
	const _clGDataRow       = '_byb_grid_data_row';
	const _clGPager         = '_byb_grid_pager';
	const _clGData          = '_byb_grid_data';
	const _clGDataCell      = '_byb_grid_data_cell';
	const _clGDataNone      = '_byb_grid_data_empty';
	const _clGSearchCell    = '_byb_grid_search_cell';
	const _clGSearchField   = '_byb_grid_search_field';
	const _clGSearchOverlay = '_byb_grid_search_overlay';
	const _clGridPagerDir   = '_byb_grid_pager_direction';
	const _clGridPagerIcon  = '_byb_grid_pager_icon';
	const _clGridPagerIdxC  = '_byb_grid_pager_index_cell';

	const _clTData       = '_byb_table_data';
	const _clTHeaderRow  = '_byb_table_header_row';
	const _clTHeaderCell = '_byb_table_header_cell';
	const _clTSearchCell = '_byb_table_search_cell';
	const _clTDataCell   = '_byb_table_data_cell';

	let _innerContainerId = '';
	let _sortedColumnId   = '';
	let _resizingVertical = false;
	let _resizeMouseY     = 0;
	let _resizeOldHeight  = 0;
	let _id;
	let _this;
	//  TODO this will be used to allow formatters to call
	//  functions from the objects that the grid is declared in.
	let _wrappingObject = null;
	return {
		data: null,

		init: function() {
			
			//!!! The data grid is created in a child div of the user defined div.
			//!!! That childs ID is _options.containerId + '_inner'

			_id = 'gid' + Date.now().toString() + (Math.floor(Math.random() * 1000001) + 1); // bug^^
			
			if (_options.parentContainerId) {
				_options.parentContainerId += '_inner';
				if (!_options.parentRowId || !document.getElementById(_options.parentContainerId)) {
					console.log(_BybGridSubgridUsage());
					alert(_BybGridAlert);
					return;
				}
				_options.containerId = 
					_options.parentContainerId+'_byb_sg_'+_options.parentRowId;
				console.log(_options.containerId);
			}
			
			_container = document.getElementById(_options.containerId);
			_container.classList.add('_byb_grid_container');
			_container.replaceChildren();
			
			_innerContainerId = _options.containerId + '_inner';
			_innerContainer = document.createElement('div');
			_innerContainer.id = _innerContainerId;
			_innerContainer.style.fontSize = _options.dataFontSize;

			_container.appendChild(_innerContainer);
			
			if (!_options.sortKey)
				_options.sortKey = _options.columns[0].key;
			this.setSortedColumn();
			_options.sortOrder = _options.sortOrder.toLowerCase();

			this.createDom();

			_this = this;

			if (_options.eventOnReady)
				_options.eventOnReady();
		},

		setSortedColumn: function() {
			_sortedColumnId = _innerContainerId + this.getColumnId(_options.sortKey).toString();
		},

		getColumnId: function(key) {
			for (let i = 0; i < _columnsLength; i++)
				if (_options.columns[i].key === key)
					return i;
			return -1;
		},

		createDom: function() {
			let requiredOptions = ['containerId','dataUrl','columns'];
			for (reqOpt of requiredOptions) {
				if (!_options[reqOpt]) {
					console.log(_BybGridUsage(reqOpt));
					alert(_BybGrid_alert);
					return;
				}
			}
			
			if (!_container) {
				console.log("Invalid div id.");
				return;
			}

			_innerContainer.classList.add("_byb_grid");
			if (_options.gridShadow)
				_innerContainer.classList.add('_byb_grid_shadow');
			if (_options.scrollbarClass)
				_innerContainer.classList.add(_options.scrollbarClass);
			if (_innerContainerId.indexOf('_byb_sg_') != -1)
				_innerContainer.classList.add('_byb_subgrid_inner');

			_innerContainer.style.height = _options.height

			// Create the _dataGrid DOM
			if (_options.layoutType == 'grid')
				this.createGrid();
			else
				this.createTable();
			_innerContainer.appendChild(_dataGrid);

			this.createHeader();

			if (_options.pager) 
				this.createPager();
			if (_options.resizeVertical) 
				this.createVerticalResize();
			if (_options.enableRefreshButton)
				this.createRefreshButton();
		},
		
		createRefreshButton: function() {
			let refreshElem = document.createElement('span');
			refreshElem.id = _id + '_rb';
			refreshElem.title = 'Refresh';
			refreshElem.classList.add('_byb_grid_refresh_button');
			//_innerContainer.append(refreshElem);
			_container.append(refreshElem);
			refreshElem.addEventListener('click', function(evt) {
				_this.reload();
			});
		},

		createVerticalResize: function() {
			let resizeElem = document.createElement('div');
			resizeElem.id = _id + '_rv';
			resizeElem.classList.add('_byb_grid_resize_v');
			_container.append(resizeElem);
			resizeElem.addEventListener('mousedown', function(evt) {
				_resizeMouseY = evt.pageY;
				_resizeOldHeight = _innerContainer.clientHeight;
				_resizingVertical = true;
			});
			document.addEventListener('mouseup', function() {
				if (_resizingVertical) {
					_resizingVertical = false;
					_resizeMouseY = 0;
				}
			});
			document.addEventListener('mousemove', function(evt) {
				if (_resizingVertical) {
					let delta = evt.pageY - _resizeMouseY;
					_innerContainer.style.height = (_resizeOldHeight + delta) + 'px';
				}
			});
		},

		createGrid: function() {
			_dataGrid = document.createElement('div');
			_dataGrid.classList.add(_clGData);
			let colWidths = '';
			if (_options.autoColumnWidth)
				colWidths = `${_options.buttonColumnWidth} repeat(${_columnsLength - (1^_options.subGrid) + (_options.buttonColumnWidth ? 0 : 1)}, 1fr)`;
			else
				for (column of _options.columns)
					colWidths += (column.width ?? '115px') + ' ';
			_dataGrid.style.gridTemplateColumns = colWidths;
		},

		createTable: function() {
			_dataGrid = document.createElement('table');
			_dataGrid.classList.add(_clTData);
		},

		createHeader: function() {
			if (_options.layoutType == 'grid') {
				let searchBar = this.createHeaderGridRow();
				this.createSubGrid('h');
				if (_options.searchBar) {
					_dataGrid.insertAdjacentHTML('beforeend', searchBar);
					this.createSubGrid('s');
				}
			} else {
				this.createHeaderTableRow();
			}
			this.applySearchBarEventListeners();
		},

		/**
		Crates the DOM for the grid's header and returns the HTML used to
		create the search bar if the grid has the search bar enabled.
		*/
		createHeaderGridRow: function() {
			let searchBar = '';
			let i = 0;
			//let colResizerT = document.createElement('span');
			//colResizerT.classList.add('_byb_grid_col_resizer');
			for (column of _options.columns) {
				let sortKey = column.sortable === false ? '-1' : column.key;
				let headerCol = document.createElement('div');
				//let colResizer = colResizerT.cloneNode(false);
				//colResizer.addEventListener('mousedown', this.colResizeHandler.bind(null, i));
				headerCol.id = _innerContainerId + '' + (i++);
				headerCol.classList.add(_innerContainerId, _clGHeaderCell);
				if (column.key == _options.sortKey)
					headerCol.classList.add(_innerContainerId, '_byb_grid_header_'+_options.sortOrder);
				headerCol.dataset.sortkey = sortKey;
				headerCol.style.fontSize = _options.headerFontSize;
				headerCol.textContent = column.label;
				if (_options.containerId.indexOf('_byb_sg_') !== -1)
					headerCol.style.zIndex = 2;
				headerCol.removeEventListener('click', this.headerRowClickHandler);
				headerCol.addEventListener('click', this.headerRowClickHandler);
				//headerCol.append(colResizer);
				_dataGrid.appendChild(headerCol);
				if (!_options.searchBar)
					continue;

				searchBar += `<div class="${_clGSearchCell}">`;
				if (typeof column.searchable !== 'undefined' && !column.searchable) {
					searchBar += '</div>';
					continue;
				}
						
				const searchVal = htmlEnc(column.searchType ?? '');
				if (column.hasOwnProperty('searchOptions')) {
					searchBar += `<select name="${column.key}" class="${_clGSearchField}" style="width:${parseInt(column.width) - 20}px">`;
					for (const [val, lbl] of Object.entries(column.searchOptions)) 
						searchBar += `<option value="${val}">${lbl}</option>`;
					searchBar += '</select>';
				} else {
					searchBar += `<input type="text" class="${_clGSearchField}" name="${column.key}" style="width:${parseInt(column.width) - 20}px" autocomplete="off">`;
				}
				searchBar += `<div class="${_clGSearchOverlay}">${searchVal}</div>`;
				searchBar += '</div>';
			}
			
			return searchBar;
		},

		/**
		_option.layoutType == 'table'
		Crates the DOM for the grid's header and search bar.
		*/
		createHeaderTableRow: function() {
			let searchBar = '';
			let i = 0;
			let tHead = document.createElement('thead');
			let tRow = document.createElement('tr');
			//let colResizerT = document.createElement('span');
			//colResizerT.classList.add('_byb_grid_col_resizer');
			tRow.classList.add(_clTHeaderRow);
			for (column of _options.columns) {
				let sortKey = column.sortable === false ? '-1' : column.key;
				let headerCol = document.createElement('th');
				//let colResizer = colResizerT.cloneNode(false);
				//colResizer.addEventListener('mousedown', this.colResizeHandler.bind(null, i));
				headerCol.id = _innerContainerId + '' + (i++);
				headerCol.classList.add(_innerContainerId, _clTHeaderCell);
				if (column.key == _options.sortKey)
					headerCol.classList.add(_innerContainerId, '_byb_grid_header_'+_options.sortOrder);
				headerCol.dataset.sortkey = sortKey;
				headerCol.style.fontSize = _options.headerFontSize;
				headerCol.textContent = column.label;
				if (_options.containerId.indexOf('_byb_sg_') !== -1)
					headerCol.style.zIndex = 2;
				headerCol.removeEventListener('click', this.headerRowClickHandler);
				headerCol.addEventListener('click', this.headerRowClickHandler);
				//headerCol.append(colResizer);
				tRow.appendChild(headerCol);

				if (!_options.searchBar)
					continue;

				if (searchBar == '')
					searchBar = `<tr class="${_clTHeaderRow}">`;

				searchBar += `<th class="${_clTSearchCell}">`;
				if (typeof column.searchable !== 'undefined' && !column.searchable) {
					searchBar += '</th>';
					continue;
				}

				const searchVal = htmlEnc(column.searchType ?? '');
				const cWidth = column.width ? 
					(parseInt(column.width) - 20) + 'px' :
					'auto';
				if (column.hasOwnProperty('searchOptions')) {
					searchBar += `<select name="${column.key}" class="${_clGSearchField}" style="width:${cWidth}">`;
					for (const [val, lbl] of Object.entries(column.searchOptions)) 
						searchBar += `<option value="${val}">${lbl}</option>`;
					searchBar += '</select>';
				} else {
					searchBar += `<input type="text" class="${_clGSearchField}" name="${column.key}" style="width:${cWidth}" autocomplete="off">`;
				}
				searchBar += `<div class="${_clGSearchOverlay}">${searchVal}</div>`;
				searchBar += '</th>';
			}

			tHead.appendChild(tRow);
			if (searchBar != '') {
				searchBar += '</tr>';
				tHead.insertAdjacentHTML('beforeend', searchBar);
			}
			_dataGrid.appendChild(tHead);
		},

		applySearchBarEventListeners: function(searchBar) {
			let searchOverlays = document.querySelectorAll(`.${_clGSearchOverlay}`);
			searchOverlays.forEach((el) => {
				el.removeEventListener('click', this.searchOverlayClickHandler);
				el.addEventListener('click', this.searchOverlayClickHandler);
			});
			const textInputs = _innerContainer.querySelectorAll(`.${_clGSearchField}[type="text"]`);
			const selectInputs = _innerContainer.querySelectorAll(`select.${_clGSearchField}`);
			textInputs.forEach((inp) => {
				inp.removeEventListener('keypress', this.searchFieldKeyPressHandler);
				inp.addEventListener('keypress', this.searchFieldKeyPressHandler);
			});
			selectInputs.forEach((inp) => {
				inp.removeEventListener('change', this.searchFieldChangeHandler);
				inp.addEventListener('change', this.searchFieldChangeHandler);
			});
		},

		createPager: function() {
			_pagerElem = document.getElementById(_options.pagerId);
			if (!_pagerElem) {
				_options.pagerId = _innerContainerId + _id;
				_pagerElem = document.createElement('div');
				_pagerElem.id = _options.pagerId;
				//if (_options.pagerOrientation == 'vertical') {
					// TODO - for now the user must create the DOM
					// for the vertical scrollbar placement.
				//} 
				if (_options.pagerPosition == 'top') {
					_innerContainer.prepend(_pagerElem);
				} else {
					_innerContainer.append(_pagerElem);
				}
			}

			_pagerElem.classList.add(`${_clGPager}_${_options.pagerOrientation}`);
			if (_options.pagerStretch)
				_pagerElem.style.width = '100%';

			if (_options.pagerOrientation == 'horizontal' && 
				_options.resizeVertical &&
				_options.hPagerOverlap)
				// Reduce gap between data and the pager at the bottom, which is created
				// because of vertical resize bar.
				_pagerElem.style.top = '-13px';

			// Left and up arrows
			let arrowClass = _options.pagerOrientation == 'vertical' ? '_v' : '_h';
			_pagerElem.insertAdjacentHTML('beforeend',
`<div class="${_clGridPagerIcon} _byb_grid_icon_first${arrowClass} ${_clGridPagerDir}" data-direction="first"> </div><div class="${_clGridPagerIcon} _byb_grid_icon_left${arrowClass} ${_clGridPagerDir}" data-direction="-1"> </div>`);
			// Page numbers
			this.initPagerIndex();
			// Right and down  arrows
			_pagerElem.insertAdjacentHTML('beforeend',
`<div class="${_clGridPagerIcon} _byb_grid_icon_right${arrowClass} ${_clGridPagerDir}" data-direction="1"> </div><div class="${_clGridPagerIcon} _byb_grid_icon_last${arrowClass} ${_clGridPagerDir}" data-direction="last"> </div>`);
			// Number of rows per page
			_rowCountInput = document.createElement('input');
			_rowCountInput.id = _options.pagerId + '_row_count';
			_rowCountInput.type = 'text';
			_rowCountInput.value = _options.rowCount;
			let rowCountElem = document.createElement('div');
			rowCountElem.classList.add(
				'_byb_grid_pager_row_count', 
				'_byb_grid_pager_row_count_' + _options.pagerOrientation);
			rowCountElem.append(_rowCountInput);
			_pagerElem.append(rowCountElem);
			_rowCountInput.removeEventListener('keypress', this.rowCountHandler)
			_rowCountInput.addEventListener('keypress', this.rowCountHandler)
			let elems = _pagerElem.querySelectorAll(`.${_clGridPagerIdxC}`);
			elems.forEach(el => {
				el.removeEventListener('click', this.indexCellHandler);
				el.addEventListener('click', this.indexCellHandler);
			});
			elems = _pagerElem.querySelectorAll(`.${_clGridPagerDir}`);
			elems.forEach(el => {
				el.removeEventListener('click', this.pagerDirectionHandler);
				el.addEventListener('click', this.pagerDirectionHandler);
			});
		},

		initPagerIndex: function() {
			_pagerIndexElem = document.createElement('div');
			_pagerIndexElem.id = _options.pagerId + '_pager_index';
			_pagerIndexElem.classList.add('_byb_grid_pager_index_'+_options.pagerOrientation);
			_selectedPagerIndexElem = document.createElement('div');
			_selectedPagerIndexElem.classList.add(_clGridPagerIdxC, `${_clGridPagerIdxC}_selected`);
			_selectedPagerIndexElem.dataset.pagenum = 1;
			_selectedPagerIndexElem.setAttribute('data-pagenum', 1);
			_selectedPagerIndexElem.innerHTML = '1';
			_pagerIndexElem.append(_selectedPagerIndexElem);
			for (let i = 2; i <= 11; i++)
				_pagerIndexElem.insertAdjacentHTML('beforeend',`<div class="${_clGridPagerIdxC}" data-pagenum="${i}">${i}</div>`);
			_pagerElem.append(_pagerIndexElem);
		},

		updatePagerIndex: function() {
			if (!_options.pager)
				return;
			let idx = _options.page >= 11 ? _options.page - 5 : 1;
			for (el of _pagerIndexElem.children) {
				el.classList.remove(`${_clGridPagerIdxC}_disabled`);
				if (idx*_options.rowCount - _this.numRows >= _options.rowCount) {
					el.classList.add(`${_clGridPagerIdxC}_disabled`);
					el.dataset.pagenum = 'x';
					el.setAttribute('data-pagenum','x');
				} 

				if (idx == _options.page) { 
					el.classList.add(`${_clGridPagerIdxC}_selected`);
					_selectedPagerIndexElem = el;
				}
				el.innerHTML = idx.toString();
				el.dataset.pagenum = idx;
				el.setAttribute('data-pagenum', idx);
				
				idx++;
			}
		},

		pagerAction: function(selectedIndex) {
			let newSelected = document.querySelector(`.${_clGridPagerIdxC}[data-pagenum="${selectedIndex}"]`);
			if (!(newSelected && newSelected.classList.contains(`${_clGridPagerIdxC}_disabled`))){
				if (_selectedPagerIndexElem)
					_selectedPagerIndexElem.classList.remove(`${_clGridPagerIdxC}_selected`);
				_options.page = selectedIndex;
			}
			this.load();
		},

		createSubGrid: function(id=0) {
			if (!_options.subGrid)
				return;
			let subGrid = document.createElement('div');
			subGrid.classList.add('_byb_subgrid');
			subGrid.id = _innerContainerId + '_byb_sg_' + id;
			subGrid.style.gridColumn = 'span ' + (_columnsLength + 1);
			_dataGrid.append(subGrid);
		},

		fillData: function() {
			_innerContainer.classList.remove(_options.loadingClass);

			if (_options.layoutType == 'grid')
				this.fillGrid();
			else
				this.fillTable();
		},

		fillGrid: function() {
			let n = 0;
			for (row of this.data.rows) {
				for (column of _options.columns) {
					let v = row[column.key];
					if (column.formatter)
						v = column.formatter(row, v);
					let align = column.align ?? 'left';
					_dataGrid.insertAdjacentHTML('beforeend',`<div class="${_clGDataCell} ${_clGDataRow}_${n} _byb_${align}">${v}</div>`);
				}
				this.createSubGrid(row.id);
				n ^= 1;
			}
			if (this.data.rows.length < _options.rowCount)
				_dataGrid.insertAdjacentHTML('beforeend', `<div class="${_clGDataNone}" style="grid-column: 1 / ${_columnsLength + 1}">No more data!</div>`);
			else if (_innerContainer.classList.contains('_byb_subgrid'))
				_innerContainer.classList.add('_byb_subgrid_shadow');
		},

		fillTable: function() {
			let n = 0;
			for (row of this.data.rows) {
				let tRow = document.createElement('tr');
				tRow.classList.add(`${_clGDataRow}_${n}`);
				for (column of _options.columns) {
					let v = row[column.key];
					if (column.formatter)
						v = column.formatter(row, v);
					const align = column.align ?? 'left';
					tRow.insertAdjacentHTML('beforeend',`<td class="${_clTDataCell} _byb_${align}">${v}</td>`);
				}
				_dataGrid.appendChild(tRow);
				// TODO support sub grids in table layout.
				//this.createSubGrid(row.id);
				n ^= 1;
			}
			if (this.data.rows.length < _options.rowCount)
				_dataGrid.insertAdjacentHTML('beforeend', `<tr><td colspan="${_columnsLength}" class="${_clGDataNone}">No more data!</td></tr>`);
			else if (_innerContainer.classList.contains('_byb_subgrid'))
				_innerContainer.classList.add('_byb_subgrid_shadow');
		},

		clearData: function() {
			let idx = 1;
			if (_options.layoutType == 'grid')
				idx = (_columnsLength*2) + (_options.subGrid ? 2 : 0);
			while (_dataGrid.childNodes.length > idx)
				_dataGrid.removeChild(_dataGrid.lastChild);
		},

		load: async function() {
			// TODO compare rows and update only changed rows.
			this.clearData();
			_innerContainer.classList.remove(_options.loadingClass);
			_innerContainer.classList.add(_options.loadingClass);
			try {
				const response = await fetch(this.queryURL());
				if (!response.ok) {
					_innerContainer.classList.remove(_options.loadingClass);
					throw new Error(`Grid load error: ${response.status}`);
				}
				this.data = await response.json();
				if (!this.data?.length) {
					console.log(
						"No data (grid " + _options.containerId + ")");
				} else if (Object.keys(this.data[0]).length != _columnsLength) {
					console.log(
						"_columnsLength must match dataRow.length (grid " + _options.containerId + ")");
					return;
				}
				this.numRows = this.data.numRows;
				this.fillData();
				this.updatePagerIndex();
			} catch (error) {
				console.log(`Grid fetch error: ${error}`);
			}
		},

		queryURL: function() {
			let qStart = _options.dataUrl.indexOf('?') == -1 ? '?':'&';
			const searchVal = new URLSearchParams();
			const searchKey = new URLSearchParams();
			const searchInputs = _innerContainer.querySelectorAll(`.${_clGSearchField}`);
			searchInputs.forEach((inp) => {
				if (inp.value) {
					searchKey.append('searchkey[]', inp.getAttribute('name'));
					searchVal.append('searchval[]', inp.value);
				}
			});
			return `${_options.dataUrl}${qStart}sortorder=${_options.sortOrder}&sortkey=${_options.sortKey}&${searchKey.size ? searchKey : ''}&${searchVal.size ? searchVal : ''}&page=${_options.page}&limit=${_options.rowCount}`;
				
		},

		reload: function() {
			
			_this.load();
		},

		onload: function() { return false; },

		headerRowClickHandler: function(e) {
			let sortKey = this.dataset.sortkey;
			if (sortKey == "-1")
				return false;
			_options.sortKey = sortKey;
			_options.sortOrder = _options.sortOrder == 'asc' ? 'desc' : 'asc';
			let sortedElem = document.getElementById(_sortedColumnId);
			if (sortedElem)
				sortedElem.classList.remove('_byb_grid_header_desc', '_byb_grid_header_asc');
			_this.setSortedColumn();
			this.classList.add("_byb_grid_header_" + _options.sortOrder); 
			_this.load();
		},
				
		//colResizeHandler: function(colIdx) {
		//	_resizeMouseX = event.pageX;
		//},

		searchFieldKeyPressHandler: function(e) {
			if (e.key === 'Enter') {
				if (_options.pager) {
					_options.rowCount = parseInt(_rowCountInput.value);
				}
				_this.pagerAction(1);
			}
		},

		searchFieldChangeHandler: function(e) {
			if (_options.pager) {
				_options.rowCount = parseInt(_rowCountInput.value);
			}
			_this.pagerAction(1); 
		},

		searchOverlayClickHandler: function(e) {
			this.previousElementSibling.focus();
		},

		rowCountHandler: function(e) {
			if (e.key == 'Enter') {
				_options.rowCount = parseInt(this.value);
				if (_options.rowCount <= 0) {
					_options.rowCount = 1;
					this.value = 1;
				}
				_this.load();
			}
		},

		indexCellHandler: function(e) {
			_this.pagerAction(this.dataset.pagenum);
		},

		pagerDirectionHandler: function(e) {
			const direction = this.dataset.direction;
			if (direction === 'first') {
				_this.pagerAction(1);
				return;
			} else if (direction == 'last') {
				_this.pagerAction(Math.ceil(_this.numRows / _options.rowCount));
				return;
			}
			let pageIdx = parseInt(_options.page) + parseInt(direction);
			_this.pagerAction(pageIdx < 1 ? 1 : pageIdx);
		}
	};
}
