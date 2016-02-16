var _       = require('underscore');
var async   = require('async');

module.exports = function (host, port, intialized, options){
  return new vuCoin(host, port, intialized, options);
}

function vuCoin(host, port, intialized, options){

  options = options || {};

  var pubkeys = null;

  this.host = host;
  this.port = port;

  this.node = {

    summary: function (done) {
      get('/node/summary', done);
    }
  };

  this.wot = {

    add: function (pubkey, self, other, done) {
      post('/wot/add', done)
        .form({
          "pubkey": pubkey,
          "self": self,
          "other": other
        });
    },

    revoke: function (pubkey, self, sig, done) {
      post('/wot/revoke', done)
        .form({
          "pubkey": pubkey,
          "self": self,
          "sig": sig
        });
    },

    lookup: function (search, done) {
      getLookup('/wot/lookup/' + encodeURIComponent(search), done);
    },

    members: function (done) {
      getWoTMembers('/wot/members', done);
    },

    certifiersOf: function (search, done) {
      getWoTCerts('/wot/certifiers-of/' + search, done);
    },

    certifiedBy: function (search, done) {
      getWoTCerts('/wot/certified-by/' + search, done);
    }
  };

  this.currency = {

    parameters: function (done) {
      get('/blockchain/parameters', done);
    }
  };

  this.blockchain = {

    parameters: function (done) {
      get('/blockchain/parameters', done);
    },

    membership: function (ms, done) {
      postMembership('/blockchain/membership', {
        "membership": ms,
      }, done);
    },

    memberships: function (search, done) {
      getMemberships('/blockchain/memberships/' + search, done);qs
    },

    current: function (done) {
      getBlock('/blockchain/current', done);
    },

    block: function (number, done) {
      getBlock('/blockchain/block/' + number, done);
    },

    blocks: function (count, from, done) {
      getBlocks('/blockchain/blocks/' + count + '/' + from, done);
    },

    with: {
      newcomers: getStatFunc('newcomers'),
      certs: getStatFunc('certs'),
      joiners: getStatFunc('joiners'),
      actives: getStatFunc('actives'),
      leavers: getStatFunc('leavers'),
      excluded: getStatFunc('excluded'),
      ud: getStatFunc('ud'),
      tx: getStatFunc('tx')
    }
  };

  function getStatFunc (statName) {
    return function (done) {
      getStat('/blockchain/with/' + statName, done);
    };
  }

  this.tx = {

    process: function (tx, done) {
      postTransaction('/tx/process', {
        "transaction": tx,
      }, done);
    },

    sources: function (pubkey, done) {
      getSources('/tx/sources/' + pubkey, done);
    },
  };

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
          postPeer('/network/peering/peers', {
            "peer": entry
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
    return require('request').get({
      json: true,
      url: requestHead(url).url,
      timeout: options.timeout || 4000
    }, _(vucoin_result).partial(callback));
  }

  function post(url, callback) {
    return require('request').post(requestHead(url), _(vucoin_result).partial(callback));
  }

  function getLookup (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Lookup));
    });
  }

  function getWoTMembers (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.WoTMembers));
    });
  }

  function getWoTCerts (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.WoTCerts));
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

  function getBlock (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Block));
    });
  }

  function getBlocks (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Blocks));
    });
  }

  function getStat (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Stat));
    });
  }

  function getSources (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Sources));
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

  function getMemberships (url, callback) {
    get(url, function (err, res, body) {
      callback(err, sanitize(res, ResultTypes.Memberships));
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
    if (res.statusCode === 200){
      // Success
      var result = body;
      if (typeof body == "string") {
        try{ result = JSON.parse(body) } catch(ex) {}
      }
      done(null, result, body);
    }
    else {
      var err = {
        httpCode: res.statusCode,
        body: {}
      };
      // Error
      if (typeof body == "object") {
        err.body = body;
      } else {
        err.message = body;
      }
      done(err);
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
        "timestamp": String
      },
      "self": String,
      "others": [{
        "pubkey": String,
        "meta": {
          "timestamp": String
        },
        "signature": String
      }]
    }]
  }]
};
ResultTypes.WoTMembers = {
  "results": [{
    "pubkey": String,
    "uid": String
  }]
};
ResultTypes.WoTCerts = {
  "pubkey": String,
  "uid": String,
  "certifications": [{
    "pubkey": String,
    "uid": String,
    "cert_time": {
      "block": Number,
      "medianTime": Number
    },
    "written": Boolean,
    "signature": String
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
ResultTypes.Stat = {
  "result": {
    "blocks": [Number]
  }
};
ResultTypes.Block = {
  "version": Number,
  "currency": String,
  "nonce": Number,
  "number": Number,
  "date": Number,
  "confirmedDate": Number,
  "issuer": String,
  "parameters": String,
  "membersCount": Number,
  "monetaryMass": Number,
  "hash": String,
  "previousHash": String,
  "previousIssuer": String,
  "joiners": [String],
  "actives": [String],
  "leavers": [String],
  "excluded": [String],
  "signature": String
};
ResultTypes.Blocks = {
  "blocks": [ResultTypes.Block]
};
ResultTypes.Source = {
  "type": String,
  "noffset": Number,
  "identifier": String,
  "amount": Number,
  "base": Number
};
ResultTypes.Sources = {
  "pubkey": String,
  "sources": [ResultTypes.Source]
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
    "signatures": [String],
    "version": Number,
    "currency": String,
    "issuers": [String],
    "inputs": [String],
    "unlocks": [String],
    "outputs": [String]
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
ResultTypes.Memberships = {
  "pubkey": String,
  "uid": String,
  "sigDate": Number,
  "memberships": [
    {
      "version": String,
      "currency": String,
      "membership": String,
      "blockNumber": Number,
      "blockHash": String
    }
  ]
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
