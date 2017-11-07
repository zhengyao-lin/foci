/* wechat util */

"use strict";

var db = require("./db");
var err = require("./err");
var util = require("./util");

var request = require("request-promise");
var cheerio = require("cheerio");

var article_url = code => "https://mp.weixin.qq.com/" + code;

// var imgDerefer = async (html) => {
//     var img = /https?:\/\/mmbiz.qpic.cn\/mmbiz_([^/]+)\/[^'")]*/g;
//     var imgi = /https?:\/\/mmbiz.qpic.cn\/mmbiz_([^/]+)\/[^'")]*/;

//     var type;

//     html = html.replace(img, function (cont) {
//         var match = cont.match(imgi);

//         // console.log(cont, match[1]);

//         switch (match[1]) {
//             case "png":
//                 type = "image/png";
//                 break;

//             case "jpg":
//             default:
//                 type = "image/jpeg";
//                 break;
//         }

//         return "/file/derefer?type=" + encodeURIComponent(type) + "&url=" + encodeURIComponent(cont);
//     });

//     // console.log(html);

//     return html;
// };

exports.getArticleContent = async (code) => {
    var html = await request.get(article_url(code));
    var $ = cheerio.load(html);
    var img = /https?:\/\/mmbiz.qpic.cn\/mmbiz_([^/]+)\/[^'")]*/;

    var map = {};
    
    $("#js_content img[data-src]").each(function (i, dom) {
        dom = $(dom);
        
        var url = dom.attr("data-src");
        var match = url.match(img);

        var type = "image/jpeg";
    
        if (match) switch (match[1]) {
            case "png":
                type = "image/png";
                break;

            case "gif":
                type = "image/gif";
                break;

            case "jpg":
            default: break;
        }

        var derefered = "/file/derefer?type=" + encodeURIComponent(type) + "&url=" + encodeURIComponent(url);

        map[url] = derefered;

        dom
            .attr("data-src", derefered)
            .addClass("frameless img");
    });

    var text = $("#js_content").html();
    var i = 0;

    for (var url in map) {
        if (map.hasOwnProperty(url)) {
            // console.log(url, map[url]);

            // var orig = text;

            text = text.replaceAll("url(" + url + ")", "url(" + map[url] + ")");

            // if (text[0] == ";") {
            //     console.log("##########################################");
                
            //     var temp = orig.slice(orig.indexOf(url) - 100, orig.indexOf(url) + 300);

            //     console.log(url, map[url]);
            //     console.log(temp + "...");
            //     console.log(text.slice(0, 500) + "...");

            //     console.log(temp.replaceAll("url(" + url + ")", "url(" + map[url] + ")"));
            // }
        }
    }

    return text;
};
