/* notice */

"use strict";

var db = require("./db");
var err = require("./err");
var util = require("./util");
var user = require("./user");
var event = require("./event");
var config = require("./config");

/*
	type: "event": event notice, "system": system notice 
	sender: euid or system senders("helper", "welcome")
	
	title: title of the message

	msg: message text
	format: message format

	date: date
 */

/*
	
	user {
		notice: {
			"sender": [ msg1, msg2 ]
		}
	}

 */

var Notice = function (config) {
	err.assert(config.type, "$core.nt.no_type");
	err.assert(config.sender, "$core.nt.no_sender");
	err.assert(config.msg, "$core.nt.no_msg");

	this.type = config.type;

	this.title = config.title || "$core.notice.untitled";

	this.sender = config.sender.toString();
	this.msg = config.msg;

	this.format = config.format || "text"; // text, html(need authoritation), markdown, etc.
	this.date = config.date || new Date();
};

exports.Notice = Notice;

Notice.set = {
	push: (sender, msg) => {
		var q = { $push: {} };
		q.$push["notice." + sender] = msg;
		return q;
	},

	update: (uuid, val) => ({
		$set: { notice_update: val }
	})
};

async function setUpdate(uuid, val) {
	var col = await db.col("user");
	await col.updateOne(user.User.query.uuid(uuid), Notice.set.update(uuid, val));
}

exports.push = async (uuid, sender, msg, type) => {
	var nnt = new Notice({ type: type || "system", sender: sender, msg: msg });
	var col = await db.col("user");

	await col.updateOne(user.User.query.uuid(uuid), Notice.set.push(sender, nnt));
	await setUpdate(uuid, true);
};

exports.pull = async (uuid) => {
	var usr = await user.uuid(uuid);
	await setUpdate(uuid, false);
	return usr.notice;
};

// get sender info
exports.info = async (type, sender) => {
	switch (type) {
		case "system":
			var found = config.notice.system[sender];

			return {
				url: true,
				logo: found.logo,
				name: found.name
			};

		case "event":
			var euid = parseInt(sender);
			var ev = await event.euid(euid);
			
			return {
				url: false,
				logo: ev.getLogo(),
				name: "$core.notice.event_notice(" + ev.getTitle() + ")"
			};

		default:
			throw new err.Exc("$core.illegal(notice type)");
	}
};

exports.update = async (uuid) => {
	var usr = await user.uuid(uuid);
	return !!usr.notice_update;
};
