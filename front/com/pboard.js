/* picture board */

"use strict";

define([ "com/util", "com/upload" ], function (util, upload) {
	foci.loadCSS("com/pboard.css");

	function procURL(url) {
		if (url && !/^\/|https?:\/\/|#/.test(url)) {
			url = "#" + url;
		}

		return;
	}

	/*
		photo: [
			{
				img: photo url,
				url: link,
				onClick
				onShow
			}
		]
	 */
	function init(cont, photo, config) {
		cont = $(cont);
		config = $.extend({
			preview: 3,
			scroll_dir: "top", // top or right
			interval: 3000,
			preview_width: "15rem",
			preview_height: "5rem",
			setting: false,
			setting_cb: null
		}, config);

		var main = $(" \
			<div class='com-pboard'> \
				<div class='main-slide'> \
					<div class='slide-front'> \
					</div> \
					<div class='slide-back'> \
					</div> \
				</div> \
				<div class='preview-set'> \
				</div> \
			</div> \
		");

		var mod = {};

		if (config.setting)
			main.addClass("enable-setting");

		function photoClick(ph, n) {
			if (config.setting) {
				upload.init(function (id, url) {
					if (id && config.setting_cb) {
						url = procURL(url);
						config.setting_cb(n, id, url, ph);
						util.bgimg(ph.dom, ph.img);
					}
				}, {
					arg: {
						prompt: "URL",
						placeholder: "url",
						init: ph.setting_arg_init
					},
					
					init: ph.setting_init
				});
			} else {
				if (ph.url)
					util.jump(ph.url);

				if (ph.onClick) {
					ph.onClick();
				}
			}
		}

		(function () {
			for (var i = 0; i < photo.length; i++) {
				(function (i) {
					var ph = photo[i];
					var dom = $("<div class='preview' data-id='" + i + "'> \
					</div>");
					// var loader = $("<div class='ui small loader active'></div>");

					ph.dom = dom;

					dom.click(function () {
						photoClick(ph, i);
					});

					if (ph.img) {
						// dom.append(loader);
						util.bgimg(dom, ph.img, function () {
							// loader.remove();
						});
					} else dom.addClass("no-img");

					main.find(".preview-set").append(dom);
				})(i);
			}

			setInterval(function () {
				mod.scrollNext();
			}, config.interval);
		})();

		(function () {
			var cur = 0;
			var locked = false;

			var unit = 100 / config.preview;
			var prop;

			var cur_ph = -1;

			var main_slide = main.find(".main-slide");
			var front = main_slide.find(".slide-front");
			var back = main_slide.find(".slide-back");

			var preview_set = main.find(".preview-set");

			main_slide.click(function () {
				photoClick(photo[cur_ph], cur_ph);
			});

			function setMain(ph) {
				if (main_slide.hasClass("switch")) {
					util.bgimg(front, ph.img, function () {
						main_slide.toggleClass("switch");
					});
				} else {
					util.bgimg(back, ph.img, function () {
						main_slide.toggleClass("switch");
					});
				}
			}

			mod.setDir = function (dir) {
				if (dir == "top") {
					prop = "top";

					preview_set.css({
						"width": config.preview_width,
						"height": ""
					});

					main_slide.css({
						"padding-right": config.preview_width,
						"padding-bottom": ""
					});

					main.find(".preview").css({
						"top": "0", "left": "0",
						"height": unit + "%",
						"width": ""
					});

					main.removeClass("left-dir").addClass("top-dir");
				} else {
					prop = "left";

					preview_set.css({
						"width": "",
						"height": config.preview_height,
					});

					main_slide.css({
						"padding-right": "",
						"padding-bottom": config.preview_height,
					});

					main.find(".preview").css({
						"top": "0", "left": "0",
						"height": "",
						"width": unit + "%",
					});

					main.addClass("left-dir").removeClass("top-dir");
				}
			};

			mod.setDir(config.scroll_dir);

			mod.scrollNext = function (delay) {
				if (locked) return;
				locked = true;

				var prev = preview_set.find(".preview");

				cur_ph++;
				if (cur_ph >= photo.length)
					cur_ph -= photo.length;

				prev.css(prop, "-" + unit + "%");

				if (photo[cur_ph].onShow) {
					photo[cur_ph].onShow();
				}

				setMain(photo[cur_ph]);

				setTimeout(function () {
					prev.css("transition", "none"); // block the animation
					prev.css(prop, "0");
					preview_set.append($(prev[0]));
					setTimeout(function () {
						prev.css("transition", "");
						locked = false;
					}, 100);
				}, delay || 1200);
			}
		})();

		mod.scrollNext(1);
		util.media(768, function () {
			mod.setDir("left");
		}, function () {
			mod.setDir("top");
		});

		// setInterval(function () {
		// 	mod.scrollUp();
		// }, 2000);

		cont.append(main);

		var ret = {};

		return ret;
	}

	/*
		slide {
			img: image url,
			url: optional url
		}
	 */
	function slide(cont, slides, config) {
		cont = $(cont);
		config = $.extend({
			interval: 3000,
			setting: false,
			setting_cb: null,

			init_height: 300,
			max_height: "30rem",

			auto_resize: false
		}, config);

		var main = $("<div class='com-pboard-slide'> \
			<i class='left-btn angle left icon'></i> \
			<i class='right-btn angle right icon'></i> \
			<div class='slides'></div> \
		</div>");

		// h / w
		var ratio = 0;

		function setBoardHeight(height) {
			main.height(height);
			main.find(".left-btn, .right-btn").css("line-height", height + "px");
		}

		// setBoardHeight(100);

		function updateRatio() {
			if (!ratio) return;
			var height = main.width() * ratio;
			setBoardHeight(height);
		}

		$(window).resize(updateRatio);

		setBoardHeight(config.init_height);

		for (var i = 0; i < slides.length; i++) {
			(function (i) {
				var slide = slides[i];
				slide.dom = $("<div class='slide'></div>");
				
				util.bgimg(slide.dom, slide.img, function () {
					if (i == 0 && config.auto_resize)
						util.imgsize(slide.img, function (size) {
							ratio = size.height / size.width;
							setTimeout(updateRatio, 100);
						});
				});

				slide.dom.click(function () {
					if (config.setting) {
						upload.init(function (id, url) {
							if (id && config.setting_cb) {
								url = procURL(url);
								config.setting_cb(i, id, url, slide);
								util.bgimg(slide.dom, slide.img);
							}
						}, {
							arg: {
								prompt: "(" + (i + 1) + ") URL#",
								placeholder: "url",
								init: slide.setting_arg_init 
							},
							init: slide.setting_init
						});
					} else if (slide.url)
						util.jump(slide.url);
				});

				main.find(".slides").append(slide.dom);
				slide.dom.css("display", "none");
			})(i);
		}

		var cur_slide = 0;
		var locked = false;

		function setSlide(i, go_back) {
			if (locked) return;
			locked = true;

			var cur = slides[cur_slide].dom;
			var next = slides[i].dom;

			var dir = [ "left", "right" ];

			if (go_back)
				dir = [ "right", "left" ];

			next.css("display", "");
			cur_slide = i;

			setTimeout(function () {
				next.addClass(dir[1]).removeClass(dir[1] + " " + dir[1] + "-ready");
				cur.addClass(dir[0]);
				setTimeout(function () {
					cur.removeClass(dir[0]);
					cur.css("display", "none");
					locked = false;
				}, 300);
			}, 50);

			next.addClass(dir[1] + "-ready");
		}

		slides[cur_slide].dom.css("display", "");

		function nextSlide() {
			setSlide((cur_slide + 1) % slides.length);
		}

		function prevSlide() {
			setSlide((cur_slide - 1 + slides.length) % slides.length, true);
		}

		setInterval(function () {
			nextSlide();
		}, config.interval - 300);

		main.find(".left-btn").click(function () {
			prevSlide();
		});

		main.find(".right-btn").click(function () {
			nextSlide();
		});

		cont.append(main);

		var ret = {};

		return ret;
	}

	return { init: init, slide: slide };
});
