# MMM-CrisisInformationSweden

**MMM-CrisisInformationSweden** is a module for [MagicMirror²](https://magicmirror.builders/) to display important news and warnings from
* Swedish Government Crisis Information [Krisinformation.se](https://www.krisinformation.se) (feed: [here](https://api.krisinformation.se/v3/news/?includeTest=0&allCounties=True))
* Swedish Meteorological and Hydrological Institute [SMHI.se](https://www.smhi.se/) (feed: [here](https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json))
* Swedish Transport Administration [Trafikverket.se](https://www.trafikverket.se/) (request file: [resources/trafikverket-situation.http](resources/trafikverket-situation.http))

## Table of Contents
- [MMM-CrisisInformationSweden](#mmm-crisisinformationsweden)
    - [About this fork](#about-this-fork)
    - [Install](#install)
    - [Update](#update)
    - [Configuration](#configuration)
        - [General configuration](#general-configuration)
        - [Feed configuration](#feed-configuration)
            - [Demo](#demo)
            - [Krisinformation](#krisinformation)
            - [SMHI](#smhi)
        - [Examples](#examples)
    - [Screenshots](#screenshots)

## About this fork
This repository continues the development of the original [**MMM-CrisisInformationSweden**](https://github.com/Pejjo/MMM-CrisisInformationSweden) by Anders Boghammar and contributors.

The goal of this fork is to evolve the module from a single-source news feed into a unified MagicMirror² module for official Swedish public information regarding crisis news, weather warnings, and public safety information.

The project remains MIT licensed, and all credit goes to the original authors for creating the foundation this work builds upon.

## Install

1. Clone repository into `../modules/` inside your MagicMirror directory.
2. Add the module to the MagicMirror config.

## Update

Run `git pull` inside `../modules/MMM-CrisisInformationSweden/` directory.

## Configuration

| Category | Configuration | Default value | Description |
|---|---|---|---|
|General refresh rates|updateInterval|30 * 60 * 1000 (30 min)|Milliseconds between API updates|
|General refresh rates|uiUpdateInterval|10 * 1000|Milliseconds between changing to next announcement|
|General behaviour|fetchDemoFeed|true|Fetch a demo/test feed to show some variations of hos data can be shown|
|General behaviour|showDescription|true|Show message description|
|General behaviour|descriptionMaxLength|400|Define how long description should be|
|General behaviour|oldest|7|If the message don't have a validity time, the message will be shown for `oldest` number of days|
|General behaviour|silent|false|If `true`, a `No messages` will be shown when the feed is empty|
|General behaviour|filterContent|[]|A list of `String`s to filter (away) from the feed. If empty, no filter will be applied. *(case-insensitive)*|
|Krisinformation.se|fetchKrisinformationFeed|false|If information from krisinformation.se should be fetched|
|Krisinformation.se|krisinformationInterestingAreas|[]|A list if areas to show messages regarding. If empty, all areas will be shown. *(case-insensitive)*|
|Krisinformation.se|krisinformationAlwaysShowNational|true|Show national messages|
|SMHI.se|fetchSMHIFeed|false|If information from smhi.se should be fetched|
|SMHI.se|smhiFeedInterestingAreas|[]|A list if areas to show messages regarding. If empty, all areas will be shown. *(case-insensitive)*|
|SMHI.se|smhiPreferredLocale|"sv"|Preferred locale for localized SMHI content. The formatter will try this locale first, then fall back to English (en) and finally to a default value ("").|
|SMHI.se|smhiShowWarningLevels|["YELLOW", "ORANGE", "RED"]|A list of warning levels you are interested in. Defined and available levels: `MESSAGE`, `YELLOW`, `ORANGE`, `RED`|
|Trafikverket.se|trafikverketCountyNos|"12"|Comma-separated county numbers to include in the Trafikverket request, for example "12,13,14"|
|Trafikverket.se|fetchTrafikverketFeed|false|If traffic situations from Trafikverket should be fetched|
|Trafikverket.se|trafikverketSituationResourcePath|"resources/trafikverket-situation.http"|Path to the HTTP request file used for the Trafikverket call|

### Examples
Here is an example for an entry in the modules array in your `config.js`:

#### All configuration
```js
{
    module: 'MMM-CrisisInformationSweden',
    position: 'top_right',
    config: {
        updateInterval: 30*60*1000,
        uiUpdateInterval: 10*1000,

        showDescription: true,
        descriptionMaxLength: 400,
        oldest: 7,
        silent: false,
        filterContent: [],

        fetchDemoFeed: false,

        fetchKrisinformationFeed: true,
        krisinformationInterestingAreas: [],
        krisinformationAlwaysShowNational: true,

        fetchSMHIFeed: true,
        smhiFeedInterestingAreas: [],
        preferredLocale: "sv",
        smhiShowWarningLevels: ["MESSAGE", "YELLOW", ORANGE", "RED"],
}
},
```

#### Minimal configuration
```js
{
    module: 'MMM-CrisisInformationSweden',
    position: 'top_right',
    config: {
        fetchDemoFeed: false,

        fetchKrisinformationFeed: true,
        krisinformationInterestingAreas: ["Skåne län"],

        fetchSMHIFeed: true,
        smhiFeedInterestingAreas: ["Skåne län"],
    }
},
```

#### Nice to have configuration
```js
{
    module: 'MMM-CrisisInformationSweden',
    position: 'top_right',
    config: {
        descriptionMaxLength: 1024,
        filterContent: ["Denna nyhet uppdateras inte längre","Meddelandet gäller inte längre"],

        fetchDemoFeed: false,

        fetchKrisinformationFeed: true,
        krisinformationInterestingAreas: ["Skåne län"],

        fetchSMHIFeed: true,
        smhiFeedInterestingAreas: ["Skåne län"],
    }
},
```

## Screenshots
![Exempelhändelse 1](/docs/event_1.png)  
![Exempelhändelse 2](/docs/event_2.png)  
![Exempelhändelse 3](/docs/event_3.png)  
![Exempelhändelse 4](/docs/event_4.png)  
![Exempelhändelse 5](/docs/event_5.png)  
