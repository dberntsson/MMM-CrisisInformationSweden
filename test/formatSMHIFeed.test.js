const assert = require("assert");
const { formatSMHIFeed, filterSMHIFeed, isWarningRelevant } = require("../lib/smhiFeedUtils");
const { getIncidentPeriodString } = require("../lib/feedFormattingUtils");
const moment = require("moment");

class FormatSMHIFeedTest {
    static run() {
        console.log("Running formatSMHIFeed tests...");
        this.testEmptyFeed();
        this.testRealResponseFromSMHI();
        this.testSMHIFeedAffectedAreaFilter();
        this.testSMHIFeedAffectedAreaDetailsFilter();
        this.testSMHIFeedAffectedAreaNoMatchFilter();
        this.testSMHIFeedWarningActive();
        this.testSMHIFeedWarningExpired();
        this.testSMHIFeedWarningFuture();
        this.testExampleCodeFromSMHI();
        this.testCountPreservesItemCount();
        this.testSMHIFeedTruncatesIncidentDescriptionToMaxLength();
        this.testSMHIFeedUsesAffectDescriptionWhenHappensIsMissing();
        this.testSMHIFeedMapsAffectedAreaAndAreaDetails();
        this.testSMHIFeedLeavesAffectedAreaDetailsUndefinedWhenWhereClauseIsMissing();
        this.testSingleWarningArea();
        this.testMultipleWarnings();
        this.testSMHIFeedContentFilterNoMatch();
        this.testSharedIncidentPeriodFormatterMatchesFeedOutput();
        console.log("All formatSMHIFeed tests passed.");
    }

    static testEmptyFeed() {
        const payload = [];
        const expected = [];
        const actual = formatSMHIFeed(payload);
        assert.deepStrictEqual(actual, expected, "Empty payload should return an empty array");
    }

    static testRealResponseFromSMHI() {
        const payload = require("./fixtures/smhiLiveResponse.json");

        const expectedIncidentDescription = (() => {
            const rawDescription = payload[0].warningAreas[0].descriptions.find((description) => description.title?.code === "AFFECT")?.text?.sv;
            if (typeof rawDescription !== "string") return undefined;

            const maxLength = 400;
            if (rawDescription.length <= maxLength) return rawDescription;
            return `${rawDescription.slice(0, maxLength - 5)}[...]`;
        })();

        const expectedFeed = [
            {
                publishTime: "2026-06-02T13:47:43.956Z",
                updatedTime: undefined,
                origin: "SMHI",
                warningLevel: "Meddelande",
                warningRelevantStartTime: "2026-06-02T13:47:43.956Z",
                warningRelevantStopTime: undefined,
                incidentStartTime: "2026-04-21T09:02:43.328Z",
                incidentStopTime: undefined,
                incidentPeriodString: getIncidentPeriodString("2026-04-21T09:02:43.328Z", undefined),
                incidentTitle: "Låga grundvattennivåer. Låga flöden i Rönne å och i Kävlingeån.",
                incidentDescription: expectedIncidentDescription,
                affectedArea: ["Skåne län"],
                affectedAreaDetails: undefined,
            },
        ];

        const actualFeed = formatSMHIFeed(payload);
        // Ensure we got results and that the first formatted entry matches the expected sample
        assert.ok(Array.isArray(actualFeed) && actualFeed.length > 0, "Formatted feed should contain at least one entry");
        assert.deepStrictEqual(actualFeed[0], expectedFeed[0], "First formatted entry should match expected sample");
    }

    static testSMHIFeedAffectedAreaFilter() {
        const payload = require("./fixtures/smhiSampleResponse.json");
        const config = { smhiFeedInterestingAreas: ["Kattegatt"] };

        const formatted = formatSMHIFeed(payload);
        const actualFeed = filterSMHIFeed(formatted, true, config);
        assert.strictEqual(actualFeed.length, 1, "SMHI filter should return one item for Kattegatt");
        assert.ok(
            actualFeed[0].affectedArea.some((area) => String(area).toLowerCase().includes("kattegatt")),
            "Filtered item should contain Kattegatt"
        );
    }

