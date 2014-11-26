var fs = require('fs'),
	Flickr = require("flickrapi"),
	gm = require('gm'),
	randomColor = require('randomcolor'),
	_ = require('lodash'),
	ChildProcess = require('child_process'),
	Promise = require("bluebird"),
	config = require('config'),
	moment = require('moment'),
	async = require('async'),
	uuid = require('node-uuid'),
	flickrOptions = config.get('flickr');

flickrOptions.permissions = "write";
flickrOptions.silent = true;

var generateAndPush = function(number, date) {

	if (typeof date === 'undefined') {
		date = moment().format('YYYY-MM-DD HH:mm:ss');
	}

	return new Promise(function(resolve, reject) {

		var tempFilePath = __dirname + '/tmp/test-' + uuid.v4() + '.jpg';

		gm(600, 600, randomColor({luminosity: 'dark'}))
		.fill('#ffffff')
		.font(__dirname + "/fonts/ProximaNova-Bold.ttf", 150)
		.drawText(0, 0, number, "center")
		.quality(100)
		.write(tempFilePath, function(err) {

			var exif = ChildProcess.spawn('exiftool', ['-ExifIFD:DateTimeOriginal="' + date + '"', '-overwrite_original', tempFilePath]);
			exif.on("close", function() {

				Flickr.upload({

					photos: [{
						title: number,
						photo: tempFilePath,
						is_public: 0,
						is_friend: 0,
						is_family: 0
					}]

				}, flickrOptions, function(err, result) {

					fs.unlink(tempFilePath);

					if (err) {
						reject(error);
					}

					resolve({
						id: result[0],
						date: date,
						number: number
					});

				});

			});

		});		

	});

};

var startDate = moment('2014-01-01');
var endDate = moment('2014-11-26');
var numPhotos = 10000;
var direction = 'desc';

var diffSeconds = endDate.format('X') - startDate.format('X');
var interval = Math.floor(diffSeconds / numPhotos);

var dates = [];

var date;

if (direction === 'asc') {
	date = startDate;
} else {
	date = endDate;
}

for (var i = 0; i < numPhotos; i++) {
	dates.push(date.format('YYYY-MM-DD HH:mm:ss'));

	if (direction === 'asc') {
		date.add(interval, 'seconds');
	} else {
		date.subtract(interval, 'seconds');
	}


}

var tasks = [];
var i = 1;
var counter = 1;

dates.forEach(function(date) {

	var number = _.clone(counter);
	counter++;

	tasks.push(function(callback) {

		generateAndPush(number, date).then(function(photo) {

			console.log(photo.number + ' - ' + photo.date + ' - ' + 'https://www.flickr.com/photos/' + flickrOptions.user_id + '/' + photo.id + '/');
			callback(null, photo);

		});

	});

});

async.parallelLimit(tasks, 8, function() {
	console.log('All done!');
});

//console.log(dates);
