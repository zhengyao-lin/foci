"use strict";

var db = require("./db");
var err = require("./err");
var util = require("./util");
var auth = require("./auth");
var tick = require("./tick");
var config = require("./config");

var fs = require("fs");
var pump = require("pump");
var crypto = require("crypto");
var request = require("request-promise");
var superagent = require("superagent");

var alioss = require("ali-oss").Wrapper; // use promise

var oss_client = null;
var derefer_oss = null;

if (config.oss && config.oss.type == "ali") {
	if (config.oss.enc) {
		var key = util.getPass();
		
		config.oss.acckey = auth.aes.dec(config.oss.acckey, key);
		config.oss.seckey = auth.aes.dec(config.oss.seckey, key);
		
		if (!config.oss.acckey || !config.oss.seckey) {
			util.log("file: incorrect password", util.style.red("ERROR"));
			process.exit();
		}
	}
	
	oss_client = new alioss({
		region: config.oss.region,
		accessKeyId: config.oss.acckey,
		accessKeySecret: config.oss.seckey,
		bucket: config.oss.bucket,
		secure: config.oss.secure
	});

	if (config.derefer.oss) {
		derefer_oss = new alioss({
			region: config.derefer.oss.region,
			accessKeyId: config.oss.acckey,
			accessKeySecret: config.oss.seckey,
			bucket: config.derefer.oss.bucket,
			secure: config.derefer.oss.secure
		});
	}
	
	// tick.awrap(async () => {
	// 	await oss_client.putBucketCORS(config.oss.bucket, config.oss.region, [
	// 		{
	// 			allowedOrigin: "*",
	// 			allowedMethod: [ "GET", "HEAD" ],
	// 			allowedHeader: "*"
	// 		}
	// 	]);
	// })();
}

var readFileAsync = exports.readFileAsync = path => {
	return new Promise((res, rej) => {
		fs.readFile(path, (err, cont) => {
			if (err) rej(err);
			else res(cont);
		});
	});
};

var writeFileAsync = (path, data) => {
	return new Promise((res, rej) => {
		fs.writeFile(path, data, (err) => {
			if (err) rej(err);
			else res();
		});
	});
};

var readdirAsync = path => {
	return new Promise((res, rej) => {
		fs.readdir(path, (err, files) => {
			if (err) rej(err);
			else res(files);
		});
	});
};

var existsAsync = path => {
	return new Promise((res, rej) => {
		fs.exists(path, (exist) => {
			res(exist);
		});
	});
};

var unlinkAsync = path => {
	return new Promise((res, rej) => {
		try {
			fs.unlink(path, (err) => {
				if (err) rej(err);
				else res();
			});
		} catch (e) {
			rej(e);
		}
	});
};

var dir = (chsum, tmp) => (tmp ? config.file.tmp_dir : config.file.save_dir) + "/" + chsum;

// get md5&length of the file
var md5FileAsync = file => {
	return new Promise((res, rej) => {
		var rstream = fs.createReadStream(file);
		// var wstream = fs.createWriteStream(pto);
		var chsum = crypto.createHash("md5");
		var len = 0;

		rstream.on("data", (chunk) => {
			// wstream.write(chunk);
			chsum.update(chunk);
			len += chunk.length;
		});

		rstream.on("end", () => {
			var md5 = chsum.digest("hex");
			res([ md5, len ]);
		});
	});
};

var moveFileAsync = (pfrom, pto) => {
	return new Promise((res, rej) => {
		var rstream = fs.createReadStream(pfrom);
		var wstream = fs.createWriteStream(pto);
		
		pump(rstream, wstream, err => {
			if (err) rej(err);
			else {
				fs.unlinkSync(pfrom);
				res();
			}
		});
	});
}

// db.file
// { type: content type, chsum: md5 checksum, size: size in bytes }

// file and content-type
exports.newFile = async (file, ct, tmp) => {
	var col = await db.col("file");
	var info = await md5FileAsync(file);

	var md5 = info[0];
	var len = info[1];

	md5 = util.md5(ct + md5 + len, "hex");

	var found = await col.findOne({ chsum: md5 });
	var cached = false;
	
	if (!found || (found.cached && tmp /* the file is cached but local temp file is requested(to prevent CORS) */)) {
		// console.log("?? " + file + " " + md5);
		
		if (oss_client && !tmp) {
			// upload to oss
			await oss_client.put(md5, file);
			cached = true;
		} else {
			// console.log("?? " + file + " " + md5);
			await moveFileAsync(file, dir(md5, tmp));
		}
		
		if (!tmp) {
			await col.insert({ ct: ct, chsum: md5, len: len, cached: cached, tmp: tmp });
		}
	} else {
		if (len != found.len) {
			throw new err.Exc("$core.file_md5_collision");
		}
	}

	return md5;
};

var findFile = async (chsum) => {
	var col = await db.col("file");
	var found = await col.findOne({ chsum: chsum });

	if (!found)
		throw new err.Exc("$core.not_exist($core.file)");

	return found;
}

exports.format = {};
exports.format.imgstyle = {
	"thumb": { type: "int", opt: true }, // 0 - 5, the higher the higher compressing rate
};

