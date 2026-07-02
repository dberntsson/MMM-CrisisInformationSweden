const {
    truncateText,
    getIncidentPeriodString,
} = require("./feedFormattingUtils");

function formatKrisinformationFeed(feed, config = {}) {
    if (!Array.isArray(feed)) {
        return [];
    }
	
	const descriptionMaxLength = config.descriptionMaxLength ?? 400;

	return feed.flatMap((item) => {
		if (!Array.isArray(item.Area)) {
			return [];
		}

		return {
			publishTime: item.Published,
			updatedTime: item.Updated,
			warningLevel: undefined,
			warningRelevantStartTime: item.Published,
			warningRelevantStopTime: getNewestTimeWithDaysAdded(item.Published, item.Updated, config.oldest),
            incidentStartTime: undefined,
            incidentStopTime: undefined,
            incidentPeriodString: getIncidentPeriodString(undefined, undefined), // No start or stop time available in Krisinformation feed
			incidentTitle: item.Preamble,
			incidentDescription: truncateText(item.BodyText, descriptionMaxLength),
			affectedArea: undefined,
			affectedAreaDetails: getAreaDescriptionString(item.Area),
			origin: item.SenderName,
		};
	});
}

/** Find out which one it newest and then add X days to that (caught from config).
 * @param {Date} publishTime - The publish time of the feed item.
 * @param {Date} updatedTime - The updated time of the feed item.
 * @param {number} daysToAdd - The number of days to add to the newest time.
 * @returns {Date|undefined} - The new time that is the newest time + X days, or undefined if both times are undefined.
 */
function getNewestTimeWithDaysAdded(publishTime, updatedTime, daysToAdd) {
    const timestamps = [publishTime, updatedTime].filter((value) => value != null);
    if (timestamps.length === 0) {
        return undefined;
    }

    const newestTime = timestamps.reduce((latest, candidate) => {
        const latestDate = latest ? new Date(latest) : undefined;
        const candidateDate = new Date(candidate);

        if (!latestDate || candidateDate > latestDate) {
            return candidate;
        }

        return latest;
    }, undefined);

    if (!newestTime) {
        return undefined;
    }

    const normalizedDaysToAdd = Number.isFinite(Number(daysToAdd)) ? Number(daysToAdd) : 0;
    const newTime = new Date(newestTime);
    newTime.setDate(newTime.getDate() + normalizedDaysToAdd);
    return newTime;
}

/**
 * item.Area is a list of areas. This function will extract all Area.Description and return a comma separated string of all areas. If item.Area is undefined or empty, it will return an empty string.
 * @param Area
 * @returns commma separated string of all areas or empty string if no areas.
 */
function getAreaDescriptionString(Area) {
    if (!Array.isArray(Area) || Area.length === 0) {
        return "";
    }

    return Area.map(a => a.Description).join(", ");
}

const isWarningRelevant = (formattedFeedItem) => {
    const now = new Date();
    const warningRelevantStartTime = formattedFeedItem.warningRelevantStartTime
        ? new Date(formattedFeedItem.warningRelevantStartTime)
        : undefined;
    const warningRelevantStopTime = formattedFeedItem.warningRelevantStopTime
        ? new Date(formattedFeedItem.warningRelevantStopTime)
        : undefined;

    const hasNotStarted = Boolean(warningRelevantStartTime && now < warningRelevantStartTime);
    const hasExpired = Boolean(warningRelevantStopTime && now > warningRelevantStopTime);

    return !hasNotStarted && !hasExpired;
};

function filterKrisinformationFeed(formattedFeed, config = {}) {
    if (!Array.isArray(formattedFeed)) return [];

    const hasAreaFilter = Array.isArray(config.areas) && config.areas.length > 0;
    const hasContentFilter = Array.isArray(config.filterContent) && config.filterContent.length > 0;

    return formattedFeed.filter((feedItem) => {
        // Check if the warning is still relevant (within time range)
        if (!isWarningRelevant(feedItem)) {
            return false;
        }

        const areas = Array.isArray(feedItem.affectedAreaDetails) ? feedItem.affectedAreaDetails : feedItem.Area;
        const text = typeof feedItem.incidentTitle === "string" ? feedItem.incidentTitle : feedItem.Preamble;

        const areaOk = !hasAreaFilter || areaFilter(config, areas);
        const contentOk = !hasContentFilter || contentFilter(config, text);

        return areaOk && contentOk;
    });
}

const areaFilter = (cfg, areas) => {
    if (!Array.isArray(areas) || areas.length === 0) return true;

    const cfgAreas = Array.isArray(cfg.areas) ? cfg.areas : [];

    if (cfg.alwaysNational && areas.some(a => a.Type === "Country" && a.Description === "Sverige")) {
        return true;
    }

    return areas.some(a => a.Type === "County" && cfgAreas.some(c => a.Description === c));
};

const contentFilter = (cfg, text) => {
    if (!text || typeof text !== "string") return true;
    const filters = Array.isArray(cfg.filterContent) ? cfg.filterContent.map(f => f.toLowerCase()) : [];
    const lowerText = text.toLowerCase();
    return !filters.some(f => lowerText.includes(f));
};

module.exports = {
    formatKrisinformationFeed,
    filterKrisinformationFeed,
    isWarningRelevant,
};