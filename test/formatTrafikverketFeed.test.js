const assert = require("assert");
const { formatTrafikverketFeed, filterTrafikverketFeed } = require("../lib/trafikverketFeedUtils");

class FormatTrafikverketFeedTest {
    static run() {
        console.log("Running Trafikverket feed tests...");
        this.testFormatsNestedResponseIntoUiShape();
        this.testSkipsSituationsWithoutDeviationEntries();
        this.testFiltersByContentAndWarningRelevance();
        console.log("All Trafikverket feed tests passed.");
    }

    static testFormatsNestedResponseIntoUiShape() {
        const publishTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const updatedTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const startTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const endTime = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

        const payload = {
            RESPONSE: {
                RESULT: [{
                    Situation: [{
                        PublicationTime: publishTime,
                        ModifiedTime: updatedTime,
                        Deviation: [{
                            Creator: "Trafikverket",
                            StartTime: startTime,
                            EndTime: endTime,
                            Header: "Vägarbete på E4",
                            Message: "Ett körfält är avstängt.",
                            SeverityCode: 4,
                            SeverityText: "Mycket stor påverkan",
                            LocationDescriptor: "E4 vid Södertälje",
                        }],
                    }],
                }],
            },
        };

        const [formattedEntry] = formatTrafikverketFeed(payload, { descriptionMaxLength: 400 });

        assert.strictEqual(formattedEntry.publishTime, publishTime);
        assert.strictEqual(formattedEntry.updatedTime, updatedTime);
        assert.strictEqual(formattedEntry.warningLevelCode, 4);
        assert.strictEqual(formattedEntry.warningLevelText, "Mycket stor påverkan");
        assert.strictEqual(formattedEntry.incidentTitle, "Vägarbete på E4");
        assert.strictEqual(formattedEntry.incidentDescription, "Ett körfält är avstängt.");
        assert.strictEqual(formattedEntry.affectedAreaDetails, "E4 vid Södertälje");
        assert.strictEqual(formattedEntry.origin, "Trafikverket");
    }

    static testSkipsSituationsWithoutDeviationEntries() {
        const payload = {
            RESPONSE: {
                RESULT: [{
                    Situation: [{
                        PublicationTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                        ModifiedTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                        Deviation: [],
                    }],
                }],
            },
        };

        const formatted = formatTrafikverketFeed(payload);
        assert.deepStrictEqual(formatted, [], "Situations without deviation entries should not produce formatted items");
    }

    static testFiltersByContentAndWarningRelevance() {
        const publishTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const updatedTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const warningRelevantStartTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const warningRelevantStopTime = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

        const payload = [{
            publishTime,
            updatedTime,
            warningRelevantStartTime,
            warningRelevantStopTime,
            incidentTitle: "Vägarbete på E4",
            incidentDescription: "Ett körfält är avstängt.",
            affectedAreaDetails: "E4 vid Södertälje",
            origin: "Trafikverket",
        }];

        const filtered = filterTrafikverketFeed(payload, { filterContent: ["Södertälje"] });

        assert.strictEqual(filtered.length, 0);
    }
}

FormatTrafikverketFeedTest.run();