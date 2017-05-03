/* event */
"use strict";

define([ "com/xfilt", "com/waterfall", "com/util", "com/avatar", "com/env", "com/upload", "com/login" ], function (xfilt, waterfall, util, avatar, env, upload, login) {
	var $ = jQuery;
	foci.loadCSS("com/event.css");
	foci.loadCSS("com/eqview.css");

	var lim_config = {
		max_title_len: 32,
		max_location_len: 64,
		max_descr_len: 512
	};

	function genDate(start, end) {
		var ret = "";
		var form = function (date) {
			return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
		};

		if (start) ret += form(new Date(start));
		else ret += "TBD";

		ret += " ~ ";

		if (end) ret += form(new Date(end));
		else ret += "TBD";

		return ret;
	}

	/* waterfall view of events */
	/* for search results and listing */
	function init(cont, config) {
		cont = $(cont);
		config = $.extend({}, lim_config, {
			max_descr_len: 64
		}, config);

		var main = "<div class='com-event'></div>";
		main = $(main);

		/* init waterfall */
		var wf = waterfall.init(main, { onUpdate: config.onUpdate });

		cont.append(main);

		function setDom(dom, info) {
			dom = $(dom);

			var cover = info.cover ? foci.download(info.cover) : [ "img/tmp1.jpg", "img/tmp2.jpg", "img/tmp3.jpg", "img/tmp4.jpg", "img/tmp5.jpg" ].choose();
			var descr = info.descr ? xfilt(util.short(info.descr, config.max_descr_len)) : "(no description)";
			var title = info.title ? xfilt(util.short(info.title, config.max_title_len)) : "(untitled)";
			var date = genDate(info.start, info.end);
			var partic = info.partic.length;

			dom.find(".cover").attr("src", cover);
			dom.find(".title").html(title);
			dom.find(".date").html(date);
			dom.find(".description").html(descr);
			dom.find(".partic").html(partic);
		}

		function genEvent(info) {
			var main = $('<div class="ui card event"> \
				<div class="image"> \
					<img class="cover"> \
				</div> \
				<div class="content"> \
					<a class="header title"></a> \
					<div class="meta"> \
						<span class="date"></span> \
					</div> \
					<div class="description"></div> \
				</div> \
				<div class="extra content"> \
					<a> \
						<i class="user icon"></i><span class="partic"></span> \
					</a> \
				</div> \
			</div>');

			main.find(".image, .header, .description").click(function () {
				qview(info, null, mod);
			});

			main.find(".cover").on("load", function () {
				wf.update();
			});

			setDom(main, info);

			return main;
		}

		var events = [];
		var edom = []; // event dom

		var mod = {};

		// interfaces
		mod.add = function (info) {
			var dom;
			
			events.push(info);

			dom = genEvent(info);
			edom.push(dom);
			
			wf.add(dom);
		};

		mod.clear = function (cb) {
			events = [];
			edom = [];

			mod.hide(function () {
				wf.clear();
				mod.show(cb);
			});
		};

		mod.hide = function (cb) {
			main.addClass("hide");
			setTimeout(cb, 300);
		};

		mod.show = function (cb) {
			// main.css("display", "");
			util.atimes(wf.update, 20);
			setTimeout(function () {
				main.removeClass("hide");
				if (cb) cb();
			}, 200);
		};

		// refresh info
		mod.update = function () {
			for (var i = 0; i < edom.length; i++) {
				setDom(edom[i], events[i]);
			}
		};

		return mod;
	}

	/* event quick view */
	function qview(info, config, event) {
		info = info || {};
		config = $.extend({}, lim_config, config);

		var main = $(" \
			<div class='com-eqview ui large modal'> \
				<div class='cover'></div> \
				<div class='cover-edit'>Change cover</div> \
				<div class='logo-cont'> \
					<div class='logo'><div>Change logo</div></div> \
					<div class='title'></div><div class='rating'></div><br> \
					<div class='detail'><i class='map outline icon'></i><span class='location'></span></div> \
					<div class='detail'><i class='calendar outline icon'></i><span class='time'></span></div> \
				</div> \
				<div class='back not-owner'> \
					<div class='util close ui icon button'> \
						<i class='close icon'></i> \
					</div><div class='util setting ui icon button'> \
						<i class='setting-btn setting icon'></i> \
					</div> \
				</div> \
				<div class='cont'> \
					<div class='descr'> \
					</div> \
					<div class='tagbox'> \
						<div class='tagadd-btn ui floating dropdown'> \
							<i class='add icon'></i> \
							<div class='menu'> \
							</div> \
						</div> \
					</div> \
					<div class='ui horizontal divider'>organizer</div> \
					<div class='orgs'> \
					</div> \
				</div> \
				<!--div class='more'>MORE</div--> \
			</div> \
		");

		function genTag(name) {
			var tag = $("<div class='favtag' data-value='" + name + "'>" + name + "<i class='tagdel-btn cancel icon'></i></div>");
			return tag;
		}

		// update info
		function updateInfo(info) {
			var title = info.title ? xfilt(util.short(info.title, config.max_title_len)) : "(untitled)";
			var location = info.title ? xfilt(util.short(info.title, config.max_location_len)) : "(not decided)";
			var time = genDate(info.start, info.end);

			var cover = info.cover ? foci.download(info.cover) : "img/tmp2.jpg";
			var logo = info.logo ? foci.download(info.logo) : "img/deficon.jpg";

			var rating = info.rating ? info.rating : "nop";

			var descr = info.descr ? xfilt(util.short(info.descr, config.max_descr_len)) : "(no description)";

			main.find(".cover").css("background-image", "url('" + cover + "')");
			main.find(".logo").css("background-image", "url('" + logo + "')");

			main.find(".title").html(title);
			main.find(".rating").html(rating);

			main.find(".loaction").html(location);
			main.find(".time").html(time);

			main.find(".descr").html(descr);

			main.find(".back .util.close").click(function () {
				main.modal("hide");
			});

			/* update organizer */

			var ava;
			var orgs = main.find(".orgs");
			var fill = util.fill();
			orgs.html(fill);

			if (info.org) {
				var size;

				switch (info.org.length) {
					case 1: size = "3em"; break;
					case 2: size = "2.5em"; break;
					default: size = "2em";
				}

				for (var i = 0; i < info.org.length; i++) {
					foci.get("/user/info", { uuid: info.org[i] }, function (suc, dat) {
						ava = $("<div class='org'></div>");
						if (suc) {
							avatar.init(ava, dat, { size: size });
						} else {
							util.qmsg(dat);
							avatar.init(ava, null, { size: size });
						}

						fill.remove();
						orgs.prepend(ava);
					});
				}
			} else {
				fill.remove();
				orgs.html("<div class='tip'>no organizer</div>");
			}

			main.find(".tagbox .favtag").remove();

			if (info.favtag) {
				for (var i = 0; i < info.favtag.length; i++) {
					main.find(".tagbox").prepend(genTag(info.favtag[i]));
				}
			}

			// check is owner
			if (env.session()) {
				env.user(function (user) {
					if (info.org && info.org.indexOf(user.uuid) != -1) {
						main.find(".back").removeClass("not-owner");
					} else {
						main.find(".back").addClass("not-owner");
					}
				});
			}
		}

		// setting
		function enableSetting() {
			var setting_open = false;
			var discard = false;
			var ask_open = false;

			main.modal({
				onHide: function () {
					if (ask_open) return false;

					if (main.hasClass("setting") && !discard) {
						ask_open = true;
						util.ask("Are you sure to discard all the changes?", function (ans) {
							ask_open = false;
							if (ans) {
								discard = true;
								main.modal("hide");
							}
						});

						return false;
					}
				}
			});

			function editText(com, cb) {
				com = $(com);
				var editor = $("<textarea class='editor-text'></textarea>");

				editor.val(com.html());
			
				function updatePos() {
					var ofs = com.offset();
					var mofs = main.offset();

					editor.css({
						position: "absolute",
						top: (ofs.top - mofs.top) + "px",
						left: (ofs.left - mofs.left) + "px",
						height: com.outerHeight(),
						width: com.outerWidth(),
						"font-size": com.css("font-size"),
						"font-family": com.css("font-family"),
						"font-weight": com.css("font-weight"),
						"line-height": com.css("line-height")
					});
				}

				updatePos()

				main.append(editor);
				editor.focus();

				$(window).on("resize", updatePos);

				editor.blur(function () {
					var val = editor.val();

					$(window).off("resize", updatePos);
					editor.remove();
					
					if (cb) cb(val);
				});
			}

			var exc_state = false;
			function exclude(cb) {
				if (exc_state) return;
				exc_state = true;
				cb(function () { exc_state = false; });
			}

			var changes;

			function editable(elem, type, field, cb) {
				elem = $(elem);
				elem.click(function () {
					if (!main.hasClass("setting")) return;

					exclude(function (unlock) {
						switch (type) {
							case "text":
								editText(elem, function (cont) {
									changes[field] = cont;
									if (cb) cb(cont);
									unlock();
								});
								break;

							case "image":
								upload.init(function (file) {
									if (file) {
										changes[field] = file;
										if (cb) cb(file);
									}
									
									unlock();
								});
								break;
						}
					});
				});
			}

			/*** editable fields ***/
			editable(main.find(".title"), "text", "title", function (cont) {
				main.find(".title").html(cont);
			});

			editable(main.find(".descr"), "text", "descr", function (cont) {
				main.find(".descr").html(cont);
			});

			editable(main.find(".cover-edit"), "image", "cover", function (cont) {
				main.find(".cover").css("background-image", "url('" + foci.download(cont) + "')");
			});

			editable(main.find(".logo"), "image", "logo", function (cont) {
				main.find(".logo").css("background-image", "url('" + foci.download(cont) + "')");
			});

			function initTag() {
				if (!changes.favtag) {
					changes.favtag = info.favtag;
				}
			}

			function removeTag(name) {
				initTag();

				var i = changes.favtag.indexOf(name);
				if (i != -1)
					changes.favtag.splice(i, 1);

				main.find(".tagadd-btn .menu").find(".t-" + name).css("display", "");
			}

			function addTag(name) {
				initTag();

				if (changes.favtag.indexOf(name) == -1)
					changes.favtag.push(name);

				main.find(".tagadd-btn .menu").find(".t-" + name).css("display", "none");
			}

			function tagdel() {
				if (!main.hasClass("setting")) return;

				var tag = $(this).parent();
				var name = tag.attr("data-value");
				
				removeTag(name);
				tag.remove();
			}

			env.favtag(function (tags) {
				if (tags) {
					for (var i = 0; i < tags.length; i++) {
						main.find(".tagadd-btn .menu").append(" \
							<div class='item t-" + tags[i] + "' data-value='" + tags[i] + "'>" + tags[i] + " \
						</div>");
					}
				}
			});

			main.find(".tagadd-btn").dropdown({
				onShow: function () {
					var menu = $(this).find(".menu");

					initTag();

					for (var i = 0; i < changes.favtag.length; i++) {
						menu.find(".t-" + changes.favtag[i]).css("display", "none");
					}
				},

				onChange: function (value) {
					addTag(value);

					var ntag = genTag(value);

					$(this).before(ntag);
					ntag.find(".tagdel-btn").click(tagdel);
				}
			});

			/*** editable fields ***/

			function openSetting() {
				offproc();

				changes = {};

				setting_open = true;

				main.addClass("setting");

				main.find(".back .util.setting")
					.attr("data-content", "Click components to edit");
				
				main.find(".back .util .setting-btn")
					.removeClass("setting")
					.addClass("checkmark");

				main.find(".tagdel-btn").click(tagdel);

				main.modal("refresh");
			
				setTimeout(function () {
					main.find(".back .util.setting")
						.popup({
							position: "right center",
							hideOnScroll: true,
							on: "manual",
							inline: true,
							lastResort: true /* force show */
						})
						.popup("show");

					onproc();
				}, 500);
			}

			function saveChanges(session, cb) {
				if (!util.kcount(changes)) {
					cb(true);
					return;
				}

				foci.encop(session, $.extend(changes, {
					int: "event",
					action: "setinfo",
					euid: info.euid
				}), function (suc, dat) {
					if (!suc) {
						util.qmsg(dat);
						cb(false);
					} else {
						foci.get("/event/info", { euid: info.euid }, function (suc, dat) {
							if (suc) {
								$.extend(info, dat);
							} else {
								util.qmsg(dat);
							}

							cb(suc);
						});
					}
				});
			}

			function closeSetting() {
				offproc();

				main.find(".back .util .setting-btn")
					.removeClass("checkmark");
				
				main.find(".back .util.setting").addClass("loading");

				function close() {
					main.removeClass("setting");

					main.find(".back .util.setting").removeClass("loading");
					
					main.find(".back .util .setting-btn")
						.removeClass("refresh")
						.addClass("setting");

					main.find(".back .util.setting").popup("hide");
					// main.modal({ closable: true });
					main.modal("refresh");

					setting_open = false;

					// update event cards
					if (event) event.update();

					onproc();
				}

				function fail() {
					main.find(".back .util.setting")
						.removeClass("loading")
						.popup("change content", "Click here to retry");

					main.find(".back .util .setting-btn")
						.addClass("refresh");
				
					// not set session_open
					onproc();
				}

				var session = env.session();

				if (!session) {
					login.init(function (dat) {
						if (dat) closeSetting(); // redo the saving
					});
				} else {
					saveChanges(session, function (suc) {
						if (suc) {
							close();
							updateInfo(info);
						} else fail();
					})
				}
			}

			var proc = function () {
				if (setting_open) {
					closeSetting();
				} else {
					openSetting();
				}
			};

			var offproc = function () {
				main.find(".back .util.setting").off("click", proc);
			};

			var onproc = function () {
				main.find(".back .util.setting").on("click", proc);
			};

			onproc();
		}

		updateInfo(info);
		enableSetting();

		main.ready(function () { main.modal("show"); });
	}

	return {
		init: init,
		qview: qview,
		genDate: genDate
	}
});