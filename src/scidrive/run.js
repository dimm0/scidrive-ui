require({
	baseUrl: '',
	packages: [
		'dojo',
		'dijit',
		'dojox',
		'gridx',
		{ name: 'scidrive', location: 'scidrive', map: {} },
		{ name: 'numeral', location: 'numeral', map: {} }
	]
}, [ 'scidrive' ]);