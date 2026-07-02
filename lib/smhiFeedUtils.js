const {
    truncateText,
    getIncidentPeriodString,
    isWarningRelevant,
} = require("./feedFormattingUtils");

/**
 * This function takes a value and converts it into an array of lowercase strings for searching purposes. It handles strings, arrays, and objects recursively.
 * @param {*} value - The value to be converted into search strings. It can be a string, an array, or an object.
 * @returns {string[]} - An array of lowercase strings extracted from the input value.
 */
const toSearchStrings = (value) => {
    if (typeof value === "string") return [value.toLowerCase()];
    if (Array.isArray(value)) return value.flatMap(toSearchStrings);
    if (value && typeof value === "object") {
        return Object.values(value).flatMap((nestedValue) => toSearchStrings(nestedValue));
    }
    return [];
};

/**
 * This function checks if a given SMHI feed item matches the specified areas of interest.
 * @param {*} item - The SMHI feed item to be checked.
 * @param {*} areasOfInterest - An array of areas of interest to filter the feed item.
 * @returns {boolean} - Returns true if the feed item matches any of the areas of interest, false otherwise.
 */
const matchesSMHIFeedFilter = (item, areasOfInterest) => {
    if (!Array.isArray(areasOfInterest) || areasOfInterest.length === 0) return true;

    const normalizedFilters = areasOfInterest
        .filter(f => f != null)
        .map(f => String(f).toLowerCase().trim())
        .filter(Boolean);

    if (normalizedFilters.length === 0) return true;

    const haystack = [
        ...toSearchStrings(item.affectedArea),
        ...toSearchStrings(item.affectedAreaDetails),
    ];
    if (haystack.length === 0) return false;

    return normalizedFilters.some(filter => haystack.some(text => text.includes(filter)));
};

/**
 * This function retrieves the filter strings from the configuration object. It looks for the "smhiFeedInterestingAreas" property and returns it as an array. If the property is not present or is not an array, it returns an empty array.
 * @param {*} config 
 * @returns 
 */
const getFilterStrings = (config = {}) => Array.isArray(config.smhiFeedInterestingAreas) ? config.smhiFeedInterestingAreas : [];

/**
 * This function resolves a localized value from an object based on the preferred locale.
 * It falls back to English ("en") or the default locale if the preferred locale is not available.
 * @param {*} value - The value to be localized. It can be an object with locale keys or a simple value.
 * @param {*} preferredLocale - The preferred locale to use for localization.
 * @returns {*} - The localized value based on the preferred locale or a fallback.
 */
const resolveLocalizedValue = (value, preferredLocale = "") => {
    if (!value || typeof value !== "object") return value;

    const normalizedLocale = String(preferredLocale || "").trim().toLowerCase();
    const localeCandidates = [];

    if (normalizedLocale) localeCandidates.push(normalizedLocale);
    localeCandidates.push("en");
    localeCandidates.push("");

    for (const locale of localeCandidates) {
        if (locale) {
            if (value[locale] !== undefined && value[locale] !== null) return value[locale];
        } else if (value[""] !== undefined && value[""] !== null) {
            return value[""];
        }
    }

    if (value.sv !== undefined && value.sv !== null) return value.sv;
    if (value.en !== undefined && value.en !== null) return value.en;

    return value;
};

/**
 * This function formats the SMHI feed into a standardized structure.
 * @param {Array} feed - The SMHI feed to be formatted.
 * @param {Object} config - The configuration object containing formatting options.
 * @returns {Array} - The formatted SMHI feed.
 */
