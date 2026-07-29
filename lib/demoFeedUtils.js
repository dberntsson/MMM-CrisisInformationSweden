const {
	truncateText,
	getIncidentPeriodString,
	isWarningRelevant,
} = require("./feedFormattingUtils");

const formatDemoFeed = (feed, config = {}) => {
    if (!Array.isArray(feed)) return [];
	const descriptionMaxLength = config.descriptionMaxLength ?? 145;

    return feed.flatMap(item => {
		return {
			publishTime: getTimeWithMinutesAdded(item.published),
			updatedTime: getTimeWithMinutesAdded(item.updated),
			warningLevelText: item.warningLevelText,
			incidentStartTime: getTimeWithMinutesAdded(item.warningStartTime),
			incidentStopTime: getTimeWithMinutesAdded(item.warningStopTime),

			warningRelevantStartTime: getTimeWithMinutesAdded(item.published),
			warningRelevantStopTime: getTimeWithMinutesAdded(item.warningStopTime),
			incidentPeriodString: getIncidentPeriodString(
				getTimeWithMinutesAdded(item.warningStartTime),
				getTimeWithMinutesAdded(item.warningStopTime)
			),

			incidentTitle: item.title,
			incidentDescription: truncateText(item.description, descriptionMaxLength),
			affectedArea: item.affectedArea,
			affectedAreaDetails: item.affectedAreaDetails,
			origin: item.origin,
		};
	});
};

/**
 * This function take a integer that represents minutes and use that to add (if positive) or subtract (if negative) that number of minutes to the current time and return the new time.
 * If the input is not a number, it will return undefined.
 * @param {number} minutesToAdd - The number of minutes to add (or subtract if negative) to the current time.
 * @returns {Date} - The new time that is the current time + X minutes.
 */
function getTimeWithMinutesAdded(minutesToAdd) {
	if (typeof minutesToAdd !== "number") return undefined;
	const currentTime = new Date();
	const newTime = new Date(currentTime.getTime() + minutesToAdd * 60000); // 60000 ms in a minute
	return newTime;
}

function filterDemoFeed(formattedFeed) {
    if (!Array.isArray(formattedFeed)) {
        return [];
    }
	return formattedFeed.filter((formattedFeedItem) => {
        if (!isWarningRelevant(formattedFeedItem)) {
            return false;
        }
		return true;
    });
}

module.exports = {
	formatDemoFeed,
	filterDemoFeed,
};