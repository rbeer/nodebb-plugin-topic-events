# nodebb-plugin-events-topic
PlugIn for NodeBB, showing inline topic events.

![](assets/screenshot.jpg?raw=true)

## Installation
1. Go to your nodeBB installation:

    `cd /path/to/nodebb/`

2. Clone the plugin into ./node_modules/ folder:

    ```bash
git clone https://github.com/Linux-statt-Windows/nodebb-plugin-events-topic.git \
./node_modules/nodebb-plugin-events-topic
```

3. Install module:

    `npm install`

4. Apply the patch:
   1. `cd ./node_modules/nodebb-plugin-events-topic`
   2. `patch < threadTools.patch`

5. Activate the plugin in the ACP.

6. Go nuts! :D

## Features
###Captured Events
* lock / unlock

    ![](assets/locked.png?raw=true)
    ![](assets/unlocked.png?raw=true)
* pin / unpin

    ![](assets/pinned.png?raw=true)
    ![](assets/unpinned.png?raw=true)
* move

    ![](assets/moved.png?raw=true)
* delete / restore

    ![](assets/deleted.png?raw=true)
    ![](assets/restored.png?raw=true)

###Show/Hide events by topic
Admins/Mods can hide events for each topic using the Topic Tools.

*Events will still be recorded.*

![](assets/topictools.png?raw=true)
