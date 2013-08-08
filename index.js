var _       = require('underscore');
var fs      = require('fs');
var openpgp = require('./openpgp').openpgp;

openpgp.init();

module.exports = function(host, port, intialized){

  this.host = host;
  this.port = port;

  this.pks = {

    add: function (key, signature, done) {
      post('/pks/add', done)
      .form({
        "keytext": fs.createReadStream(key),
        "keysign": fs.createReadStream(signature)
      });
    },

    lookup: function (search, done) {
      get('/pks/lookup?search=' + encodeURIComponent(search) + '&op=index', done);
    }
  }

  function server() {
    var server = host.match(/:/) ? '[' + host + ']' : host;
    server += ':' + port;
    console.error(server);
    return server;
  }

  function get(url, callback) {
    return require('request').get({
      "url": "http://" + server() + url,
      "headers": {
        "Accept": "multipart/signed"
      }
    }, _(vucoin_result).partial(callback));
  }

  function post(url, callback) {
    return require('request').post({
      "url": "http://" + server() + url,
      "headers": {
        "Accept": "multipart/signed"
      }
    }, _(vucoin_result).partial(callback));
  }

  // ====== Initialization ======
  var that = this;
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

  return this;
}

function vucoin_result(done, err, res, body) {
  var result = null;
  if(err)
    done(err);
  else{
    if(res.statusCode == 200){
      verifyResponse(res, body, done);
    }
    else{
      errorCode(res, body, done);
    }
  }
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
