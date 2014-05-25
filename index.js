var _       = require('underscore');
var fs      = require('fs');
var async   = require('async');
var openpgp = require('openpgp');

module.exports = function (host, port, authenticated, withSignature, intialized){
  return new vuCoin(host, port, authenticated, withSignature, intialized);
}

function vuCoin(host, port, authenticated, withSignature, intialized){

  var pubkeys = null;

  if(typeof authenticated == 'function'){
    intialized = authenticated;
    authenticated = false;
    withSignature = false;
  }
  if(typeof withSignature == 'function'){
    intialized = withSignature;
    withSignature = false;
  }

  if(withSignature && !authenticated){
    throw new Error('Cannot give signature in unauthenticated mode');
  }

  this.host = host;
  this.port = port;

  this.pks = {

    add: function (key, signature, done) {
      post('/pks/add', done)
      .form({
        "keytext": key,
        "keysign": signature
      });
    },

    lookup: function (search, done) {
      get('/pks/lookup?search=' + encodeURIComponent(search) + '&op=index', done);
    },

    all: function () {
      var opts = arguments.length == 1 ? {} : arguments[0];
      var done = arguments.length == 1 ? arguments[0] : arguments[1];
      dealMerkle(ResultTypes.PublicKey, '/pks/all', opts, done);
    }
  }

  this.network = {

    pubkey: function (done) {
      get('/network/pubkey', done);
    },

    peering: {

      get: function (done) {
        getPeer('/network/peering', done);
      },

      peers: {

        get: function (done) {
          var opts = arguments.length == 1 ? {} : arguments[0];
          var done = arguments.length == 1 ? arguments[0] : arguments[1];
          dealMerkle(ResultTypes.Peer, '/network/peering/peers', opts, done);
        },

        post: function (entry, done) {
          var sigIndex = entry.indexOf("-----BEGIN");
          postPeer('/network/peering/peers', {
            "entry": entry.substring(0, sigIndex),
            "signature": entry.substring(sigIndex)
          }, done);
        },

        upstream: {
          
          get: function (done) {
            getStream('/network/peering/peers/upstream', done);
          },
          
          of: function (fingerprint, done) {
            getStream('/network/peering/peers/upstream/' + fingerprint, done);
          },
        },

        downstream: {
          
          get: function (done) {
            getStream('/network/peering/peers/downstream', done);
          },
          
          of: function (fingerprint, done) {
            getStream('/network/peering/peers/downstream/' + fingerprint, done);
          },
        }
      },

      forward: function (forward, done) {
        var sigIndex = forward.indexOf("-----BEGIN");
        postForward('/network/peering/forward', {
          "forward": forward.substring(0, sigIndex),
          "signature": forward.substring(sigIndex)
        }, done);
      },

      status: function (status, done) {
        var sigIndex = status.indexOf("-----BEGIN");
        postStatus('/network/peering/status', {
          "status": status.substring(0, sigIndex),
          "signature": status.substring(sigIndex)
        }, done);
      }
    },

    wallet: {

      get: function (done) {
        var opts = arguments.length == 1 ? {} : arguments[0];
        var done = arguments.length == 1 ? arguments[0] : arguments[1];
        dealMerkle(ResultTypes.Wallet, '/network/wallet', opts, done);
      },

      post: function (entry, done) {
        var sigIndex = entry.indexOf("-----BEGIN");
        postWallet('/network/wallet', {
          "entry": entry.substring(0, sigIndex),
          "signature": entry.substring(sigIndex)
        }, done);
      },

      of: function (fingerprint, done) {
        getWallet('/network/wallet/' + fingerprint, done);
      }
    }
  }

  this.hdc = {

    amendments: {

      current: function (done) {
        getAmendment('/hdc/amendments/promoted', done);
      },

      promoted: function (number, done) {
        getAmendment('/hdc/amendments/promoted/' + number, done);
      },

      view: {

        self: function (number, hash, done) {
          getAmendment('/hdc/amendments/view/' + number + '-' + hash + '/self', done);
        },

        signatures: function (number, hash, done) {
          amMerkle(ResultTypes.Signature, arguments, 'signatures', done);
        }
      },

      votes: {

        get: function (done) {
          getAmendmentIndex('/hdc/amendments/votes', done);
        },

        post: function (vote, done) {
          var sigIndex = vote.indexOf("-----BEGIN");
          postVote('/hdc/amendments/votes', {
            "amendment": vote.substring(0, sigIndex),
            "signature": vote.substring(sigIndex)
          }, done);
        }
      }
    },

    coins: {

      list: function (fingerprint, done) {
        getCoinList('/hdc/coins/list/' + fingerprint, done);
      },

      owner: function (fingerprint, amNumber, coinNumber, done) {
        getCoinOwning('/hdc/coins/view/' + [fingerprint, amNumber, coinNumber].join('-') + '/owner', done);
      },

      history: function (fingerprint, amNumber, coinNumber, done) {
        getCoinOwningHistory('/hdc/coins/view/' + [fingerprint, amNumber, coinNumber].join('-') + '/history', done);
      }
    },

    transactions: {

      lasts: function (number, done) {
        getTransactionList('/hdc/transactions/last/' + number, done);
      },

      process: function (tx, done) {
        var sigIndex = tx.indexOf("-----BEGIN");
        postTransaction('/hdc/transactions/process', {
          "transaction": tx.substring(0, sigIndex),
          "signature": tx.substring(sigIndex)
        }, done);
      },

      sender: {

        get: function () {
          txSenderMerkle(arguments);
        },

        lasts: function (fingerprint, number, from, done) {
          if (from == undefined)
            getTransactionList('/hdc/transactions/sender/' + fingerprint + '/last/' + number, done);
          else
            getTransactionList('/hdc/transactions/sender/' + fingerprint + '/last/' + number + '/' + from, done);
        },
      },

      recipient: function () {
        txRecipientMerkle(arguments);
      },

      refering: function (hash, number, done) {
        getTransactionList('/hdc/transactions/refering/' + hash + '/' + number, done);
      },

      view: function (hash, number, done) {
        getTransaction('/hdc/transactions/sender/' + hash + '/view/' + number, done);
      }
    }
  };

  this.registry = {

    parameters: function (done) {
      getParameters('/registry/parameters', done);
    },

    community: {
      
      members: {

        get: function (ms, done) {
          var opts = arguments.length == 1 ? {} : arguments[0];
          var done = arguments.length == 1 ? arguments[0] : arguments[1];
          dealMerkle(ResultTypes.Membership, '/registry/community/members', opts, done);
        },

        post: function (ms, done) {
          var sigIndex = ms.indexOf("-----BEGIN");
          postMembership('/registry/community/members', {
            "membership": ms.substring(0, sigIndex),
            "signature": ms.substring(sigIndex)
          }, done);
        },

        current: function (fingerprint, done) {
          getMembership('/registry/community/members/' + fingerprint + '/current', done);
        },

        history: function (fingerprint, done) {
          getMembershipHistory('/registry/community/members/' + fingerprint + '/history', done);
        }
      },
      
      voters: {

        get: function (ms, done) {
          var opts = arguments.length == 1 ? {} : arguments[0];
          var done = arguments.length == 1 ? arguments[0] : arguments[1];
          dealMerkle(ResultTypes.Voting, '/registry/community/voters', opts, done);
        },

        post: function (voting, done) {
          var sigIndex = voting.indexOf("-----BEGIN");
          postVoting('/registry/community/voters', {
            "voting": voting.substring(0, sigIndex),
            "signature": voting.substring(sigIndex)
          }, done);
        },

        current: function (fingerprint, done) {
          getVoting('/registry/community/voters/' + fingerprint + '/current', done);
        },

        history: function (fingerprint, done) {
          getVotingHistory('/registry/community/voters/' + fingerprint + '/history', done);
        }
      }
    },

    amendment: {

      proposed: function (number, done) {
        getAmendment('/registry/amendment/' + number, done);
      },

      vote: function (number, done) {
        getVote('/registry/amendment/' + number + '/vote', done);
      }
    }
  };

  function txSenderMerkle (args) {
    var hash = args[0];
    var opts = args.length == 2 ? {} : args[1];
    var done = args.length == 2 ? args[1] : args[2];
    dealMerkle(ResultTypes.Transaction, '/hdc/transactions/sender/' + hash, opts, done);
  }

  function txRecipientMerkle (args) {
    var hash = args[0];
    var opts = args.length == 2 ? {} : args[1];
    var done = args.length == 2 ? args[1] : args[2];
    dealMerkle(ResultTypes.Transaction, '/hdc/transactions/recipient/' + hash, opts, done);
  }

  function amMerkle (leafResult, args, property) {
    var number = args[0];
    var hash = args[1];
    var opts = args.length == 3 ? {} : args[2];
    var done = args.length == 3 ? opts : args[3];
    dealMerkle(leafResult, '/hdc/amendments/view/' + number + '-' + hash + '/' + property, opts, done);
  }

  function dealMerkle (leafType, url, opts, done) {
    var i = 0;
    _(opts).each(function (value, key) {
      url += (i == 0 ? '?' : '&');
      url += key + '=' + value;
      i++;
    });
    var getFunction = opts.leaves ? getMerkleWithLeaves : (opts.leaf ? async.apply(getMerkleWithLeaf, leafType) : getMerkle);
    getFunction(url, done);
  }

  function server() {
    var server = host.match(/:/) ? '[' + host + ']' : host;
    server += ':' + port;
    return server;
  }

  function requestHead(url) {
    return authenticated ? {
      "url": "http://" + server() + url,
      "headers": {
        "Accept": "multipart/msigned"
      }
    } : {
      "url": "http://" + server() + url
    };
  }

  function get(url, callback) {
    return require('request').get(requestHead(url), _(vucoin_result).partial(callback));
  }

  function post(url, callback) {
    return require('request').post(requestHead(url), _(vucoin_result).partial(callback));
  }

  function getPeer (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Peer));
    });
  }

  function getStream (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Stream));
    });
  }

  function getWallet (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Wallet));
    });
  }

  function getAmendment (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Amendment));
    });
  }

  function getAmendmentIndex (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.AmendmentIndex));
    });
  }

  function getCoinList (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.CoinList));
    });
  }

  function getCoinOwning (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.CoinOwning));
    });
  }

  function getCoinOwningHistory (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.CoinOwningHistory));
    });
  }

  function getTransaction (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Transaction));
    });
  }

  function getTransactionList (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.TransactionList));
    });
  }

  function getParameters (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Parameters));
    });
  }

  function getMembership (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Membership));
    });
  }

  function getMembershipHistory (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.MembershipHistory));
    });
  }

  function getVoting (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Voting));
    });
  }

  function getVotingHistory (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.VotingHistory));
    });
  }

  function getVote (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Vote));
    });
  }

  function getMerkle (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Merkle));
    });
  }

  function getMerkleWithLeaves (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.MerkleWithLeaves));
    });
  }

  function getMerkleWithLeaf (leafType, url, callback) {
    get(url, function (err, res, body) {
      var m = sanitize(res, ResultTypes.MerkleWithLeaf);
      m.leaf.value = sanitize(m.leaf.value, leafType);
      callback(err, m);
    });
  }

  function postForward (url, data, callback) {
    post(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Forward));
    }).form(data);
  }

  function postVote (url, data, callback) {
    post(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Vote));
    }).form(data);
  }

  function postWallet (url, data, callback) {
    post(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Wallet));
    }).form(data);
  }

  function postStatus (url, data, callback) {
    post(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Status));
    }).form(data);
  }

  function postPeer (url, data, callback) {
    post(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Peer));
    }).form(data);
  }

  function postTransaction (url, data, callback) {
    post(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Transaction));
    }).form(data);
  }

  function postMembership (url, data, callback) {
    post(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Membership));
    }).form(data);
  }

  function postVoting (url, data, callback) {
    post(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Voting));
    }).form(data);
  }

  function vucoin_result(done, err, res, body) {
    var result = null;
    if(err)
      done(err);
    else{
      if(res.headers['content-type'] && res.headers['content-type'].match(/multipart\/msigned/)){
        if(authenticated)
          verifyResponse(res, body, done);
        else{
          var result = body;
          done(null, result);
        }
      }
      else{
        errorCode(res, body, done);
      }
    }
  }

  // ====== Initialization ======
  if(authenticated){
    var that = this;
    if(typeof authenticated != "string"){
      require('request')('http://' + server() + '/network/pubkey', function (err, res, body) {
        try{
          if(err)
            throw new Error(err);
          pubkeys = openpgp.key.readArmored(body).keys;
          intialized(null, that);
        }
        catch(ex){
          intialized("Remote key could not be retrieved: " + ex);
        }
      });
    }
    else{
      try{
        if(err)
          throw new Error(err);
        pubkeys = openpgp.key.readArmored(authenticated).keys;
        console.error("Public key imported.");
        intialized(null, that);
      }
      catch(ex){
        intialized("Bad key given.");
      }
    }
  }
  else intialized(null, this);

  function verifyResponse(res, body, done) {
    var type = res.headers["content-type"];
    if(type && type.match(/multipart\/msigned/)){
      var boundaries = type.match(/boundary=([\w\d]*);/);
      if(boundaries.length > 1){
        var boundary = "--" + boundaries[1];
        var index1 = body.indexOf(boundary);
        var index2 = body.indexOf(boundary, index1 + boundary.length);
        var index3 = body.indexOf(boundary, index2 + boundary.length);
        var content = body.substring(index1 + boundary.length + '\r\n'.length, index2 - '\r\n'.length*1);
        var signature = body.substring(boundary.length + '\r\n'.length + index2, index3 - '\r\n'.length*2);
        var sigMessage = signature.substring(signature.lastIndexOf('-----BEGIN PGP'));
        content = content.substring(content.indexOf('\r\n\r\n') + '\r\n'.length*2);
        var verified = false;
        try{
          var clearSigned = toClearSign(content, sigMessage);
          var clearTextMessage = openpgp.cleartext.readArmored(clearSigned);
          var sigRes = openpgp.verifyClearSignedMessage(pubkeys, clearTextMessage);
          if (sigRes.signatures && sigRes.signatures.length > 0) {
            verified = sigRes.signatures[0].valid;
          }
        }
        catch(ex){
          err = ex.toString();
          console.error('Exception during signature verification: ' + err);
        }
        if(verified){
          errorCode(res, content, sigMessage, done);
        }
        else{
          done("Signature verification failed for URL " + res.request.href);
        }
      }
    }
    else done("Non signed content.");
  }

  function toClearSign (data, signature) {
    if (signature.match(/-----BEGIN PGP SIGNED MESSAGE-----/))
      return signature
    else {
      var msg = '-----BEGIN PGP SIGNED MESSAGE-----\r\n' +
              'Hash: SHA1\r\n' +
              '\r\n' +
              data.replace(/^-----/gm, '- -----') + '\r\n' +
              signature + '\r\n';

      var signatureAlgo = findSignatureAlgorithm(msg) || 2;
      msg = msg.replace('Hash: SHA1', 'Hash: ' + hashAlgorithms[signatureAlgo.toString()]);

      return msg;
    }
  }

  function findSignatureAlgorithm (msg) {
    var signatureAlgo = null;
    var input = openpgp.armor.decode(msg);
    if (input.type !== openpgp.enums.armor.signed) {
      throw new Error('No cleartext signed message.');
    }
    var packetlist = new openpgp.packet.List();
    packetlist.read(input.data);
    packetlist.forEach(function(packet){
      if (packet.tag == openpgp.enums.packet.signature) {
        signatureAlgo = packet.hashAlgorithm;
      }
    });
    return signatureAlgo;
  }

  var hashAlgorithms = {
    '1': "MD5",
    '2': "SHA1",
    '3': "RIPEMD160",
    '8': "SHA256",
    '9': "SHA384",
    '10': "SHA512",
    '11': "SHA224"
  };

  function errorCode(res, body, signature, done) {
    if(signature && !done){
      done = signature;
      signature = undefined;
    }
    var err;
    if(res.statusCode != 200){
      if(res.statusCode == 400)
        err = "400 - Bad request.";
      else if(res.statusCode == 404)
        err = "404 - Not found.";
      else{
        err = res.statusCode + " - Unknown error.";
      }
      err += "\n" + body;
      done(err);
    }
    else{
      var result = body;
      try{ result = JSON.parse(body) } catch(ex) {}
      if(withSignature)
        done(null, result, withSignature ? signature : undefined);
      else
        done(null, result);
    }
  }

  return this;
}

