var _       = require('underscore');
var fs      = require('fs');
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
      dealMerkle('/pks/all', opts, done);
    }
  }

  this.ucg = {

    pubkey: function (done) {
      get('/network/pubkey', done);
    },

    peering: {

      get: function (done) {
        get('/network/peering', done);
      },

      peers: {

        get: function (done) {
          var opts = arguments.length == 1 ? {} : arguments[0];
          var done = arguments.length == 1 ? arguments[0] : arguments[1];
          dealMerkle('/network/peering/peers', opts, done);
        },

        upstream: {
          
          get: function (done) {
            get('/network/peering/peers/upstream', done);
          },
          
          of: function (fingerprint, done) {
            get('/network/peering/peers/upstream/' + fingerprint, done);
          },
        },

        downstream: {
          
          get: function (done) {
            get('/network/peering/peers/downstream', done);
          },
          
          of: function (fingerprint, done) {
            get('/network/peering/peers/downstream/' + fingerprint, done);
          },
        }
      },

      forward: function (forward, done) {
        var sigIndex = forward.indexOf("-----BEGIN");
        post('/network/peering/forward', done)
        .form({
          "forward": forward.substring(0, sigIndex),
          "signature": forward.substring(sigIndex)
        });
      },

      status: function (status, done) {
        var sigIndex = status.indexOf("-----BEGIN");
        post('/network/peering/status', done)
        .form({
          "status": status.substring(0, sigIndex),
          "signature": status.substring(sigIndex)
        });
      }
    },

    tht: {

      get: function (done) {
        var opts = arguments.length == 1 ? {} : arguments[0];
        var done = arguments.length == 1 ? arguments[0] : arguments[1];
        dealMerkle('/network/tht', opts, done);
      },

      post: function (entry, done) {
        var sigIndex = entry.indexOf("-----BEGIN");
        post('/network/tht', done)
        .form({
          "entry": entry.substring(0, sigIndex),
          "signature": entry.substring(sigIndex)
        });
      },

      of: function (fingerprint, done) {
        get('/network/tht/' + fingerprint, done);
      }
    }
  }

  this.hdc = {

    amendments: {

      current: function (done) {
        get('/hdc/amendments/promoted', done);
      },

      promoted: function (number, done) {
        get('/hdc/amendments/promoted/' + number, done);
      },

      view: {

        self: function (number, hash, done) {
          get('/hdc/amendments/view/' + number + '-' + hash + '/self', done);
        },

        signatures: function (number, hash, done) {
          amMerkle(arguments, 'signatures', done);
        }
      },

      votes: {

        get: function (done) {
          get('/hdc/amendments/votes', done);
        },

        post: function (vote, done) {
          var sigIndex = vote.indexOf("-----BEGIN");
          post('/hdc/amendments/votes', done)
          .form({
            "amendment": vote.substring(0, sigIndex),
            "signature": vote.substring(sigIndex)
          });
        }
      }
    },

    coins: {

      list: function (fingerprint, done) {
        get('/hdc/coins/list/' + fingerprint, done);
      },

      owner: function (fingerprint, amNumber, coinNumber, done) {
        get('/hdc/coins/view/' + [fingerprint, amNumber, coinNumber].join('-') + '/owner', done);
      },

      history: function (fingerprint, amNumber, coinNumber, done) {
        get('/hdc/coins/view/' + [fingerprint, amNumber, coinNumber].join('-') + '/history', done);
      }
    },

    transactions: {

      last: function (done) {
        get('/hdc/transactions/last/1', done);
      },

      lasts: function (number, done) {
        get('/hdc/transactions/last/' + number, done);
      },

      processs: function (tx, done) {
        var sigIndex = tx.indexOf("-----BEGIN");
        post('/hdc/transactions/process', done)
        .form({
          "transaction": tx.substring(0, sigIndex),
          "signature": tx.substring(sigIndex)
        });
      },

      sender: {

        get: function () {
          txSenderMerkle(arguments, '');
        },

        last: function (fingerprint, done) {
          get('/hdc/transactions/sender/' + fingerprint + '/last/1', function (err, json) {
            done(err, err || json.transactions.length == 0 ? null : json.transactions[0]);
          });
        },

        lasts: function (fingerprint, number, done) {
          get('/hdc/transactions/sender/' + fingerprint + '/last/' + number, done);
        },

        ud: function (fingerprint, amNumber, done) {
          get('/hdc/transactions/sender/' + fingerprint + '/ud/' + amNumber, done);
        }
      },

      recipient: function () {
        var hash = arguments[0];
        var opts = arguments.length == 2 ? {} : arguments[1];
        var done = arguments.length == 2 ? arguments[1] : arguments[2];
        dealMerkle('/hdc/transactions/recipient/' + hash, opts, done);
      },

      view: function () {
        var hash = arguments[0];
        var number = arguments[1];
        get('/hdc/transactions/sender/' + hash + '/view/' + number, done);
      }
    }
  };

  this.ucs = {

    parameters: function (done) {
      get('/registry/parameters', done);
    },

    community: {
      
      members: {

        get: function (ms, done) {
          var opts = arguments.length == 1 ? {} : arguments[0];
          var done = arguments.length == 1 ? arguments[0] : arguments[1];
          dealMerkle('/registry/community/members', opts, done);
        },

        post: function (ms, done) {
          var sigIndex = ms.indexOf("-----BEGIN");
          post('/registry/community/members', done)
          .form({
            "membership": ms.substring(0, sigIndex),
            "signature": ms.substring(sigIndex)
          });
        },

        current: function (fingerprint, done) {
          get('/registry/community/members/' + fingerprint + '/current', done);
        },

        history: function (fingerprint, done) {
          get('/registry/community/members/' + fingerprint + '/history', done);
        }
      },
      
      voters: {

        get: function (ms, done) {
          var opts = arguments.length == 1 ? {} : arguments[0];
          var done = arguments.length == 1 ? arguments[0] : arguments[1];
          dealMerkle('/registry/community/voters', opts, done);
        },

        post: function (voting, done) {
          var sigIndex = voting.indexOf("-----BEGIN");
          post('/registry/community/voters', done)
          .form({
            "voting": voting.substring(0, sigIndex),
            "signature": voting.substring(sigIndex)
          });
        },

        current: function (fingerprint, done) {
          get('/registry/community/voters/' + fingerprint + '/current', done);
        },

        history: function (fingerprint, done) {
          get('/registry/community/voters/' + fingerprint + '/history', done);
        }
      }
    },

    amendment: {

      proposed: function (number, done) {
          get('/registry/amendment/' + number, done);
      },

      vote: function (number, done) {
          get('/registry/amendment/' + number + '/vote', done);
      }
    }
  };

  function txSenderMerkle (args, property) {
    var hash = args[0];
    var opts = args.length == 2 ? {} : args[1];
    var done = args.length == 2 ? args[1] : args[2];
    dealMerkle('/hdc/transactions/sender/' + hash + property, opts, done);
  }

  function amMerkle (args, property) {
    var number = args[0];
    var hash = args[1];
    var opts = args.length == 3 ? {} : args[2];
    var done = args.length == 3 ? opts : args[3];
    dealMerkle('/hdc/amendments/view/' + number + '-' + hash + '/' + property, opts, done);
  }

  function dealMerkle (url, opts, done) {
    var i = 0;
    _(opts).each(function (value, key) {
      url += (i == 0 ? '?' : '&');
      url += key + '=' + value;
      i++;
    });
    get(url, done);
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
            verified = sigRes.signatures[0].valid && sigRes.text == content;
          }
        }
        catch(ex){
          err = ex.toString();
          console.error('Exception during signature verification: ' + err);
        }
        if(verified){
          errorCode(res, content, sigMessage, done);
        }
        else done("Signature verification failed");
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
