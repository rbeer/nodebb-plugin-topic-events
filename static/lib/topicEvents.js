'use strict';
/*global socket, ajaxify, RELATIVE_PATH, utils, translator, templates*/


$('document').ready(function() {

  var TopicEvents = {

    getState: function(tid, cb) {
      $.get(RELATIVE_PATH + '/api/topic-events/' + tid + '/state',
            function(stateData) {
              return cb(stateData.isHidden);
            });
    },

    getTopicEvents: function(data) {

      var tid = data.tid || ajaxify.variables.get('topic_id');
      // get state
      TopicEvents.getState(tid, function(hidden) {
        if (!hidden) {
          $.get(RELATIVE_PATH + '/api/topic-events/' + tid, function(events) {
            $.each(events, function(idx, data) {
              if ($('.topic-events[data-timestamp="' +
                  data.tstamp + '"]').length ||
                  data.evtType === void 0) {
                return true;
              }

              var tstamp = utils.toISOString(data.tstamp),
                  userUri = RELATIVE_PATH + '/user/' + data.userslug,
                  evtType = data.evtType,
                  contentTpl = 'topicEvents:topic.' + evtType;

              if (evtType === 'moved') {
                var fromUri = RELATIVE_PATH + '/category/' + data.fromSlug,
                    toUri = RELATIVE_PATH + '/category/' + data.toSlug;

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
            });
          });
        }
      });
    },

    clearTopicEvents: function() {
      var eventBlocks = document.getElementsByClassName('topic-events-block');
      for (var i = eventBlocks.length - 1; i >= 0; i--) {
        eventBlocks[i].parentNode.removeChild(eventBlocks[i]);
      }
    },

    addTopicEvent: function(data) {
      templates.parse('topicEvents/event', data, function(tpl) {
        translator.translate(tpl, function(content) {

          var posts = document.getElementsByClassName('post-row'),
              nextTstamp = 0;

          for (var pIdx = 0; pIdx <= posts.length - 1; pIdx++) {
            if (pIdx != posts.length - 1) {
              nextTstamp = posts.item(pIdx + 1).dataset.timestamp;
            } else {
              nextTstamp = data.tstamp + 1;
            }

            // event goes inbetween this and next post
            if (posts.item(pIdx).dataset.timestamp < data.tstamp &&
                nextTstamp > data.tstamp) {

              var newEvtRow = $(content);
              newEvtRow.find('.timeago').timeago();

              // already events in here?
              var possEvents = posts.item(pIdx).nextElementSibling;
              if (possEvents && possEvents.className === 'topic-events-block') {
                // loop through present events and place new one according
                // to timestamps; necessary, since templates.parse is async.
                for (var cIdx = possEvents.children.length - 1; cIdx >= 0;
                    cIdx--) {
                  if (possEvents.children[cIdx].dataset.timestamp <
                      data.tstamp) {
                    possEvents.children[cIdx].insertAdjacentElement('afterend',
                        newEvtRow[0]);
                    break;
                  } else if (cIdx === 0) {
                    possEvents.children[cIdx].insertAdjacentElement('beforebegin',
                        newEvtRow[0]);
                  }
                }
              } else {
                var block = document.createElement('div');
                block.className = 'topic-events-block';
                block.appendChild(newEvtRow[0]);
                posts.item(pIdx).insertAdjacentElement('afterend', block);
              }
            }
          }
        });
      });
    },

    setEventTool: function(hidden) {
      var ttDOM = $('.toggle-events').children();
      for (var i = ttDOM.length - 1; i >= 0; i--) {
        var domTarget = ttDOM[i];
        if (hidden) {
          domTarget.classList.remove('fa-toggle-off');
          domTarget.classList.remove('te-hide');
          domTarget.classList.add('fa-toggle-on');
          domTarget.classList.add('te-show');
          domTarget.parentElement.dataset.teHidden = '1';
          translator.translate('[[topicEvents:ttool.show]]',
              function(translated) {
                domTarget.nextSibling.textContent = translated;
              });
        } else {
          domTarget.classList.remove('fa-toggle-on');
          domTarget.classList.remove('te-show');
          domTarget.classList.add('fa-toggle-off');
          domTarget.classList.add('te-hide');
          domTarget.parentElement.dataset.teHidden = '0';
          translator.translate('[[topicEvents:ttool.hide]]',
              function(translated) {
                domTarget.nextSibling.textContent = translated;
              });
        }
      }
    }
  };

  $(window).on('action:ajaxify.end', function(evt, data) {

    var url = data.url,
        tid;

    if (tid = data.url.match(/^topic\/(\d*)/)) {
      TopicEvents.getState(tid[1], function(hidden) {
        TopicEvents.setEventTool(hidden);
        if (!hidden) {
          TopicEvents.getTopicEvents({tid: tid[1]});
        }
      });
    }
    $('.toggle-events').on('click', function(evt) {
      //TopicEvents.toggleTopicTool(tid[1]);

      // topic tool DOM
      var ttDOM = $('.toggle-events').children()[0];
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
  });
  $(window).on('action:posts.loaded', TopicEvents.getTopicEvents);

  socket.on('event:topic_pinned', TopicEvents.getTopicEvents);
  socket.on('event:topic_unpinned', TopicEvents.getTopicEvents);
  socket.on('event:topic_locked', TopicEvents.getTopicEvents);
  socket.on('event:topic_unlocked', TopicEvents.getTopicEvents);
  socket.on('event:topic_deleted', TopicEvents.getTopicEvents);
  socket.on('event:topic_restored', TopicEvents.getTopicEvents);
  socket.on('event:topic_moved', TopicEvents.getTopicEvents);
});