    static testSMHIFeedAffectedAreaDetailsFilter() {
        const payload = require("./fixtures/smhiSampleResponse.json");
        const config = { smhiFeedInterestingAreas: ["Öland"] };

        const formatted = formatSMHIFeed(payload);
        const actualFeed = filterSMHIFeed(formatted, true, config);
        assert.strictEqual(actualFeed.length, 1, "SMHI filter should return one item for Öland");
        assert.ok(
            String(actualFeed[0].affectedAreaDetails).toLowerCase().includes("öland"),
            "Filtered item should contain Öland in affectedAreaDetails"
        );
    }

    static testSMHIFeedAffectedAreaNoMatchFilter() {
        const payload = require("./fixtures/smhiSampleResponse.json");
        const config = { smhiFeedInterestingAreas: ["random-non-matching-string"] };

        const formatted = formatSMHIFeed(payload);
        const actualFeed = filterSMHIFeed(formatted, true, config);
        assert.strictEqual(actualFeed.length, 0, "SMHI filter should return no items for a non-matching string");
    }

    static testSMHIFeedWarningActive() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: `${moment().subtract(1, "days")}`,
                        warningLevel: { sv: "Gul" },
                        approximateStart: `${moment().subtract(2, "days")}`,
                        approximateEnd: `${moment().add(1, "days")}`,
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Active Warning" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Currently happening" } },
                            { title: { code: "WHERE" }, text: { sv: "Västergötland" } },
                        ],
                        affectedAreas: ["Västergötland"],
                    },
                ],
            },
        ];

        const [formattedItem] = formatSMHIFeed(payload);
        assert.strictEqual(isWarningRelevant(formattedItem), true, "SMHI relevance helper should include an item that is currently active");
    }

    static testSMHIFeedWarningExpired() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: `${moment().subtract(10, "days")}`,
                        warningLevel: { sv: "Orange" },
                        approximateStart: `${moment().subtract(12, "days")}`,
                        approximateEnd: `${moment().subtract(1, "days")}`,
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Expired Warning" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Already happened" } },
                            { title: { code: "WHERE" }, text: { sv: "Värmland" } },
                        ],
                        affectedAreas: ["Värmland"],
                    },
                ],
            },
        ];

        const [formattedItem] = formatSMHIFeed(payload);
        assert.strictEqual(isWarningRelevant(formattedItem), false, "SMHI relevance helper should exclude an item whose stop time is in the past");
    }

    static testSMHIFeedWarningFuture() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: `${moment().add(1, "days")}`,
                        warningLevel: { sv: "Röd" },
                        approximateStart: `${moment().add(1, "days")}`,
                        approximateEnd: `${moment().add(2, "days")}`,
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Future Warning" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Will happen" } },
                            { title: { code: "WHERE" }, text: { sv: "Norrbotten" } },
                        ],
                        affectedAreas: ["Norrbotten"],
                    },
                ],
            },
        ];

        const [formattedItem] = formatSMHIFeed(payload);
        assert.strictEqual(isWarningRelevant(formattedItem), false, "SMHI relevance helper should exclude a warning that has not been published yet");
    }

    static testSMHIFeedGeneratesIncidentPeriodStringRelativeToNow() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: `${moment().subtract(1, "hours")}`,
                        warningLevel: { sv: "Gul" },
                        approximateStart: `${moment().add(2, "hours")}`,
                        approximateEnd: `${moment().add(5, "hours")}`,
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Future incident" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Starts soon" } },
                            { title: { code: "WHERE" }, text: { sv: "Skåne" } },
                        ],
                        affectedAreas: ["Skåne"],
                    },
                ],
            },
        ];

        const [formattedItem] = formatSMHIFeed(payload);
        const expectedStart = `${moment(formattedItem.incidentStartTime).format("YYYY-MM-DD HH:mm")}`;
        const expectedStop = `${moment(formattedItem.incidentStopTime).format("YYYY-MM-DD HH:mm")}`;

        assert.strictEqual(formattedItem.incidentPeriodString, `${expectedStart} -- ${expectedStop}`, "incidentPeriodString should reflect the incident start and stop times");
    }

    static testCountPreservesItemCount() {
        const payload = require("./fixtures/smhiLiveResponse.json");

        function countWarningEntries(input) {
            if (!Array.isArray(input)) return 0;
            return input.reduce((sum, it) => {
                return sum + (Array.isArray(it.warningAreas) ? it.warningAreas.length : 0);
            }, 0);
        }

        const expectedCount = countWarningEntries(payload);
        const actual = formatSMHIFeed(payload);
        assert.strictEqual(actual.length, expectedCount, "Formatted feed should have same number of entries as input warningAreas");
    }

    static testExampleCodeFromSMHI() {
        const payload = require("./fixtures/smhiSampleResponse.json");

        const truncateText = (value, maxLength = 400) => {
            if (typeof value !== "string") return value;
            if (value.length <= maxLength) return value;
            return `${value.slice(0, maxLength - 5)}[...]`;
        };

        const getDescriptionText = (warningArea) => {
            const direct = warningArea?.descriptions?.find((description) => description.title?.code === "HAPPENS")?.text?.sv;
            if (typeof direct === "string" && direct.length > 0) return direct;

            return warningArea?.descriptions?.find((description) => description.title?.code === "AFFECT")?.text?.sv;
        };

        const expectedFeed = [
            {
                publishTime: "2021-09-20T09:08:40.862Z",
                updatedTime: undefined,
                origin: "SMHI",
                warningLevel: "Gul",
                warningRelevantStartTime: "2021-09-20T09:08:40.862Z",
                warningRelevantStopTime: "2026-06-29T08:00:00.000Z",
                incidentStartTime: "2026-06-27T08:00:00.000Z",
                incidentStopTime: "2026-06-29T08:00:00.000Z",
                incidentPeriodString: getIncidentPeriodString("2026-06-27T08:00:00.000Z", "2026-06-29T08:00:00.000Z"),
                incidentTitle: 'TESTMEDDELANDE Under torsdagen väntas tilltagande västlig vind med byvindar upp till stormstyrka som bland annat medför risk för nedfallna träd, begränsad framkomlighet i trafiken och risk för flygande föremål. Vinden avtar västerifrån under kvällen.',
                incidentDescription: truncateText(getDescriptionText(payload[0].warningAreas[0])),
                affectedArea: ["Västra Götalands län"],
                affectedAreaDetails: "TEST Hallands län, Skåne län, Kronobergs län, Blekinge län och Kalmar län, inklusive Öland.",
            },
            {
                publishTime: "2021-09-20T09:10:16.237Z",
                updatedTime: undefined,
                origin: "SMHI",
                warningLevel: "Gul",
                warningRelevantStartTime: "2021-09-20T09:10:16.237Z",
                warningRelevantStopTime: "2026-06-30T08:00:00.000Z",
                incidentStartTime: "2026-06-27T08:00:00.000Z",
                incidentStopTime: "2026-06-30T08:00:00.000Z",
                incidentPeriodString: getIncidentPeriodString("2026-06-27T08:00:00.000Z", "2026-06-30T08:00:00.000Z"),
                incidentTitle: "TESTMEDDELANDE Från torsdag förmiddag till torsdag eftermiddag sydväst ca 15 m/s.",
                incidentDescription: truncateText(getDescriptionText(payload[1].warningAreas[0])),
                affectedArea: ["Kattegatt"],
                affectedAreaDetails: "TEST Västra delen av Kattegatt",
            },
        ];

        const actualFeed = formatSMHIFeed(payload);
        assert.deepStrictEqual(actualFeed, expectedFeed, "SMHI example payload should format correctly");
    }
    static testSMHIFeedUsesAffectDescriptionWhenHappensIsMissing() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: "2026-06-28T10:00:00Z",
                        warningLevel: { sv: "Meddelande", en: "Message" },
                        approximateStart: "2026-06-29T00:00:00Z",
                        approximateEnd: "2026-06-30T00:00:00Z",
                        descriptions: [
                            { title: { code: "INCIDENT", sv: "Händelsebeskrivning", en: "Description of incident" }, text: { sv: "Risken för bränder i skog och mark är stor", en: "The risk of forest and land fires is high." } },
                            { title: { code: "AFFECT", sv: "Vad ska jag tänka på?", en: "What should I think about?" }, text: { sv: "Skogsbrand kan lätt uppstå.", en: "Forest fire can easily occur." } },
                            { title: { code: "WHERE", sv: "Var?", en: "Where?" }, text: { sv: "Skåne", en: "Skåne" } },
                        ],
                        affectedAreas: [{ id: 12, sv: "Skåne län", en: "Skåne County" }],
                    },
                ],
            },
        ];

        const [formattedItem] = formatSMHIFeed(payload, { preferredLocale: "en" });

        assert.strictEqual(formattedItem.incidentDescription, "Forest fire can easily occur.", "incidentDescription should use the AFFECT description when HAPPENS is missing");
    }

    static testSMHIFeedTruncatesIncidentDescriptionToMaxLength() {
        const longDescription = "a".repeat(1010); // 1010 characters long
        const payload = [
            {
                warningAreas: [
                    {
                        published: "2026-06-28T10:00:00Z",
                        warningLevel: { sv: "Meddelande" },
                        approximateStart: "2026-06-29T00:00:00Z",
                        approximateEnd: "2026-06-30T00:00:00Z",
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Titel" } },
                            { title: { code: "HAPPENS" }, text: { sv: longDescription } },
                            { title: { code: "WHERE" }, text: { sv: "Skåne" } },
                        ],
                        affectedAreas: [{ id: 12, sv: "Skåne län" }],
                    },
                ],
            },
        ];

        const [formattedItem] = formatSMHIFeed(payload);

        assert.strictEqual(formattedItem.incidentDescription, `${longDescription.slice(0, 395)}[...]`, "incidentDescription should be truncated to 400 visible characters");
    }

    static testSMHIFeedMapsAffectedAreaAndAreaDetails() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: "2026-06-28T10:00:00Z",
                        warningLevel: { sv: "Gul", en: "Yellow" },
                        approximateStart: "2026-06-29T00:00:00Z",
                        approximateEnd: "2026-06-30T00:00:00Z",
                        descriptions: [
                            { title: { code: "INCIDENT", sv: "Händelse", en: "Incident" }, text: { sv: "Händelsebeskrivning", en: "Incident description" } },
                            { title: { code: "HAPPENS", sv: "Vad händer?", en: "What happens?" }, text: { sv: "Det händer", en: "It happens" } },
                            { title: { code: "WHERE", sv: "Var?", en: "Where?" }, text: { sv: "Delar av Blekinge, Kalmar och Kronobergs län.", en: "Parts of Blekinge, Kalmar and Kronoberg counties." } },
                        ],
                        affectedAreas: [{ id: 8, sv: "Kalmar län", en: "Kalmar County" }],
                    },
                ],
            },
        ];

        const [formattedItem] = formatSMHIFeed(payload, { preferredLocale: "en" });

        assert.strictEqual(formattedItem.warningLevel, "Yellow", "warningLevel should resolve to the configured locale");
        assert.strictEqual(formattedItem.incidentTitle, "Incident description", "incidentTitle should resolve to the configured locale");
        assert.strictEqual(formattedItem.incidentDescription, "It happens", "incidentDescription should resolve to the configured locale");
        assert.deepStrictEqual(formattedItem.affectedArea, ["Kalmar County"], "affectedArea should resolve to localized area names");
        assert.strictEqual(formattedItem.affectedAreaDetails, "Parts of Blekinge, Kalmar and Kronoberg counties.", "affectedAreaDetails should resolve to the WHERE description text in the configured locale");
    }

    static testSMHIFeedLeavesAffectedAreaDetailsUndefinedWhenWhereClauseIsMissing() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: "2026-06-28T10:00:00Z",
                        warningLevel: { sv: "Gul", en: "Yellow" },
                        approximateStart: "2026-06-29T00:00:00Z",
                        approximateEnd: "2026-06-30T00:00:00Z",
                        descriptions: [
                            { title: { code: "INCIDENT", sv: "Händelsebeskrivning", en: "Description of incident" }, text: { sv: "Låga grundvattennivåer. Låga flöden i Rönne å, Helgeån och i Kävlingeån, samt i Kävlingeåns biflöden.", en: "Low groundwater levels. Low flows in rivers Rönne å and Kävlingeån, and in tributaries to river Kävlingeån." } },
                            { title: { code: "AFFECT", sv: "Vad ska jag tänka på?", en: "What should I think about?" }, text: { sv: "Du som använder kommunalt vatten bör vara uppmärksam på att kommunen kan utfärda restriktioner och uppmana till vattenbesparande åtgärder.\nDu som har enskilt vatten från egen eller delad brunn bör vara sparsam med vattenförbrukningen eftersom låga grundvattennivåer kan minska uttagskapaciteten och försämra vattenkvaliteten.\nVerksamheter och hushåll med enskilt vatten från sjöar eller vattendrag bör vara vaksamma på att låga vattennivåer kan begränsa uttagsmängderna och försämra vattenkvaliteten.\nLåga vattennivåer kan ha negativ påverkan på växt- och djurliv inom jordbruket och i naturen.", en: "Users of municipal water should be aware that the municipality may impose restrictions and encourage water-saving measures.\nThose receiving water from private or shared wells should be considerate of their water consumption, as low groundwater levels may reduce abstraction capacity and deteriorate water quality.\nBusinesses and households with private water from lakes or rivers should be aware that low water levels may limit the amount of water withdrawn and degrade water quality.\nLow water levels may have a negative impact on plant and animal life in agriculture and in nature." } },
                        ],
                        affectedAreas: [{ id: 12, sv: "Skåne län", en: "Skåne County" }],
                    },
                ],
            },
        ];

        const [formattedItem] = formatSMHIFeed(payload, { preferredLocale: "en" });

        assert.strictEqual(formattedItem.affectedAreaDetails, undefined, "affectedAreaDetails should be undefined when no WHERE description exists");
    }

    static testSingleWarningArea() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: "2026-06-28T10:00:00Z",
                        warningLevel: { sv: "Gul" },
                        approximateStart: "2026-06-29T00:00:00Z",
                        approximateEnd: "2026-06-30T00:00:00Z",
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Storm" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Blåser kraftigt" } },
                            { title: { code: "WHERE" }, text: { sv: "Kust" } },
                        ],
                        affectedAreas: ["Gotland"],
                    },
                ],
            },
        ];

        const expected = [
            {
                publishTime: "2026-06-28T10:00:00Z",
                updatedTime: undefined,
                origin: "SMHI",
                warningLevel: "Gul",
                warningRelevantStartTime: "2026-06-28T10:00:00Z",
                warningRelevantStopTime: "2026-06-30T00:00:00Z",
                incidentStartTime: "2026-06-29T00:00:00Z",
                incidentStopTime: "2026-06-30T00:00:00Z",
                incidentPeriodString: getIncidentPeriodString("2026-06-29T00:00:00Z", "2026-06-30T00:00:00Z"),
                incidentTitle: "Storm",
                incidentDescription: "Blåser kraftigt",
                affectedArea: ["Gotland"],
                affectedAreaDetails: "Kust",
            },
        ];

        const actual = formatSMHIFeed(payload);
        assert.deepStrictEqual(actual, expected, "Payload with one warning area should be mapped correctly");
    }

    static testMultipleWarnings() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: "2026-06-28T11:00:00Z",
                        warningLevel: { sv: "Orange" },
                        approximateStart: "2026-06-28T12:00:00Z",
                        approximateEnd: "2026-06-28T18:00:00Z",
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Översvämning" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Vattennivån stiger" } },
                            { title: { code: "WHERE" }, text: { sv: "Nära ån" } },
                        ],
                        affectedAreas: ["Västra Götaland"],
                    },
                    {
                        published: "2026-06-28T12:30:00Z",
                        warningLevel: { sv: "Röd" },
                        approximateStart: "2026-06-28T13:00:00Z",
                        approximateEnd: "2026-06-28T16:00:00Z",
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Halka" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Blir mycket halt" } },
                            { title: { code: "WHERE" }, text: { sv: "Vägar" } },
                        ],
                        affectedAreas: ["Dalarna"],
                    },
                ],
            },
        ];

        const expected = [
            {
                publishTime: "2026-06-28T11:00:00Z",
                updatedTime: undefined,
                origin: "SMHI",
                warningLevel: "Orange",
                warningRelevantStartTime: "2026-06-28T11:00:00Z",
                warningRelevantStopTime: "2026-06-28T18:00:00Z",
                incidentStartTime: "2026-06-28T12:00:00Z",
                incidentStopTime: "2026-06-28T18:00:00Z",
                incidentPeriodString: getIncidentPeriodString("2026-06-28T12:00:00Z", "2026-06-28T18:00:00Z"),
                incidentTitle: "Översvämning",
                incidentDescription: "Vattennivån stiger",
                affectedArea: ["Västra Götaland"],
                affectedAreaDetails: "Nära ån",
            },
            {
                publishTime: "2026-06-28T12:30:00Z",
                updatedTime: undefined,
                origin: "SMHI",
                warningLevel: "Röd",
                warningRelevantStartTime: "2026-06-28T12:30:00Z",
                warningRelevantStopTime: "2026-06-28T16:00:00Z",
                incidentStartTime: "2026-06-28T13:00:00Z",
                incidentStopTime: "2026-06-28T16:00:00Z",
                incidentPeriodString: getIncidentPeriodString("2026-06-28T13:00:00Z", "2026-06-28T16:00:00Z"),
                incidentTitle: "Halka",
                incidentDescription: "Blir mycket halt",
                affectedArea: ["Dalarna"],
                affectedAreaDetails: "Vägar",
            },
        ];

        const actual = formatSMHIFeed(payload);
        assert.deepStrictEqual(actual, expected, "Payload with multiple warnings should return all mapped entries");
    }

    static testSMHIFeedContentFilterExcludes() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: `${moment().subtract(1, 'days')}`,
                        warningLevel: { sv: "Gul" },
                        approximateStart: `${moment().subtract(1, 'days')}`,
                        approximateEnd: `${moment().add(1, 'days')}`,
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Snöstorm" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Mycket snö faller" } },
                            { title: { code: "WHERE" }, text: { sv: "Norrbotten" } },
                        ],
                        affectedAreas: ["Norrbotten"],
                    },
                ],
            },
        ];

        const formatted = formatSMHIFeed(payload);
        const config = { filterContent: ["snö"] };
        const actualFeed = filterSMHIFeed(formatted, config);

        assert.strictEqual(actualFeed.length, 0, "Content filter should exclude warnings containing the filtered text");
    }

    static testSMHIFeedContentFilterNoMatch() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: `${moment().subtract(1, "days")}`,
                        warningLevel: { sv: "Gul" },
                        approximateStart: `${moment().subtract(1, "days")}`,
                        approximateEnd: `${moment().add(1, "days")}`,
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Snöstorm" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Mycket snö faller" } },
                            { title: { code: "WHERE" }, text: { sv: "Norrbotten" } },
                        ],
                        affectedAreas: ["Norrbotten"],
                    },
                ],
            },
        ];

        const formatted = formatSMHIFeed(payload);
        const config = { filterContent: ["regn"] };
        const actualFeed = filterSMHIFeed(formatted, config);

        assert.strictEqual(actualFeed.length, 1, "Content filter should include warnings when filter text doesn't match");
    }

    static testSharedIncidentPeriodFormatterMatchesFeedOutput() {
        const startTime = "2026-07-02T09:00:00.000Z";
        const stopTime = "2026-07-02T12:00:00.000Z";

        const actual = getIncidentPeriodString(startTime, stopTime);
        const formattedItem = formatSMHIFeed([
            {
                warningAreas: [
                    {
                        published: startTime,
                        warningLevel: { sv: "Gul" },
                        approximateStart: startTime,
                        approximateEnd: stopTime,
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Shared formatter" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Shared formatter" } },
                            { title: { code: "WHERE" }, text: { sv: "Stockholm" } },
                        ],
                        affectedAreas: ["Stockholm"],
                    },
                ],
            },
        ])[0];

        assert.strictEqual(actual, formattedItem.incidentPeriodString, "The shared formatter should produce the same output as the feed formatter");
    }

    static testSMHIFeedContentFilterMultiple() {
        const payload = [
            {
                warningAreas: [
                    {
                        published: `${moment().subtract(1, "days")}`,
                        warningLevel: { sv: "Orange" },
                        approximateStart: `${moment().subtract(1, "days")}`,
                        approximateEnd: `${moment().add(1, "days")}`,
                        descriptions: [
                            { title: { code: "INCIDENT" }, text: { sv: "Värmebölga" } },
                            { title: { code: "HAPPENS" }, text: { sv: "Mycket varmt" } },
                            { title: { code: "WHERE" }, text: { sv: "Södra Sverige" } },
                        ],
                        affectedAreas: ["Skåne"],
                    },
                ],
            },
        ];

        const formatted = formatSMHIFeed(payload);
        const config = { filterContent: ["snö", "varmt"] };
        const actualFeed = filterSMHIFeed(formatted, config);

        assert.strictEqual(actualFeed.length, 0, "Content filter should exclude when any filter text matches");
    }
}

FormatSMHIFeedTest.run();
