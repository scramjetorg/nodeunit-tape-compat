const {DataStream} = require('scramjet');
const test = require("tape");
const tTest = (t) => {
    return Object.assign(t, {
        expect: (count) => {
            t.expectCount = count;
        },
        done: () => {
            if (t.expectCount > 0 && t.assertCount !== t.expectCount) {
                t.fail(`Expected ${t.expectCount} assertions, but ${t.assertCount} were run.`);
            }
            t.end();
        },
        equals: t.equal
    });
};

const _path = require('path');

const reporter = ({tests, name}) => {
    const ok = !tests.find(({ok}) => !ok);

    console.error(ok ? "✓" : "✗", name);

    tests.forEach(
        ({ok, operator, actual, expected, name, error}) => {
            console.error('    ', ok ? "✓" : "✗", `${operator}(${name})`);
            if (error) {
                console.error('    ', error && error.stack);
            }
            if (!ok && actual) {
                console.error('     => actual:', actual, 'expected:', expected);
            }
        }
    );

    return {name, ok};
};

const flattenTests = ({tests, conf: {testOnly, ...conf} = {}, prefix = ''}) => {
    return {
        name: prefix,
        tests: Object.keys(tests)
            .reduce((acc, name) => {
                if (typeof tests[name] === "function" && (!testOnly || name.startsWith("test"))) {
                    const test = tests[name];
                    acc.push({
                        name: `${prefix}/${name}`,
                        conf,
                        async exec(t) {
                            try {
                                await test(tTest(t));
                            } catch(e) {
                                console.log(name, test);
                                t.fail(e);
                                t.done();
                            }
                        }
                    });

                    return acc;
                } else if (typeof tests[name] === "object") {
                    return acc.concat(flattenTests({tests: tests[name], conf, prefix: prefix + '/' + name}).tests);
                }
                return acc;
            }, [])
    };
};

const runTests = ({name, tests}) => {
    const harness = test.createHarness();

    let current = null;
    const acc = new DataStream;

    harness.createStream({objectMode: true})
        .pipe(new DataStream)
            .each(async (chunk) => {
                switch (chunk.type) {
                    case "test":
                        current = Object.assign({}, chunk, {
                            tests: []
                        });
                        break;
                    case "assert":
                        if (!current) {
                            const err = new Error('Test assertions run after the test has completed');
                            err.assertion = chunk;
                            throw err;
                        }
                        current.tests.push(chunk);
                        break;
                    case "end": // eslint-disable-next-line
                        const last = current;
                        current = null;
                        return acc.whenWrote(last);
                }
            })
            .on("end", () => acc.end())
        ;

    DataStream.fromArray(tests)
        .map(async ({name, conf, exec}) => harness(name, conf, exec))
        .catch(e => console.error("Error!", e && e.stack));

    return acc
        .map(reporter)
        .toArray()
        .then((result) => ({
            name,
            result,
            ok: !result.find(({ok}) => !ok)
        }));
};

/**
 * Returns a transform stream that should be fed with file objects and runs tests.
 *
 * @param {Object} conf configuration for tape
 * @returns {DataStream} stream of test results.
 */
module.exports = (stream, conf) => {
    return DataStream.from(stream)
        .map(({path}) => ({
            prefix: _path.basename(path).replace(/\.js$/, ''),
            conf,
            tests: require(path)
        }))
        .map(flattenTests)
        .map(runTests)
        .tap()
        .until(
            ({name, ok}) => {
                if (!ok) {
                    throw new Error(`✗ Unit test errors occurred in ${name}`);
                }
                return false;
            }
        );
};

/**
 * Runs test on any {Readable} stream of file.
 *
 * @param {Readable} stream stream of file entries
 * @param {Object} conf
 */
module.exports.from = async (stream, conf) => DataStream.from(stream)
    .use(module.exports, conf)
    .run();

module.exports.flattenTests = flattenTests;
module.exports.runTests = runTests;
