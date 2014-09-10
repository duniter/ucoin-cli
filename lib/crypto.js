var nacl   = require('tweetnacl');
var scrypt = require('scrypt');

var enc = nacl.util.encodeBase64,
    dec = nacl.util.decodeBase64;

var SEED_LENGTH = 32; // Length of the key
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
    var sig = nacl.sign.detached(nacl.util.decodeUTF8(msg), sec);
    done(null, enc(sig));
  }
};

function getScryptKey(key, salt, callback) {
  // console.log('Derivating the key...');
  scrypt.kdf.config.saltEncoding = "ascii";
  scrypt.kdf.config.keyEncoding = "ascii";
  scrypt.kdf.config.outputEncoding = "base64";
  scrypt.kdf(key, TEST_PARAMS, SEED_LENGTH, salt, function (err, res) {
    callback(dec(res.hash));
  });
}
