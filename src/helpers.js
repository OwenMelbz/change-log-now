const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { gitToJs } = require('git-parse');
const { DateTime } = require('luxon');
const plural = require('plural');
const _ = require('lodash');

let cachedConfig = null;

const getSysPath = fileName => path.join(__dirname, fileName);

const getUserPath = fileName => path.join(process.cwd(), fileName);

const getLogPath = () => getUserPath(getConfig('fileName'))

const getPkg = () => {
	return require(
		getSysPath('../package.json')
	);
}

const getVersionNumber = () => {
	return getPkg().version;
}

const say = (text, colour) => {
	console.log(chalk[colour || 'cyan'](text || ''))
}

const defaultConfig = () => {
	return fs.readFileSync(
		getSysPath('defaultConfig.js'),
		'utf8'
	);
}

const getConfig = key => {
	if (cachedConfig) {
		if (key) {
			return cachedConfig[key]
		}

		return cachedConfig;
	}

	const configPath = getUserPath('changelog.config.js')

	if (fs.existsSync(configPath)) {
		cachedConfig = require(configPath);
	} else {
		cachedConfig = require(getSysPath('defaultConfig.js'));
	}

	if (key) {
		return cachedConfig[key]
	}

	return cachedConfig;
}

const preflight = () => {
	getConfig();

	const logPath = getLogPath();

	if (!fs.existsSync(logPath)) {
		fs.writeFileSync(logPath, `# Change Log`);
	}
}

const ltrim = (string, charlist) => {
	if (charlist === undefined) charlist = '\s';
	return string.replace(new RegExp('^[' + charlist + ']+'), '');
};

const rtrim = (string, charlist) => {
	if (charlist === undefined) charlist = '\s';
	return string.replace(new RegExp('[' + charlist + ']+$'), '');
};

const capitalize = s => {
	if (typeof s !== 'string') return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
}

const formatCommit = commit => {
	const prefixes = getConfig('prefixes');
	let group = null;
	let message = 'No commit message.'

	const hasPrefixMap = !Array.isArray(prefixes);
	const loopables = hasPrefixMap ?  Object.keys(prefixes) : prefixes;

	for (const prefix of loopables) {
		const messageParts = (commit.message || '').split(prefix);

		if (messageParts.length === 2) {
			group = hasPrefixMap ? prefixes[prefix] : prefix;

			if (getConfig('pluralisePrefix')) {
				group = plural(group, 2)
			}

			message = messageParts.pop().trim();
			message = ltrim(message, getConfig('separator')).trim();
			message = (rtrim(message, '.').trim() || 'no commit message') + '.';
			message = capitalize(message);
			break;
		}
	}

	if (!group) {
		return null;
	}

	return {
		sha: commit.hash.substring(0, 7),
		date: generateDateSignature(commit.date),
		group,
		message,
	}
}

const getAllCommits = () => {
	return new Promise(async (resolve, reject) => {
		let commits = [];

		try {
			commits = (await gitToJs(process.cwd())).slice()
		} catch (e) {
			console.error(e.message)
		}

		return resolve(commits.map(formatCommit).filter(c => c))
	})
}

const generateDateSignature = date => {
	const object = DateTime.fromRFC2822(date);

	return {
		object,
		string: object.toFormat(
			getConfig('dateFormat')
		)
	}
}

const getExistingLogs = () => {
	return fs.readFileSync(getUserPath(
		getConfig('fileName')
	), 'utf8').split('\n');
}

const saveChangelog = data => {
	fs.writeFileSync(getLogPath(), data.join('\n'));
}

const findLogIntersections = existingData => {
	let lastEntryIndex = existingData.findIndex(row => row.indexOf('## ') === 0)

	if (lastEntryIndex === -1) {
		say('No existing logs found, appending to document.');
		return {
			start: existingData.length - 1,
			end: existingData.length - 1,
			lastEntry: '01/01/1970',
		}
	}

	let lastEntry = ltrim(existingData[lastEntryIndex], '## ');

	const today = DateTime.utc().startOf('day');
	const lastDate = DateTime.fromFormat(
		lastEntry,
		getConfig('dateFormat')
	).startOf('day');

	if (today.toLocaleString() !== lastDate.toLocaleString()) {
		say('Adding new entries to begging of the log.');
		return {
			start: lastEntryIndex,
			end: lastEntryIndex,
			lastEntry,
		}
	} else {
		say('Updating today\'s log');
		for (const index in existingData) {
			if (existingData[index] !== existingData[lastEntryIndex]) {
				if (existingData[index].indexOf('## ') === 0) {
					return {
						start: lastEntryIndex,
						end: parseInt(index),
						lastEntry,
					}
				}
			}
		}
	}

	return {
		start: lastEntryIndex,
		end: existingData.length - 1,
		lastEntry,
	}
}

const getLastEntries = refresh => {
	const existingData = getExistingLogs();
	const { start, end, lastEntry } = findLogIntersections(existingData);

	const header = existingData.slice(0, start)
	const footer = existingData.slice(end, existingData.length);

	return {
		header,
		footer: refresh ? [] : footer,
		lastEntry: DateTime.fromFormat(lastEntry, getConfig('dateFormat')),
	}
}

const datesEqual = (d1, d2) => {
	return d1.startOf('day').toLocaleString() === d2.startOf('day').toLocaleString()
}

const olderThan = (d1, d2) => {
	return d1.startOf('day') > d2.startOf('day')
}

module.exports = {
	getPkg,
	getVersionNumber,
	say,
	defaultConfig,
	getConfig,
	preflight,
	getAllCommits,
	generateDateSignature,
	getExistingLogs,
	saveChangelog,
	getLastEntries,
	datesEqual,
	olderThan,
}
