const fs = require('fs');
const path = require('path');
const { say, defaultConfig } = require('./helpers');

say();
say('Generating change log config...', 'cyan');

const data = defaultConfig();

fs.writeFileSync(
    path.join(process.cwd(), 'changelog.config.js'),
    data,
);

say('Config saved to "changelog.config.js"', 'green');
say();
