# nodeunit-tape-compat

A [`nodeunit`](https://npmjs.com/package/nodeunit) compatible runner based on [`tape`](https://npmjs.com/package/tape) for lazy people like me that don't want to review 1000 files and change two function signatures in every one...

Simply take your `nodeunit` files and this will run your tests with tape, removing legacy dependencies on non supported `nodeunit`.

If this is not fully compatible with nodeunit, please open an issue with an example test.

## Usage

From command line:

```bash
# -- with global install --
npm i -g nodeunit-tape-compat
nodeunit-tape <path-to-file> <path-to-file>
# -- or simply --
npx nodeunit-tape-compat <path-to-file> <path-to-file> [-t]
```

The `-t` flag runs only methods starting with "test".

In package JSON (remember to `npm i -D nodeunit-tape-compat`):

```json
    "test": "nodeunit-tape ./test/**/*.js"
```

From node.js:

```javascript
const { DataStream } = require('scramjet');
const gs = require('glob-stream');
const tapeRunner = require('nodeunit-tape-compat');

tapeRunner.from(gs(process.argv.slice(2)))
    .run()
    .then(() => {
        console.error("✔ Tests succeeded.");
    })
    .catch(() => {
        console.error("✘ Some tests failed.");
        process.exit(1);
    });
```

## API

### As a module

module.exports = [scramjet module](https://github.com/scramjetorg/scramjet/blob/master/docs/data-stream.md#DataStream+use)

To be used on a [`scramjet`](https://www.npmjs.com/package/scramjet/) stream of files like this:

```javascript
    DataStream
        .from(gs(process.argv.slice(2)))
        .use('nodeunit-tape-compat')
        // do something with the stream of tests
        .pipe(process.stdout)
    ;
```

### Methods:

* `async from(Readable stream) : void` consumes a stream of [file objects](#File_object)
* `flattenTests(Object.<String,Object|AsyncFunction>) : Object.<String,AsyncFunction>` DataStream mapper that flattens the nested test objects to a simple hash of test cases.
* `runTests(Object.<String,AsyncFunction>)` DataStream mapper that runs the tests asynchronously and returns the results.

### File object

A file object is meant to be generally compatible with `fs.stat` and `VinylFS`.

Properties:

* `path` - path to the file containing tests
