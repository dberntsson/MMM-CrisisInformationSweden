const assert = require("assert");
const { truncateText, getIncidentPeriodString } = require("../lib/feedFormattingUtils");

class FeedFormattingUtilsTest {
    static run() {
        console.log("Running feedFormattingUtils tests...");
        this.testTruncateTextLeavesShortValuesUntouched();
        this.testTruncateTextAddsEllipsisForLongValues();
        this.testGetIncidentPeriodStringReturnsUndefinedWhenNoTimes();
        this.testGetIncidentPeriodStringFormatsFutureSameDayWindow();
        this.testGetIncidentPeriodStringFormatsActiveWindow();
        this.testGetIncidentPeriodStringClarifiesDateOnlyUntilLabel();
        this.testGetIncidentPeriodStringUsesFromLabelWhenOnlyStartTimeExists();
        this.testGetIncidentPeriodStringUsesFromLabelWithTimeWhenOnlyFutureStartTimeExists();
        this.testGetIncidentPeriodStringUsesUntilLabelWhenOnlyStopTimeExists();
        this.testGetIncidentPeriodStringFormatsMultiDayWindow();
        console.log("All feedFormattingUtils tests passed.");
    }

    static testTruncateTextLeavesShortValuesUntouched() {
        const value = "Short text";
        assert.strictEqual(truncateText(value, 50), value, "Short text should remain unchanged");
    }

    static testTruncateTextAddsEllipsisForLongValues() {
        const value = "abcdefghijklmnopqrst";
        const actual = truncateText(value, 15);
        const expected = "abcdefghij[...]";

        assert.strictEqual(actual, expected, "Long text should be truncated with an ellipsis");
    }

    static testGetIncidentPeriodStringReturnsUndefinedWhenNoTimes() {
        assert.strictEqual(getIncidentPeriodString(undefined, undefined), undefined, "No times should yield undefined");
    }

    static testGetIncidentPeriodStringFormatsFutureSameDayWindow() {
        this.withMockedNow(new Date(2026, 6, 29, 12, 0, 0, 0), () => {
            const startTime = new Date(2026, 6, 29, 14, 0, 0, 0);
            const stopTime = new Date(2026, 6, 29, 17, 0, 0, 0);

            const actual = getIncidentPeriodString(startTime, stopTime);
            const expected = `${this.formatTimePart(startTime)}-${this.formatTimePart(stopTime)}`;

            assert.strictEqual(actual, expected, "A future same-day incident should render as a time range");
        });
    }

    static testGetIncidentPeriodStringFormatsActiveWindow() {
        this.withMockedNow(new Date(2026, 6, 29, 12, 0, 0, 0), () => {
            const startTime = new Date(2026, 6, 29, 10, 0, 0, 0);
            const stopTime = new Date(2026, 6, 29, 14, 0, 0, 0);

            const actual = getIncidentPeriodString(startTime, stopTime);
            const expected = `Giltlig till ${this.formatTimePart(stopTime)} idag`;

            assert.strictEqual(actual, expected, "An active incident should render as a till-stop string");
        });
    }

    static testGetIncidentPeriodStringClarifiesDateOnlyUntilLabel() {
        const startTime = new Date("2026-07-02T00:00:00.000Z");
        const stopTime = new Date("2026-07-03T00:00:00.000Z");

        const actual = getIncidentPeriodString(startTime, stopTime);
        assert.ok(actual.startsWith("Giltlig till 2026-07-03"), "A date-only stop label should be explicit that the warning is valid until that date");
    }

    static testGetIncidentPeriodStringUsesFromLabelWhenOnlyStartTimeExists() {
        this.withMockedNow(new Date(2026, 6, 29, 12, 0, 0, 0), () => {
            const startTime = new Date(2026, 6, 29, 14, 0, 0, 0);

            const actual = getIncidentPeriodString(startTime, undefined);
            const expected = `Giltlig från ${this.formatTimePart(startTime)}`;

            assert.strictEqual(actual, expected, "When only a start time exists for today, the label should show only time");
        });
    }

    static testGetIncidentPeriodStringUsesFromLabelWithTimeWhenOnlyFutureStartTimeExists() {
        this.withMockedNow(new Date(2026, 6, 29, 12, 0, 0, 0), () => {
            const startTime = new Date(2026, 6, 31, 14, 0, 0, 0);

            const actual = getIncidentPeriodString(startTime, undefined);
            const expected = `Giltlig från ${this.formatDatePart(startTime)} ${this.formatTimePart(startTime)}`;

            assert.strictEqual(actual, expected, "When only a non-today start time exists, the label should show date and time");
        });
    }

    static testGetIncidentPeriodStringUsesUntilLabelWhenOnlyStopTimeExists() {
        const stopTime = new Date("2026-07-03T00:00:00.000Z");

        const actual = getIncidentPeriodString(undefined, stopTime);
        const expected = "Giltlig till 2026-07-03";

        assert.strictEqual(actual, expected, "When only a stop date exists, the label should explicitly say the warning is valid until that date");
    }

    static testGetIncidentPeriodStringFormatsMultiDayWindow() {
        const startTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        const stopTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const actual = getIncidentPeriodString(startTime, stopTime);
        const expected = `Giltlig ${this.formatDatePart(startTime)} ${this.formatTimePart(startTime)} -- ${this.formatDatePart(stopTime)} ${this.formatTimePart(stopTime)}`;

        assert.strictEqual(actual, expected, "A multi-day incident should render as a dated range");
    }

    static formatDatePart(value) {
        return value.toLocaleString("sv-SE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    }

    static formatTimePart(value) {
        return value.toLocaleString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    static withMockedNow(mockedNow, callback) {
        const RealDate = Date;

        class MockDate extends RealDate {
            constructor(...args) {
                if (args.length === 0) {
                    super(mockedNow.getTime());
                    return;
                }

                super(...args);
            }

            static now() {
                return mockedNow.getTime();
            }

            static parse(value) {
                return RealDate.parse(value);
            }

            static UTC(...args) {
                return RealDate.UTC(...args);
            }
        }

        global.Date = MockDate;

        try {
            return callback();
        } finally {
            global.Date = RealDate;
        }
    }
}

FeedFormattingUtilsTest.run();
