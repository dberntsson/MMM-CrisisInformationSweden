const assert = require("assert");
const { formatKrisinformationFeed, filterKrisinformationFeed, isWarningRelevant } = require("../lib/krisinformationFeedUtils");

class FormatKrisinformationFeedTest {
    static run() {
        console.log("Running formatKrisinformationFeed tests...");
        this.testEmptyFeed();
        this.testCountPreservesItemCount();
        this.testDescriptionTruncationRespectsConfiguredMaxLength();
        this.testContentFilterExcludes();
        this.testKrisinformationWarningRelevanceHelperUsesDynamicTimestamps();
        console.log("All formatKrisinformationFeed tests passed.");
    }

    static testEmptyFeed() {
        const payload = [];
        const expected = [];
        const actual = formatKrisinformationFeed(payload);
        assert.deepStrictEqual(actual, expected, "Empty payload should return an empty array");
    }

    static testRealResponseFromKrisinformation() {
        const payload = require("./fixtures/krisinformationLiveResponse.json");
        const config = { oldest: 1 };

        const actualFeed = formatKrisinformationFeed(payload);
        assert.ok(Array.isArray(actualFeed), "Formatted feed should be an array");
        assert.strictEqual(actualFeed.length, payload.length, "Formatted feed should preserve item count");
        assert.deepStrictEqual(actualFeed[0], {
            publishTime: payload[0].Published,
            updatedTime: payload[0].Updated,
            warningLevel: undefined,
            warningRelevantStartTime: payload[0].Published,
            warningRelevantStopTime: new Date(payload[0].Published),
            incidentStartTime: undefined,
            incidentStopTime: undefined,
            incidentTitle: payload[0].Preamble,
            incidentDescription: payload[0].BodyText,
            affectedArea: undefined,
            affectedAreaDetails: payload[0].Area,
            origin: payload[0].SenderName,
        }, "First formatted entry should match the expected Krisinformation shape");
    }

    static testCountPreservesItemCount() {
        const payload = require("./fixtures/krisinformationLiveResponse.json");
        const actual = formatKrisinformationFeed(payload);
        assert.strictEqual(actual.length, payload.length, "Formatted feed should have the same number of entries as input");
    }

    static testDescriptionTruncationRespectsConfiguredMaxLength() {
        const payload = [
            {
                Published: "2026-07-01T07:00:00.000Z",
                Updated: undefined,
                Preamble: "Test title",
                BodyText: "a".repeat(260),
                Area: [{ Description: "Skåne län" }],
                SenderName: "Krisinformation",
            },
        ];

        const [formattedItem] = formatKrisinformationFeed(payload, { descriptionMaxLength: 20 });

        assert.strictEqual(formattedItem.incidentDescription, `${"a".repeat(15)}[...]`, "Krisinformation descriptions should honor the configured max length");
    }

    static testAreaFilterMatches() {
        const payload = require("./fixtures/krisinformationLiveResponse.json");
        const config = { areas: ["Skåne län"] };

        const formatted = formatKrisinformationFeed(payload);
        const actualFeed = filterKrisinformationFeed(formatted, config);

        assert.ok(Array.isArray(actualFeed), "Filtered feed should be an array");
        assert.ok(actualFeed.length > 0, "Area filter should return at least one matching item");
        assert.ok(
            actualFeed[0].affectedAreaDetails.some((area) => area.Description === "Skåne län"),
            "Filtered item should include the configured county in affectedAreaDetails"
        );
    }

    static testAreaFilterNoMatch() {
        const payload = require("./fixtures/krisinformationLiveResponse.json");
        const config = { areas: ["Uppland"] };

        const formatted = formatKrisinformationFeed(payload);
        const actualFeed = filterKrisinformationFeed(formatted, config);
        assert.strictEqual(actualFeed.length, 0, "Area filter should return no items when nothing matches");
    }

    static testContentFilterExcludes() {
        const payload = require("./fixtures/krisinformationLiveResponse.json");
        const config = { filterContent: ["elfel"] };

        const formatted = formatKrisinformationFeed(payload);
        const actualFeed = filterKrisinformationFeed(formatted, config);

        assert.strictEqual(actualFeed.length, 0, "Content filter should exclude items containing the configured text");
    }

    static testKrisinformationWarningRelevanceHelperUsesDynamicTimestamps() {
        const payload = [
            {
                Published: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                Updated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                Preamble: "Dynamic relevance test",
                BodyText: "This should stay visible",
                Area: [{ Description: "Stockholm" }],
                SenderName: "Krisinformation",
            },
        ];

        const [formattedItem] = formatKrisinformationFeed(payload, { oldest: 7 });
        assert.strictEqual(isWarningRelevant(formattedItem), true, "Krisinformation relevance helper should include an item within the configured relevance window");
    }
}

FormatKrisinformationFeedTest.run();