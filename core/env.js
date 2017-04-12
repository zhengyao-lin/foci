"use strict";

var err = require("./err");
var util = require("./util");
var config = require("./config");

var multiparty = require("multiparty");

var Env = function (req, res) {
	var qjson = obj => {
		res.set("Content-Type", "application/json");
		res.send(JSON.stringify(obj));
	};

	this.header = obj => res.set(obj);
	this.setCT = ct => res.set("Content-Type", ct);

	this.raw = dat => res.send(dat);

	this.qjson = qjson;
	this.qsuc = obj => qjson({ suc: true, res: obj });
	this.qerr = msg => qjson({ suc: false, msg: msg });

	this.query = req.query;
	this.file = {};

	if (req.method == "POST") {
		this.init = cb => {
			var form = new multiparty.Form({ maxFilesSize: config.file.max_size });

			form.parse(req, (e, query, file) => {
				if (e) {
					env.qerr("failed to upload file");
					util.log(e, exports.style.yellow("EXCEPTION"));
					return;
				}

				for (var k in query) {
					if (query.hasOwnProperty(k)) {
						this.query[k] = query[k][0];
					}
				}

				for (var k in file) {
					if (file.hasOwnProperty(k)) {
						this.file[k] = file[k][0];
					}
				}

				return cb();
			});
		};
	} else this.init = cb => cb()
};

exports.Env = Env;
