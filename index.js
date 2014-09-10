var _       = require('underscore');
var fs      = require('fs');
var async   = require('async');
var openpgp = require('openpgp');

module.exports = function (host, port, intialized){
  return new vuCoin(host, port, intialized);
}

function vuCoin(host, port, intialized){

  var pubkeys = null;

  this.host = host;
  this.port = port;

  this.wot = {

    add: function (pubkey, self, done) {
      post('/wot/add', done)
      .form({
        "pubkey": pubkey,
        "self": self
      });
    },

    lookup: function (search, done) {
      getLookup('/wot/lookup/' + encodeURIComponent(search), done);
    }
  };

  this.pks = {

    add: function (key, done) {
      post('/pks/add', done)
      .form({
        "keytext": key
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
  };

  this.keychain = {

    parameters: function (done) {
      get('/keychain/parameters', done);
    },

    membership: function (ms, done) {
      var sigIndex = ms.indexOf("-----BEGIN");
      postMembership('/keychain/membership', {
        "membership": ms.substring(0, sigIndex),
        "signature": ms.substring(sigIndex)
      }, done);
    },

    current: function (done) {
      getKeyblock('/keychain/current', done);
    },

    keyblock: function (number, done) {
      getKeyblock('/keychain/keyblock/' + number, done);
    },
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
          if (arguments.length == 3) {
            done = from;
            from = undefined;
          }
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
    return {
      "url": "http://" + server() + url
    };
  }

  function get(url, callback) {
    return require('request').get(requestHead(url), _(vucoin_result).partial(callback));
  }

  function post(url, callback) {
    return require('request').post(requestHead(url), _(vucoin_result).partial(callback));
  }

  function getLookup (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Lookup));
    });
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

  function getKeyblock (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Keyblock));
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
      handleResponse(res, body, done);
    }
  }

  // ====== Initialization ======
  intialized(null, this);

  function handleResponse(res, body, done) {
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
      done(null, result, body);
    }
  }

  return this;
}

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
ResultTypes.Lookup = {
  "partial": Boolean,
  "results": [{
    "pubkey": String,
    "uids": [{
      "uid": String,
      "meta": {
        "timestamp": Number
      },
      "self": String,
      "others": [{
        "pubkey": String,
        "meta": {
          "timestamp": Number
        },
        "signature": String
      }]
    }]
  }]
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
ResultTypes.Keyblock = {
  "version": Number,
  "nonce": Number,
  "number": Number,
  "timestamp": Number,
  "membersCount": Number,
  "currency": String,
  "membersRoot": String,
  "signature": String,
  "hash": String,
  "previousHash": String,
  "previousIssuer": String,
  "membersChanges": [String],
  "keysChanges": [Object]
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
  "transaction": String
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
