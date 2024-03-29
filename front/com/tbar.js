/* top bar */
"use strict";

define([
	"com/login", "com/xfilt", "com/util",
	"com/env", "com/upload", "com/pm",
	"com/notice", "com/lang", "com/popselect",
	"com/rating", "com/club", "com/tip",
	"com/trex"
], function (login, xfilt, util, env, upload, pm, notice, lang, popselect, rating, club, tip, trex) {
	var $ = jQuery;
	foci.loadCSS("com/tbar.css");

	// var instance = [];

	function init(config) {
		config = $.extend({
			max_search_res: 7
		}, config);

		var main = ' \
			<div class="com-tbar hide"> \
				<div class="left-bar"> \
					<div class="menu-btn"><i class="fitted content icon"></i></div \
					><div class="ui left action right icon input search-box"> \
						<button class="site-logo hide-with-search"> \
							<span class="site-logo-name"> \
								<i class="foci-logo"></i><b class="hide-in-mobile">Foci</b> \
							</span> \
						</button> \
						<div class="ui search fluid hide-with-search"> \
							<div class="filter-tag fluid ui multiple dropdown"> \
								<div class="ui fluid menu"> ' + /* tags add here! */ ' \
									<div class="header"> \
										<i class="tags icon"></i> \
										Add tag \
									</div> \
									<div class="scrolling menu"> \
										<div class="item" data-value="no-select" style="display: none;"> \
											dont select me \
										</div> \
									</div> \
								</div> \
							</div> \
							<input class="prompt lang" data-attr="placeholder" data-replace="$front.com.tbar.search_prompt" placeholder="Type for surprise" type="text"> \
						</div> \
						<i class="filter-btn filter link icon hide-with-search"></i> \
						<span class="site-logo-prompt"> - <span class="lang" data-replace="$front.com.login.logo_prompt">Where events begin</span></span> \
					</div> \
					<!-- div class="nav-link-set"> \
						<a class="nav-link" href="#cover">Home</a> \
						<a class="nav-link" href="#search">Plaza</a> \
						<a class="nav-link" href="#profile">Profile</a> \
						<a class="nav-link" href="#contact">Contact</a> \
					</div --> \
				</div> \
				<div class="menu-view"> \
					<div class="menu-cont"> \
						<i class="cancel icon"></i> \
						<a class="menu-link" href="#cover">Home</a> \
						<a class="menu-link" href="#search">Plaza</a> \
						<a class="menu-link" href="#profile">Profile</a> \
						<a class="menu-link" href="#contact">Contact</a> \
					</div> \
				</div> \
				<div class="msg-view-set"></div> \
				<div class="banner-view"> \
					<div class="banner"></div> \
				</div> \
				<div class="right-bar"> \
					<div class="avatar-box"> \
						<div class="avatar-util-box expand"> \
							<div class="avatar-util man-club-btn"> \
								<i class="fitted flag outline icon"></i> \
							</div><div class="avatar-util notice-btn"> \
								<i class="fitted alarm outline icon" style="font-size: 95%;"></i> \
								<div class="reddot"></div> \
							</div><div class="avatar-util pm-btn"> \
								<i class="fitted comments outline icon"></i> \
								<div class="reddot"></div> \
							</div> \
							<div class="pm-popup ui popup transition hidden"></div> \
							<div class="notice-popup ui popup transition hidden"></div> \
						</div><div class="avatar"> \
							<div class="ui tiny loader"></div> \
						</div> \
						<button class="login-btn"> \
							<div class="ui small loader"></div> \
							<i class="sign in icon" style="font-size: 1.3em;"></i> \
						</button> \
						<div class="reddot"></div> \
					</div> \
					<div class="avatar-popup ui popup transition hidden"> \
						<div class="cont"> \
							<div class="pop-avatar"><div><i class="setting icon"></i></div></div> \
							<div class="pop-title header"></div> \
							<div class="rating"></div> \
							<a class="setting-btn" href="#setting/user"> \
								<i class="fitted setting icon"></i> \
							</a> \
						</div> \
						<div class="ui two bottom attached buttons"> \
							<div class="ui basic button profile lang" data-replace="$front.com.tbar.profile">Profile</div> \
							<div class="ui basic button logout lang" data-replace="$front.com.tbar.logout">Logout</div> \
						</div> \
					</div> \
				</div> \
				<div class="right-bar-restore"></div> \
			</div> \
		';

		main = $(main);

		main.find(".site-logo-prompt").prepend(main.find(".site-logo-name").clone());
		
		var showNewMsg;

		(function () {
			var msg_set = main.find(".msg-view-set");

			showNewMsg = function (icon, msg, style) {
				var dom = $("<div class='msg-view " + style + "'> \
					<i class='msg-view-icon " + icon + " icon'></i> \
					<span>" + msg + "</span> \
				</div>");

				dom.click(function () {
					var dom = $(this);
					
					dom.removeClass("show-msg");
	
					if (!msg_set.children(".show-msg").length) {
						main.removeClass("show-msg");
					}
	
					setTimeout(function () {
						dom.remove();
					}, 500);
				});

				setTimeout(function () {
					main.addClass("show-msg");
					dom.addClass("show-msg");
				}, 300);
				
				msg_set.append(dom);
			};

			// setTimeout(function () {
			// 	showNewMsg("rocket", "<b>Foci has just updated!</b>");
			// }, 3000);
		})();

		(function () {
			var trex_count = 0;
			var trex_time = new Date();
	
			main.find(".site-logo-name").click(function () {
				var cur = new Date();
	
				if (cur - trex_time < 3000 || trex_count == 0) {
					if (++trex_count == 3) {
						trex_count = 0;
						trex.modal({ use_dragi: foci.use_dragi });
						setTimeout(function () {
							hideMenu();
						}, 300);
					}
				} else trex_count = 0;
	
				trex_time = cur;
			});
		})();

		function toggleAvatarUtil(dir) {
			main.find(".avatar-util").transition({
				animation: "scale " + (dir || ""),
				interval: 200
			});
		}
		
		var is_mobile = $(window).width() <= 640;

		var getTag, clearTag, addTag;

		// tag filter
		(function () {
			var tag_dname = {}; // TODO: tag display name map
			var tag_selected = {};
			
			getTag = function () {
				var ret = [];

				for (var k in tag_selected) {
					if (tag_selected.hasOwnProperty(k) && tag_selected[k]) {
						ret.push(k);
					}
				}

				return ret;
			}

			clearTag = function () {
				tag_selected = {};
				main.find(".filter-btn").removeClass("active");
				main.find(".filter-tag .scrolling.menu .tag div").removeClass("blue").addClass("grey");
			};

			addTag = function (name) {
				var tag = $(" \
					<div class='item tag filtered' style='display: block !important; font-weight: normal !important;'> \
						<div class='ui grey empty circular label'></div> \
					</div> \
				");

				tag.attr("data-value", name);
				tag.append(tag_dname.hasOwnProperty(name) ? tag_dname[name] : name);
				tag.click(function () {
					main.find(".filter-btn").addClass("active");
					tag_selected[name] = !tag_selected[name];
					tag.find("div").toggleClass("grey").toggleClass("blue");
				});

				main.find(".filter-tag .scrolling.menu").append(tag);
			};
			
			env.favtag(function (tags) {
				if (tags) for (var k in tags) {
					if (tags.hasOwnProperty(k))
						addTag(k);
				}
			});
		})();
		
		var showMenu, hideMenu;

		// show/hide menu
		(function () {
			var proc;

			showMenu = function () {
				hideSearchResult();

				main.addClass("show-menu");
				main.removeClass("show-banner");
				main.css("overflow", "hidden");
				clearTimeout(proc);
			};

			hideMenu = function () {
				main.removeClass("show-menu");
				proc = setTimeout(function () {
					main.css("overflow", "");
				}, 300);
			};

			main.find(".site-logo, .site-logo-prompt").click(function () {
				if (util.isMobile())
					showMenu();
			});
			
			main.find(".menu-btn").click(showMenu);
			main.find(".menu-cont .cancel.icon").click(hideMenu);
			main.find(".menu-cont .menu-link").click(hideMenu);
		})();

		// search
		var onsearch = null;

		function search(e, kw) {
			if (!e || e.keyCode == 13) {
				main.find(".prompt").blur();

				if (onsearch) {
					kw = kw || main.find(".prompt").val();
					onsearch({
						kw: kw,
						favtag: getTag()
					});

					clearTag();
				}
			}
		}
		
		function hideSearchResult() {
			main.find(".search").search("hide results");
		}
		
		function showAvatar() {
			main.find(".right-bar").addClass("logged");
		}

		function hideAvatar() {
			ava.popup("hide");
			main.find(".right-bar").removeClass("logged");
		}
		
		var old_info = null;
		
		var ratobj = rating.init(main.find(".rating"), undefined, { size: "mini" });
		
		function setAvatarBoxUnread() {
			main.find(".avatar-box").addClass("unread");
		}
		
		function unsetAvatarBoxUnread() {
			main.find(".avatar-box").removeClass("unread");
		}
		
		// update avatar
		function updateAvatar(file) {
			function refresh(info) {
				main.find(".login-btn .loader").removeClass("active");
				
				info = login.parseInfo(info || {});

				function update() {
					ava.css("background-image", "url(\'" + info.avatar + "\')");
					main.find(".avatar-popup .pop-avatar").css("background-image", "url(\'" + info.avatar + "\')");
					return info.avatar;
				}
					
				ratobj.set(info.rating);

				main.find(".avatar-popup .pop-title").html(info.dname);
				main.find(".avatar-popup .logout").click(function () {
					// ava.addClass("loading");
					env.logout(function () {
						updateAvatar();
					});
				});

				var url = update();

				showAvatar();

				main.find(".avatar .loader").addClass("active");
				util.img(url, function () {
					main.find(".avatar .loader").removeClass("active");
				});

				pmview.init(function (unread) {});

				ntview.keepUpdate(function (has) {
					if (has) {
						setAvatarBoxUnread();
						main.find(".notice-btn").addClass("unread");
						util.emsg("you have a new notice", "info");
					}
				});

				// vcent.update();
			}

			if (env.session()) {
				main.find(".login-btn .loader").addClass("active");
				
				env.user(function (info) {
					if (file) {
						info.avatar = file;
						old_info = null;
						refresh(info);
					} else {
						if (info !== old_info) {
							old_info = info;
							refresh(info);
						}
					}
				});
				
				login.onlyAdmin(adminSetting);
			} else {
				main.find(".login-btn .loader").removeClass("active");
				
				hideAvatar();
				old_info = null;
			}
		}

		function onSearchResponse(resp) {
			var ret = [];

			if (resp.suc) {
				var len =
					config.max_search_res < resp.res.length
					? config.max_search_res : resp.res.length;

				// alert("here");

				for (var i = 0; i < len; i++) {
					// alert(resp.res[i].title);
					ret.push({
						title: resp.res[i].title,
						// description: resp.res[i].descr,
						euid: resp.res[i].euid
					});
				}

				return { results: ret };
			} else {
				console.log("failed to connect to the server");
			}
		}
		
		function adminSetting() {
			ntview.setAdmin();
			// main.find(".site-logo").removeClass("foci-logo").addClass("admin-logo bathtub icon");
		}

		// functions end
		/**********************************************************************/
		// settings begin

		lang.update(main);

		main.find(".man-club-btn").click(function () {
			club.popview({ use_dragi: foci.use_dragi });
		});
		
		tip.init(main.find(".man-club-btn"), "Manage club", "bottom center", {
			on: "hover",
			style: "white",
			auto: false,
			
			distanceAway: is_mobile ? 0 : 18
		});

		// popselect.init(main.find(".new-event-btn"), [
		// 	{
		// 		cont: "<i class='flag checkered text outline icon'></i> Event",
		// 		onSelect: function () {
		// 			util.jump("#profile//new");
		// 		}
		// 	},
		// 
		// 	{
		// 		cont: "<i class='users text outline icon'></i> Club",
		// 		onSelect: function () {
		// 			util.emsg("coming soon", "info");
		// 		}
		// 	},
		// ], { position: "bottom left" });

		var pmview, ntview;

		// initialize personal message and notice
		(function () {
			var pm_open = false;

			main.find(".pm-btn").popup({
				popup: main.find(".pm-popup"),
				position: "bottom left",
				on: "click",
				lastResort: true,
				distanceAway: is_mobile ? 0 : 18, /* TODO: not fixed!! */
				
				onShow: function () {
					pm_open = true;
					pmview.refresh();
				},

				onHidden: function () {
					pm_open = false;
				}

				// onShow: function () {
				// 	// main.find(".pm-btn").removeClass("unread");
				// 	// unsetAvatarBoxUnread();
				// }
			});

			main.find(".notice-btn").popup({
				popup: main.find(".notice-popup"),
				position: "bottom right",
				on: "click",
				lastResort: true,
				distanceAway: is_mobile ? 0 : 18,

				onShow: function () {
					// main.find(".notice-btn").removeClass("unread");
					// unsetAvatarBoxUnread();
					ntview.refresh();
				},

				onHide: function () {
					if (!ntview.canHide()) return false;
				}
			});

			pmview = pm.qview(main.find(".pm-popup"), {
				use_dragi: foci.use_dragi,
				
				onUnread: function (server_end) {
					if (server_end && pm_open) pmview.refresh();

					main.find(".pm-btn").addClass("unread");
					setAvatarBoxUnread();
				},
				
				onAllRead: function () {
					main.find(".pm-btn").removeClass("unread");
					unsetAvatarBoxUnread();
				}
			});
			
			ntview = notice.init(main.find(".notice-popup"), {
				use_dragi: foci.use_dragi,
				
				onUnread: function () {
					main.find(".notice-btn").addClass("unread");
					setAvatarBoxUnread();
				},
				
				onAllRead: function () {
					main.find(".notice-btn").removeClass("unread");
					unsetAvatarBoxUnread();
				}
			});
			
			if (env.session())
				ntview.refresh();
		})();

		// init filter tag
		(function () {
			main.find(".filter-tag").dropdown({
				hideAdditions: true,
				transition: "scale",

				onShow: function () {
					main.find(".filter-tag").css("pointer-events", "auto");
				},

				onHide: function () {
					main.find(".filter-tag").css("pointer-events", "none");
				},

				keys: {
					enter: -1 // avoid enter select
				}
			});

			main.find(".filter-btn").click(function () {
				main.find(".filter-tag").dropdown("toggle");
			});
		})();

		main.find(".prompt").keydown(search);

		// init search
		main.find(".search").search({
			apiSettings: {
				url: "/event/search?kw={query}",
				onResponse: onSearchResponse
			},

			onSelect: function (arg) {
				search(null, arg.title);
			}
		});

		// login button
		main.find(".login-btn").click(function () {
			hideAvatar();
			main.find(".login-btn .loader").addClass("active");
			login.init(function (dat) {
				updateAvatar();
				if (!dat)
					main.find(".login-btn .loader").removeClass("active");
			});
		});

		var ava = main.find(".avatar");
		ava.popup({
			popup: main.find(".avatar-popup"),
			position: "bottom right",
			hoverable: true,
			distanceAway: is_mobile ? 0 : 30 // TODO: temp fix
		});
		
		main.find(".avatar-box").swipe({
			swipeDown: function () {
				if (is_mobile) {
					ava.popup("hide");
					main.find(".avatar-util-box").removeClass("expand");
					ret.hideFloatAvatar();
				}
			},
			
			threshold: 30,
			
			preventDefaultEvents: false
		});
		
		main.find(".right-bar-restore").swipe({
			swipeUp: function () {
				if (is_mobile) {
					ret.showFloatAvatar();
				}
			},
			
			threshold: 30,
			
			preventDefaultEvents: true
		});

		main.find(".avatar-popup .pop-avatar")
			.click(function () {
				upload.init(function (file) {
					if (file) {
						login.session(function (session) {
							// set avatar
							foci.encop(session, {
								int: "info",
								action: "set",
								avatar: file
							}, function (suc, dat) {
								if (suc) {
									updateAvatar(file);
								} else {
									util.emsg(dat);
								}
							});
						});
					}
				});
			});

		var ret = (function () {
			var mod = {};
			
			var styles = [ "simple", "light-simple", "shadowy", "apply", "green", "orange", "colorful" ].join(" ");
			var session = null;
			
			mod.search = function (cb) {
				onsearch = cb;
			};

			mod.updateAvatar = function () {
				if (env.session() != session) {
					updateAvatar();
					session = env.session();
				}
			};

			mod.setStyle = function (style) {
				main.removeClass(styles);
				main.addClass(style);
			};

			mod.applyShadow = function () {
				main.addClass("apply");
			};

			mod.removeShadow = function () {
				main.removeClass("apply");
			};

			mod.menu = function (cb) {
				// main.find(".menu-btn").click(cb);
			};

			mod.toggleIcon = function (icon) {
				main.find(".site-logo i")
					.toggleClass(icon)
					.toggleClass("content");
			};

			mod.icon = function (icon) {
				main.find(".site-logo i")
					.addClass(icon)
					.removeClass("content");
			};

			mod.profile = function (cb) {
				main.find(".profile").click(cb);
			};

			mod.showBanner = function () {
				hideSearchResult();
				main.addClass("show-banner");
				hideMenu();
				main.find(".avatar-util-box").removeClass("expand");
			};

			mod.hideBanner = function () {
				main.removeClass("show-banner");
				main.find(".avatar-util-box").removeClass("expand");
			};

			mod.setBanner = function (html) {
				main.find(".banner").html(html);
			};

			mod.setTitle = function () {
				var args = Array.prototype.slice.apply(arguments);
				
				for (var i = 0; i < args.length; i++) {
					args[i] = xfilt(args[i]);
				}
				
				main.find(".banner")
					.html(args.join("<i class='sub caret right icon'></i>"))
					
				util.setTitle.apply(util, arguments);
				
				main.find(".banner").attr("title", util.htmlToText(document.title));

				// ret.showBanner();
				// setTimeout(ret.hideBanner, 3000);
			};

			mod.showSearchLoad = function () {
				main.find(".search-box").addClass("loading");
			};

			mod.hideSearchLoad = function () {
				main.find(".search-box").removeClass("loading");
			};

			mod.openNotice = function () {
				main.find(".notice-btn").click();
			};

			mod.openPM = function () {
				main.find(".pm-btn").click();
			};
			
			mod.openClub = function () {
				main.find(".man-club-btn").click();
			};
			
			mod.showSearch = function () {
				// main.find(".menu-cont").append(main.find(".search-box .menu-link"));
				main.removeClass("hide-search");
			};
			
			mod.hideSearch = function () {
				main.addClass("hide-search");
				// main.find(".search-box").append(main.find(".menu-cont .menu-link"));
			};
			
			mod.hide = function () {
				main.css("display", "none");
			};
			
			mod.show = function () {
				main.css("display", "");
			};
			
			mod.height = function () {
				return main.height();
			};
			
			mod.hideFloatAvatar = function () {
				main.addClass("hide-float-avatar");
			};
			
			mod.showFloatAvatar = function () {
				main.removeClass("hide-float-avatar");
			};

			mod.showMsg = function (icon, msg, style) {
				showNewMsg(icon, msg, style);
			};
			
			return mod;
		})();

		// event bindings
		(function () {
			setInterval(ret.updateAvatar, 5000);
			
			env.on("loginchange", function () {
				updateAvatar();
			});
		})();
		
		ret.updateAvatar();

		main.css("opacity", "0");
		main.ready(function () {
			main.css("opacity", "");
			main.removeClass("hide");
		});
		
		login.onlyAdmin(adminSetting);

		util.media(640, function () {
			// mobile
			// main.find(".new-event-btn").attr("data-position", "top center");
			// is_mobile = true;
		}, function () {
			// desktop
			// main.find(".new-event-btn").attr("data-position", "bottom center");
			// is_mobile = false;
		});
		
		$("body").prepend(main);

		// instance.push(ret);

		return ret;
	};

	return {
		init: init
	}
});
