var nacl   = require('tweetnacl');
var naclb  = require('naclb');

var enc = nacl.util.encodeBase64,
    dec = nacl.util.decodeBase64;

var SEED_LENGTH = 32; // Length of the key
const crypto_sign_BYTES = 64;
// TODO: change key parameters
var TEST_PARAMS = {
  "N":4096,
  "r":16,
  "p":1
};

module.exports = {

  getKeyPair: function (key, salt, done) {
    getScryptKey(key, salt, function(keyBytes) {
      done(null, nacl.sign.keyPair.fromSeed(keyBytes));
    });
  },

  sign: function (msg, sec, done) {
    var m = nacl.util.decodeUTF8(msg);
    var signedMsg = naclb.sign(m, sec);
    var sig = new Uint8Array(crypto_sign_BYTES);
    for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
    done(null, nacl.util.encodeBase64(sig));
  },

  sign2: function (msg, sec, done) {
    var sig = nacl.sign.detached(nacl.util.decodeUTF8(msg), sec);
    done(null, enc(sig));
  }
};

//function getScryptKey(key, salt, callback) {
//  // console.log('Derivating the key...');
//  scrypt.kdf.config.saltEncoding = "ascii";
//  scrypt.kdf.config.keyEncoding = "ascii";
//  scrypt.kdf.config.outputEncoding = "base64";
//  scrypt.kdf(key, TEST_PARAMS, SEED_LENGTH, salt, function (err, res) {
//    callback(dec(res.hash));
//  });
//}


function getScryptKey(key, saltString, callback) {
  // console.log('Derivating the key...');
  var scrypt = require('scrypt-hash');
  var password = Buffer(key);
  var salt = Buffer(saltString);
  var N = TEST_PARAMS.N;
  var r = TEST_PARAMS.r;
  var p = TEST_PARAMS.p;
  var len = SEED_LENGTH;
  scrypt(password, salt, N, r, p, len, function (err, hash) {
    if (err) {
      throw err;
    }
    callback(dec(hash.toString('base64')));
  });
  //scrypt.kdf.config.saltEncoding = "ascii";
  //scrypt.kdf.config.keyEncoding = "ascii";
  //scrypt.kdf.config.outputEncoding = "base64";
  //scrypt.kdf(key, TEST_PARAMS, SEED_LENGTH, salt, function (err, res) {
  //  callback(dec(res.hash));
  //});
}