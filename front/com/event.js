/* event */
"use strict";

define([
	"com/xfilt", "com/waterfall", "com/util",
	"com/avatar", "com/env", "com/upload",
	"com/login", "com/map", "com/tagbox",
	"com/rating", "com/progress", "com/sortby",
	"com/editable", "com/tip", "com/lang"
], function (
	xfilt, waterfall, util, avatar,
	env, upload, login, map, tagbox,
	rating, progress, sortby, editable,
	tip, lang
) {
	var $ = jQuery;
	foci.loadCSS("com/event.css");
	foci.loadCSS("com/eqview.css");
	foci.loadCSS("com/ecase.css");

	var lim_config = {
		max_title_len: 32,
		max_descr_len: 512,
		max_detail_len: 1024
	};

	function genDate(start, end) {
		start = start ? util.localDate(new Date(start), true) : "TBD";
		end = end ? util.localDate(new Date(end), true) : "TBD";

		return start + " ~ " + end;
	}

	function eventTemplate(show_logo) {
		var main = $('<div class="com-event-single ui card event"> \
			<div class="cover"> \
				<div class="ui loader"></div> \
				<div class="status-shadow"> \
					<div class="accept prompt"> \
						<i class="check circle icon"></i> \
						<span class="lang" data-replace="$front.com.event.accepted">Accepted</span> \
					</div> \
					<div class="decline prompt"> \
						<i class="remove circle icon"></i> \
						<span class="lang" data-replace="$front.com.event.declined">Declined</span> \
					</div> \
					<div class="pending prompt"> \
						<i class="ellipsis horizontal icon"></i> \
						<span class="lang" data-replace="$front.com.event.pending">Pending</span> \
					</div> \
				</div> \
			</div> \
			<div class="content"> \
				<div> \
					<a class="header title"></a> \
					<div class="flags"></div> \
				</div> \
				<div class="meta"> \
					<span class="date"></span> \
				</div> \
				<div class="description"></div> \
				<div class="logo"> \
					<i class="add icon"></i> \
				</div> \
			</div> \
			<div class="extra content favtag"> \
			</div> \
			<div class="extra content"> \
				<a> \
					<i class="user outline icon"></i><span class="apply_num"></span> \
				</a> \
				<div class="ext-btn-set"></div> \
			</div> \
		</div>');

		if (!show_logo)
			main.find(".logo").remove();

		lang.update(main);

		main.find(".star.icon").popup({
			position: "left center"
		});

		return main;
	}

	function parseInfo(info, config) {
		config = $.extend({}, lim_config, config);

		var ret = {};

		ret.cover = info.cover ? foci.download(info.cover) : util.randimg();
		ret.logo = info.logo ? foci.download(info.logo) : "img/def/logo.jpg";

		var descr_html = info.descr ? markdown.toHTML(info.descr) : "";
		var descr_text = util.htmlGist(descr_html);
		// .replace(/<[^>]+>/g, "").replace(/\n/g, " ");

		descr_text = xfilt(util.short(descr_text, config.max_descr_len));

		ret.descr = descr_html;
		ret.descr_text = descr_text;

		// ret.descr = info.descr ? xfilt(util.short(info.descr, config.max_descr_len), { ignore_nl: config.ignore_nl }) : "(no description)";
		ret.title = info.title ? xfilt(util.short(info.title, config.max_title_len), { ignore_nl: config.ignore_nl }) : "(untitled)";

		ret.detail = info.detail ? markdown.toHTML(info.detail) : "(no detail)";

		ret.date = genDate(info.start, info.end);

		ret.apply_num = info.apply_num;
		ret.rating = info.rating ? info.rating : 0;

		ret.favtag = info.favtag ? info.favtag : [];

		ret.org = info.org || [];
		ret.org_club = info.org_club || [];

		ret.lat = info.lat;
		ret.lng = info.lng;
		ret.has_location = info.lat || info.lng;

		ret.location = function (cb) {
			if (info.loclng && info.loclat) {
				ret.loclng = info.loclng;
				ret.loclat = info.loclat;

				map.locToName(info.loclng, info.loclat, function (addr) {
					cb(addr);
				});
			} else {
				cb("(unsettled)");
			}
		};

		return ret;
	}

	function updateDomPos(dom) {
		var cont = dom.find(".cover-cont");
		var cover = dom.find(".cover");

		var r1 = cover.width() / cover.height();
		var r2 = cont.width() / cont.height();

		if (r1 > r2) {
			cover.css({
				"height": "100%",
				"width": "auto",
				"top": "0",
				"left": -(Math.abs(r1 - r2) / r2 / 2 * 100) + "%"
			});
		} else {
			// alert((-(1 / r1 - 1 / r2) / 2 * 100));
			cover.css({
				"width": "100%",
				"height": "auto",
				"left": "0",
				"top": -(Math.abs(1 / r1 - 1 / r2) / (1 / r2) / 2 * 100) + "%"
			});
		}
	}

	function genStateFlag(info) {
		var flag = "";

		switch (info.state) {
			case foci.evstat.review:
				flag = "<div class='com-event-state-flag purple'> \
					<div class='flag-name'>review</div> \
				</div>";
				break;
			
			case foci.evstat.draft:
				flag = "<div class='com-event-state-flag yellow'> \
					<div class='flag-name'>draft</div> \
				</div>";
				break;

			case foci.evstat.published:
				flag = "<div class='com-event-state-flag green'> \
					<div class='flag-name'>ongoing</div> \
				</div>";
				break;

			case foci.evstat.terminated:
				flag = "<div class='com-event-state-flag blue'> \
					<div class='flag-name'>ended</div> \
					<div class='flag-rating'>" + (util.trimFloat(info.rating, 1) || 0) + " / 10</div> \
				</div>";
				break;
		}

		return flag;
	}

	function setDom(dom, info, config) {
		config = $.extend({ ignore_nl: true }, config);
		dom = $(dom);

		var parsed = parseInfo(info, config);

		// dom.find(".cover").attr("src", parsed.cover).on("load", function () {
		// 	updateDomPos(dom);
		// });

		util.bgimg(dom.find(".cover"), parsed.cover, function () {
			if (config.onCoverLoad) config.onCoverLoad();
		});

		if (dom.find(".logo").length && info.logo) {
			dom.find(".logo i").css("display", "none");
			util.bgimg(dom.find(".logo"), parsed.logo);
		}

		dom.find(".title").html(parsed.title);
		dom.find(".date").html(parsed.date);
		dom.find(".description").html(parsed.descr_text);
		dom.find(".apply_num").html(parsed.apply_num);

		dom.find(".flags").html(genStateFlag(info));

		if (info.status)
			dom.addClass(info.status);

		if (parsed.favtag.length || config.editTag) {
			dom.find(".favtag").css("display", "").html("");

			env.favtag(function (tags) {
				var box = tagbox.init(dom.find(".favtag"), tags, { onChange: config.onTagChange })

				box.set(parsed.favtag);

				if (config.editTag) {
					box.openEdit();
				}
			});
		} else {
			dom.find(".favtag").css("display", "none");
		}

		var dom_util = {
			changeCover: function (cover) {
				parsed.cover = foci.download(cover);
				util.bgimg(dom.find(".cover"), parsed.cover);
			},

			changeLogo: function (logo) {
				parsed.logo = foci.download(logo);
				util.bgimg(dom.find(".logo"), parsed.logo);
				dom.find(".logo i").css("display", "none");
			}
		};

		if (config.onCoverClick) {
			dom.find(".cover").css("cursor", "pointer");
			dom.find(".cover").click(function () {
				config.onCoverClick(dom_util);
			});
		}

		if (config.onLogoClick) {
			dom.find(".logo").click(function () {
				config.onLogoClick(dom_util);
			});
		}

		if (config.ext_button) {
			dom.find(".ext-btn-set").html("");
			for (var i = 0; i < config.ext_button.length; i++) {
				(function (btn) {
					/*
						e.g. { class: "send outline", onClick: function }
					 */

					var extbtn = btn.class ? $("<i class='" + btn.class + " icon'></i>") : $(btn.html).clone();

					dom.find(".ext-btn-set").append(extbtn);

					extbtn.click(function () {
						if (btn.onClick) {
							btn.onClick(info);
						}
					});
				})(config.ext_button[i]);
			}
		}
	}

	/* waterfall view of events */
	/* for search results and listing */
	function init(cont, config) {
		cont = $(cont);
		config = $.extend({}, lim_config, {
			max_descr_len: 64,
			view: function (info) {
				if (util.isMobile()) {
					util.jump("#event/" + info.euid);
				} else {
					qview(info, null, mod);
				}
			},

			always_show_sortby: false,

			loader_only_on_buffer: false, // only show loader when buffering(not on the beginning)

			gap: 20,

			// extra utillity buttons on the top bar(beside the sortby bar)
			// format see sortby.js
			extra_util_btn: [],

			// fetch: {
			//     fetch: function (skip, cb(suc, dat)),
			//     cont: the scroll container,
			//     no_more_prompt: prompt shown when no more event is loaded
			// }
		}, config);

		var main = $("<div class='com-event'><div class='sortby' style='opacity: 0;'></div></div>");

		var sort = sortby.init(
			main.find(".sortby"),
			{
				"sort_create": {
					name: "<span class='lang' data-replace='$front.com.event.sortby.create'>create time</span>",
					init: -1
				},

				"sort_pop": {
					name: lang.msg("<span class='lang' data-replace='$front.com.event.sortby.popularity'>popularity</span>"),
					init: -1
				}
			},
			{
				onClick: function (cond) {
					mod.refetch(cond);
				},

				extra_util_btn: config.extra_util_btn
			});

		main.ready(function () {
			main.find(".sortby").css("opacity", "");
		});

		main.find(".sortby").css("padding-top", config.gap + "px");

		/* init waterfall */
		var wf = waterfall.init(main, {
			gap: config.gap,
			onUpdate: function (pos) {
				if (wf.count() || config.always_show_sortby) {
					main.find(".sortby").css("padding-left", (pos.left || 20) + "px").css("display", "");
				} else {
					main.find(".sortby").css("display", "none");
				}

				if (config.onUpdate) config.onUpdate(pos);
			}
		});

		cont.append(main);

		function genEvent(info) {
			var main = eventTemplate();

			main.find(".cover, .header, .description").click(function () {
				config.view(info);
			});

			var cover = main.find(".cover");
			var prog = progress.init(cover, { height: 3, color: "grey" });

			main.css("opacity", "0");
			main.css("pointer-events", "none");
			// main.find(".loader").addClass("active");

			// cover.css("opacity", "0");

			main.ready(function () {
				setTimeout(function () {
					main.css("opacity", "1");
					main.css("pointer-events", "");
				}, 300);
			});

			prog.show();
			
			var incprog = setInterval(function () {
				prog.fakeinc();
			}, 1000);

			setDom(main, info, $.extend({}, config, {
				onCoverLoad: function () {
					wf.update();

					clearInterval(incprog);
					prog.complete();
					setTimeout(prog.hide, 500);
				}
			}));

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
			// NOTE: fetch lock is necessary because removing the events
			// may trigger the scrolling event which will refetch before
			// the client callback
			fetch_lock = true;
			
			events = [];
			edom = [];

			clearFetch();

			mod.hide(function () {
				wf.clear();
				mod.show(function () {
					fetch_lock = false;
					if (cb) cb();
				});
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
				setDom(edom[i], events[i], config);
			}

			wf.update();
		};

		function bottomBar() {
			var bar = $(' \
				<div class="flow-loader"> \
					<div class="ui active centered inline loader" style="display: none;"></div> \
					<div class="prompt" style="display: none;"></div> \
				</div> \
			')

			bar.setLoader = function () {
				bar.find(".loader").css("display", "");
				bar.find(".prompt").css("display", "none");
			};

			bar.setPrompt = function (msg) {
				bar.find(".loader").css("display", "none");
				bar.find(".prompt").css("display", "").html(msg);
			};

			return bar;
		}

		function clearFetch() {
			fetch_skip = 0;
			if (fetch_loader) fetch_loader.remove();
			fetch_loader = null;
			// fetch_lock = false;
		}

		var fetch_skip = 0;
		var fetch_loader = null;
		var fetch_lock = false;

		mod.fetch = function (cb) {			
			if (!config.fetch) {
				util.emsg("$impossible(fetch function is not set for the current container)");
				return;
			}

			if (fetch_loader) return; // already loading

			if (fetch_lock) return;
			fetch_lock = true;

			// alert("??");

			// console.log("load");

			// set bottom loader icon
			var bar = bottomBar();
			fetch_loader = bar;
			main.append(bar);

			// alert(edom.length);
			if (edom.length || !config.loader_only_on_buffer)
				bar.setLoader();

			config.fetch.fetch(fetch_skip, sort.get(), function (suc, dat) {
				if (suc) {
					fetch_skip += dat.length;
					for (var i = 0; i < dat.length; i++)
						mod.add(dat[i]);
				} else {
					util.emsg(dat);
				}

				suc = suc && dat.length > 0;

				if (!suc) {
					bar.setPrompt(config.fetch.no_more_prompt);
					// no unlock
				} else {
					bar.remove();
					fetch_loader = null;
				}
				
				fetch_lock = false;

				if (cb) cb(suc);
			});
		};

		mod.refetch = function (sortby) {
			clearFetch();
			mod.clear(function () {
				mod.fetch();
			});
		};

		if (config.fetch) {
			util.scrollBottom($(config.fetch.cont), 3, function (com) {
				mod.fetch();

				// com.toBottom();
			});
		}

		return mod;
	}

	/* event quick view */
	function qview(info, config, event) {
		info = info || {};
		config = $.extend({}, lim_config, config);

		var main = $(" \
			<div class='com-eqview ui small modal' style='border: none;'> \
				<div style='position: relative;'> \
					<div class='cover' style='border-radius: 3px 3px 0 0;'></div> \
					<div class='cover-edit lang' data-replace='$front.com.event.change_cover'>Change cover</div> \
					<div class='logo-cont'> \
						<div class='logo'><div class='lang' data-replace='$front.com.event.change_logo'>Change logo</div></div> \
						<div class='title'></div><br> \
						<div class='rating'></div> \
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
							<div class='descr-cont'></div> \
							<div class='shade'><i class='horizontal ellipsis icon'></i></div> \
						</div> \
						<div class='tagbox' style='margin-top: 0;'></div> \
						<!--div class='orgs'> \
						</div--> \
					</div> \
					<button class='ui button more lang' data-replace='$front.com.event.more' style='width: 100%; border-radius: 0 0 3px 3px; height: 4rem; opacity: 0.7;'>MORE</button> \
				</div> \
			</div> \
		");

		lang.update(main);

		var tgbox = null;

		var rat = rating.init(main.find(".rating"));

		if (info.euid) {
			main.find(".more").click(function () {
				main.modal("hide all");
				util.jump("#event/" + info.euid);
			});
		}

		// update info
		function updateInfo(info) {
			var parsed = parseInfo(info, config);

			parsed.location(function (addr) {
				main.find(".location").html(addr);
			});

			main.find(".cover").css("background-image", "url('" + parsed.cover + "')");
			main.find(".logo").css("background-image", "url('" + parsed.logo + "')");

			main.find(".title").html(parsed.title);

			if (info.state >= 2) {
				rat.set(parsed.rating || 0.0);
			} else {
				main.find(".rating").remove();
			}

			main.find(".time").html(parsed.date);

			main.find(".descr-cont").html(parsed.descr);

			main.find(".back .util.close").click(function () {
				main.modal("hide");
			});

			/* update organizer */

			var ava;
			var orgs = main.find(".orgs");
			var fill = util.fill();
			orgs.html(fill);

			if (info.favtag) {
				util.await(function () { return tgbox !== null; }, function () {
					tgbox.set(info.favtag);
				});
			}

			// check if the user is owner
			if (env.session()) {
				env.user(function (user) {
					if ((info.org && info.org.indexOf(user.uuid) != -1) ||
						env.session().isAdmin()) {
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
				autofocus: false,
				allowMultiple: true,
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

			var exc_state = false;
			function exclude(cb) {
				if (exc_state) return;
				exc_state = true;
				cb(function () { exc_state = false; });
			}

			var changes;

			function edit(elem, type, field, cb) {
				elem = $(elem);

				if (type == "text") {
					// editable component
					var mod = editable.init(elem, function (cont) {
						changes[field] = cont;
						if (cb) cb(cont);
					}, {
						explicit: true, enable: false, type: "textarea",
						onEdit: function () {
							if (exc_state) return false;
							else exc_state = true; // lock
						},

						onBlur: function () {
							exc_state = false;
						},

						text: function () {
							return changes[field] || info[field];
						}
					});
				} else {
					elem.click(function () {
						if (!main.hasClass("setting")) return;

						exclude(function (unlock) {
							upload.init(function (file) {
								if (file) {
									changes[field] = file;
									if (cb) cb(file);
								}

								unlock();
							});
						});
					});
				}
			}

			/*** editable fields ***/

			edit(main.find(".title"), "text", "title", function (cont) {
				main.find(".title").html(xfilt(cont));
			});

			edit(main.find(".descr-cont"), "text", "descr", function (cont) {
				main.find(".descr-cont").html(xfilt(cont));
			});

			edit(main.find(".cover-edit"), "image", "cover", function (cont) {
				main.find(".cover").css("background-image", "url('" + foci.download(cont) + "')");
			});

			edit(main.find(".logo"), "image", "logo", function (cont) {
				main.find(".logo").css("background-image", "url('" + foci.download(cont) + "')");
			});

			env.favtag(function (tags) {
				tgbox = tagbox.init(main.find(".tagbox"), tags || []);
			});

			/*** editable fields ***/

			function openSetting() {
				offproc();

				changes = {};
				setting_open = true;

				main.find(".title, .location, .time").addClass("enabled");

				main.addClass("setting");

				main.find(".back .util.setting")
					.attr("data-content", "Click components to edit");

				main.find(".back .util .setting-btn")
					.removeClass("setting")
					.addClass("checkmark");

				main.modal("refresh");

				util.await(function () { return tgbox !== null; }, function () {
					tgbox.openEdit();
				});

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

				if (tgbox && tgbox.hasChanged()) {
					changes.favtag = tgbox.cur();
				}

				foci.encop(session, $.extend(changes, {
					int: "event",
					action: "setinfo",
					euid: info.euid
				}), function (suc, dat) {
					if (!suc) {
						util.emsg(dat);
						cb(false);
					} else {
						util.invalidEventInfo(info.euid);
						util.eventInfo(info.euid, null, null, function (suc, dat) {
							if (suc) {
								$.extend(info, dat);
							}

							cb(suc);
						})
					}
				});
			}

			function closeSetting() {
				offproc();

				main.find(".title, .descr-cont, .location, .time").removeClass("enabled");

				main.find(".back .util .setting-btn")
					.removeClass("checkmark");

				main.find(".back .util.setting").addClass("loading");

				function close() {
					main.removeClass("setting");

					main.find(".back .util.setting").removeClass("loading");

					main.find(".back .util .setting-btn")
						.removeClass("refresh")
						.addClass("setting");

					util.await(function () { return tgbox !== null; }, function () {
						tgbox.closeEdit();
					});

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

	function showcase(cont, info, config) {
		cont = $(cont);
		config = $.extend({
			imgpos: "right"
		}, config);

		var parsed = parseInfo(info, {
			max_title_len: 24,
			max_descr_len: 110
		});

		var main = $("<div class='com-event-showcase img-" + config.imgpos + "'> \
			<div class='show-cover'></div> \
			<div class='show-info'> \
				<div style='position: relative; height: 100%; width: 100%; overflow: hidden;'> \
					<div class='show-title'></div> \
					<div class='show-descr'></div> \
					<div class='show-tagbox'></div> \
					<!--div class='show-toolbar'> \
						<span class='info-icon loc-bar'><i class='map outline icon'></i><span class='show-loc'></span></span> \
						<span class='info-icon' style='float: right;'><i class='user outline icon'></i><span class='show-partic'></span></span> \
					</div--> \
				</div> \
			</div> \
		</div>");

		main.find(".show-title").html(parsed.title);
		main.find(".show-descr").html(parsed.descr_text);
		// main.find(".show-partic").html(parsed.apply_num || "0");

		env.favtag(function (tags) {
			var tgbox = tagbox.init(main.find(".show-tagbox"), tags, { init: parsed.favtag });

			tgbox.addTrivial({
				name: "<span><i class='user outline icon'></i>" + parsed.apply_num + "</span>"
			});

			tgbox.addTrivial({
				name: "<span><i class='calendar outline icon'></i>" + parsed.date + "</span>",
				style: "blue border"
			});

			if (!parsed.has_location) {
				tgbox.addTrivial({
					name: "<span><i class='world icon'></i>Online</span>",
					style: "purple border"
				});
			}

			if (info.loclng && info.loclat) {
				map.locToName(info.loclng, info.loclat, function (addr) {
					// main.find(".show-loc").html(addr);
					tgbox.addTrivial({
						name: "<span><i class='map outline icon'></i>" + addr + "</span>",
						style: "green border"
					});
				});
			}
		});

		util.bgimg(main.find(".show-cover"), parsed.cover);

		main.find(".show-title, .show-descr, .show-cover").click(function () {
			util.jump("#event/" + info.euid);
		});

		cont.append(main);

		var ret = {};

		return ret;
	}

	return {
		init: init,
		qview: qview,
		showcase: showcase,
		genDate: genDate,
		eventTemplate: eventTemplate,
		setDom: setDom,
		parseInfo: parseInfo,
		genStateFlag: genStateFlag
	}
});
