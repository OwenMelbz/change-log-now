const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { gitToJs } = require('git-parse');
const { DateTime } = require('luxon');
const plural = require('plural');

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

	for (const prefix of prefixes) {
		const messageParts = (commit.message || '').split(prefix);

		if (messageParts.length === 2) {
			if (getConfig('pluralisePrefix')) {
				group = plural(prefix, 2)
			} else {
				group = prefix;
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
			commits = await gitToJs(process.cwd())
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

const extractCommitData = commit => {
	const parts = commit.message.split(getConfig('separator'));
	const typeIndex = Object.values(getConfig('prefixes')).indexOf(parts[0])
	const type = Object.keys(getConfig('prefixes'))[typeIndex];

	return {
		sha: commit.hash.substring(0, 7),
		type,
		prettyType: parts[0] + 's',
		message: parts[1],
		exclude: typeIndex === -1 || type === 'wip',
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

module.exports = {
	getPkg,
	getVersionNumber,
	say,
	defaultConfig,
	getConfig,
	preflight,
	getAllCommits,
	generateDateSignature,
	extractCommitData,
	getExistingLogs,
	saveChangelog
}
