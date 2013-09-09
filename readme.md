# vucoin

Node.js module to access [ucoin](https://github.com/c-geek/ucoin) server through its HTTP API.

## Usage

```js
var vucoin = require('vucoin');
var authentication = true; // Wether we want authentified responses, or not (as it is costly)
vucoin('localhost', '8081', authentication, function (err, node){
  // Public key imported, exchanges are signed
});
```
Here, vucoin will ask remote his public key for authentication, but it can be manually given too:

```js
var pubkey = fs.readFileSync('/path/to/key.pub', 'utf8');
vucoin('localhost', '8081', pubkey, function (err, node){
  // Public key imported, exchanges are signed
});
```

### Public keys

```js
var key = fs.readFileSync('/path/to/key.pub', 'utf8');
var sig = fs.readFileSync('/path/to/signature', 'utf8');

node.pks.add(key, sig, function(err, key){
  // Key is now updated
  var fpr = key.fingerprint;
  var name = key.name;
});

node.pks.lookup('John Carter', function(err, keys){
  // Results
});

var merkleOpts = {};

node.pks.all(merkleOpts, function(err, json){
  // Results
});
```
### Peering
```js
node.ucg.peering.get(function(err, json){
  // Results
});

node.ucg.peering.peers.upstream.get(function(err, json){
  // Results
});

node.ucg.peering.peers.upstream.of('0124A69D94F4101EFAD727A73A8A49A2960C6826', function(err, json){
  // Results
});

node.ucg.peering.peers.downstream.get(function(err, json){
  // Results
});

node.ucg.peering.peers.downstream.of('0124A69D94F4101EFAD727A73A8A49A2960C6826', function(err, json){
  // Results
});

var subscriptionData  = fs.readFileSync('/path/to/subscription', 'utf8');

node.ucg.peering.subscribe(subscriptionData, function(err, json){
  // Results
});

var statusData  = fs.readFileSync('/path/to/status', 'utf8');

node.ucg.peering.subscribe(statusData, function(err, json){
  // Results
});
```
### Community
```js
node.hdc.community.join('/path/to/membership/file', function(err, json){
  // Results
});

var merkleOpts = {};
node.hdc.community.memberships(merkleOpts, function(err, json){
  // Results
});

var merkleOpts = {};
node.hdc.community.votes(merkleOpts, function(err, json){
  // Results
});
```
### Trust Hash Table
```js
var entryData  = fs.readFileSync('/path/to/entry', 'utf8');

node.ucg.tht.get(function(err, json){
  // Results
});

node.ucg.tht.post(entryData, function(err, json){
  // Results
});

node.ucg.tht.of('0124A69D94F4101EFAD727A73A8A49A2960C6826', function(err, json){
  // Results
});
```
### Amendments
```js
var amendmentNumber = 25;
var amendmentHash = '0124A69D94F4101EFAD727A73A8A49A2960C6826';
var merkleOpts = {};

node.hdc.amendments.current(function(err, json){
  // Results
});

node.hdc.amendments.promoted(amendmentNumber, function(err, json){
  // Results
});

node.hdc.amendments.view.self(amendmentNumber, amendmentHash, function(err, json){
  // Results
});

node.hdc.amendments.view.members(amendmentNumber, amendmentHash, merkleOpts, function(err, json){
  // Results
});

node.hdc.amendments.view.voters(amendmentNumber, amendmentHash, merkleOpts, function(err, json){
  // Results
});

node.hdc.amendments.view.memberships(amendmentNumber, amendmentHash, merkleOpts, function(err, json){
  // Results
});

node.hdc.amendments.view.signatures(amendmentNumber, amendmentHash, merkleOpts, function(err, json){
  // Results
});

node.hdc.amendments.votes.get(function(err, json){
  // Results
});

var vote = fs.readFileSync('/path/to/vote', 'utf8');

node.hdc.amendments.votes.post(vote, function(err, json){
  // Results
});

node.hdc.amendments.votes.of(amendmentNumber, amendmentHash, function(err, json){
  // Results
});
```
### Coins
```js
var fingerprint = '93B49E9719BABF7EB33C28B9BDFC901EF6358E9C';
var coinNumber = 2;

node.hdc.coins.list(fingerprint, function(err, json){
  // Results
});

node.hdc.coins.view(fingerprint, coinNumber, function(err, json){
  // Results
});

node.hdc.coins.history(fingerprint, coinNumber, function(err, json){
  // Results
});
```
### Transactions
```js
var fiveLasts = 5;

node.hdc.transactions.all(function(err, json){
  // Results
});

node.hdc.transactions.keys(function(err, json){
  // Results
});

node.hdc.transactions.last(function(err, json){
  // Results
});
```
#### Process
```js
var issuanceData  = fs.readFileSync('/path/to/issuance', 'utf8');
var transfertData = fs.readFileSync('/path/to/transfert', 'utf8');
var fusionData    = fs.readFileSync('/path/to/fusion', 'utf8');

node.hdc.transactions.lasts(fiveLasts, function(err, json){
  // Results
});

node.hdc.transactions.process.issuance(issuanceData, function(err, json){
  // Results
});

node.hdc.transactions.process.transfert(transfertData, function(err, json){
  // Results
});

node.hdc.transactions.process.fusion(fusionData, function(err, json){
  // Results
});
```
#### Sender
```js
var senderFPR = '93B49E9719BABF7EB33C28B9BDFC901EF6358E9C';
var recipientFPR = 'F01B40DA4962D094F9BFB70A386BCD02789E64C1';
var merkleOpts = {};
var lastsFive = 5;
var amendmentNumber = 25;

node.hdc.transactions.sender.last(senderFPR, function(err, json){
  // Results
});

node.hdc.transactions.sender.lasts(senderFPR, lastsFive, function(err, json){
  // Results
});

node.hdc.transactions.sender.get(senderFPR, merkleOpts, function(err, json){
  // Results
});

node.hdc.transactions.sender.issuance.get(senderFPR, merkleOpts, function(err, json){
  // Results
});

node.hdc.transactions.sender.issuance.last(senderFPR, function(err, json){
  // Results
});

node.hdc.transactions.sender.issuance.dividend.get(senderFPR, merkleOpts, function(err, json){
  // Results
});

node.hdc.transactions.sender.issuance.dividend.amendment(senderFPR, amendmentNumber, merkleOpts, function(err, json){
  // Results
});

node.hdc.transactions.sender.fusion(senderFPR, merkleOpts, function(err, json){
  // Results
});

node.hdc.transactions.sender.transfert(senderFPR, merkleOpts, function(err, json){
  // Results
});

node.hdc.transactions.recipient(recipientFPR, merkleOpts, function(err, json){
  // Results
});

var txNumber = 96;

node.hdc.transactions.view(senderFPR, txNumber, merkleOpts, function(err, json){
  // Results
});
```

#### Recipient

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

  Usage: vucoin [options] [command]

  Commands:

    pks [add|lookup]       Add or search for public keys.
    peer                   Show remote peering informations.
    am [current|contract]  View current amendment or list all amendments of the contract.
    join                   Send join membership request.
    vote                   Send vote request.
    forge [join|actu|leave] Forge HDC data.

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    --key <keyFile>            File of the key to submit.
    --search <search>          Search string
    --membership <request>     Signed membership request file to send.
    --votefile <voteFile>      Vote file to send.
    -s, --signature <sigFile>  File of a signature to append.
    -h, --host <address>       DNS, IPv4 or IPv6 address of the node to contact.
    -p, --port <port>          Port of the node to contact.


```


# License

This software is provided under [MIT license](https://raw.github.com/c-geek/vucoin/master/LICENSE).
