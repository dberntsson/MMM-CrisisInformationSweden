const {
	truncateText,
	getIncidentPeriodString,
	isWarningRelevant,
} = require("./feedFormattingUtils");

const formatDemoFeed = (feed, config = {}) => {
    if (!Array.isArray(feed)) return [];
	const descriptionMaxLength = config.descriptionMaxLength ?? 97;

    return feed.flatMap(item => {
		return {
			publishTime: getTimeWithHoursAdded(item.published),
			updatedTime: getTimeWithHoursAdded(item.updated),
			warningLevel: item.warningLevel,
			incidentStartTime: getTimeWithHoursAdded(item.warningStartTime),
			incidentStopTime: getTimeWithHoursAdded(item.warningStopTime),

			warningRelevantStartTime: getTimeWithHoursAdded(item.published),
			warningRelevantStopTime: getTimeWithHoursAdded(item.warningStopTime),
			incidentPeriodString: getIncidentPeriodString(
				getTimeWithHoursAdded(item.warningStartTime),
				getTimeWithHoursAdded(item.warningStopTime)
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
 * This function take a integer that represents hours and use that to add (if possitive) or subtract (if negative) that number of hours to the current time and return the new time.
 * If the input is not a number, it will return undefined.
 * @param {number} hoursToAdd - The number of hours to add (or subtract if negative) to the current time.
 * @returns {Date} - The new time that is the current time + X hours.
 */
function getTimeWithHoursAdded(hoursToAdd) {
	if (typeof hoursToAdd !== "number") return undefined;
	const currentTime = new Date();
	const newTime = new Date(currentTime.getTime() + hoursToAdd * 3600000); // 3600000 ms in an hour
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