var parseImgProc = (config) => {
	config = config || {};
	var style = "";
	
	if (config.thumb !== undefined) {
		style = "style/thumb" + config.thumb;
	} else {
		style = "style/thumb3";
	}

	return style;
};

var replaceDomain = (url, domain) => {
	if (domain) {
		return url.replace(/:\/\/[^\/]+\//, "://" + domain + "/");
	} else return url;
};

exports.getFile = async (chsum, conf) => {
	conf = conf || {};

	if (conf.tmp) {
		if (await existsAsync(dir(chsum, true))) {
			return {
				ct: null,
				cont: await readFileAsync(dir(chsum, true))
			};
		}
		
		throw new err.Exc("$core.file_missing(" + chsum + ")");
	}

	var file = await findFile(chsum);

	if (file.force_local || !file.cached || !oss_client) {
		if (await existsAsync(dir(chsum, conf.tmp))) { // has local file
			if (!conf.tmp && !file.force_local) {
				tick.awrap(async () => {
					await exports.cacheOne(chsum);
				})();
			}
			
			return {
				ct: file.ct,
				cont: await readFileAsync(dir(chsum, conf.tmp))
			};
		} else {
			throw new err.Exc("$core.file_missing(" + chsum + ")");
		}
	}

	return {
		ct: file.ct,
		redir: replaceDomain(oss_client.signatureUrl(chsum, {
			expires: 60 * 60 * 24 * 30, /* 30 days */
			process: parseImgProc(conf) 
		}), config.oss.domain)
	}
};

exports.ref = async (chsum) => {
	var col = await db.col("file");
	var ret = await col.findOneAndUpdate({ chsum: chsum }, { $inc: { ref: 1 } });

	if (!ret.value)
		throw new err.Exc("$core.not_exist($core.file)");
};

exports.cacheOne = async md5 => {
	var col = await db.col("file");
	var local = dir(md5);

	if (oss_client && await existsAsync(local)) {
		await oss_client.put(md5, local);
		await col.updateOne({ chsum: md5 }, { $set: { cached: true } });
		
		// TODO: check if put will delete the file
		await unlinkAsync(local);
	}
};

// upload all local files to the oss
exports.cacheFull = async () => {
	if (!oss_client) return;
	
	var col = await db.col("file");
	var files = await col.find({ cached: { $not: { $eq: true } } }).toArray();
	
	for (var i = 0; i < files.length; i++) {
		if (!files[i].force_local)
			await exports.cacheOne(files[i].chsum);
	}
};

// cache back to local
exports.cacheToLocal = async (chsum) => {
	var file = await findFile(chsum);

	if (!await existsAsync(dir(chsum))) {
		// cache back
		if (oss_client) {
			var url = oss_client.signatureUrl(chsum);
		
			var res = await request.head(url);
			
			// download
			await request(url).pipe(fs.createWriteStream(dir(chsum, false)));

			// set force local flag
			var col = await db.col("file");
			await col.updateOne({ chsum: chsum }, { $set: { force_local: true } });
		}
	}
};

exports.cacheToLocalFull = async () => {
	var col = await db.col("file");
	var files = await col.find({}).toArray();
	
	for (var i = 0; i < files.length; i++) {
		await exports.cacheToLocal(files[i].chsum);
	}
};

exports.isLegalID = async (id) => {
	return /^(([0-9a-z]{32})|([0-9a-z]{64}))$/i.test(id);
};

exports.cleanTmp = async () => {
	var files = await readdirAsync(config.file.tmp_dir);
	
	for (var i = 0; i < files.length; i++) {
		await unlinkAsync(dir(files[i], true));
	}
};

var dereferStream = url => 
	superagent
		.get(decodeURIComponent(url))
		.set("Referer", "")
		.set("User-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");

// TODO: need to restrict the url format
exports.derefer = async (url, type, env, config) => {
	// check log
	config = config = {};

	var col = await db.col("derefer");

	var md5 = util.md5(url, "hex");
	var found = await col.findOne({ md5: md5 });

	if (!found) {
		throw new err.Exc("derefer log not found");
	}

	if (found.no_oss || !derefer_oss) {
		var res = await new Promise((res, rej) => {
			dereferStream(found.url).end(function (err, result) {
				if (err) rej(err);
				else res(result.body);
			});
		});

		env.setCT(type);
		env.raw(res);
	} else {
		env.setCT(type);
		env.redir(derefer_oss.signatureUrl(md5, {
			expires: 60 * 60 * 24 * 30, /* 30 days */
			procss: parseImgProc(config)
		}));
	}
};

exports.logDerefer = async (url) => {
	var col = await db.col("derefer");

	var md5 = util.md5(url, "hex");
	var found = await col.findOne({ md5: md5 });

	if (!found) {
		if (derefer_oss) {
			// save to oss
			await col.insert({ url: url, md5: md5, no_oss: false });
			await derefer_oss.putStream(md5, dereferStream(url));
		} else {
			await col.insert({ url: url, md5: md5, no_oss: true });
		}
	}
};

// only logged derefer url can be used
exports.logDereferAll = async (urls) => {
	for (var i = 0; i < urls.length; i++) {
		await exports.logDerefer(urls[i]);
	}
};

setInterval(function () {
	tick.awrap(exports.cleanTmp)();
}, config.file.tmp_clean_interval);
