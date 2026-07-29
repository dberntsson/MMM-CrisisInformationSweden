/* MMM-CrisisInformationSweden.js
 *
 * MagicMirror² module - News feed from the Swedish Government Crisis Information (Krisinformation.se).
 *
 * Module: MMM-CrisisInformationSweden
 *
 * MagicMirror² by Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * Module MMM-CrisisInformationSweden by Anders Boghammar
 *
 * Notifications:
 *      CONFIG: Sent to update any listeners of the current configuration.
 *      NEW_FEED: Received when a new feed is available.
 *      SERVICE_FAILURE: Received when the service access failed.
 */
Module.register("MMM-CrisisInformationSweden", {
    // --------------------------------------- Define module defaults
    defaults: {
        updateInterval: 30*60*1000,
        uiUpdateInterval: 10*1000,
        fetchDemoFeed: true,
        fetchTrafikverketFeed: false,

        showDescription: true,
        descriptionMaxLength: 400,
        oldest: 7,
        silent: false,
        filterContent: [],

        fetchKrisinformationFeed: false,
        krisinformationInterestingAreas: [],
        krisinformationAlwaysShowNational: true,

        fetchSMHIFeed: false,
        smhiFeedInterestingAreas: [],
        smhiPreferredLocale: "sv",
        smhiShowWarningLevels: ["YELLOW", "ORANGE", "RED"],
        trafikverketCountyNos: "12",
        trafikverketSituationResourcePath: "resources/trafikverket-situation.http",
    },

    // --------------------------------------- Define required scripts
    getScripts () {
        return ["moment.js"];
    },

    // --------------------------------------- Start the module
    start () {
        const self = this;
        Log.info(`Starting module: ${self.name}`);

        // Set locale.
        moment.locale(config.language);

        this.loaded = false;
        this.sendSocketNotification("CONFIG", this.config); // Send config to helper and initiate an update
        this.currentFeedIndex = 0;

        // Start timer for ui-updates
        this.uitimer = setInterval(() => { // This timer is saved in uitimer so that we can cancel it
            self.currentFeedIndex++;
            if (self.currentFeedIndex >= self.currentFeed.length) {
                self.currentFeedIndex = 0;
            }
            self.updateDom();
        }, self.config.uiUpdateInterval);
    },

    // --------------------------------------- Generate dom for module
    getDom () {
        const self = this;
        const wrapper = document.createElement("div");

        if (!this.loaded) {
            wrapper.innerHTML = `${self.name} loading feeds ...`;
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        // ------ Display a selected message in the feed
        if (this.currentFeed.length > 0) { // We have messages display the one up for displaying
            
            const msg = this.currentFeed[this.currentFeedIndex];

            //top div with time and index
            const tdiv = document.createElement("div");
            tdiv.className = "dimmed xsmall";
            tdiv.style.display = "flex";
            tdiv.style.justifyContent = "space-between";
            tdiv.style.alignItems = "center";
            tdiv.style.gap = "8px";
            tdiv.style.width = "100%";

            var tdiv_lspan = document.createElement("span");
            tdiv_lspan.innerHTML = `${msg.updatedTime !== undefined && msg.updatedTime != null && msg.updatedTime > msg.publishTime
                    ? `Uppdaterad ${moment(msg.updatedTime).fromNow()}`
                    : `Publiserad ${moment(msg.publishTime).fromNow()}`}`;
            tdiv_lspan.className = "align-left";
            tdiv_lspan.style.flex = "1";
            tdiv_lspan.style.minWidth = "0";
            tdiv.appendChild(tdiv_lspan);

            var tdiv_rspan = document.createElement("span");
            if (this.currentFeed.length > 1) {
                    tdiv_rspan.innerHTML = "(" + (this.currentFeedIndex + 1) + "/" + this.currentFeed.length + ")";
            }
            tdiv_rspan.className = "align-right";
            tdiv_rspan.style.flexShrink = "0";
            tdiv.appendChild(tdiv_rspan);
            wrapper.appendChild(tdiv);


            //middle div with title and description
            const mdiv = document.createElement("div");
            mdiv.style.display = "flex";
            mdiv.style.flexDirection = "column";
            mdiv.style.alignItems = "flex-start";
            mdiv.style.textAlign = "left";
            var mdiv_tspan = document.createElement("span");
            const warningLevelLabel = msg.warningLevelText || msg.warningLevelCode;
            if (warningLevelLabel !== undefined && warningLevelLabel != null) {
                mdiv_tspan.innerHTML = "<b>[" + warningLevelLabel + "]</b> ";
            }
            mdiv_tspan.innerHTML = mdiv_tspan.innerHTML + msg.incidentTitle;
            mdiv_tspan.className = "small align-left";
            mdiv_tspan.style.display = "block";
            mdiv.appendChild(mdiv_tspan);

            const mdiv_bspan = document.createElement("span");
            if (msg.incidentPeriodString !== undefined && msg.incidentPeriodString != null && msg.incidentPeriodString != "") {
                mdiv_bspan.innerHTML = msg.incidentPeriodString + "<br>";
            }
            if (this.config.showDescription && 
                    msg.incidentDescription !== undefined && msg.incidentDescription != null && msg.incidentDescription != "") {
                mdiv_bspan.innerHTML = mdiv_bspan.innerHTML + msg.incidentDescription;
            }
            mdiv_bspan.className = "dimmed xsmall align-left";
            mdiv_bspan.style.display = "block";
            mdiv_bspan.style.marginTop = "2px";
            mdiv.appendChild(mdiv_bspan);
            wrapper.appendChild(mdiv);


            //bottom div with affected area and source
            const bdiv = document.createElement("div");
            bdiv.className = "dimmed xsmall";
            bdiv.style.display = "flex";
            bdiv.style.justifyContent = "space-between";
            bdiv.style.alignItems = "center";
            bdiv.style.gap = "8px";
            bdiv.style.width = "100%";
            // TODO use style instead
            bdiv.style.marginTop = "5px";
            bdiv.style.borderTopWidth = "1px";
            bdiv.style.borderTopColor = "#666";
            bdiv.style.borderTopStyle = "dotted";
            var affectedArea = undefined;
            if (msg.affectedAreaDetails !== undefined && msg.affectedAreaDetails != null && msg.affectedAreaDetails != "") {
                affectedArea = msg.affectedAreaDetails;
            } else if (msg.affectedArea !== undefined && msg.affectedArea != null && msg.affectedArea != "") {
                affectedArea = msg.affectedArea;
            }
            if (affectedArea !== undefined && affectedArea != null && affectedArea != "") {
                var bdiv_lspan = document.createElement("span");
                bdiv_lspan.innerHTML = `<b>Område:</b> ${affectedArea}`;
                bdiv_lspan.className = "align-left";
                bdiv_lspan.style.flex = "1";
                bdiv_lspan.style.minWidth = "0";
                bdiv.appendChild(bdiv_lspan);
            }
            if (msg.origin !== undefined && msg.origin != "") {
                var bdiv_rspan = document.createElement("span");
                bdiv_rspan.innerHTML = `<b>Källa:</b> ${msg.origin}`;
                bdiv_rspan.className = "align-right";
                bdiv_rspan.style.flexShrink = "0";
                bdiv.appendChild(bdiv_rspan);
            }
            wrapper.appendChild(bdiv);
        } else {
            if (!this.config.silent) {
                var div = document.createElement("div");
                div.innerHTML = `${self.name}: There are no messages to show`;
                //div.style.color = "red"; // TODO Change this to a custom style
                div.className = "dimmed xsmall";
            }
        }

        // ----- Show service failure if any
        if (this.failure !== undefined) {
            var div = document.createElement("div");
            div.innerHTML = `Service: ${this.failure.StatusCode}-${this.failure.Message}`;
            div.style.color = "red"; // TODO Change this to a custom style
            wrapper.appendChild(div);
        }
        return wrapper;
    },

    // --------------------------------------- Debug output
    debug (msg) {
        if (this.config.debug) Log.log(`${msg}`);
    },

    // --------------------------------------- Handle socketnotifications
    socketNotificationReceived (notification, payload) {
        if (notification === "NEW_FEED") {
            this.loaded = true;
            this.failure = undefined;
            // Handle payload
            this.currentFeed = payload;
            this.updateDom();
        }
        if (notification === "SERVICE_FAILURE") {
            this.failure = payload;
            this.sendSocketNotification("CIS_LOG", `[${this.name}] Service failure: ${this.failure.StatusCode}:${this.failure.Message}`);
            this.updateDom();
        }
    }

});
