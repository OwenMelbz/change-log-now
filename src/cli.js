#!/usr/bin/env node
const { program } = require('commander');
const { getVersionNumber } = require('./helpers');

program
	.description('Automatically generate a Change Log file based off your commit messages.')
	.option('--init', 'Creates a change log config')
	.option('--refresh', 'Regenerates from the whole commit history')
	.version(getVersionNumber())
	.parse(process.argv);

if (program.init) {
	require('./init')
} else {
	const app = require('./app')
	app(program.refresh)
}
