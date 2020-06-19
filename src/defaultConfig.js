module.exports = {

	fileName: 'CHANGELOG.md',

	/*
	* Use the Luxon formatting table to help:
	* https://moment.github.io/luxon/docs/manual/formatting.html#standalone-vs-format-tokens
 	*/
	dateFormat: 'dd/LL/yyyy',

	/*
	* This separates your "prefix" from your actual commit message.
	* You can leave this as an empty string if you do not use one.
 	*/
	separator: '-',

	/*
	* Only commits prefixed with these markers will be
	* displayed within the changelog.
	*/
	prefixes: [
		'🐛 Bug',
		'🚀 Feature',
		'💥 Change',
		'📝 Documentation',
	],

	/*
	* If you want the prefix to be pluralised in the output.
 	*/
	pluralisePrefix: true,
}
