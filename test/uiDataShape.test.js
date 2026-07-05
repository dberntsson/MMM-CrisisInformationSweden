const assert = require("assert");
const { formatSMHIFeed } = require("../lib/smhiFeedUtils");
const { formatKrisinformationFeed } = require("../lib/krisinformationFeedUtils");

class UiDataShapeTest {
    static run() {
        console.log("Running UI data-shape tests...");
        this.testSMHIFeedUiFieldsMatchFixture();
        this.testKrisinformationUiFieldsMatchFixture();
        console.log("All UI data-shape tests passed.");
    }

    static buildUiViewModel(entry) {
        return {
            title: entry.incidentTitle?.sv || entry.incidentTitle,
            description: entry.incidentDescription?.sv || entry.incidentDescription,
            area: entry.affectedAreaDetails?.sv || entry.affectedAreaDetails?.Description || entry.affectedAreaDetails,
            origin: entry.origin,
            publishTime: entry.publishTime,
            updatedTime: entry.updatedTime,
            warningLevelText: entry.warningLevelText?.sv || entry.warningLevelText,
        };
    }

    static testSMHIFeedUiFieldsMatchFixture() {
        const payload = require("./fixtures/smhiSampleResponse.json");
        const [formattedEntry] = formatSMHIFeed(payload);
        const viewModel = this.buildUiViewModel(formattedEntry);

        assert.strictEqual(viewModel.title, formattedEntry.incidentTitle);
        assert.strictEqual(viewModel.description, formattedEntry.incidentDescription);
        assert.strictEqual(viewModel.area, formattedEntry.affectedAreaDetails);
        assert.strictEqual(viewModel.origin, "SMHI");
        assert.strictEqual(viewModel.warningLevelText, formattedEntry.warningLevelText);
        assert.strictEqual(viewModel.publishTime, formattedEntry.publishTime);
    }

    static testKrisinformationUiFieldsMatchFixture() {
        const payload = require("./fixtures/krisinformationLiveResponse.json");
        const [formattedEntry] = formatKrisinformationFeed(payload, { oldest: 7 });
        const viewModel = this.buildUiViewModel(formattedEntry);

        assert.strictEqual(viewModel.title, formattedEntry.incidentTitle);
        assert.strictEqual(viewModel.description, formattedEntry.incidentDescription);
        assert.strictEqual(viewModel.area, formattedEntry.affectedAreaDetails);
        assert.strictEqual(viewModel.origin, formattedEntry.origin);
        assert.strictEqual(viewModel.warningLevelText, formattedEntry.warningLevelText);   
        assert.strictEqual(viewModel.publishTime, formattedEntry.publishTime);
    }
}

UiDataShapeTest.run();
