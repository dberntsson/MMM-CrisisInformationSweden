const truncateText = (value, maxLength = 400) => {
    if (typeof value !== "string") return value;

    if (maxLength == null || Number.isNaN(Number(maxLength))) {
        return value;
    }

    const normalizedMaxLength = Math.max(0, Number(maxLength));
    if (value.length <= normalizedMaxLength) return value;

    if (normalizedMaxLength <= 5) return "[...".slice(0, normalizedMaxLength);

    return `${value.slice(0, normalizedMaxLength - 5)}[...]`;
};

const getIncidentPeriodString = (startTime, stopTime) => {
    const normalizeDateValue = (value) => {
        if (!value) return undefined;

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? undefined : date;
    };

    const formatDatePart = (value) => {
        const normalizedValue = normalizeDateValue(value);
        if (!normalizedValue) return undefined;

        return normalizedValue.toLocaleString("sv-SE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    };

    const formatTimePart = (value) => {
        const normalizedValue = normalizeDateValue(value);
        if (!normalizedValue) return undefined;

        return normalizedValue.toLocaleString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };

    const sameDate = (a, b) => {
        const left = normalizeDateValue(a);
        const right = normalizeDateValue(b);

        return Boolean(
            left &&
            right &&
            left.getFullYear() === right.getFullYear() &&
            left.getMonth() === right.getMonth() &&
            left.getDate() === right.getDate()
        );
    };

    const sameDayAsToday = (value) => {
        const normalizedValue = normalizeDateValue(value);
        const today = new Date();

        return Boolean(
            normalizedValue &&
            normalizedValue.getFullYear() === today.getFullYear() &&
            normalizedValue.getMonth() === today.getMonth() &&
            normalizedValue.getDate() === today.getDate()
        );
    };

    if (!startTime && !stopTime) return undefined;

    const normalizedStartTime = normalizeDateValue(startTime);
    const normalizedStopTime = normalizeDateValue(stopTime);
    const now = new Date();

    if (!normalizedStartTime && !normalizedStopTime) return undefined;

    if (normalizedStartTime && normalizedStopTime) {
        if (now < normalizedStartTime) {
            if (sameDayAsToday(normalizedStartTime) && sameDayAsToday(normalizedStopTime)) {
                return `${formatTimePart(normalizedStartTime)}-${formatTimePart(normalizedStopTime)}`;
            }

            if (sameDate(normalizedStartTime, normalizedStopTime)) {
                return `${formatDatePart(normalizedStartTime)} ${formatTimePart(normalizedStartTime)}-${formatTimePart(normalizedStopTime)}`;
            }

            return `Giltlig ${formatDatePart(normalizedStartTime)} ${formatTimePart(normalizedStartTime)} -- ${formatDatePart(normalizedStopTime)} ${formatTimePart(normalizedStopTime)}`;
        }

        if (now >= normalizedStartTime && now < normalizedStopTime) {
            const stopLabel = sameDayAsToday(normalizedStopTime)
                ? `${formatTimePart(normalizedStopTime)} idag`
                : sameDate(normalizedStartTime, normalizedStopTime)
                    ? `${formatDatePart(normalizedStartTime)} ${formatTimePart(normalizedStopTime)}`
                    : `${formatDatePart(normalizedStopTime)} ${formatTimePart(normalizedStopTime)}`;

            return `Giltlig till ${stopLabel}`;
        }
    }

    const startLabel = normalizedStartTime
        ? sameDayAsToday(normalizedStartTime)
            ? formatTimePart(normalizedStartTime)
            : `${formatDatePart(normalizedStartTime)} ${formatTimePart(normalizedStartTime)}`
        : undefined;
    const stopLabel = normalizedStopTime ? formatDatePart(normalizedStopTime) : undefined;

    if (startLabel && stopLabel) {
        return `${startLabel} -- ${stopLabel}`;
    }

    if (startLabel) {
        return `Giltlig från ${startLabel}`;
    }

    if (stopLabel) {
        return `Giltlig till ${stopLabel}`;
    }

    return undefined;
};

module.exports = {
    truncateText,
    getIncidentPeriodString,
};
