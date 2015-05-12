'use strict';
/*global socket, ajaxify, RELATIVE_PATH, utils, translator, templates*/

$('document').ready(function() {
  //todo: experiment with pre-loading this info on ajaxify.start
  $(window).on('action:ajaxify.end', function(err, data) {

    if (err) {
      return err;
    }

    var url = data.url, tid;

    if (tid = data.url.match(/^topic\/(\d*)/)) {
      getTopicEvents({tid: tid[1]});
    }
  });

  $(window).on('action:posts.loaded', getTopicEvents);

  socket.on('event:topic_pinned', getTopicEvents);
  socket.on('event:topic_unpinned', getTopicEvents);
  socket.on('event:topic_locked', getTopicEvents);
  socket.on('event:topic_unlocked', getTopicEvents);
  socket.on('event:topic_moved', getTopicEvents);

  function getTopicEvents(data) {
    var tid = data.tid || ajaxify.variable.get('topic_id');

    $.get(RELATIVE_PATH + '/api/events/tid/' + tid, function(events) {
      $.each(events, function(idx, data) {
        if ($('.events-topic[data-timestamp="' +
            data.timestamp + '"]').length ||
            data.eventType === void 0) {
          return true;
        }

        var tstamp = utils.toISOString(data.timestamp),
            userUri = RELATIVE_PATH + '/user/' + data.userslug,
            evtType = data.eventType,
            contentTpl = 'events:topic.' + eType;

        if (evtType === 'move') {
          var fromUri = RELATIVE_PATH + '/category/' + data.fromCategorySlug,
              toUri = RELATIVE_PATH + '/category/' + data.toCategorySlug;

          data.content = translator.compile(contentTpl, userUri,
              data.username, fromUri, data.fromCategoryName, toUri,
              data.toCategoryName, tstamp);
        } else {
          data.content = translator.compile(contentTpl, userUri, data.username,
              tstamp);
        }
        data.class = evtType;
        addTopicEventRow(data, idx);
      });
    });
  }

  function createTopicEventRow(data, idx) {
    // the async nature of this function causes
    // occasional hiccups on the placing of events
    templates.parse('events/topic', data, function(tpl) {
      translator.translate(tpl, function(content) {

        var rows = $('li.post-row');
        rows.each(function(idx) {
          var $this = $(this),
              nextRow = rows.eq(idx + 1),
              nextRowTimestamp = nextRow.attr('data-timestamp') ?
                  nextRow.attr('data-timestamp') : data.timestamp + 1;

          if ($this.attr('data-timestamp') < data.timestamp &&
              nextRowTimestamp > data.timestamp) {
            var contentEl;
            if (nextRow.length) {
              contentEl = $(content).insertBefore(nextRow);
            } else {
              contentEl = $(content).appendTo($this.parent());
            }

            contentEl.find('.timeago').timeago();

            contentEl.prev().addClass('events-topic-before');
            if (!contentEl.next().length) {
              $('.bottom-post-bar').addClass('events-topic-after');
            } else {
              contentEl.next().addClass('events-topic-after');
            }
            return false;
          }
        });
      });
    });
  }
}
