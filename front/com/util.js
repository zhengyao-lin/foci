/* util */

"use strict";

define([ "com/xfilt", "com/dragi.js" ], function (xfilt, dragi) {
	var util = {};
	foci.loadCSS("com/util.css");

	util.short = function (str, max, fill) {
		fill = fill || "...";

		if (str.length > max) {
			return str.substr(0, max - fill.length) + fill;
		}

		return str;
	};

	util.mfilt = function (str) {
		return str;
	};
	
	util.isMobile = function () {
		return $(window).width() <= 640;
	};

	util.jump = function (url, allow_dragi) {
		if (allow_dragi && foci.use_dragi) {
			dragi.iframe(foci.platform, url);
		} else {
			if (window.location.hash === url) {
				util.emsg("already here", "info");
			} else window.location = url;
		}
	};

	util.refresh = function () {
		require("com/env").get("part").refresh();
	};

	util.emsg = function (str, style) {
		style = style || "error";
		var msg = $(" \
			<div style='text-align: center;'> \
				<div> \
					<div class='ui " + style + " message' style='word-wrap: break-word;'></div> \
				</div> \
			</div> \
		");

		var hide = function () {
			msg.transition("scale out");
			clearTimeout(proc);

			setTimeout(function () {
				msg.remove();
			}, 5000);
		};

		$("body").append(msg);

		msg.css({
			"position": "fixed",
			"top": "9px",
			"z-index": "1000000",
			"width": "100%",
			"pointer-events": "none"
		});

		msg.children("div")
			.css({
				"max-width": "80%",
				"display": "inline-block"
			})

		msg.find(".message")
			.css("cursor", "pointer")
			.css("pointer-events", "auto")
			.transition("scale in")
			.html(util.mfilt(str))
			.click(hide);

		var proc = setTimeout(hide, 5000);
	};

	util.json = function (str) {
		var ret = null;

		if (!str) return null;

		try {
			ret = JSON.parse(str);
		} catch (e) {
			util.emsg("$def.illegal_json");
		}

		return ret;
	};

	util.listen = function (dob) {
		var proc = setInterval(function () {
			if (dob()) clearInterval(proc);
		}, 0);
	};

	// async times
	util.atimes = function (dob, time) {
		var i = 0;
		var proc = setInterval(function () {
			dob(); i++;
			if (i > time) clearInterval(proc);
		}, 0);
	};

	util.media = function (max_width, cb, exit) {
		$(window).resize(function () {
			if ($(window).width() <= max_width)
				cb();
			else
				exit();
		}).resize();
	};
	
	util.windowWidth = function () {
		return $(window).width();
	};

	util.ask = function (msg, cb) {
		var main = $(' \
			<div class="ui mini modal com-util-ask"> \
				<div class="ui header"> \
					' + util.mfilt(msg) + ' \
				</div> \
				<div class="actions"> \
					<div class="ui red cancel button"> \
						<i class="remove icon"></i> \
						No \
					</div> \
					<div class="ui green ok button"> \
						<i class="checkmark icon"></i> \
						Yes \
					</div> \
				</div> \
			</div> \
		');

		var ret = false;

		main.modal({
			closable: false,
			allowMultiple: true,

			onDeny: function(){
				ret = false;
			},

			onApprove: function() {
				ret = true;
			},

			onHidden: function () {
				cb(ret);
			}
		}).modal("show");
	};

	// success or failed
	util.suc = function (suc, msg) {
		util.emsg((suc ? "success: " : "failed: ") + msg, "success");
	};

	util.kcount = function (obj) {
		var count = 0;

		for (var k in obj) {
			if (obj.hasOwnProperty(k)) count++;
		}

		return count;
	};

	util.fill = function () {
		return $("<img class='com-util-cont-fill' src='img/paragraph.png'></img>");
	};

	util.scrollBottom = function (elem, ofs, cb) {
		elem = $(elem);
		ofs = ofs || 0;

		var scroll = {
			toTop: function (ofs) { elem.scrollTop(ofs || 0); },
			toBottom: function (ofs) { elem.scrollTop(elem.prop("scrollHeight") - elem.height() - (ofs || 0)); }
		};

		elem.scroll(function () {
			if ((elem.scrollTop() + ofs) >= (elem.prop("scrollHeight") - elem.height())) {
				cb(scroll);
			}
		});
	};

	util.scrollTop = function (elem, cb, alt, offset) {
		var tool = {
			off: function () {
				$(elem).off("scroll", null, proc);
			}
		};
		
		var proc = function () {
			if ($(elem).scrollTop() < offset) {
				cb();
			} else {
				alt();
			}
		};
		
		$(elem).scroll(proc).scroll();
		
		return tool;
	};

	util.bottom = function (elem) {
		elem.scrollTop(elem.prop("scrollHeight") - elem.height());
	};

	// cb(n) if scroll down
	// cb(-n) if scroll up
	util.scroll = function (elem, cb, down_ofs, up_ofs,
							min_top /* min_top distance to trigger */) {
		elem = $(elem);

		var cur = elem.scrollTop();
		var acc = 0;
		
		min_top = (min_top === undefined ? 0 : min_top);
		down_ofs = (down_ofs === undefined ? 5 : down_ofs);
		up_ofs = (up_ofs === undefined ? 5 : up_ofs);
		
		var off = function () {
			elem.off("scroll", null, onscr);
		};

		var onscr = function () {
			var now = $(this).scrollTop();

			// scrolling down need to be faster to trigger
			// console.log(now);
			if ((now >= min_top && now > cur && now - cur > down_ofs) || // scroll down
				(cur > now && cur - now > up_ofs)) {
				cb(now - cur, cur);
			}

			cur = now;

			// elem.off("scroll", onscr);
			// setTimeout(function () {
			// 	elem.on("scroll", onscr);
			// }, 100);
		};

		elem.on("scroll", onscr);
		
		return off;
	};

	util.nextTick = function (cb) {
		setTimeout(cb, 0);
	};

	util.await = function (cond, cb) {
		var proc = setInterval(function () {
			if (cond()) {
				clearInterval(proc);
				cb();
			}
		}, 30);
	};

	Array.prototype.choose = function () {
		return this[Math.floor(Math.random() * this.length)];
	};

	Array.prototype.last = function () {
		return this[this.length - 1];
	};

	String.prototype.capital = function () {
		return this[0].toUpperCase() + this.substr(1);
	};

	util.random = function (a, b) {
		return (Math.random() * (b - a)) + a;
	};

	util.blur = function (obj, r) {
		obj = $(obj);
		r = r || 5;
		obj.css({
			"-webkit-filter": "blur(" + r + "px)",
			"-moz-filter": "blur(" + r + "px)",
			"-ms-filter": "blur(" + r + "px)",
			"filter": "blur(" + r + "px)"
		});
	};

	util.img = function (url, cb) {
		var img = new Image();
		img.src = url;
		$(img).on("load", function () {
			cb(img);
		});
	};

	util.bgimg = function (obj, url, load) {
		if (url) {
			util.img(url, function (img) {
				$(obj).css("background-image", "url('" + url + "')").ready(function () {
					if (load) load(img);
				});
			});
		} else {
			$(obj).css("background-image", "");
			if (load) load();
		}
	};
	
	function fill0(str, bit, after) {
		str = str.toString();
		
		while (str.length < bit) {
			if (after) {
				str = str + "0";
			} else {
				str = "0" + str;
			}
		}
		
		return str;
	}

	util.localDate = function (date, short) {
		var cur = new Date();
		var sub = cur - date;

		var ud = 1000 * 60 * 60 * 24; // one day

		var time = fill0(date.getHours(), 2) + ":" + fill0(date.getMinutes(), 2);
		var ret;

		if (sub >= 0 && sub < ud) {
			ret = time;
		} else {
			var day = cur.getDay();

			if (sub >= 0 && sub < day * ud) {
				// in this week
				var pref = [ "Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat" ][date.getDay()];
				ret = pref + " " + (short ? "" : time);
			} else {
				ret = (date.getMonth() + 1) + "-" + date.getDate() + " " + (short ? "" : time);

				if (cur.getFullYear() != date.getFullYear())
					ret = date.getFullYear() + "-" + ret;
			}
		}

		return ret;
	};

	// unreliable
	util.wheel = function (cb) {
		$(window).on("mousewheel DOMMouseScroll", cb);
	};

	util.randimg = function () {
		return "img/cover/" + Math.floor(Math.random() * 30 + 1) + ".jpg";
	};

	// mode: 0: after, 1, before, 2, replace
	util.insertTextarea = function (textarea, val, mode) {
		textarea = $(textarea)[0];
		mode = mode || "after";

		if (document.selection) {
			// ie
			textarea.focus();
			var sel = document.selection.createRange();
			sel.text = val;
		} else if (textarea.selectionStart || textarea.selectionStart == '0') {
			// others
			var start, end;

			switch (mode) {
				case "before":
					start = end = textarea.selectionStart;
					break;

				case "after":
					start = end = textarea.selectionEnd;
					break;

				case "replace":
					start = textarea.selectionStart;
					end = textarea.selectionEnd;
					break;
			}

			textarea.value = textarea.value.substring(0, start)
							 + val
							 + textarea.value.substring(end, textarea.value.length);

			textarea.focus();
		} else {
			textarea.value += val;
		}
	};
	
	util.getSelection = function (dom) {
		if (window.getSelection) {
			var sel = window.setSelection();
			
			
		}
		
		return {
			start: 0,
			end: 0,
			dir: "forward"
		};
	};
	
	util.setSelection = function (dom, sel) {
		
	};

	util.trimFloat = function (val, decimal) {
		var e = Math.pow(10, decimal);
		return Math.floor(val * e) / e;
	};

	// run once according to the local record
	util.localOnce = function (id, func) {
		id = "util-local-once-" + id;

		if (foci.getLocal(id)) return;

		foci.setLocal(id, true);
		func();
	};

	util.setTitle = function () {
		document.title = "Foci - " + Array.prototype.slice.apply(arguments).join(" - ");
	};
	
	util.ratingOf = function (uuid, cb) {
		foci.get("/user/rating", {
			uuid: uuid
		}, function (suc, dat) {
			if (suc) {
				cb(dat);
			} else {
				util.emsg(dat);
				cb(0);
			}
		});
	};
	
	util.htmlToText = function (html) {
		return $("<span>" + xfilt(html) + "</span>").text();
	};
	
	util.createObjectURL = function (blob) {
		var url = window[window.webkitURL ? "webkitURL" : "URL"];
		
		if (url && url.createObjectURL) return url.createObjectURL(blob);
	
		return undefined;
	};

	util.checkUploadSize = function (input, cb) {
		input = $(input)[0];
		
		if (input.files && input.files[0]) {
			if (foci.config && foci.config.max_upload_size) {
				if (input.files[0].size > foci.config.max_upload_size) {
					util.emsg("max upload size exceeded");
					cb(false);
					return;
				}
			}
		}
		
		cb(true);
	};

	return util;
});
