const {
    truncateText,
    getIncidentPeriodString,
    isWarningRelevant,
} = require("./feedFormattingUtils");

const toDateOrUndefined = (value) => {
    if (!value) {
        return undefined;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const uniqueStrings = (values) => {
    const seen = new Set();

    return values
        .filter((value) => value != null)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .filter((value) => {
            if (seen.has(value)) {
                return false;
            }

            seen.add(value);
            return true;
        });
};

const pickEarliestSourceValue = (values) => {
    const candidates = values
        .filter((value) => value != null)
        .map((value) => ({ value, date: toDateOrUndefined(value) }))
        .filter((candidate) => candidate.date);

    if (candidates.length === 0) {
        return undefined;
    }

    return candidates.reduce((earliest, candidate) => (candidate.date < earliest.date ? candidate : earliest)).value;
};

const pickLatestSourceValue = (values) => {
    const candidates = values
        .filter((value) => value != null)
        .map((value) => ({ value, date: toDateOrUndefined(value) }))
        .filter((candidate) => candidate.date);

    if (candidates.length === 0) {
        return undefined;
    }

    return candidates.reduce((latest, candidate) => (candidate.date > latest.date ? candidate : latest)).value;
};
const pickSeverity = (deviations) => {
    const severityCodes = deviations
        .map((deviation) => Number(deviation?.SeverityCode))
        .filter((severityCode) => Number.isFinite(severityCode));

    if (severityCodes.length === 0) {
        return { warningLevelCode: undefined, warningLevelText: undefined };
    }

    const warningLevelCode = Math.max(...severityCodes);
    const warningLevelText = deviations.find((deviation) => Number(deviation?.SeverityCode) === warningLevelCode)?.SeverityText;

    return {
        warningLevelCode,
        warningLevelText,
    };
};

const SituationNormalizer = (situation, descriptionMaxLength = 400) => {
    const deviations = Array.isArray(situation?.Deviation) ? situation.Deviation.filter(Boolean) : [];
    if (deviations.length === 0) {
        return undefined;
    }

    const messageCodes = uniqueStrings(deviations.map((deviation) => deviation?.MessageCode || deviation?.Header));
    const messages = uniqueStrings(deviations.map((deviation) => deviation?.Message));
    const locationDescriptors = uniqueStrings(deviations.map((deviation) => deviation?.LocationDescriptor));
    const creators = uniqueStrings(deviations.map((deviation) => deviation?.Creator));
    const { warningLevelCode, warningLevelText } = pickSeverity(deviations);
    const incidentStartTime = pickEarliestSourceValue(deviations.map((deviation) => deviation?.StartTime));
    const incidentStopTime = pickLatestSourceValue(deviations.map((deviation) => deviation?.EndTime));

    return {
        publishTime: situation?.PublicationTime,
        updatedTime: situation?.ModifiedTime,
        warningLevelCode,
        warningLevelText,
        warningRelevantStartTime: situation?.PublicationTime,
        warningRelevantStopTime: incidentStopTime,
        incidentStartTime,
        incidentStopTime,
        incidentPeriodString: getIncidentPeriodString(incidentStartTime, incidentStopTime),
        incidentTitle: messageCodes.join(" / ") || "Trafikverket",
        incidentDescription: truncateText(messages.join(" "), descriptionMaxLength),
        affectedArea: locationDescriptors.join(" / ") || undefined,
        affectedAreaDetails: locationDescriptors.join(" / ") || undefined,
        origin: creators.join(" / ") || "Trafikverket",
    };
};

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

    return extractSituations(feed)
        .map((item) => SituationNormalizer(item, descriptionMaxLength))
        .filter(Boolean);
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
    SituationNormalizer,
    formatTrafikverketFeed,
    filterTrafikverketFeed,
};