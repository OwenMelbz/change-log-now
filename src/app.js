const {
    preflight,
    getAllCommits,
    getLastEntries,
    saveChangelog,
} = require('./helpers')

const _ = require('lodash')
const { DateTime } = require('luxon');

const today = DateTime.local();

preflight();

const run = async (refresh) => {
    const { header, footer, lastEntry } = getLastEntries();
    const newRows = [];

    const allCommits = (await getAllCommits())
        .filter(commit => {
            return commit.date.object.startOf('day') > lastEntry.startOf('day') ||
                commit.date.object.startOf('day').toLocaleString() === today.startOf('day').toLocaleString()
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

    // console.log(header, footer)

    const writeData = [
        ...header,
        ...newRows,
        ...footer
    ];

    saveChangelog(writeData);
}

module.exports = run;
