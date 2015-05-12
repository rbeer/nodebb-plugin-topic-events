'use strict';
/*global socket, ajaxify, RELATIVE_PATH, utils, translator, templates*/

$('document').ready(function() {
  //todo: experiment with pre-loading this info on ajaxify.start
  $(window).on('action:ajaxify.end', function(evt, data) {

    var url = data.url,
        tid;

    if (tid = data.url.match(/^topic\/(\d*)/)) {
      getTopicEvents({tid: tid[1]});
    }
  });

  $(window).on('action:posts.loaded', getTopicEvents);

  socket.on('event:topic_pinned', getTopicEvents);
  socket.on('event:topic_unpinned', getTopicEvents);
  socket.on('event:topic_locked', getTopicEvents);
  socket.on('event:topic_unlocked', getTopicEvents);
  socket.on('event:topic_deleted', getTopicEvents);
  socket.on('event:topic_restored', getTopicEvents);
  socket.on('event:topic_moved', getTopicEvents);

  function getTopicEvents(data) {
    var tid = data.tid || ajaxify.variables.get('topic_id');
    clearTopicEvents();

    $.get(RELATIVE_PATH + '/api/events/tid/' + tid, function(events) {
      $.each(events, function(idx, data) {
        if ($('.events-topic[data-timestamp="' +
            data.tstamp + '"]').length ||
            data.evtType === void 0) {
          return true;
        }

        var tstamp = utils.toISOString(data.tstamp),
            userUri = RELATIVE_PATH + '/user/' + data.userslug,
            evtType = data.evtType,
            contentTpl = 'events:topic.' + evtType;

        if (evtType === 'move') {
          var fromUri = RELATIVE_PATH + '/category/' + data.fromSlug,
              toUri = RELATIVE_PATH + '/category/' + data.toSlug;

          data.content = translator.compile(contentTpl, userUri,
              data.username, fromUri, data.fromName, toUri,
              data.toName, tstamp);
        } else {
          data.content = translator.compile(contentTpl, userUri, data.username,
              tstamp);
        }
        data.class = evtType;
        addTopicEvent(data, idx);
      });
    });
  }

  function clearTopicEvents() {
    var posts = document.getElementsByClassName('events-topic-block');
    for (var i = posts.length - 1; i >= 0; i--) {
      posts[i].remove();
    }
  }

  function addTopicEvent(data, idx) {
    templates.parse('events/topic', data, function(tpl) {
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
            if (possEvents && possEvents.className === 'events-topic-block') {
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
              block.className = 'events-topic-block';
              block.appendChild(newEvtRow[0]);
              posts.item(pIdx).insertAdjacentElement('afterend', block);
            }
          }
        }
      });
    });
  }
});
