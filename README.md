# nodebb-plugin-events-topic
PlugIn for NodeBB, showing inline topic events.

## Installation
1. clone the repo in nodebb/node_modules
2. `npm install`
3. apply the patch
   1. cd `nodebb/node_modules/nodebb-plugin-events-topic`
   2. `patch /full/path/to/nodebb/src/threadTools.js < threadTools.patch` 
4. activate the plugin in the ACP
5. profit
