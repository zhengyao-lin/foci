/* water fall */

"use strict";

define(function () {
	var $ = jQuery;
	function init(cont /* parent container */, config) {
		config = $.extend({
			gap: 20, /* px */
			count: 5, /* max column count */
			min_margin: 20
		}, config);

		cont = $(cont);
		var child = cont.children();
		var width = 0;

		for (var i = 0; i < child.length; i++) {
			child[i] = $(child[i]);
		}

		function update(from) {
			if (child.length) width = child[0].width();
			else return;

			from = from || 0;

			/* side margin */
			var count = config.count + 1;
			var gap = config.gap;
			var left;

			var cont_width = cont.width();
			count = Math.floor((cont_width - config.min_margin * 2) / width);

			if (count <= 0) count = 1;

			left = (cont_width - count * width - (count - 1) * gap) / 2;

			var top;

			for (var col = 0; col < count; col++) {
				top = gap;

				for (var i = col; i < child.length; i += count) {
					if (child[i]) {
						child[i].css({
							position: "absolute",
							left: left + "px",
							top: top + "px",
							margin: "0"
						});

						top += child[i].height() + gap;
					}
				}

				left += width + gap;
			}
		}

		function add(elem, cb) {
			elem = $(elem);

			child.push(elem);
			cont.append(elem);
		
			elem.ready(function () {
				update();
				if (cb) cb();
			});
		}

		var proc = null;
		window.onresize = function () {
			if (proc) {
				clearTimeout(proc);
			}

			proc = setTimeout(function () {
				update();
				proc = null;
			}, 50);
		}

		update();

		return {
			update: update,
			add: add,
			clear: function () {
				child = [];
				cont.html("");
			}
		};
	}

	return {
		init: init
	}
});
