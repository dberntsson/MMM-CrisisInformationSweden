const assert = require("assert");
const {
    applyTrafikverketRequestVariables,
    parseHttpRequest,
} = require("../lib/trafikverketRequestUtils");

class TrafikverketRequestUtilsTest {
    static run() {
        console.log("Running Trafikverket request utility tests...");
        this.testAppliesGenericConfigPlaceholders();
        this.testRemovesCountyCriterionWhenCountyNosIsEmpty();
        this.testRemovesWithinCriterionWhenCoordinatePairIsIncomplete();
        console.log("All Trafikverket request utility tests passed.");
    }

    static testAppliesGenericConfigPlaceholders() {
        const template = [
            "POST https://example.test/data HTTP/1.1",
            "content-type: application/xml",
            "x-api-key: {{ trafikverketAuthenticationKey }}",
            "",
            "<REQUEST>",
            "  <LOGIN authenticationkey=\"{{ trafikverketAuthenticationKey }}\" />",
            "</REQUEST>",
        ].join("\n");

        const actual = applyTrafikverketRequestVariables(template, {
            trafikverketAuthenticationKey: "real-key",
        });

        assert.ok(actual.includes("x-api-key: real-key"));
        assert.ok(actual.includes("authenticationkey=\"real-key\""));
    }

    static testRemovesCountyCriterionWhenCountyNosIsEmpty() {
        const template = [
            "<FILTER>",
            "  <AND>",
            "    <IN name=\"Deviation.CountyNo\" value=\"{{ trafikverketCountyNos }}\" />",
            "  </AND>",
            "</FILTER>",
        ].join("\n");

        const actual = applyTrafikverketRequestVariables(template, {
            trafikverketCountyNos: "   ",
        });

        assert.ok(!actual.includes("Deviation.CountyNo"));
    }

    static testRemovesWithinCriterionWhenCoordinatePairIsIncomplete() {
        const template = [
            "<FILTER>",
            "  <AND>",
            "    <WITHIN name=\"Deviation.Geometry.Point.SWEREF99TM\" shape=\"center\" value=\"{{ trafikverketLocationCoordinates }}\" radius=\"{{ trafikverketLocationRadius }}\" />",
            "  </AND>",
            "</FILTER>",
        ].join("\n");

        const actual = applyTrafikverketRequestVariables(template, {
            trafikverketLocationCoordinates: "",
            trafikverketLocationRadius: 20000,
        });

        assert.ok(!actual.includes("Deviation.Geometry.Point.SWEREF99TM"));
    }
}

TrafikverketRequestUtilsTest.run();