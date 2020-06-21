const {
    preflight,
    getAllCommits,
    getLastEntries,
    saveChangelog,
    olderThan,
    datesEqual,
} = require('./helpers')

const _ = require('lodash')
const { DateTime } = require('luxon');

const today = DateTime.local();

preflight();

const run = async refresh => {
    const { header, footer, lastEntry } = getLastEntries(refresh);
    const newRows = [];

    const allCommits = (await getAllCommits())
        .filter(commit => {
            return refresh ||
                olderThan(commit.date.object, lastEntry) ||
                datesEqual(commit.date.object, today)
        })

    const commitsByDate = _.groupBy(allCommits, 'date.string')

    const commitsGrouped = _.mapValues(commitsByDate, commits => {
        return _.groupBy(commits, 'group')
    })

    _.each(commitsGrouped, (groups, date) => {
        newRows.push(`## ${date}`)
        newRows.push('');

        _.each(groups, (commits, type) => {
            newRows.push(`### ${type}`);
            newRows.push('');

            commits.forEach(commit => {
                newRows.push(`- ${commit.message} (${commit.sha})`);
            })

            newRows.push('');
        })
    });

    const writeData = [
        ...header,
        ...newRows,
        ...footer
    ];

    saveChangelog(writeData);
}

module.exports = run;
