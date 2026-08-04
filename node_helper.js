/* node_helper.js
 *
 * MagicMirror² module - News feed from the Swedish Government Crisis Information (Krisinformation.se).
 *
 * Module: MMM-CrisisInformationSweden
 *
 * MagicMirror² by Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * Module MMM-CrisisInformationSweden by Anders Boghammar
 */
const Log = require("logger");
const NodeHelper = require("node_helper");
const fs = require("node:fs/promises");
const path = require("node:path");
const {
    formatSMHIFeed: formatSMHIFeedLib,
    filterSMHIFeed: filterSMHIFeedLib,
} = require("./lib/smhiFeedUtils");
const {
    formatKrisinformationFeed: formatKrisinformationFeedLib,
    filterKrisinformationFeed: filterKrisinformationFeedLib,
} = require("./lib/krisinformationFeedUtils");
const {
    formatDemoFeed: formatDemoFeedLib,
    filterDemoFeed: filterDemoFeedLib,
} = require("./lib/demoFeedUtils");
const {
    formatTrafikverketFeed: formatTrafikverketFeedLib,
    filterTrafikverketFeed: filterTrafikverketFeedLib,
} = require("./lib/trafikverketFeedUtils");
const {
    applyTrafikverketRequestVariables,
    parseHttpRequest,
} = require("./lib/trafikverketRequestUtils");

