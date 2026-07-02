const {
    truncateText,
    getIncidentPeriodString,
    isWarningRelevant,
} = require("./feedFormattingUtils");

/**
 * Formats the Krisinformation feed into a standardized structure.
 * @param {Array} feed - The Krisinformation feed to be formatted.
 * @param {Object} config - The configuration object containing formatting options.
 * @returns {Array} - The formatted Krisinformation feed.
 */
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
 * @param {Array} Area - The list of areas.
 * @returns {string} - Comma separated string of all areas or empty string if no areas.
 */
function getAreaDescriptionString(Area) {
    if (!Array.isArray(Area) || Area.length === 0) {
        return "";
    }

    return Area.map(a => a.Description).join(", ");
}

/**
 * Filters the Krisinformation feed based on the provided configuration or filters. It can exclude items that are not relevant based on time and can filter based on areas of interest and content.
 * @param {Array} formattedFeed - The formatted Krisinformation feed to be filtered.
 * @param {Object} config - The configuration object containing filter settings.
 * @returns {Array} - The filtered Krisinformation feed items.
 */
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

/**
 * Filters the areas based on the configuration settings.
 * @param {Object} cfg - The configuration object containing area filter settings.
 * @param {Array} areas - The list of areas to be filtered.
 * @returns {boolean} - True if the areas pass the filter, false otherwise.
 */
const areaFilter = (cfg, areas) => {
    if (!Array.isArray(areas) || areas.length === 0) return true;

    const cfgAreas = Array.isArray(cfg.areas) ? cfg.areas : [];

    if (cfg.alwaysNational && areas.some(a => a.Type === "Country" && a.Description === "Sverige")) {
        return true;
    }

    return areas.some(a => a.Type === "County" && cfgAreas.some(c => a.Description === c));
};

/**
 * Filters the content based on the configuration settings.
 * @param {Object} cfg - The configuration object containing content filter settings.
 * @param {string} text - The text to be filtered.
 * @returns {boolean} - True if the text passes the filter, false otherwise.
 */
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