String.prototype.dos2unix = function(){
  return this.replace(/\r\n/g, '\n');
};

String.prototype.unix2dos = function(){
  return this.dos2unix().replace(/\n/g, '\r\n');
};

function sanitize (json, type) {
  // Return type is either a string or an object
  if (typeof json != typeof type) {
    if (typeof type == 'object') {
      json = {};
    } else {
      json = "";
    }
  }

  _(type).keys().forEach(function(prop){
    var propType = type[prop];
    var t = "";
    if (propType.name) {
      t = propType.name;
    } else if (propType.length != undefined) {
      t = 'Array';
    } else {
      t = 'Object';
    }
    // Test json member type
    var tjson = typeof json[prop];
    if (~['Array', 'Object'].indexOf(t)) {
      if (tjson == 'object') {
        tjson = json[prop].length == undefined ? 'Object' : 'Array';
      }
    }
    // Check coherence & alter member if needed
    if (!_(json[prop]).isNull() && t.toLowerCase() != tjson.toLowerCase()) {
      try {
        if (t == "String" || t == "Number") {
          var s = json[prop] == undefined ? '' : json[prop];
          eval('json[prop] = new ' + t + '(' + s + ').valueOf()');
        }
        else {
          eval('json[prop] = new ' + t + '()');
        }
      } catch (ex) {
        eval('json[prop] = new ' + t + '()');
      }
    }
    // Arrays
    if (t == 'Array') {
      var subt = propType[0];
      json[prop].forEach(function(item){
        if (subt == "String" || subt == "Number")
          eval('item = new ' + t + '(' + (json[prop] + '') + ').valueOf()');
        else
          sanitize(item, subt);
      });
    }
    // Recursivity
    if (t == 'Object') {
      json[prop] = sanitize(json[prop], type[prop]);
    }
  });
  return json;
}

