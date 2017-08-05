/* upload */

"use strict";

define([ "com/util" ], function (util) {
	var $ = jQuery;
	foci.loadCSS("com/upload.css");

	function init(cb, config) {
		config = $.extend({
			arg: null // { prompt }
		}, config);

		var main = $(" \
			<div class='ui basic modal com-upload'> \
				<div class='exdim'></div> \
				<form class='ui form' enctype='multipart/form-data'> \
					<div class='field preview-cont' style='display: none;'> \
						<img class='ui medium rounded bordered preview'></img> \
						<div class='ui labeled input upload-arg' style='margin-top: 0.5rem;'> \
							<div class='ui label'></div> \
							<input type='text'> \
						</div> \
						<input type='text' style='display: none;'> \
					</div> \
					<div class='ui buttons'> \
						<button type='button' class='ui icon button exit-btn'> \
							<i class='remove icon'></i> \
						</button> \
						<button type='button' class='ui blue icon button select-btn'> \
							<i class='upload icon'></i> \
						</button> \
						<button type='button' class='ui green icon button use-btn'> \
							<i class='checkmark icon'></i> \
						</button> \
					</div> \
					<input class='file' name='file' type='file'> \
				</form> \
			</div> \
		");

		var selected = null;
		var argfield = main.find(".upload-arg");

		function getArg() {
			return config.arg ? argfield.find("input").val() : undefined;
		}

		if (config.arg) {
			argfield.find(".label").html(config.arg.prompt);
			argfield.find("input").attr("placeholder", config.arg.placeholder);
		} else {
			argfield.remove();
		}

		main.find(".select-btn").click(function () {
			main.find(".file").click();
		});

		main.find(".use-btn").click(function () {
			if (!selected) {
				util.emsg("no file selected");
			} else {
				main.modal("hide");
				if (cb) cb(selected, getArg());
			}
		});

		function showPreview() {
			if (!selected) return;

			main.find(".preview-cont").css("display", "");
			main.find(".preview")
				.attr("src", foci.download(selected))
				.ready(function () {
					main.modal("refresh");
				}).on("load", function () {
					main.modal("refresh");
				});

			return;
		}

		main.find(".file").change(function () {
			var val = $(this).val();
			if (val) {
				if (!FormData) {
					// TODO: fallback upload mode
					util.emsg("$unsupported(FormData)");
					return;
				}

				main.find(".select-btn").addClass("loading");
				var form = new FormData(main.find("form")[0]);

				foci.post("/file/upload", form, function (suc, dat) {
					main.find(".select-btn").removeClass("loading");

					if (suc) {
						selected = dat;
						showPreview();
					} else {
						util.emsg(dat);
					}
				});
			}
		});

		main.find(".exit-btn, .exdim").click(function () {
			main.modal("hide");
			if (cb) cb(null, getArg());
		});

		main.modal({
			allowMultiple: true,
			observeChanges: true,
			autofocus: false
		});

		main.modal("show");
	}

	return {
		init: init
	};
});
