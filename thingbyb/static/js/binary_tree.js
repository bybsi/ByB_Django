

export function ByBBinaryTree() {
	function Node(key, data) {
		return {
			_key:key,
			_data:data,
			_left:null,
			_right:null
		};
	}

	function insertHelper(root, key, data) {
		if (key < root._key)
		{
			if (!root._left)
				root._left = new Node(key, data);
			else
				insertHelper(root._left, key, data);
		} else if (key > root._key) {
			if (!root._right)
				root._right = new Node(key, data);
			else
				insertHelper(root._right, key, data);
		} else {
			// Specialized tree. Update the node.
			// We could use a function pointer to make things
			// more generic but that's not needed right now.
			// Using +/- numbers will add or subtract from the data.
			root._data += data;
		}
	}
	
	function inOrder(root) {
		if (!_visitFunction) {
			console.error("BST: A node _visitFunction has not been provided");
			return;
		}

		let st = [];
		let currentNode = root;
		while (st.length > 0 || currentNode) {
			while (currentNode) {
				st.push(currentNode);
				currentNode = currentNode._left;
			}

			currentNode = st.pop();
			_visitFunction(currentNode._key, currentNode._data);
			currentNode = currentNode._right;
		}
	}

	function deleteGT(root, key) {
		if (!root)
			return null;

		if (root._key > key)
			return deleteGT(root._left, key);
		root._right = deleteGT(root._right, key)
		return root;
	}
	
	function deleteLT(root, key) {
		if (!root)
			return null;

		if (root._key < key)
			return deleteLT(root._right, key);
		root._left = deleteLT(root._left, key)
		return root;
	}
	
	let _root = null;
	let _visitFunction = null;

	return {
		insert: (key, data) => {
			if (!_root) {
				_root = new Node(key, data);
				return;
			}
			insertHelper(_root, key, data);
		},

		inOrderPrint: function() {
			_visitFunction = this.log;
			inorder(_root);
			_visitFunction = null;
		},

		inOrder: function(fn) {
			this.setVisitFunction(fn);
			inOrder(_root);
		},

		setVisitFunction: function(fn) {
			_visitFunction = fn;
		},

		deleteGreaterThan: (key) => {
			_root = deleteGT(_root, key);
		},

		deleteLessThan: (key) => {
			_root = deleteLT(_root, key);
		},

		log: (key, data) => {
			console.log(key);
			console.log(data);
		}
	};
}