var ResultTypes = {};
ResultTypes.PublicKey = {
  "fingerprint": String,
  "pubkey": String
};
ResultTypes.Peer = {
  "version": String,
  "currency": String,
  "fingerprint": String,
  "endpoints": [String],
  "signature": String
};
ResultTypes.Merkle = {
  "depth": Number,
  "nodesCount": Number,
  "leavesCount": Number,
  "root": String
};
ResultTypes.MerkleWithLeaves = {
  "depth": Number,
  "nodesCount": Number,
  "leavesCount": Number,
  "root": String,
  "leaves": [String]
};
ResultTypes.MerkleWithLeaf = {
  "depth": Number,
  "nodesCount": Number,
  "leavesCount": Number,
  "root": String,
  "leaf": {
    "hash": String,
    "value": {}
  }
};
ResultTypes.Stream = {
  "peers": [String]
};
ResultTypes.Amendment = {
  "version": String,
  "currency": String,
  "number": Number,
  "generated": Number,
  "previousHash": String,
  "dividend": String,
  "votersRoot": String,
  "votersCount": Number,
  "votersChanges": [String],
  "membersRoot": String,
  "membersCount": Number,
  "membersChanges": [String],
  "raw": String
};
ResultTypes.Signature = {
  "issuer": String,
  "signature": String,
};
ResultTypes.AmendmentIndex = {
  "amendments": {}
};
ResultTypes.Transaction = {
  "raw": String,
  "transaction":
  {
    "signature": String,
    "version": Number,
    "currency": String,
    "sender": String,
    "number": Number,
    "previousHash": String,
    "recipient": String,
    "coins": [String],
    "comment": String
  }
};
ResultTypes.TransactionList = {
  "transactions": [ResultTypes.Transaction]
};
ResultTypes.Parameters = {
  "AMStart": Number,
  "AMFrequency": Number,
  "UDFrequency": Number,
  "UD0": Number,
  "UDPercent": Number,
  "CoinAlgo": String,
  "Consensus": Number,
  "MSExpires": Number,
  "VTExpires": Number
};
ResultTypes.CoinList = {
  "coins": [String]
};
ResultTypes.CoinOwning = {
  "coinid": String,
  "owner": String,
  "transaction": ResultTypes.Transaction
};
ResultTypes.CoinOwningHistory = {
  "history": [ResultTypes.CoinOwning]
};
ResultTypes.Membership = {
  "signature": String,
  "membership": {
    "version": String,
    "currency": String,
    "issuer": String,
    "membership": String,
    "sigDate": Number,
    "raw": String
  }
};
ResultTypes.MembershipHistory = {
  "memberships": [ResultTypes.Membership]
};
ResultTypes.Voting = {
  "signature": String,
  "voting": {
    "version": String,
    "currency": String,
    "issuer": String,
    "sigDate": Number,
    "raw": String
  }
};
ResultTypes.VotingHistory = {
  "votings": [ResultTypes.Voting]
};
ResultTypes.Vote = {
  "issuer": String,
  "signature": String,
  "amendment": ResultTypes.Amendment
};
ResultTypes.Forward = {
  "version": String,
  "currency": String,
  "from": String,
  "to": String,
  "forward": String,
  "keys": [String]
};
ResultTypes.Wallet = {
  "signature": String,
  "entry": {
    "version": String,
    "currency": String,
    "fingerprint": String,
    "requiredTrusts": Number,
    "hosters": [String],
    "trusts": [String]
  }
};
ResultTypes.Status = {
  "version": String,
  "currency": String,
  "status": String
};
