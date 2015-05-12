'use strict';

var plugin = {},
    async = module.parent.require('async'),
    db = module.parent.require('./database'),
    user = module.parent.require('./user'),
    plugins = module.parent.require('./plugins'),
    categories = module.parent.require('./categories'),
    translator = module.parent.require('../public/src/translator');


plugin.addEvent = function(tID, eventName, tstamp, evtData) {
  var key = 'topic:' + tID + ':events';

  db.setAdd(key, eventName + ':' + tstamp, function(err) {
    db.setObject(key + ':' + eventName + ':' + tstamp, evtData);
  });
};

plugin.topicDeleteRestore = function(data) {
  var tid = data.tid,
      isDelete = data.isDelete,
      uid = data.uid,
      tstamp = Date.now();

  user.getUserFields(uid, ['username', 'userslug', 'picture'],
      function(err, userData) {
        var evtType = isDelete ? 'deleted' : 'restored',
            evtData = {
              evtType: evtType,
              tstamp: tstamp,
              picture: userData.picture,
              username: userData.username,
              userslug: userData.userslug
            };
        plugin.addEvent(tid, evtType, tstamp, evtData);
      });
};


plugin.topicPurge = function(tID) {
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

plugin.getEvents = function(tID, callback) {
  var key = 'topic:' + tID + ':events';

  db.getSetMembers(key, function(err, members) {
    var events = [];
    async.eachSeries(members, function(eventName, next) {
      db.getObject(key + ':' + eventName, function(err, data) {
        if (data !== null) {
          events = events.concat(data);
        }
        next(err);
      });
    }, function(err) {
      callback(err, events);
    });
  });
};

plugin.topicPin = function(data) {
  var tid = data.tid,
      isPinned = data.isPinned,
      uid = data.uid,
      tstamp = Date.now();

  user.getUserFields(uid, ['username', 'userslug', 'picture'],
      function(err, userData) {
        var evtType = isPinned ? 'pinned' : 'unpinned',
            evtData = {
              evtType: evtType,
              tstamp: tstamp,
              picture: userData.picture,
              username: userData.username,
              userslug: userData.userslug
            };
        plugin.addEvent(tid, evtType, tstamp, evtData);
      });
};

plugin.topicLock = function(data) {
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

        plugin.addEvent(data.tid, evtType, tstamp, evtData);
      });
};

plugin.topicMove = function(data) {
  var tstamp = Date.now();

  async.parallel({
    user: function(next) {
      user.getUserFields(data.uid, ['username', 'userslug', 'picture'], next);
    },
    categories: function(next) {
      categories.getCategoriesData([data.fromCid, data.toCid], next);
    }
  }, function(err, data) {
    var evtData = {
      evtType: 'moved',
      tstamp: tstamp,
      picture: data.user.picture,
      username: data.user.username,
      userslug: data.user.userslug,
      fromName: data.categories[0].name,
      fromSlug: data.categories[0].slug,
      toName: data.categories[1].name,
      toSlug: data.categories[1].slug
    };

    plugin.addEvent(data.tid, evtData.evtType, tstamp, evtData);
  });
};

plugin.init = function(data, callback) {
  data.router.get('/api/events/tid/:tid', listTopicEvents);
  callback();
};

function listTopicEvents(req, res, next) {
  var tid = req.params.tid || 0;

  plugin.getEvents(tid, function(err, events) {
    res.json(events);
  });
}

module.exports = plugin;
