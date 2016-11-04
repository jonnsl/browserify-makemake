
var fs = require('fs');
var path = require('path');
var stream = require('stream').Stream;
var assert = require('assert');
var through = require('through2');

var cwd = process.cwd() + path.sep;
var sep = ' \\\n ';

module.exports = function (b, opts) {
    var outfile = b.argv.o || b.argv.outfile;
    assert(outfile !== undefined, 'no targetName specified.');

    var depfile = opts.o || opts.outfile || (outfile + '.d');
    var out = (depfile instanceof stream) ? depfile : fs.createWriteStream(depfile);

    var entries = [];
    var deps = new Map();
    var prereq = new Set();

    function recurse (depId, name) {
        var dep = deps.get(depId);
        assert(dep, 'Could not find dependency "' + depId + '"');

        if (name[0] === '.') {
            prereq.add(removePrefix(dep.file, cwd));
            for (var name in dep.deps) {
                recurse(dep.deps[name], name);
            }
        } else {
            prereq.add('package.json');
        }
    }

    b.pipeline.get('deps').push(through.obj(
        function (row, enc, next) {
            if (row.entry) {
                entries.push({ file: row.file, deps: row.deps});
            }
            deps.set(row.id, { file: row.file, deps: row.deps});
            next(null, row);
        },
        function (cb) {
            entries.forEach(function (entry) {
                prereq.add(removePrefix(entry.file, cwd));
                for (var name in entry.deps) {
                    recurse(entry.deps[name], name);
                }
            });

            var t = toMakefileFormat(outfile, Array.from(prereq).sort());
            out.end(t + '\n', 'utf8');
            cb();
        }
    ));
}

// Join the list of prerequisites in lines of maximum of 80 characters.
function toMakefileFormat (target, prereq) {
    return prereq.reduce(function (prev, cur) {
        var lastSep = prev.lastIndexOf(sep);
        lastSep = lastSep === -1 ? 0 : lastSep + (sep.length - 1);
        if ((prev.length - lastSep) + sep.length + cur.length > 80) {
            return prev + sep + cur;
        } else {
            return prev + ' ' + cur;
        }
    }, target + ':');
}

function removePrefix(str, prefix) {
    if (str.indexOf(prefix) !== 0) {
        return str;
    }

    return str.substr(prefix.length);
}