module.exports = NodeHelper.create({
    // --------------------------------------- Start the helper
    start () {
        const self = this;
        Log.log(`Starting helper: ${self.name}`);
        this.started = false;
    },

    // --------------------------------------- Schedule a feed update
    scheduleUpdate () {
        const self = this;
        this.updatetimer = setInterval(() => { // This timer is saved in uitimer so that we can cancel it
            self.getAllFeeds();
        }, self.config.updateInterval);
    },


    async getAllFeeds () {
        const self = this;

        if (!this.config.fetchKrisinformationFeed) {
            Log.log("Krisinformation feed disabled by config (fetchKrisinformationFeed=false)");
        }
        if (!this.config.fetchSMHIFeed) {
            Log.log("SMHI feed disabled by config (fetchSMHIFeed=false)");
        }
        if (!this.config.fetchDemoFeed) {
            Log.log("Demo feed disabled by config (fetchDemoFeed=false)");
        }
        if (!this.config.fetchTrafikverketFeed) {
            Log.log("Trafikverket feed disabled by config (fetchTrafikverketFeed=false)");
        }

        const [feed1, feed2, feed3, feed4] = await Promise.all([
            this.config.fetchKrisinformationFeed
                ? this.getKrisinformationFeed()
                : Promise.resolve([]),
            this.config.fetchSMHIFeed
                ? this.getSMHIFeed()
                : Promise.resolve([]),
            this.config.fetchDemoFeed
                ? this.getDemoFeed()
                : Promise.resolve([]),
            this.config.fetchTrafikverketFeed
                ? this.getTrafikverketFeed()
                : Promise.resolve([]),
        ]);

        const allFeeds = [feed1, feed2, feed3, feed4]
            .flatMap((feed) => Array.isArray(feed) ? feed : []);

        // Sort the feeds by updatedTime or publishTime in descending order (most recent first)
        const filteredFeed = allFeeds.sort((left, right) => {
            const leftTime = Date.parse(left?.updatedTime ?? left?.publishTime ?? 0);
            const rightTime = Date.parse(right?.updatedTime ?? right?.publishTime ?? 0);

            const normalizedLeft = Number.isNaN(leftTime) ? 0 : leftTime;
            const normalizedRight = Number.isNaN(rightTime) ? 0 : rightTime;
            return normalizedRight - normalizedLeft;
        });

        self.sendSocketNotification("NEW_FEED", filteredFeed); // Send feed to module
    },

    // --------------------------------------- Retrive weatherwarnings from SMHI.se
    async getSMHIFeed () {
        const self = this;
        const url = "https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json";
        Log.log(`Calling ${url}`);
        Log.debug(`   With config: ` + JSON.stringify(this.config));

        //Fetch the feed from SMHI.se
        const feed = await this.fetchFeed(url);

        // Format and filter the SMHI feed according to the configuration
        const formattedFeed = self.formatSMHIFeed(feed, this.config);
        const filteredFeed = self.filterSMHIFeed(formattedFeed, this.config);

        Log.log(`Sending ${filteredFeed.length} (of ${formattedFeed.length}) feed items from smhi to module (NEW_FEED)`);
        return filteredFeed;
    },

    // --------------------------------------- Retrive feed from Krisinformation.se
    async getKrisinformationFeed () {
        const self = this;
        const url = "https://api.krisinformation.se/v3/news/?includeTest=0&allCounties=True";
        Log.log(`Calling ${url}`);
        Log.debug(`   With config: ` + JSON.stringify(this.config));

        //Fetch the feed from Krisinformation.se
        const feed = await this.fetchFeed(url);

        //Filter the feed according to the configuration
        const formattedFeed = self.formatKrisinformationFeed(feed, this.config);
        const filteredFeed = self.filterKrisinformationFeed(formattedFeed, this.config);

        Log.log(`Sending ${filteredFeed.length} (of ${formattedFeed.length}) feed items from Krisinformation to module (NEW_FEED)`);
        return filteredFeed;
    },

    // --------------------------------------- Retrive feed from local resource for demo purposes
    async getDemoFeed () {
        const self = this;
        const configuredResourcePath = this.config.demoFeedResourcePath || "resources/demoFeed.json";
        const resourcePath = path.resolve(__dirname, configuredResourcePath);
        Log.log(`Loading demo feed resource ${resourcePath}`);
        Log.debug(`   With config: ` + JSON.stringify(this.config));

        // Fetch the feed from a local resource file
        const feed = await this.fetchResourceFeed(resourcePath);

        //Filter the feed according to the configuration
        const formattedFeed = self.formatDemoFeed(feed, this.config);
        const filteredFeed = self.filterDemoFeed(formattedFeed);

        Log.log(`Sending ${filteredFeed.length} (of ${formattedFeed.length}) feed items from demo to module (NEW_FEED)`);
        return filteredFeed;
    },

    // --------------------------------------- Retrive feed from Trafikverket.se
    async getTrafikverketFeed () {
        const configuredResourcePath = "resources/trafikverket-situation.http";
        const resourcePath = path.resolve(__dirname, configuredResourcePath);
        Log.log(`Loading Trafikverket request resource ${resourcePath}`);
        Log.debug(`   With config: ` + JSON.stringify(this.config));

        let feed = [];

        //validate config.trafikverketAuthenticationKey. if it is empty or undefined or "YOUR-API-KEY", log a warning and return an empty feed
        if (!this.config.trafikverketAuthenticationKey || this.config.trafikverketAuthenticationKey === "YOUR-API-KEY") {
            Log.warn("Trafikverket feed disabled due to insufficient config (trafikverketAuthenticationKey is empty or invalid)");
        } else {
            feed = await this.fetchTrafikverketFeed(resourcePath);
        }
        const formattedFeed = formatTrafikverketFeedLib(feed, this.config);
        const filteredFeed = filterTrafikverketFeedLib(formattedFeed, this.config);
        Log.log(`Sending ${filteredFeed.length} (of ${formattedFeed.length}) feed items from Trafikverket to module (NEW_FEED)`);
        return filteredFeed;
    },

    async fetchFeed (url) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const feed = await response.json();
            Log.debug(`${feed}`);
            return feed;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                // Handle timeout
                this.sendSocketNotification("SERVICE_FAILURE", { message: "Request timed out" });
            } else if (error.message && error.message.startsWith("HTTP error!")) {
                // Handle HTTP error status
                this.sendSocketNotification("SERVICE_FAILURE", { message: error.message });
            } else {
                // Handle other errors
                this.sendSocketNotification("SERVICE_FAILURE", { message: error.message || "Unknown error" });
            }

            return [];
        }
    },

    async fetchTrafikverketFeed (resourcePath) {
        try {
            const fileContent = await fs.readFile(resourcePath, "utf8");
            const request = parseHttpRequest(applyTrafikverketRequestVariables(fileContent, this.config));
            Log.debug(`Trafikverket request:\n${JSON.stringify(request)}`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
            const response = await fetch(request.url, {
                method: request.method,
                headers: request.headers,
                body: request.body,
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const feed = await response.json();
            Log.debug(`${JSON.stringify(feed)}`);
            return feed;
        } catch (error) {
            if (error.name === 'AbortError') {
                this.sendSocketNotification("SERVICE_FAILURE", { message: "Request timed out" });
            } else if (error.message && error.message.startsWith("HTTP error!")) {
                this.sendSocketNotification("SERVICE_FAILURE", { message: error.message });
            } else {
                this.sendSocketNotification("SERVICE_FAILURE", { message: error.message || "Unknown error" });
            }

            return [];
        }
    },

    async fetchResourceFeed (resourcePath) {
        try {
            const fileContent = await fs.readFile(resourcePath, "utf8");
            const parsedFeed = JSON.parse(fileContent);

            if (!Array.isArray(parsedFeed)) {
                throw new Error("Resource feed must be a JSON array");
            }

            return parsedFeed;
        } catch (error) {
            this.sendSocketNotification("SERVICE_FAILURE", {
                message: `Failed to read demo feed resource: ${error.message || "Unknown error"}`,
            });
            return [];
        }
    },

    formatSMHIFeed (feed, config = {}) {
        return formatSMHIFeedLib(feed, config);
    },

    filterSMHIFeed (feed, config) {
        return filterSMHIFeedLib(feed, config);
    },

    formatKrisinformationFeed (feed) {
        return formatKrisinformationFeedLib(feed);
    },

    filterKrisinformationFeed (feed, config) {
        return filterKrisinformationFeedLib(feed, config);
    },

    filterDemoFeed (feed) {
        return filterDemoFeedLib(feed);
    },

    formatDemoFeed (feed) {
        return formatDemoFeedLib(feed);
    },

    formatTrafikverketFeed (feed, config = {}) {
        return formatTrafikverketFeedLib(feed, config);
    },

    filterTrafikverketFeed (feed, config = {}) {
        return filterTrafikverketFeedLib(feed, config);
    },

    // --------------------------------------- Handle notifications

    // --------------------------------------- Handle notifications
    socketNotificationReceived (notification, payload) {
        Log.debug(`Module helper received notification: ${notification}`);
        const self = this;
        if (notification === "CONFIG" && this.started === false) {
            this.config = payload;
            Log.log(
                `Feed sources enabled: Krisinformation=${Boolean(this.config.fetchKrisinformationFeed)}, ` +
                `SMHI=${Boolean(this.config.fetchSMHIFeed)}, ` +
                `Demo=${Boolean(this.config.fetchDemoFeed)}`
            );
            this.started = true;
            self.scheduleUpdate();
            self.getAllFeeds(); // Get get the feed for the first time
        }
        if (notification === "CIS_LOG") {
            Log.log(payload);
        }
    }

});
