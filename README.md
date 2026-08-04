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
            - [Trafikverket](#trafikverket)
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

### General configuration
| Key | Default value | Description |
|---|---|---|
|updateInterval|30 * 60 * 1000 (30 min)|Milliseconds between API updates|
|uiUpdateInterval|10 * 1000|Milliseconds between changing to next announcement|
|showDescription|true|Show message description|
|descriptionMaxLength|400|Define how long description should be|
|oldest|7|If the message don't have a validity time, the message will be shown for `oldest` number of days|
|silent|false|If `true`, a `No messages` will be shown when the feed is empty|
|filterContent|[]|A list of `String`s to filter (away) from the feed. If empty, no filter will be applied. *(case-insensitive)*|

### Feed configuration
#### Demo
| Key | Default value | Description |
|---|---|---|
|fetchDemoFeed|true|Fetch a demo/test feed to show some variations of hos data can be shown|

#### Krisinformation
| Key | Default value | Description |
|---|---|---|
|fetchKrisinformationFeed|false|If information from krisinformation.se should be fetched|
|krisinformationInterestingAreas|[]|A list if areas to show messages regarding. If empty, all areas will be shown. *(case-insensitive)*|
|krisinformationAlwaysShowNational|true|Show national messages|

#### SMHI
| Key | Default value | Description |
|---|---|---|
|fetchSMHIFeed|false|If information from smhi.se should be fetched|
|smhiFeedInterestingAreas|[]|A list if areas to show messages regarding. If empty, all areas will be shown. *(case-insensitive)*|
|smhiPreferredLocale|"sv"|Preferred locale for localized SMHI content. The formatter will try this locale first, then fall back to English (en) and finally to a default value ("").|
|smhiShowWarningLevels|["YELLOW", "ORANGE", "RED"]|A list of warning levels you are interested in. Defined and available levels: `MESSAGE`, `YELLOW`, `ORANGE`, `RED`|

#### Trafikverket
| Key | Default value | Description |
|---|---|---|
|fetchTrafikverketFeed|false|If traffic situations from Trafikverket should be fetched|
|trafikverketAuthenticationKey|"YOUR-API-KEY"|Authentication key for Trafikverket requests|
|trafikverketCountyNos|""|Comma-separated county numbers to include in the Trafikverket request, for example "0,12,13,14"|
|trafikverketLocationCoordinates|""|SWEREF99TM formatted coordinates pointing out the center of your geografical interest. [Convert to SWEREF99TM using this tool.](https://latlong.mellifica.se), for example "374058 6164393" *(Both `trafikverketLocationCoordinates` and `trafikverketLocationRadius` need to be configured for the filter to be added.)*|
|trafikverketLocationRadius|1000|Radius from `trafikverketLocationCoordinates` where your geographical interest is. *(Both `trafikverketLocationCoordinates` and `trafikverketLocationRadius` need to be configured for the filter to be added.)*|

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

        fetchTrafikverketFeed: true,
        trafikverketAuthenticationKey: "YOUR-API-KEY",
        trafikverketCountyNos: "0,12",
        trafikverketLocationCoordinates: "374058 6164393",
        trafikverketLocationRadius: 1000
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

        fetchTrafikverketFeed: true,
        trafikverketAuthenticationKey: "YOUR-API-KEY"
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

        fetchTrafikverketFeed: true,
        trafikverketAuthenticationKey: "YOUR-API-KEY",
        trafikverketLocationCoordinates: "374058 6164393",
        trafikverketLocationRadius: 1000
    }
},
```

## Screenshots
![Exempelhändelse 1](/docs/event_1.png)  
![Exempelhändelse 2](/docs/event_2.png)  
![Exempelhändelse 3](/docs/event_3.png)  
![Exempelhändelse 4](/docs/event_4.png)  
![Exempelhändelse 5](/docs/event_5.png)  
