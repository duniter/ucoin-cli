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
    }
  }

  this.ucg = {

    peering: function (done) {
      get('/ucg/peering', done);
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
        }
      }
    },

    coins: {

      view: function (fingerprint, coinPart, done) {
        get('/hdc/coins/' + fingerprint + '/view/' + coinPart, done);
      }
    },

    transactions: {

      last: function (done) {
        get('/hdc/transactions/last', done);
      },

      lasts: function (number, done) {
        get('/hdc/transactions/last/' + number, done);
      },

      processs: {

        issuance: function (tx, done) {
          var sigIndex = tx.indexOf("-----BEGIN");
          post('/hdc/transactions/process/issuance', done)
          .form({
            "transaction": tx.substring(0, sigIndex),
            "signature": tx.substring(sigIndex)
          });
        },

        transfert: function (tx, done) {
          var sigIndex = tx.indexOf("-----BEGIN");
          post('/hdc/transactions/process/transfert', done)
          .form({
            "transaction": tx.substring(0, sigIndex),
            "signature": tx.substring(sigIndex)
          });
        },

        fusion: function (tx, done) {
          var sigIndex = tx.indexOf("-----BEGIN");
          post('/hdc/transactions/process/fusion', done)
          .form({
            "transaction": tx.substring(0, sigIndex),
            "signature": tx.substring(sigIndex)
          });
        }
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
          }
        }
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

  function requestSuccess(callback) {
    return _(vucoin_result).partial(callback);
  }

  function get(url, callback) {
    return require('request').get(requestHead(url), requestSuccess(callback));
  }

  function post(url, callback) {
    return require('request').post(requestHead(url), requestSuccess(callback));
  }

  function vucoin_result(done, err, res, body) {
    var result = null;
    if(err)
      done(err);
    else{
      if(res.statusCode == 200){
        if(authenticated)
          verifyResponse(res, body, done);
        else
          done(null, JSON.parse(body));
      }
      else{
        errorCode(res, body, done);
      }
    }
  }

  // ====== Initialization ======
  if(authenticated){
    var that = this;
    console.log("Looking for public key...");
    require('request')('http://' + server() + '/ucg/pubkey', function (err, res, body) {
      try{
        if(err)
          throw new Error(err);
        openpgp.keyring.importPublicKey(body);
        console.log("Public key imported.");
        intialized(null, that);
      }
      catch(ex){
        intialized("Remote key could not be retrieved.");
      }
    });
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
      var sig = openpgp.read_message(signature)[0];
      if(sig.verifySignature()){
        // Correct public keys and signature messages
        content = content.replace('BEGIN PGP PUBLIC KEY BLOCK', '-----BEGIN PGP PUBLIC KEY BLOCK-----');
        content = content.replace('BEGIN PGP SIGNATURE', '-----BEGIN PGP SIGNATURE-----');
        content = content.replace('END PGP PUBLIC KEY BLOCK', '-----END PGP PUBLIC KEY BLOCK-----');
        content = content.replace('END PGP SIGNATURE', '-----END PGP SIGNATURE-----');
        done(null, JSON.parse(content));
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
