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
            self.getFeed();
        }, self.config.updateInterval);
    },

    // --------------------------------------- Retrive new feed
    async getFeed () {
        const self = this;
        const url = "https://api.krisinformation.se/v3/news/?includeTest=0&allCounties=True";
        Log.log(`[${self.name}] Calling ${url}`);
        Log.debug(`[${self.name}]   With config: ` + JSON.stringify(this.config));

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const feed = await response.json();
            Log.debug(`[${self.name}] ${feed}`);
            
            const filteredFeed = self.filterFeed(feed);
            Log.log(`[${self.name}] Sending ${filteredFeed.length} (of ${feed.length}) filtered feed items to module (NEW_FEED)`);
            self.sendSocketNotification("NEW_FEED", filteredFeed); // Send feed to module
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

    // --------------------------------------- Filter feeds according to config
    filterFeed (feed) {
        const self = this;
        Log.debug(`[${self.name}] Filtering feed: ${JSON.stringify(feed)}`);
        if (self.config.areas === undefined || self.config.areas.length < 1) return feed;
        
        const filteredFeed = [];
        for (let ix = 0; ix < feed.length; ix++) {
            const feedItem = feed[ix];
            Log.debug(`[${self.name}] Looking at ` + feedItem.Identifier);
            if (areaFilter(self.config, feedItem.Area)) filteredFeed.push(feedItem);
        }
        return filteredFeed;

        /**
         * A filter function to determine if a feed item should be included based on areas in config
         * The config can contain a list of areas to include. If the feed item has any area matching one of those, it is included.
         */
        function areaFilter(cfg, areas) {
            if (!Array.isArray(areas) || areas.length === 0) return true; // Always include if no areas defined
            for (let feedItemAreasIx = 0; feedItemAreasIx < areas.length; feedItemAreasIx++) {
                Log.debug(`[${self.name}] areaFilter called with cfg: ${JSON.stringify(cfg.areas)}, areas: ${JSON.stringify(areas[feedItemAreasIx].Description)}`);
                for (let cfgAreasIx = 0; cfgAreasIx < cfg.areas.length; cfgAreasIx++) {
                    if (areas[feedItemAreasIx].Type == "County" && areas[feedItemAreasIx].Description == cfg.areas[cfgAreasIx]) return true;
                }
                //National area special case
                if (cfg.alwaysNational && areas[feedItemAreasIx].Type === "Country" && areas[feedItemAreasIx].Description === "Sverige") return true;
            }
            return false;
        }
    },

    // --------------------------------------- Handle notifications
    socketNotificationReceived (notification, payload) {
        Log.debug(`[${this.name}] Module helper received notification: ${notification}`);
        const self = this;
        if (notification === "CONFIG" && this.started === false) {
            this.config = payload;
            this.started = true;
            self.scheduleUpdate();
            self.getFeed(); // Get get the feed for the first time
        }
        if (notification === "CIS_LOG") {
            Log.log(payload);
        }
    }

});
