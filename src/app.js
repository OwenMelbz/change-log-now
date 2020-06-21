const {
    preflight,
    getAllCommits,
    getLastEntries,
    saveChangelog,
    defaultCommitFilter,
    done,
    getConfig,
} = require("./helpers");

const _ = require("lodash");
const { DateTime } = require("luxon");
const log = require('log-utils');
const plural = require('plural')

const today = DateTime.local();

const run = async (refresh) => {
    const { header, footer, lastEntry } = getLastEntries(refresh);
    const newRows = [];

    const allCommits = (await getAllCommits()).filter((commit) => defaultCommitFilter(refresh, commit, lastEntry, today));

    done(`Calculated ${allCommits.length} commits to insert/update.`);

    const commitsByDate = _.groupBy(allCommits, "date.string");

    const commitsGrouped = _.mapValues(commitsByDate, (commits) => _.groupBy(commits, "group"));

    done(`${Object.keys(commitsByDate).length} date ${plural('range', Object.keys(commitsByDate).length)} to update.`);

    _.each(commitsGrouped, (groups, date) => {
        newRows.push(`## ${date}`);
        newRows.push("");

        _.each(groups, (commits, type) => {
            newRows.push(`### ${type}`);
            newRows.push("");

            commits.forEach((commit) => {
                newRows.push(`- ${commit.message} (${commit.sha})`);
            });

            newRows.push("");
        });

        done(`Commits for ${date} added.`);
    });

    const writeData = [...header, ...newRows, ...footer];

    saveChangelog(writeData);

    done(`${getConfig('fileName')} has been updated.`);
};

console.log(log.heading(`
##########################################
###     Welcome to Changelog Now!!!    ###
##########################################
`));

preflight();

module.exports = run;
