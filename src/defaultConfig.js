module.exports = {

	fileName: "CHANGELOG.md",

	/*
     * Use the Luxon formatting table to help:
     * https://moment.github.io/luxon/docs/manual/formatting.html#standalone-vs-format-tokens
     */
	dateFormat: "dd/LL/yyyy",

	/*
     * This separates your "trigger" from your actual commit message.
     * You can leave this as an empty string if you do not use one.
     */
	separator: "-",

	/*
     * Only commits prefixed with these markers will be
     * displayed within the changelog.
     */
	triggers: [
		"🚀 Feature",
		"💥 Change",
		"🐛 Bug",
		"📝 Documentation",
	],

	/*
     * If you want the trigger text to be pluralised when converted to a heading.
     */
	pluraliseTrigger: true,

	/*
	* If there is no commit message after the trigger, we have the option to skip it.
 	*/
	skipEmptyCommitMessages: false,

	/*
	* This allows you to apply a custom formatter to your commit message bullet points.
	*
	* It should be a function that returns a string with the text for the bullet point.
	* It will receive an object containing "commit", "group", "allCommits", "resolvedConfig" and "clnMessage"
	*/
	customMessageFormatter: null,

	/*
	* This allows you to apply a custom formatter to your trigger headings.
	*
	* It should be a function that returns a string with the text for the bullet point.
	* It will receive an object containing "group", "commit", "resolvedConfig" and "clnHeading"
	*/
	customHeadingFormatter: null,

};
