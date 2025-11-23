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
        Log.log(`[${self.name}] Getting feed for module at ${new Date(Date.now()).toLocaleTimeString()}`);
        const url = "https://api.krisinformation.se/v3/news/?includeTest=0&allCounties=True";
        Log.log(`[${self.name}] Calling ${url}`);
        Log.log(`[${self.name}] With area filter config: ` + JSON.stringify(this.config.areas));
        Log.log(`[${self.name}] With alwaysNational filter config: ` + this.config.alwaysNational);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            Log.debug(data);
            const feeds = self.filterFeed(data);
            Log.log(`[${self.name}] - Sending NEW_FEED count: ${feeds.length} Org: ${data.length}`);
            self.sendSocketNotification("NEW_FEED", feeds); // Send feed to module
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
    filterFeed (resp) {
        const self = this;
        if (this.config.areas === undefined || this.config.areas.length < 1) return resp;
        const feeds = [];
        for (let ix = 0; ix < resp.length; ix++) {
            Log.debug(`[${self.name}] MSB: ` + ix);
            let inc = false;
            const feed = resp[ix];
            const areas = feed.Area;
            Log.debug(`[${self.name}] Looking at `+ feed.Identifier);
            if (areas === undefined || areas === null || areas.length === 0) inc = true; // Always include if there's no area(s) defined
            else {
                for (let ia = 0; ia < areas.length; ia++) {
                    Log.debug(`[${self.name}] filter: ` + JSON.stringify(areas[ia]));
                    for (let iad = 0; iad < this.config.areas.length; iad++) {
                        if (areas[ia].Type == "County" && areas[ia].Description == this.config.areas[iad]) inc = true;
                    }
                    if (this.config.alwaysNational && areas[ia].Type === "Country" && areas[ia].Description === "Sverige") inc = true;
                }
            }
            if (inc) feeds.push(feed);
        }
        return feeds;
    },

    // --------------------------------------- Handle notifications
    socketNotificationReceived (notification, payload) {
        const self = this;
        if (notification === "CONFIG" && this.started === false) {
            this.config = payload;
            this.started = true;
            self.scheduleUpdate();
            self.getFeed(); // Get it first time
        }
    }

});
