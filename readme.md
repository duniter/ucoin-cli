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

### Installation

vucoin may be installed globally via

```bash
$ sudo npm install vucoin -g
```

### Forge

`uforge` is a CLI to *forge* HDC documents, ready-to-send data for uCoin servers.

#### Requirements

##### Node.js

`uforge` is relying on `vucoin` CLI, itself powered by Node.js v0.10+, so you need it installed first. Here is an example for Ubuntu installation:

```bash
$ sudo apt-get update
$ sudo apt-get install python-software-properties python g++ make
$ sudo add-apt-repository ppa:chris-lea/node.js
$ sudo apt-get update
$ sudo apt-get install mongodb nodejs
```

You can find the installation of Node.js for other distribution [on this GitHub document](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).

##### GPG

`uforge` also relies on gpg, as uCoin software uses it almost everywhere.

Here is an example for Ubuntu installation:

```bash
$ sudo apt-get install gpg
```

#### Usage

```
usage: uforge [options] command

This script allow to forge HDC documents in accordance with a uCoin server data.

Command:
  forge-join  Forge and sign a joining membership
  forge-actu  Forge and sign an actualizing membership
  forge-leave Forge and sign a leaving membership

Options:
  -s  uCoin server to look data in
  -p  uCoin server port
  -u  PGP key to use for signature
  -h  Help
```

### vuCoin

```
$ vucoin --help

  Usage: vucoin [options]

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    --add <keyFile>            File of the key to submit.
    --lookup <search>          Search string
    --peering                  View peering informations
    --current                  View current amendment informations
    --contract                 View the whole contract's amendment suite
    --membership <request>     Signed membership request file to send.
    --vote <voteFile>          Vote file to send.
    --forgejoin                Outputs a join membership, ready for signing.
    --forgeactu                Outputs an actualize membership, ready for signing.
    --forgeleave               Outputs a leave membership, ready for signing.
    -s, --signature <sigFile>  File of a signature to append.
    -h, --host <address>       DNS, IPv4 or IPv6 address of the node to contact.
    -p, --port <port>          Port of the node to contact.

```


# License

This software is provided under [MIT license](https://raw.github.com/c-geek/vucoin/master/LICENSE).
