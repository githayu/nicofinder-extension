var Nicofinder = {
  Define: {
    Host: {
      URL: 'http://www.nicofinder.net'
    },

    Regexp: {
      Niconico: /http[s]?:\/\/.*\.nicovideo\.jp\/.*/,
      Nicofinder: /http[s]?:\/\/.*\.nicofinder\.net\/.*/,
      Views: /http[s]?:\/\/(www|sp)\.nicovideo\.jp\/(watch|mylist)\/([a-z]{2}\d+|\d+)/,
      NicofinderWatch: /http[s]?:\/\/(www|dev|staging)\.nicofinder\.net\/watch\/([a-z]{2}\d+|\d+)/
    }
  },

  message: {
    send: function(message) {
      var d = new $.Deferred();

      chrome.runtime.sendMessage(message, function (res) {
        d.resolve(res)
      });

      return d.promise();
    }
  },

  request: {
    getthumbinfo: function(id) {

      var d = new $.Deferred();

      Nicofinder.message.send({
          get: ['lastinfo']

        }).done(function(res) {

        if(res.lastinfo !== false && $(res.lastinfo).find('video_id').text() == id) {

          d.resolve($(res.lastinfo));

        } else {

          $.ajax({
            url: 'http://ext.nicovideo.jp/api/getthumbinfo/'+ id,
            dataType: 'xml'
          }).done(function(xml) {

            d.resolve($(xml).find('nicovideo_thumb_response'));

            chrome.runtime.sendMessage({
              set: [
                ['lastinfo', xml.children[0].outerHTML]
              ]
            });

          });

        }
      });

      return d.promise();

    }
  },

  storage: {
    chrome: {
      local: function(obj) {
        var d = new $.Deferred();

        chrome.storage.local[obj.mode](obj.query, function(res) {
          d.resolve(res);
        });

        return d.promise();
      }
    }
  },

  fn: {
    url_vars_decode: function(url) {
      var result = {},
          query = url.substring(1).split('&');

      for(var i = 0; query[i]; i++) {
          var p = query[i].split('=');
          result[p[0]] = p[1];
      }

      return result;
    },
  }
}
