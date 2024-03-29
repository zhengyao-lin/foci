/* realname util */

"use strict";

define([ "com/util", "com/login", "com/xfilt" ], function (util, login, xfilt) {
    var $ = jQuery;
    foci.loadCSS("com/realname.css");
    
    var realname = {};
    
    realname.badge = function (uuid, euid, config) {
        config = $.extend({
            show_name: true,
            only_state: false,
            show_norealname: false, // show when the user is not authenticated
            use_given: false,
            data: null, // using the given realname data
            // onLoad
        }, config);
        
        var main = $("<div class='com-realname-badge'> \
            <i class='badge-icon fitted help circle icon'></i> \
            <div class='ui loader tiny active'></div> \
            <span class='name'></span> \
        </div>");
        
        var popup = $("<div class='com-realname-badge-popup'> \
            <div class='name'></div><div class='school'></div> \
        </div>");
        
        function check() {
            main.addClass("auth");
            main.find(".badge-icon").removeClass("help").addClass("check");
        }
        
        function callLoad() {
            if (config.onLoad) config.onLoad();
        }
        
        function loadData(dat) {
            if (dat) {
                check();

                main.data("realname", xfilt(dat.name) + " " + xfilt(dat.school));
                
                popup.find(".name").html(xfilt(dat.name));
                if (config.show_name)
                    main.find(".name").html(xfilt(dat.name));
                
                popup.find(".school").html(xfilt(dat.school));
            } else if (!config.show_norealname) {
                main.addClass("not-realname");
            } else {
                popup.html("Not authenticated");
            }
        }
        
        if (config.only_state) {
            popup.addClass("only-state");
            
            // don't show the name
            foci.get("/user/realname", { uuid: uuid }, function (suc, dat) {
                main.find(".loader").removeClass("active");
                
                if (suc) {
                    if (dat) {
                        check();
                        popup.html("Real-name authenticated");
                    } else {
                        if (!config.show_norealname)
                            main.addClass("not-realname");
                        else {
                            popup.addClass("not-realname");
                            popup.html("Not authenticated");
                            main.click(function () {
                                util.jump("#setting/user/realname");
                            });
                        }
                    }
                } else {
                    util.emsg(dat);
                }
                
                callLoad();
            });
        } else {
            if (config.use_given) {
                main.find(".loader").removeClass("active");
                loadData(config.data);
                callLoad();
            } else {
                login.session(function (session) {
                    if (session) {                
                        foci.encop(session, {
                            int: "info",
                            action: "realname",
                            uuid: uuid,
                            euid: euid
                        }, function (suc, dat) {
                            main.find(".loader").removeClass("active");
                            
                            if (suc) {
                                loadData(dat);
                            } else {
                                util.emsg(dat);
                            }
                            
                            callLoad();
                        });
                    } else {
                        main.find(".loader").removeClass("active");
                        callLoad();
                    }
                });
            }
        }
        
        main.popup({
            html: popup,
            lastResort: "bottom center",
            offset: -13,
            
            hoverable: true
        });
        
        return main;
    };
    
    return realname;
});
