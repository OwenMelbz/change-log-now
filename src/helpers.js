const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { gitToJs } = require("git-parse");
const { DateTime } = require("luxon");
const plural = require("plural");
const _ = require("lodash");
const log = require('log-utils');

let cachedConfig = null;

const getSysPath = (fileName) => path.join(__dirname, fileName);

const getUserPath = (fileName) => path.join(process.cwd(), fileName);

const getLogPath = () => getUserPath(getConfig("fileName"));

const getPkg = () => {
	return require(getSysPath("../package.json"));
};

const getVersionNumber = () => {
	return getPkg().version;
};

const say = (text, colour) => {
	console.log(chalk[colour || "cyan"](text || ""));
};

const getConfig = (key) => {
	if (cachedConfig) {
		if (key) {
			return cachedConfig[key];
		}

		return cachedConfig;
	}

	const configPath = getUserPath("changelog.config.js");

	if (fs.existsSync(configPath)) {
		cachedConfig = require(configPath);
	} else {
		cachedConfig = require(getSysPath("defaultConfig.js"));
	}

	if (key) {
		return cachedConfig[key];
	}

	return cachedConfig;
};

const preflight = () => {
	getConfig();

	const logPath = getLogPath();

	if (!fs.existsSync(logPath)) {
		done(`Creating ${logPath}`);

		fs.writeFileSync(logPath, "");
	}
};

const ltrim = (string, charlist) => {
	if (charlist === undefined) charlist = "s";
	return string.replace(new RegExp("^[" + charlist + "]+"), "");
};

const rtrim = (string, charlist) => {
	if (charlist === undefined) charlist = "s";
	return string.replace(new RegExp("[" + charlist + "]+$"), "");
};

const capitalize = (s) => {
	if (typeof s !== "string") return "";
	return s.charAt(0).toUpperCase() + s.slice(1);
};

const formatMessage = (messageParts) => {
	let message = messageParts.pop().trim();
	message = ltrim(message, getConfig("separator")).trim();

	if (!message && getConfig('skipEmptyCommitMessages')) {
		return null;
	}

	message = (rtrim(message, ".").trim() || "no commit message") + ".";
	message = capitalize(message);

	return message;
}

const formatGroup = (group) => {
	if (getConfig("pluraliseTrigger")) {
		return plural(group, 2);
	}

	return group;
}

const defaultCommitFilter = (refresh, commit, lastEntry, today) => {
	return refresh ||
		olderThan(commit.date.object, lastEntry) ||
		datesEqual(commit.date.object, today);
}

const formatCommit = (commit, allCommits) => {
	const triggers = getConfig("triggers");
	let group = null;
	let message = null;

	const hasPrefixMap = !Array.isArray(triggers);
	const loopables = hasPrefixMap ? Object.keys(triggers) : triggers;

	for (const prefix of loopables) {
		const messageParts = (commit.message || "").split(prefix);

		if (messageParts.length === 2) {
			group = hasPrefixMap ? triggers[prefix] : prefix;

			const customGroupFormatter = getConfig('customHeadingFormatter');
			const customFormatter = getConfig('customMessageFormatter');

			group = formatGroup(group);
			message = formatMessage(messageParts);

			group = customGroupFormatter ? customGroupFormatter({group, commit, resolvedConfig: getConfig()}) : group;
			message = customFormatter ? customFormatter({
				commit,
				group,
				allCommits,
				resolvedConfig: getConfig(),
				clnMessage: message,
			}) : message;

			break;
		}
	}

	if (!group) {
		return null;
	}

	if (!message && getConfig('skipEmptyCommitMessages')) {
		return null;
	}

	return {
		sha: commit.hash.substring(0, 7),
		date: generateDateSignature(commit.date),
		group,
		message,
	};
};

const getAllCommits = () => {
	return new Promise(async (resolve, reject) => {
		let commits = [];

		try {
			commits = (await gitToJs(process.cwd())).slice();
		} catch (e) {
			console.error(e.message);
		}

		done(`A total of ${commits.length} commits found.`)

		return resolve(commits.map(c => formatCommit(c, commits)).filter((c) => c));
	});
};

const generateDateSignature = (date) => {
	const object = DateTime.fromRFC2822(date);

	return {
		object,
		string: object.toFormat(getConfig("dateFormat")),
	};
};

const getExistingLogs = () => {
	return fs
		.readFileSync(getUserPath(getConfig("fileName")), "utf8")
		.split("\n");
};

const saveChangelog = (data) => {
	fs.writeFileSync(getLogPath(), data.join("\n"));
};

const findLogIntersections = (existingLogs) => {
	let lastEntryIndex = existingLogs.findIndex(
		(row) => row.indexOf("## ") === 0
	);

	if (lastEntryIndex === -1) {
		done('Empty changelog found - Starting from the beginning of time itself.')

		return {
			start: existingLogs.length - 1,
			end: existingLogs.length - 1,
			lastEntry: DateTime.fromFormat("01/01/1970", "dd/LL/yyyy").toFormat(
				getConfig("dateFormat")
			),
		};
	}

	let lastEntry = ltrim(existingLogs[lastEntryIndex], "## ");

	const today = DateTime.local().startOf("day");
	const lastDate = DateTime.fromFormat(
		lastEntry,
		getConfig("dateFormat")
	).startOf("day");

	if (today.toString() !== lastDate.toString()) {
		done('Adding new entries to beginning of the changelog.');

		return {
			start: lastEntryIndex,
			end: lastEntryIndex,
			lastEntry,
		};
	} else {
		done('Found commits for today - refreshing changelog.');
		for (const index in existingLogs) {
			if (existingLogs[index] !== existingLogs[lastEntryIndex]) {
				if (existingLogs[index].indexOf("## ") === 0) {
					return {
						start: lastEntryIndex,
						end: parseInt(index),
						lastEntry,
					};
				}
			}
		}
	}

	return {
		start: lastEntryIndex,
		end: existingLogs.length - 1,
		lastEntry,
	};
};

const getLastEntries = (refresh) => {
	const existingLogs = getExistingLogs();
	done('Fetching existing changelog.')

	const { start, end, lastEntry } = findLogIntersections(existingLogs);
	done(`Changelog intersections calculated between line ${start} and ${end}.`)

	const header = existingLogs.slice(0, start);
	const footer = existingLogs.slice(end, existingLogs.length);

	return {
		header,
		footer: refresh ? [] : footer,
		lastEntry: DateTime.fromFormat(lastEntry, getConfig("dateFormat")),
	};
};

const datesEqual = (d1, d2) => {
	return d1.startOf("day").toString() === d2.startOf("day").toString();
};

const olderThan = (d1, d2) => {
	return d1.startOf("day") > d2.startOf("day");
};

const done = message => console.log(log.ok(message));

module.exports = {
	preflight,
	getAllCommits,
	getLastEntries,
	saveChangelog,
	olderThan,
	datesEqual,
	getVersionNumber,
	defaultCommitFilter,
	getConfig,
	say,
	done,
};
