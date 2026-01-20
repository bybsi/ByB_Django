
export function ByBLeakyList(capacity) {
	function Node(data, key=null) {
		return {
			_key:key,
			_data:data,
			_next:null,
			_prev:null
		};
	}

	let _length = 0;
	let _capacity = capacity;
	let _head = new Node(null);
	let _tail = _head;
	return {

		insert: (data, key=null) => {
			let n = new Node(data, key);
			if (_length == _capacity) {
				let tmp = _tail._prev;
				if (tmp && tmp._prev) {
					tmp._prev._next = _tail;
					_tail._prev = tmp._prev
				}
			} else
				_length++;

			n._next = _head;
			_head._prev = n;
			_head = n;
		},

		// _key is assumed not null.
		// list is assumed ordered.
		updateBefore: (key, data) => {
			let n = _head;
			while (n) {
				if (key >= n._key) {
					n._data += data;
					return;
				}
				n = n._next;
			}
		},
		
		// _key is assumed not null.
		// list is assumed ordered.
		updateAfter: (key, data) => {
			let n = _head;
			while (n) {
				if (key <= n._key) {
					n._data += data;
					return;
				}
				n = n._next;
			}
		},
		
		reset: function() {
			let iter = this.iterator();
			for (const node of iter) {
				if (node._data == null)
					break;
				node._data = 0;
			}
		},

		iteratorV2: () => { return _head; },
		iteratorV2Reverse: () => { return _tail._prev; },
		
		iterator: function*(){
			let iter = _head;
			while (iter) {
				yield iter;
				iter = iter._next;
			}
		},
		
		reverseIterator: function*(){
			let iter = _tail._prev;
			while (iter) {
				yield iter;
				iter = iter._prev;
			}
		}
	};
}

