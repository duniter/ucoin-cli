# vucoin

Node.js module to access [ucoin](https://github.com/c-geek/ucoin) server through its HTTP API.

## Usage

```js
var vucoin = require('vucoin');
var authentication = true; // Wether we want authentified responses, or not (costly)
vucoin('localhost:8081', authentication, function (err, node){
  // Public key imported, exchanges are secure
});
```

```js
node.pks.add('/path/to/key.pub', '/path/to/signature', function(err, key){
  // Key is now updated
  var fpr = key.fingerprint;
  var name = key.name;
})
```

```js
node.pks.lookup('John Carter', function(err, keys){
  // Results
})
```

## Command Line

vucoin may be installed globally via

```bash
$ sudo npm install vucoin -g
$ vucoin --help

  Usage: vucoin [options]

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    --add <keyFile>            File of the key to submit.
    --lookup <search>          Search string
    -s, --signature <sigFile>  File of a signature to append.
    -h, --host <address>       DNS, IPv4 or IPv6 address of the node to contact.
    -p, --port <port>          Port of the node to contact.
```


# License

This software is provided under [MIT license](https://raw.github.com/c-geek/vucoin/master/LICENSE).
