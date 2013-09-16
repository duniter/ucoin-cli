var _       = require('underscore');
var fs      = require('fs');
var openpgp = require('./openpgp').openpgp;

openpgp.init();

module.exports = function(host, port, authenticated, intialized){

  if(!intialized){
    intialized = authenticated;
    authenticated = false;
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
      get('/ucg/pubkey', done);
    },

    peering: {

      get: function (done) {
        get('/ucg/peering', done);
      },

      peers: {

        upstream: {
          
          get: function (done) {
            get('/ucg/peering/peers/upstream', done);
          },
          
          of: function (fingerprint, done) {
            get('/ucg/peering/peers/upstream/' + fingerprint, done);
          },
        },

        downstream: {
          
          get: function (done) {
            get('/ucg/peering/peers/downstream', done);
          },
          
          of: function (fingerprint, done) {
            get('/ucg/peering/peers/downstream/' + fingerprint, done);
          },
        }
      },

      subscribe: function (subscription, done) {
        var sigIndex = subscription.indexOf("-----BEGIN");
        post('/ucg/peering/subscribe', done)
        .form({
          "subscription": subscription.substring(0, sigIndex),
          "signature": subscription.substring(sigIndex)
        });
      },

      status: function (status, done) {
        var sigIndex = status.indexOf("-----BEGIN");
        post('/ucg/peering/status', done)
        .form({
          "status": status.substring(0, sigIndex),
          "signature": status.substring(sigIndex)
        });
      }
    },

    tht: {

      get: function (done) {
        get('/ucg/tht', done);
      },

      post: function (entry, done) {
        var sigIndex = entry.indexOf("-----BEGIN");
        post('/ucg/tht', done)
        .form({
          "entry": entry.substring(0, sigIndex),
          "signature": entry.substring(sigIndex)
        });
      },

      of: function (fingerprint, done) {
        get('/ucg/tht/' + fingerprint, done);
      }
    }
  }

  this.hdc = {

    community: {

      join: function (membership, done) {
        var ms = fs.readFileSync(membership, 'utf8');
        var sigIndex = ms.indexOf("-----BEGIN");
        post('/hdc/community/join', done)
        .form({
          "request": ms.substring(0, sigIndex),
          "signature": ms.substring(sigIndex)
        });
      },

      memberships: function (opts, done) {
        var done = arguments.length == 1 ? opts : arguments[1];
        var opts = arguments.length == 1 ? {} : arguments[0];
        dealMerkle('/hdc/community/memberships', opts, done);
      },

      votes: function (opts, done) {
        var opts = arguments.length == 1 ? {} : arguments[0];
        var done = arguments.length == 1 ? opts : arguments[1];
        dealMerkle('/hdc/community/votes', opts, done);
      }
    },

    amendments: {

      current: function (done) {
        get('/hdc/amendments/current', done);
      },

      promoted: function (number, done) {
        get('/hdc/amendments/promoted/' + number, done);
      },

      view: {

        self: function (number, hash, done) {
          get('/hdc/amendments/view/' + number + '-' + hash + '/self', done);
        },

        members: function (number, hash, opts, done) {
          amMerkle(arguments, 'members', opts, done);
        },

        voters: function (number, hash, done) {
          amMerkle(arguments, 'voters', done);
        },

        memberships: function (number, hash, done) {
          amMerkle(arguments, 'memberships', done);
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
        },

        of: function (amendmentNumber, amendmentHash, done) {
          get('/hdc/amendments/votes/' + amendmentNumber + '-' + amendmentHash, done);
        }
      }
    },

    coins: {

      list: function (fingerprint, done) {
        get('/hdc/coins/' + fingerprint + '/list', done);
      },

      view: function (fingerprint, coinNumber, done) {
        get('/hdc/coins/' + fingerprint + '/view/' + coinNumber, done);
      },

      history: function (fingerprint, coinNumber, done) {
        get('/hdc/coins/' + fingerprint + '/view/' + coinNumber + '/history', done);
      }
    },

    transactions: {

      all: function () {
        var opts = arguments.length == 1 ? {} : arguments[0];
        var done = arguments.length == 1 ? arguments[0] : arguments[1];
        dealMerkle('/transactions/all', opts, done);
      },

      keys: function () {
        var opts = arguments.length == 1 ? {} : arguments[0];
        var done = arguments.length == 1 ? arguments[0] : arguments[1];
        dealMerkle('/transactions/keys', opts, done);
      },

      last: function (done) {
        get('/hdc/transactions/last', done);
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
          get('/hdc/transactions/sender/' + fingerprint + '/last', done);
        },

        lasts: function (fingerprint, number, done) {
          get('/hdc/transactions/sender/' + fingerprint + '/last/' + number, done);
        },

        issuance: {

          get: function () {
            txSenderMerkle(arguments, '/issuance');
          },

          last: function (fingerprint, done) {
            get('/hdc/transactions/sender/' + fingerprint + '/issuance/last', done);
          },

          dividend: {

            get: function () {
              txSenderMerkle(arguments, '/issuance/amendment');
            },

            amendment: function () {
              var hash = arguments[0];
              var number = arguments[1];
              var opts = arguments.length == 3 ? {} : arguments[2];
              var done = arguments.length == 3 ? arguments[2] : arguments[3];
              dealMerkle('/hdc/transactions/sender/' + hash + '/issuance/dividend/' + number, opts, done);
            }
          },

          fusion: function () {
            txSenderMerkle(arguments, '/issuance/amendment');
          }
        },

        transfert: function () {
          txSenderMerkle(arguments, '/issuance/transfert');
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
        var opts = arguments.length == 3 ? {} : arguments[2];
        var done = arguments.length == 3 ? arguments[2] : arguments[3];
        dealMerkle('/hdc/transactions/view/' + hash + '-' + number, opts, done);
      }
    }
  }

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
        "Accept": "multipart/signed"
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
      if(res.statusCode == 200){
        if(authenticated)
          verifyResponse(res, body, done);
        else{
          var result = body;
          try{ result = JSON.parse(body) } catch(ex) {}
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
      console.error("Looking for public key...");
      require('request')('http://' + server() + '/ucg/pubkey', function (err, res, body) {
        try{
          if(err)
            throw new Error(err);
          openpgp.keyring.importPublicKey(body);
          console.error("Public key imported.");
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
        openpgp.keyring.importPublicKey(authenticated);
        console.error("Public key imported.");
        intialized(null, that);
      }
      catch(ex){
        intialized("Bad key given.");
      }
    }
  }
  else intialized(null, this);

  return this;
}

function verifyResponse(res, body, done) {
  var type = res.headers["content-type"];
  if(type && type.match(/multipart\/signed/)){
    var boundaries = type.match(/boundary=([\w\d]*);/);
    if(boundaries.length > 1){
      var boundary = "--" + boundaries[1];
      body = body.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
      var index1 = body.indexOf(boundary);
      var index2 = body.indexOf(boundary, boundary.length + index1);
      var index3 = body.indexOf(boundary, boundary.length + index2);
      var content = body.substring(boundary.length + '\r\n'.length + index1, index2 - '\r\n'.length*2);
      var signature = body.substring(boundary.length + '\r\n'.length + index2, index3 - '\r\n'.length*2);
      signature = "-----BEGIN PGP SIGNED MESSAGE-----\r\nHash: SHA256\r\n\r\n" + content + '\r\n' + signature.substring(signature.lastIndexOf('-----BEGIN PGP SIGNATURE'));
      // console.log(signature);
      var sig = openpgp.read_message(signature)[0];
      if(sig.verifySignature()){
        // Correct public keys and signature messages
        content = content.replace(/BEGIN PGP([A-Z ]*)/g, '-----BEGIN PGP$1-----');
        content = content.replace(/END PGP([A-Z ]*)/g, '-----END PGP$1-----');
        var result = content;
        try{ result = JSON.parse(content) } catch(ex) {}
        done(null, result);
      }
      else done("Signature verification failed");
    }
  }
  else done("Non signed content.");
}

function errorCode(res, body, done) {
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
