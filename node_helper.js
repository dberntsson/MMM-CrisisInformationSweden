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
const {
    formatSMHIFeed: formatSMHIFeedLib,
    filterSMHIFeed: filterSMHIFeedLib,
} = require("./lib/smhiFeedUtils");
const {
    formatKrisinformationFeed: formatKrisinformationFeedLib,
    filterKrisinformationFeed: filterKrisinformationFeedLib,
} = require("./lib/krisinformationFeedUtils");

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

        const [feed1, feed2] = await Promise.all([
            this.config.fetchKrisinformationFeed
                ? this.getKrisinformationFeed()
                : Promise.resolve([]),
            this.config.fetchSMHIFeed
                ? this.getSMHIFeed()
                : Promise.resolve([])
        ]);

        const filteredFeed = [...feed1, ...feed2];
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

    filterBasedOnTime(feed, config) {
        if (!Array.isArray(feed)) return [];
        // Implementation for filtering based on time
        
    },

    // --------------------------------------- Handle notifications

    // --------------------------------------- Handle notifications
    socketNotificationReceived (notification, payload) {
        Log.debug(`Module helper received notification: ${notification}`);
        const self = this;
        if (notification === "CONFIG" && this.started === false) {
            this.config = payload;
            this.started = true;
            self.scheduleUpdate();
            self.getAllFeeds(); // Get get the feed for the first time
        }
        if (notification === "CIS_LOG") {
            Log.log(payload);
        }
    }

});
