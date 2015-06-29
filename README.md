# nodebb-plugin-topic-events
PlugIn for NodeBB, showing inline topic events.

![](assets/screenshot.jpg?raw=true)

## Installation
1. Go to your nodeBB installation:

    `cd /var/nodebb/`

2. Clone the plugin into ./node_modules/ folder:

    ```bash
git clone https://github.com/Linux-statt-Windows/nodebb-plugin-topic-events.git \
./node_modules/nodebb-plugin-topic-events
```

4. Activate the plugin in the ACP.

5. Go nuts! :D

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

* purge

    Deletes all recorded events.

###Show/Hide events by topic
Admins/Mods can hide events for each topic using the Topic Tools.

*Events will still be recorded.*

![](assets/topictools.png?raw=true)
