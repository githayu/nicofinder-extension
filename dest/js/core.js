var Nicofinder={Define:{Host:{URL:"http://www.nicofinder.net"},Regexp:{Niconico:/http[s]?:\/\/.*\.nicovideo\.jp\/.*/,Nicofinder:/http[s]?:\/\/.*\.nicofinder\.net\/.*/,Views:/http[s]?:\/\/(www|sp)\.nicovideo\.jp\/(watch|mylist)\/([a-z]{2}\d+|\d+)/,NicofinderWatch:/http[s]?:\/\/(www|dev|staging)\.nicofinder\.net\/watch\/([a-z]{2}\d+|\d+)/}},message:{send:function(e){var n=new $.Deferred;return chrome.runtime.sendMessage(e,function(e){n.resolve(e)}),n.promise()}},request:{getthumbinfo:function(e){var n=new $.Deferred;return Nicofinder.message.send({get:["lastinfo"]}).done(function(t){t.lastinfo!==!1&&$(t.lastinfo).find("video_id").text()==e?n.resolve($(t.lastinfo)):$.ajax({url:"http://ext.nicovideo.jp/api/getthumbinfo/"+e,dataType:"xml"}).done(function(e){n.resolve($(e).find("nicovideo_thumb_response")),chrome.runtime.sendMessage({set:[["lastinfo",e.children[0].outerHTML]]})})}),n.promise()}},storage:{chrome:{local:function(e){var n=new $.Deferred;return chrome.storage.local[e.mode](e.query,function(e){n.resolve(e)}),n.promise()}}},fn:{url_vars_decode:function(e){for(var n={},t=e.substring(1).split("&"),i=0;t[i];i++){var o=t[i].split("=");n[o[0]]=o[1]}return n}}};