const formatSMHIFeed = (feed, config = {}) => {
    if (!Array.isArray(feed)) return [];

    const preferredLocale = config.preferredLocale || config.locale || "sv";
    const descriptionMaxLength = config.descriptionMaxLength ?? 400;

    return feed.flatMap(item => {
        if (!Array.isArray(item.warningAreas)) return [];

        return item.warningAreas.map(warning => {
            const incidentTitle = warning.descriptions?.find(d => d.title?.code === "INCIDENT");
            const incidentDescription = warning.descriptions?.find(d => d.title?.code === "HAPPENS")
                || warning.descriptions?.find(d => d.title?.code === "AFFECT");
            const affectedAreaDetails = warning.descriptions?.find(d => d.title?.code === "WHERE");

            return {
                publishTime: warning.published,
                updatedTime: undefined,
                warningLevel: resolveLocalizedValue(warning.warningLevel, preferredLocale),
                warningRelevantStartTime: warning.published,
                warningRelevantStopTime: warning.approximateEnd,
                incidentStartTime: warning.approximateStart,
                incidentStopTime: warning.approximateEnd,
                incidentPeriodString: getIncidentPeriodString(warning.approximateStart, warning.approximateEnd),
                incidentTitle: resolveLocalizedValue(incidentTitle?.text, preferredLocale),
                incidentDescription: truncateText(resolveLocalizedValue(incidentDescription?.text, preferredLocale), descriptionMaxLength),
                affectedArea: (warning.affectedAreas || []).map((area) => resolveLocalizedValue(area, preferredLocale)),
                affectedAreaDetails: resolveLocalizedValue(affectedAreaDetails?.text, preferredLocale),
                origin: "SMHI",
            };
        });
    });
};

/**
 * This function filters the SMHI feed based on the provided configuration or filters. It can exclude items that are not relevant based on time and can filter based on areas of interest and content.
 * @param {*} formattedFeed - The original feed to be filtered.
 * @param {*} excludeTimeFilterOrConfig - A boolean indicating whether to exclude items based on time relevance, or a configuration object containing filter settings.
 * @param {*} configOrFilters - An optional configuration object containing filter settings if the second parameter is a boolean.
 * @returns {Array} - The filtered feed items.
 */
function filterSMHIFeed(formattedFeed, excludeTimeFilterOrConfig = false, configOrFilters = {}) {
    if (typeof excludeTimeFilterOrConfig === "boolean") {
        return filterSMHIFeedItems(formattedFeed, excludeTimeFilterOrConfig, configOrFilters);
    }
    return filterSMHIFeedItems(formattedFeed, false, excludeTimeFilterOrConfig);
}

/**
 * Filters the SMHI feed items based on time relevance, areas of interest, and content filters.
 * @param {Array} formattedFeed - The formatted SMHI feed to be filtered.
 * @param {boolean} excludeTimeFilter - Whether to exclude items based on time relevance.
 * @param {Object} configOrFilters - The configuration object containing filter settings.
 * @returns {Array} - The filtered SMHI feed items.
 */
function filterSMHIFeedItems(formattedFeed, excludeTimeFilter = false, configOrFilters = {}) {
    if (!Array.isArray(formattedFeed)) {
        return [];
    }

    return formattedFeed.filter((formattedFeedItem) => {
        if (!excludeTimeFilter && !isWarningRelevant(formattedFeedItem)) {
            return false;
        }

        const areasOfInterest = getFilterStrings(configOrFilters);
        const areaOk = areasOfInterest.length === 0 || matchesSMHIFeedFilter(formattedFeedItem, areasOfInterest);
        const contentOk = passesContentFilter(formattedFeedItem, configOrFilters);
        return areaOk && contentOk;
    });
}

/**
 * Checks if the given item passes the content filter. The item passes the filter if none of the specified filter strings are found in its description or title.
 * @param {*} item - The item to be checked against the content filter.
 * @param {*} config - The configuration object containing the content filter settings.
 * @returns {boolean} - True if the item passes the content filter, false otherwise.
 */
function passesContentFilter(item, config) {
	if (!config || !Array.isArray(config.filterContent) || config.filterContent.length === 0) {
		return true; // No content filter applied
	}
	
	const textParts = [item.incidentDescription, item.incidentTitle]
		.flatMap((value) => toSearchStrings(value));
    const text = textParts.join(" ");
	if (!text) return true;
	
	const filters = config.filterContent
		.filter((filter) => filter != null)
		.map((filter) => String(filter).toLowerCase().trim())
		.filter(Boolean);
	
	const lowerText = text.toLowerCase();
	return !filters.some((filter) => lowerText.includes(filter));
}

module.exports = {
    formatSMHIFeed,
    filterSMHIFeed,
    isWarningRelevant,
};
