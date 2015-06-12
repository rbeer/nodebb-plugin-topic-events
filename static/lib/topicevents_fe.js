'use strict';
/*global socket, ajaxify, RELATIVE_PATH, utils, templates*/

(function(window) {
  require(['translator'], function(translator) {

    var TopicEvents = window.TopicEvents = {

      _firstAnswerId: 0,
      _headEvents: [],
      _tailEvents: [],
      _isHidden: null,

      init: function() {

        // first things first:
        // yes, I'm talking exclusively to you here, FIREFOX! >:@
        if (Element.prototype.insertAdjacentElement === void 0) {
          Element.prototype.insertAdjacentElement = TopicEvents.thxFireFox;
        }

        var tid = ajaxify.variables.get('topic_id');
        var firstAnswerPost = document.querySelectorAll('[component="post"]');
        try {
          TopicEvents._firstAnswerId = Number.parseInt(firstAnswerPost.item(1)
                                                       .dataset.index);
        } catch (err) {
          TopicEvents._firstAnswerId = -1;
        }

        TopicEvents.getState(tid, function(hidden) {
          TopicEvents.setEventTool(hidden);
          if (!hidden) {
            TopicEvents.getTopicEvents({tid: tid});
          }
        });

        window.$('.toggle-events').on('click', function(evt) {
          var tid = ajaxify.variables.get('topic_id');
          socket.emit('plugins.topicEvents.toggleState',
                      {tid: tid},
                      function(err, backData) {
                        if (err) {
                          return console.log(err);
                        } else if (backData.isHidden) {
                          TopicEvents.setEventTool(backData.isHidden);
                          TopicEvents.clearTopicEvents();
                        } else {
                          TopicEvents.setEventTool(backData.isHidden);
                          TopicEvents.getTopicEvents({});
                        }
                      });
          evt.preventDefault();
        });
      },

      thxFireFox: function(pos, element) {
        if (pos === 'beforebegin') {
          return this.parentElement.insertBefore(element, this);
        } else if (pos === 'afterbegin') {
          throw Error('Not implemented.');
        } else if (pos === 'beforeend') {
          this.parentElement.appendChild(element);
        } else if (pos === 'afterend') {
          return this.parentElement.insertBefore(element,
                                                 this.nextSiblingElement);
        }
      },

      getState: function(tid, cb) {
        if (TopicEvents._isHidden !== null) {
          return cb(TopicEvents._isHidden);
        } else {
          window.$.get(RELATIVE_PATH + '/api/topic-events/' + tid + '/state',
              function(stateData) {
                return cb(stateData.isHidden);
              });
        }
      },

      getTopicEvents: function(data) {

        var tid = data.tid || ajaxify.variables.get('topic_id');
        // get state
        TopicEvents.getState(tid, function(hidden) {
          if (!hidden) {
            window.$.get(RELATIVE_PATH + '/api/topic-events/' + tid,
                function(events) {
                  events.forEach(TopicEvents.prepareTopicEvent);
                }
            );
          }
        });
      },

      prepareTopicEvent: function(data) {
        var selector = 'li[component="topic/event"][data-timestamp="' +
                       data.tstamp + '"]';
        if (document.querySelector(selector) != null ||
            data.evtType === void 0) {
          return true;
        }

        var tstamp = utils.toISOString(data.tstamp),
            userUri = RELATIVE_PATH + '/user/' + data.userslug,
            evtType = data.evtType,
            contentTpl = 'topicEvents:topic.' + evtType;

        if (evtType === 'moved') {
          var fromUri = RELATIVE_PATH + '/category/' + data.fromSlug;
          var toUri = RELATIVE_PATH + '/category/' + data.toSlug;
          data.content = translator.compile(contentTpl, userUri,
                                            data.username, fromUri,
                                            data.fromName, toUri,
                                            data.toName, tstamp);
        } else {
          data.content = translator.compile(contentTpl, userUri,
                                            data.username, tstamp);
        }
        data.class = evtType;
        TopicEvents.addTopicEvent(data);
      },

      placeTopicEvent: function(posts, eventElement, tstamp) {

        var nextTstamp = 0;

        if (posts instanceof NodeList) {
          posts = Array.prototype.slice.call(posts);
        }

        // if only one post || event is older than 1st answer
        if (posts.length === 1 || tstamp < posts[1].dataset.timestamp) {
          TopicEvents._headEvents.push(eventElement);
        } else if (tstamp > posts[posts.length - 1].dataset.timestamp) {
          TopicEvents._tailEvents.push(eventElement);
        }

        for (var pIdx = 0; pIdx <= posts.length - 1; pIdx++) {
          if (pIdx !== posts.length - 1) {
            nextTstamp = posts[pIdx + 1].dataset.timestamp;
          } else {
            nextTstamp = tstamp + 1;
          }

          if (posts[pIdx].dataset.timestamp < tstamp &&
              nextTstamp > tstamp) {

            var post = posts[pIdx];
            var possEvent = post.nextElementSibling;

            // nextElementSibling is null, so post was the last post
            // withour any events attached
            if (possEvent === null) {
              post.insertAdjacentElement('afterend', eventElement);
              return;
            }

            while (possEvent.getAttribute('component') === 'topic/event') {

              if (possEvent.dataset.timestamp > tstamp) {
                possEvent.insertAdjacentElement('beforebegin', eventElement);
                return;
              }

              // iterate
              if (possEvent.nextElementSibling != null) {
                possEvent = possEvent.nextElementSibling;
              } else {
                possEvent.insertAdjacentElement('afterend', eventElement);
                return;
              }
            }
            // if routes in loop didnt return,
            // possEvent is the next not-event Element in topic <ul>
            possEvent.insertAdjacentElement('beforebegin', eventElement);
            return;
          }
        }
      },

      addTopicEvent: function(data) {
        templates.parse('topicEvents/event', data, function(tpl) {
          translator.translate(tpl, function(content) {

            var posts = document.querySelectorAll('li[component=post]');
            var newEventElement = window.$(content);
            newEventElement.find('.timeago').timeago();

            TopicEvents.placeTopicEvent(posts, newEventElement[0], data.tstamp);
          });
        });
      },

      clearTopicEvents: function() {
        var eventBlocks = document
                            .querySelectorAll('[component="topic/event"]');
        for (var i = eventBlocks.length - 1; i >= 0; i--) {
          eventBlocks[i].parentElement.removeChild(eventBlocks[i]);
        }
      },

      setEventTool: function(hidden) {
        var ttDOM = window.$('.toggle-events').children();
        for (var i = ttDOM.length - 1; i >= 0; i--) {
          var domTarget = ttDOM[i];
          if (hidden) {
            domTarget.classList.remove('fa-toggle-off');
            domTarget.classList.remove('te-hide');
            domTarget.classList.add('fa-toggle-on');
            domTarget.classList.add('te-show');
            translator.translate('[[topicEvents:ttool.show]]',
                function(translated) {
                  domTarget.nextSibling.textContent = translated;
                });
          } else {
            domTarget.classList.remove('fa-toggle-on');
            domTarget.classList.remove('te-show');
            domTarget.classList.add('fa-toggle-off');
            domTarget.classList.add('te-hide');
            translator.translate('[[topicEvents:ttool.hide]]',
                function(translated) {
                  domTarget.nextSibling.textContent = translated;
                });
          }
        }
      }
    };

    window.$(window).on('action:topic.loaded', TopicEvents.init);
    window.$(window).on('action:posts.loaded', function(evt, data) {
      TopicEvents.getState(data.posts[0].tid, function(isHidden) {
        if (isHidden) { return; }

        var topic = document.querySelector('[component="topic"]');
        var pqs = '';
        var posts = [
          document.querySelector('[component="post"][data-index="0"]')
        ];
        var iterEvents = [];
        var moveEvents = [];

        // new posts are delivered alone && have a CategoryID
        // assume there are no events after a post, that just
        // arrived, so just push the post to the very end
        if (data.posts.length === 1 && data.posts[0].cid) {
          pqs = '[component="post"][data-index="' +
                data.posts[data.posts.length - 1].index + '"]';
          var post = document.querySelector(pqs);
          topic.removeChild(post);
          topic.insertAdjacentElement('beforeend', post);
          return;
        }

        for (var i = 0; i <= data.posts.length - 1; i++) {
          pqs = '[component="post"][data-index="' +
                data.posts[i].index + '"]';
          posts.push(document.querySelector(pqs));
        }

        var newLastId = data.posts[data.posts.length - 1].index;
        if (newLastId < TopicEvents._firstAnswerId) {
          if (TopicEvents._headEvents.length === 0) {
            return;
          }
          iterEvents = TopicEvents._headEvents.slice(0);
          moveEvents = TopicEvents._headEvents;
        } else {
          if (TopicEvents._tailEvents.length === 0) {
            return;
          }
          iterEvents = TopicEvents._tailEvents.slice(0);
          moveEvents = TopicEvents._tailEvents;
        }
        for (var hIdx = 0; hIdx <= iterEvents.length - 1; hIdx++) {
          evt = iterEvents[hIdx];
          topic.removeChild(evt);
          moveEvents.shift();
          TopicEvents.placeTopicEvent(posts, evt, evt.dataset.timestamp);
        }
        return;
      });
    });

    socket.on('event:topic_pinned', TopicEvents.getTopicEvents);
    socket.on('event:topic_unpinned', TopicEvents.getTopicEvents);
    socket.on('event:topic_locked', TopicEvents.getTopicEvents);
    socket.on('event:topic_unlocked', TopicEvents.getTopicEvents);
    socket.on('event:topic_deleted', TopicEvents.getTopicEvents);
    socket.on('event:topic_restored', TopicEvents.getTopicEvents);
    socket.on('event:topic_moved', TopicEvents.getTopicEvents);
  });
})(window);
