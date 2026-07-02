const {
    truncateText,
    getIncidentPeriodString,
} = require("./feedFormattingUtils");

const toSearchStrings = (value) => {
    if (typeof value === "string") return [value.toLowerCase()];
    if (Array.isArray(value)) return value.flatMap(toSearchStrings);
    if (value && typeof value === "object") {
        return Object.values(value).flatMap((nestedValue) => toSearchStrings(nestedValue));
    }
    return [];
};

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

const getFilterStrings = (config = {}) => Array.isArray(config.smhiFeedInterestingAreas) ? config.smhiFeedInterestingAreas : [];

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

function filterSMHIFeed(formattedFeed, excludeTimeFilterOrConfig = false, configOrFilters = {}) {
    if (typeof excludeTimeFilterOrConfig === "boolean") {
        return filterSMHIFeedItems(formattedFeed, excludeTimeFilterOrConfig, configOrFilters);
    }

    return filterSMHIFeedItems(formattedFeed, false, excludeTimeFilterOrConfig);
}

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
