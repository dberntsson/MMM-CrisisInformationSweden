# MMM-CrisisInformationSweden

**MMM-CrisisInformationSweden** is a module for [MagicMirror²](https://magicmirror.builders/) to display a news feed from the Swedish Government Crisis Information [Krisinformation.se](https://www.krisinformation.se/engelska).

The current feed in json format can be obtained here <https://api.krisinformation.se/v3/news/?includeTest=0&allCounties=True>.

## Install

1. Clone repository into `../modules/` inside your MagicMirror directory.
2. Add the module to the MagicMirror config.

## Update

Run `git pull` inside `../modules/MMM-CrisisInformationSweden/` directory.

## Configuration

Here is an example for an entry in the modules array in your `config.js`:

```js
    {
        module: 'MMM-CrisisInformationSweden',
        position: 'top_right',
        config: {
            updateInterval: 30*60*1000,     // Optional. Number of ms between API updates.
            uiUpdateInterval: 10*1000,      // Optional. Number of ms between changing to next announcement.
            alwaysNational: true,           // Optional, Regardless of other settings always show national info.
            areas: [],                      // Optional. An array of strings with area names. 
                                            // Only those messages aimed at the areas listed in the array are shown. 
                                            // The strings must match exactly with the AreaDesc of the message.
                                            // If empty or undefined show all messages. Not implemented yet.
            showDescription: true,          // Optional. Show message description.
            oldest: 7,                      // Optional. Dont show messages older then this number of days.
            silent: false,                  // Optional. If enabled no messages are shown if therer are no
                                            // messages younger then 'oldest' setting
            filterContent: [],              // A list of strings to filter (away) from the information feed
            debug: false,                   // Optional. Enable some extra output when debugging
        }
    },
```

## Screenshot

![Screenshot](/docs/ScreenShot2.PNG)
