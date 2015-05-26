'use strict';

var TopicEvents = {};
var async = module.parent.require('async');
var db = module.parent.require('./database');
var user = module.parent.require('./user');
var plugins = module.parent.require('./plugins');
var categories = module.parent.require('./categories');
var translator = module.parent.require('../public/src/modules/translator');
var PluginSocket = require.main.require('./src/socket.io/plugins');
var ThreadTools = module.parent.require('./threadTools');
var user = require.main.require('./src/user');

TopicEvents.addEvent = function(tID, eventName, tstamp, evtData) {
  var key = 'topic:' + tID + ':events';

  db.setAdd(key, eventName + ':' + tstamp, function(err) {
    db.setObject(key + ':' + eventName + ':' + tstamp, evtData);
  });
};


TopicEvents.getEvents = function(tID, cb) {
  var key = 'topic:' + tID + ':events';

  db.getSetMembers(key, function(err, members) {
    var events = [];
    async.eachSeries(members, function(evtName, next) {
      db.getObject(key + ':' + evtName, function(err, data) {
        if (data !== null) {
          events = events.concat(data);
        }
        next(err);
      });
    }, function(err) {
      cb(err, events);
    });
  });
};

TopicEvents.topicDeleteRestore = function(data) {
  var tstamp = Date.now();

  user.getUserFields(data.uid, ['username', 'userslug', 'picture'],
      function(err, userData) {
        var evtType = data.isDelete ? 'deleted' : 'restored',
            evtData = {
              evtType: evtType,
              tstamp: tstamp,
              picture: userData.picture,
              username: userData.username,
              userslug: userData.userslug
            };
        TopicEvents.addEvent(data.tid, evtType, tstamp, evtData);
      });
};


TopicEvents.topicPurge = function(tID) {
  var key = 'topic:' + tID + ':events';
  db.getSetMembers(key, function(err, members) {
    async.eachSeries(members, function(eventName, next) {
      db.delete(key + ':' + eventName, void 0);
      next(err);
    }, function(err) {
      // no errors, assuming all event objects have been deleted
      // delete event list for this topic
      if (!err) {
        db.delete(key, void 0);
      }
    });
  });
};

TopicEvents.topicPin = function(data) {
  var tstamp = Date.now();

  user.getUserFields(data.uid, ['username', 'userslug', 'picture'],
      function(err, userData) {
        var evtType = data.isPinned ? 'pinned' : 'unpinned',
            evtData = {
              evtType: evtType,
              tstamp: tstamp,
              picture: userData.picture,
              username: userData.username,
              userslug: userData.userslug
            };
        TopicEvents.addEvent(data.tid, evtType, tstamp, evtData);
      });
};

TopicEvents.topicLock = function(data) {
  var tstamp = Date.now();

  user.getUserFields(data.uid, ['username', 'userslug', 'picture'],
      function(err, userData) {
        var evtType = data.isLocked ? 'locked' : 'unlocked',
            evtData = {
              evtType: evtType,
              tstamp: tstamp,
              picture: userData.picture,
              username: userData.username,
              userslug: userData.userslug
            };

        TopicEvents.addEvent(data.tid, evtType, tstamp, evtData);
      });
};

TopicEvents.topicMove = function(data) {
  var tstamp = Date.now();

  async.parallel({
    user: function(next) {
      user.getUserFields(data.uid, ['username', 'userslug', 'picture'], next);
    },
    categories: function(next) {
      categories.getCategoriesData([data.fromCid, data.toCid], next);
    }
  }, function(err, cuData) {
    var evtData = {
      evtType: 'moved',
      tstamp: tstamp,
      picture: cuData.user.picture,
      username: cuData.user.username,
      userslug: cuData.user.userslug,
      fromName: cuData.categories[0].name,
      fromSlug: cuData.categories[0].slug,
      toName: cuData.categories[1].name,
      toSlug: cuData.categories[1].slug
    };

    TopicEvents.addEvent(data.tid, evtData.evtType, tstamp, evtData);
  });
};

TopicEvents.addTopicTool = function(tTools, cb) {

  var title = translator.compile('topicEvents:ttool.hide'),
      ico = 'fa-toggle-off';
  tTools.tools.push({
    'title': title,
    'class': 'toggle-events',
    'icon': ico
  });

  cb(null, tTools);
};

TopicEvents.getState = function(req, res, next) {
  if (!req.params.tid) {
    res.json('no topic_id');
    return;
  }
  var key = 'topic:' + req.params.tid + ':hideevents';
  db.exists(key, function(err, itExists) {
    if (itExists) {
      res.json({ isHidden: true });
    } else {
      res.json({ isHidden: false });
    }
  });
};

TopicEvents.init = function(data, cb) {
  data.router.get('/api/topic-events/:tid', listTopicEvents);
  data.router.get('/api/topic-events/:tid/state', TopicEvents.getState);
  PluginSocket.topicEvents = {};
  PluginSocket.topicEvents.toggleState = function(socket, data, cb) {
    if (!data.tid) {
      return cb('No topic_id');
    }
    var key = 'topic:' + data.tid + ':hideevents';
    db.exists(key, function(err, itExists) {
      if (itExists) {
        db.delete(key, void 0);
        return cb(null, { isHidden: false });
      } else {
        db.set(key, '1', void 0);
        return cb(null, { isHidden: true });
      }
    });
  };

  cb();
};

function listTopicEvents(req, res, next) {
  var tid = req.params.tid || 0;

  TopicEvents.getEvents(tid, function(err, events) {
    res.json(events);
  });
}

module.exports = TopicEvents;
