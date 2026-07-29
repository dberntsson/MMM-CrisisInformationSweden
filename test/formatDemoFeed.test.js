const assert = require("assert");
const { formatDemoFeed, filterDemoFeed } = require("../lib/demoFeedUtils");
const { getIncidentPeriodString } = require("../lib/feedFormattingUtils");

class FormatDemoFeedTest {
    static run() {
        console.log("Running formatDemoFeed tests...");
        this.testFormatDemoFeedReturnsEmptyArrayForNonArrayInput();
        this.testFormatDemoFeedMapsFieldsAndBuildsIncidentPeriodString();
        this.testFilterDemoFeedReturnsEmptyArrayForNonArrayInput();
        this.testFilterDemoFeedKeepsOnlyRelevantItems();
        this.testFilterDemoFeedIncludesItemWhenRelevanceTimestampsAreMissing();
        console.log("All formatDemoFeed tests passed.");
    }

    static testFormatDemoFeedReturnsEmptyArrayForNonArrayInput() {
        assert.deepStrictEqual(formatDemoFeed(undefined), [], "Non-array input should return an empty array");
    }

    static testFormatDemoFeedMapsFieldsAndBuildsIncidentPeriodString() {
        const payload = [
            {
                published: -600,
                updated: -300,
                warningLevelText: "Gul",
                warningStartTime: 900,
                warningStopTime: 4500,
                title: "Demo warning title",
                description: "a".repeat(200),
                affectedArea: "Skane",
                affectedAreaDetails: "Skane lan",
                origin: "demo",
            },
        ];

        const [formatted] = formatDemoFeed(payload, { descriptionMaxLength: 20 });
        assert.ok(formatted, "Formatter should return one item for one-item input");

        this.assertDateNearOffset(formatted.publishTime, -600);
        this.assertDateNearOffset(formatted.updatedTime, -300);
        this.assertDateNearOffset(formatted.incidentStartTime, 900);
        this.assertDateNearOffset(formatted.incidentStopTime, 4500);

        assert.strictEqual(formatted.warningLevelText, "Gul", "warningLevelText should be mapped");
        assert.strictEqual(formatted.incidentTitle, "Demo warning title", "incidentTitle should be mapped");
        assert.strictEqual(formatted.incidentDescription, `${"a".repeat(15)}[...]`, "incidentDescription should respect descriptionMaxLength");
        assert.strictEqual(formatted.affectedArea, "Skane", "affectedArea should be mapped");
        assert.strictEqual(formatted.affectedAreaDetails, "Skane lan", "affectedAreaDetails should be mapped");
        assert.strictEqual(formatted.origin, "demo", "origin should be mapped");

        const expectedIncidentPeriod = getIncidentPeriodString(formatted.incidentStartTime, formatted.incidentStopTime);
        assert.strictEqual(
            formatted.incidentPeriodString,
            expectedIncidentPeriod,
            "incidentPeriodString should be generated from incident start and stop times"
        );
    }

    static testFilterDemoFeedReturnsEmptyArrayForNonArrayInput() {
        assert.deepStrictEqual(filterDemoFeed(undefined), [], "Non-array input should return an empty array");
    }

    static testFilterDemoFeedKeepsOnlyRelevantItems() {
        const now = Date.now();
        const input = [
            {
                incidentTitle: "Active warning",
                warningRelevantStartTime: new Date(now - 60 * 1000),
                warningRelevantStopTime: new Date(now + 60 * 1000),
            },
            {
                incidentTitle: "Future warning",
                warningRelevantStartTime: new Date(now + 10 * 60 * 1000),
                warningRelevantStopTime: new Date(now + 20 * 60 * 1000),
            },
            {
                incidentTitle: "Expired warning",
                warningRelevantStartTime: new Date(now - 20 * 60 * 1000),
                warningRelevantStopTime: new Date(now - 10 * 60 * 1000),
            },
        ];

        const output = filterDemoFeed(input);
        assert.deepStrictEqual(output, [input[0]], "Demo filter should only include currently relevant items");
    }

    static testFilterDemoFeedIncludesItemWhenRelevanceTimestampsAreMissing() {
        const input = [
            {
                incidentTitle: "No relevance window fields",
                warningRelevantStartTime: undefined,
                warningRelevantStopTime: undefined,
            },
        ];

        const output = filterDemoFeed(input);
        assert.deepStrictEqual(
            output,
            input,
            "Demo filter should include items when no relevance timestamps are provided"
        );
    }

    static assertDateNearOffset(value, offsetMinutes) {
        assert.ok(value instanceof Date, "Formatted timestamp should be a Date");

        const expected = Date.now() + offsetMinutes * 60 * 1000;
        const actual = value.getTime();
        const toleranceMs = 4000;

        assert.ok(
            Math.abs(actual - expected) <= toleranceMs,
            `Expected time to be within ${toleranceMs}ms of offset ${offsetMinutes} minutes`
        );
    }
}

FormatDemoFeedTest.run();
