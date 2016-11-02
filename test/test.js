
var browserify = require('browserify');
var through = require('through2');
var path = require('path');
var test = require('tap').test;
var makemake = require('../');

test('', function (t) {
	var expected = 'target.js: package.json test/files/b.js test/files/common.js \\\n test/files/subdir/a.js test/files/w.js test/files/x.js test/files/y.js \\\n test/files/z.js\n';
	var b = browserify(path.join(__dirname, 'files', 'x.js'));
	b.argv = { o: 'target.js' }

	var result = '';
	var acc = through(function (data, enc, cb) {
		result += data;
		cb(null, data);
	}, function (cb) {
		console.log(result)
		t.equal(result, expected);
		t.end();
		cb();
	});

	b.plugin(makemake, { outfile: acc });
	b.bundle().pipe(through(function(chunk, enc, cb){
		cb(null, chunk)
	}, function(cb){
		cb();
	}));
});
