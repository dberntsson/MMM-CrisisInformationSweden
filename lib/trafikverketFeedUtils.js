const {
    truncateText,
    getIncidentPeriodString,
    isWarningRelevant,
} = require("./feedFormattingUtils");

const extractSituations = (feed) => {
    if (Array.isArray(feed)) {
        return feed;
    }

    const results = Array.isArray(feed?.RESPONSE?.RESULT) ? feed.RESPONSE.RESULT : [];

    return results.flatMap((result) => {
        const situations = result?.Situation;
        if (Array.isArray(situations)) {
            return situations;
        }

        if (situations) {
            return [situations];
        }

        return [];
    });
};

const formatTrafikverketFeed = (feed, config = {}) => {
    const descriptionMaxLength = config.descriptionMaxLength ?? 400;

    return extractSituations(feed).flatMap((item) => {
        const deviations = Array.isArray(item?.Deviation) ? item.Deviation : [];

        return deviations.map((deviation) => ({
            publishTime: item?.PublicationTime,
            updatedTime: item?.ModifiedTime,
            warningLevelCode: deviation?.SeverityCode,
            warningLevelText: deviation?.SeverityText,
            warningRelevantStartTime: deviation?.StartTime || item?.PublicationTime,
            warningRelevantStopTime: deviation?.EndTime,
            incidentStartTime: deviation?.StartTime,
            incidentStopTime: deviation?.EndTime,
            incidentPeriodString: getIncidentPeriodString(deviation?.StartTime, deviation?.EndTime),
            incidentTitle: deviation?.Header || deviation?.MessageCode || "Trafikverket",
            incidentDescription: truncateText(deviation?.Message, descriptionMaxLength),
            affectedArea: deviation?.LocationDescriptor,
            affectedAreaDetails: deviation?.LocationDescriptor,
            origin: deviation?.Creator || "Trafikverket",
        }));
    });
};

const filterTrafikverketFeed = (formattedFeed, config = {}) => {
    if (!Array.isArray(formattedFeed)) {
        return [];
    }

    const filters = Array.isArray(config.filterContent) ? config.filterContent : [];
    if (filters.length === 0) {
        return formattedFeed.filter((formattedFeedItem) => isWarningRelevant(formattedFeedItem));
    }

    const normalizedFilters = filters
        .filter((filter) => filter != null)
        .map((filter) => String(filter).toLowerCase().trim())
        .filter(Boolean);

    return formattedFeed.filter((formattedFeedItem) => {
        if (!isWarningRelevant(formattedFeedItem)) {
            return false;
        }

        const text = [formattedFeedItem.incidentTitle, formattedFeedItem.incidentDescription, formattedFeedItem.affectedAreaDetails]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return !normalizedFilters.some((filter) => text.includes(filter));
    });
};

module.exports = {
    formatTrafikverketFeed,
    filterTrafikverketFeed,
};