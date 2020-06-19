const {
    getConfig,
    preflight,
    getExistingLogs,
    getAllCommits,
    generateDateSignature,
    extractCommitData,
    saveChangelog,
} = require('./helpers')

const { DateTime } = require('luxon')
const _ = require('lodash')

preflight();

const run = async () => {
    const markdown = getExistingLogs();
    const newRows = [];
    const lastDateIndex = markdown.findIndex(line => line.indexOf('## ') === 0);

    let headings = [];
    let existing = [];
    let lastDate = DateTime.fromISO('1970-01-01');

    if (lastDateIndex !== -1) {
        headings = markdown.slice(0, lastDateIndex)
        existing = markdown.slice(lastDateIndex)
        const dateLine = markdown[lastDateIndex].replace('## ', '');
        lastDate = DateTime.fromFormat(dateLine, getConfig('dateFormat'));
    } else {
        headings = markdown.slice(0, markdown.length - 1);
    }

    if (!headings.length) {
        newRows.push('');
    }

    const allCommits = (await getAllCommits()).filter(commit => {
        return commit.date.object.startOf('day') >= lastDate.startOf('day');
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
        ...headings,
        ...newRows,
        ...existing
    ];

    saveChangelog(writeData);
}

run();
