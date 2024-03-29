/* comment */

"use strict";

var db = require("./db");
var err = require("./err");
var util = require("./util");
var user = require("./user");
var event = require("./event");
var config = require("./config");

var Comment = function (config) {
	err.assert(config.uuid, "$core.comment.no_uuid");
	err.assert(config.comment, "$core.comment.no_comment");

	this.uuid = config.uuid;
	this.comment = config.comment;

	this.id = config.id;

	this.rating = config.rating === undefined ? null : config.rating;

	this.upvote = config.upvote || [];

	this.format = config.format || "text"; // text, html(need authoritation), markdown, etc.
	this.date = config.date || new Date();
};

Comment.prototype = {};

Comment.prototype.setRating = function (val) {
	this.rating = val === undefined ? null : val;
};

Comment.prototype.setID = function (id) {
	this.id = id;
};

Comment.prototype.getUUID = function () {
	return this.uuid;
};

exports.Comment = Comment;

Comment.query = {
	upvote_check: (euid, cid, uuid) => {
		var q = util.extend(event.Event.query.euid(euid), {
			// $and: [ { "comment.id": cid }, { "comment.$.upvote": { $ne: uuid } } ]
			comment: {
				$elemMatch: {
					id: cid,
					upvote: { $ne: uuid }
				}
			}
		})

		return q;
	},

	cid: (euid, cid) => ({
		euid: euid,
		comment: {
			$elemMatch: {
				id: cid
			}
		}
	}),

	count_comm: (euid, uuid) => {
		var q = util.extend(event.Event.query.euid(euid), {
			comment: {
				$elemMatch: {
					uuid: uuid
				}
			}
		})

		return q;
	}
};

Comment.set = {
	issue: comm => ({
		$push: { comment: comm }
	}),

	upvote: uuid => ({
		$addToSet: { "comment.$.upvote": uuid }
	}),

	remove_upvote: uuid => ({
		$pull: { "comment.$.upvote": uuid }
	})
};

var checkCommCount = async (comm, uuid) => {
	var count = 0;

	for (var i = 0; i < comm.length; i++) {
		if (comm[i].uuid == uuid)
			count++;
	}

	if (count >= config.lim.comment.max_comm_per_user &&
		!await user.isAdmin(uuid))
		throw new err.Exc("$core.comment.max_comm_reached");
};

exports.issue = async (euid, conf) => {
	var col = await db.col("event");

	var ev = await event.euid(euid);

	if (ev.getState() != event.evstat.terminated)
		delete conf.rating;
		
	if (!await user.isAdmin(conf.uuid)) {
		await event.checkPartic(euid, conf.uuid);
	}

	var ncomm = new Comment(conf);
	var comm = ev.getComment();

	await checkCommCount(comm, ncomm.getUUID());

	ncomm.setID(comm.length + 1);

	var res = await col.findOneAndUpdate(event.Event.query.euid(euid), Comment.set.issue(ncomm));

	if (!res.value)
		throw new err.Exc("$core.comment.issue_failed");
	
	if (conf.rating != undefined)
		await event.addRating(euid, conf.rating);
};

exports.get = async (euid, conf) => {
	conf = conf || {};

	var limit = conf.limit || config.lim.comment.max_get_length;
	var skip = conf.skip || 0;

	var ev = await event.euid(euid);
	var comm = ev.getComment();
	var len = comm.length;

	if (conf.hot) {
		comm = comm.sort(function (a, b) {
			return a.upvote.length - b.upvote.length;
		});

		var res = [];

		// filter out comments with too few comments
		comm.slice(0, config.lim.comment.max_hot).forEach(comm =>
			comm.upvote.length >= config.lim.comment.hot_min_upvote ?
			res.push(comm) : null);

		return res;
	} else {
		var end = len - skip;
		var start = end - limit;
	
		if (end < 0) end = 0;
		if (start < 0) start = 0;

		return comm.slice(start, end);
	}
};

exports.upvote = async (euid, cid /* comment id */, uuid) => {
	var col = await db.col("event");

	var ret = await col.findOneAndUpdate(Comment.query.upvote_check(euid, cid, uuid), Comment.set.upvote(uuid));

	if (!ret.value)
		throw new err.Exc("$core.comment.already_voted");
};

exports.removeUpvote = async (euid, cid, uuid) => {
	var col = await db.col("event");
	var ret = await col.findOneAndUpdate(Comment.query.cid(euid, cid), Comment.set.remove_upvote(uuid));
};
