'use strict';

var TopicEvents = {},
    async = module.parent.require('async'),
    db = module.parent.require('./database'),
    user = module.parent.require('./user'),
    plugins = module.parent.require('./plugins'),
    categories = module.parent.require('./categories'),
    translator = module.parent.require('../public/src/translator');


TopicEvents.addEvent = function(tID, eventName, tstamp, evtData) {
  var key = 'topic:' + tID + ':events';

  db.setAdd(key, eventName + ':' + tstamp, function(err) {
    db.setObject(key + ':' + eventName + ':' + tstamp, evtData);
  });
};


TopicEvents.getEvents = function(tID, callback) {
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
      callback(err, events);
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

TopicEvents.init = function(data, callback) {
  data.router.get('/api/events/tid/:tid', listTopicEvents);
  callback();
};

function listTopicEvents(req, res, next) {
  var tid = req.params.tid || 0;

  TopicEvents.getEvents(tid, function(err, events) {
    res.json(events);
  });
}

module.exports = TopicEvents;
