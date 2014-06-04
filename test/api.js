var fs     = require('fs');
var nock   = require('nock');
var should = require('should');
var async  = require('async');
var _      = require('underscore');
var vucoin = require('./..');

var NO_MSIGNED = false, NO_SIGNATURE_EXTRACT = false;

var node;

nock('http://localhost:8888')
  .get('/network/pubkey').reply(200, fs.readFileSync(__dirname + '/data/cat.pub'))
  .get('/network/peering').reply(200, "No JSON data")
  .get('/network/peering/peers').reply(200, "No JSON data")
  .get('/network/peering/peers?leaves=true').reply(200, "No JSON data")
  .get('/network/peering/peers?leaf=AAAA').reply(200, "No JSON data")
  .post('/network/peering/peers').reply(200, "No JSON data")
  .get('/network/peering/peers/upstream').reply(200, "No JSON data")
  .get('/network/peering/peers/upstream/GFGEG').reply(200, "No JSON data")
  .get('/network/peering/peers/downstream').reply(200, "No JSON data")
  .get('/network/peering/peers/downstream/GFGEG').reply(200, "No JSON data")
  .post('/network/peering/forward').reply(200, "No JSON data")
  .post('/network/peering/status').reply(200, "No JSON data")
  .get('/network/wallet').reply(200, "No JSON data")
  .get('/network/wallet?leaves=true').reply(200, "No JSON data")
  .get('/network/wallet?leaf=AAAA').reply(200, "No JSON data")
  .post('/network/wallet').reply(200, "No JSON data")
  .get('/network/wallet/ABCDE').reply(200, "No JSON data")
  .get('/hdc/amendments/promoted').reply(200, "No JSON data")
  .get('/hdc/amendments/promoted/1').reply(200, "No JSON data")
  .get('/hdc/amendments/view/1-AM/self').reply(200, "No JSON data")
  .get('/hdc/amendments/view/1-AM/signatures').reply(200, "No JSON data")
  .get('/hdc/amendments/view/1-AM/signatures?leaves=true').reply(200, "No JSON data")
  .get('/hdc/amendments/view/1-AM/signatures?leaf=AAAA').reply(200, "No JSON data")
  .get('/hdc/amendments/votes').reply(200, "No JSON data")
  .post('/hdc/amendments/votes').reply(200, "No JSON data")
  .post('/hdc/transactions/process').reply(200, "No JSON data")
  .get('/hdc/transactions/last/10').reply(200, "No JSON data")
  .get('/hdc/transactions/sender/DEFG').reply(200, "No JSON data")
  .get('/hdc/transactions/sender/DEFG?leaves=true').reply(200, "No JSON data")
  .get('/hdc/transactions/sender/DEFG?leaf=AAAA').reply(200, "No JSON data")
  .get('/hdc/transactions/sender/DEFG/view/0').reply(200, "No JSON data")
  .get('/hdc/transactions/sender/DEFG/last/1').reply(200, "No JSON data")
  .get('/hdc/transactions/sender/DEFG/last/1/2').reply(200, "No JSON data")
  .get('/hdc/transactions/recipient/DEFG').reply(200, "No JSON data")
  .get('/hdc/transactions/recipient/DEFG?leaves=true').reply(200, "No JSON data")
  .get('/hdc/transactions/recipient/DEFG?leaf=AAAA').reply(200, "No JSON data")
  .get('/hdc/transactions/refering/DEFG/4').reply(200, "No JSON data")
  .get('/hdc/coins/list/HIJ').reply(200, "No JSON data")
  .get('/hdc/coins/view/HIJ-0-1/owner').reply(200, "No JSON data")
  .get('/hdc/coins/view/HIJ-0-1/history').reply(200, "No JSON data")
  .get('/registry/parameters').reply(200, "No JSON data")
  .get('/registry/community/members').reply(200, "No JSON data")
  .get('/registry/community/members?leaves=true').reply(200, "No JSON data")
  .get('/registry/community/members?leaf=AAAA').reply(200, "No JSON data")
  .post('/registry/community/members').reply(200, "No JSON data")
  .get('/registry/community/members/LMN/current').reply(200, "No JSON data")
  .get('/registry/community/members/LMN/history').reply(200, "No JSON data")
  .get('/registry/community/voters').reply(200, "No JSON data")
  .get('/registry/community/voters?leaves=true').reply(200, "No JSON data")
  .get('/registry/community/voters?leaf=AAAA').reply(200, "No JSON data")
  .post('/registry/community/voters').reply(200, "No JSON data")
  .get('/registry/community/voters/LMN/current').reply(200, "No JSON data")
  .get('/registry/community/voters/LMN/history').reply(200, "No JSON data")
  .get('/registry/amendment').reply(200, "No JSON data")
  .get('/registry/amendment/4').reply(200, "No JSON data")
  .get('/registry/amendment/4/AnyKey/vote').reply(200, "No JSON data")
;

before(function (done) {
  vucoin('localhost', '8888', NO_MSIGNED, NO_SIGNATURE_EXTRACT, function (err, remoteNode) {
    node = remoteNode;
    done(err);
  });
});

describe('/network', function () {

  this.timeout(500);

  it ('/pubkey should return a string', function (done) {
    node.network.pubkey(noErrorResult(function(pubkey) {
      pubkey.should.match(/^-----BEGIN PGP/);
    }, done));
  });

  it ('/peering should return a peer', function (done) {
    node.network.peering.get(noErrorResult(function(peer) {
      isPeer(peer);
    }, done));
  });

  testMerkle('/peering/peers', 'node.network.peering.peers.get', isPeer);

  it ('/peering/peers POST should return a peer', function (done) {
    node.network.peering.peers.post('blabla-----BEGIN', noErrorResult(function(p) {
      isPeer(p);
    }, done));
  });


  it ('/peering/peers/upstream POST should return a stream', function (done) {
    node.network.peering.peers.upstream.get(noErrorResult(function(json) {
      isStream(json);
    }, done));
  });

  it ('/peering/peers/upstream/GFGEG POST should return a stream', function (done) {
    node.network.peering.peers.upstream.of('GFGEG', noErrorResult(function(json) {
      isStream(json);
    }, done));
  });

  it ('/peering/peers/downstream POST should return a stream', function (done) {
    node.network.peering.peers.downstream.get(noErrorResult(function(json) {
      isStream(json);
    }, done));
  });

  it ('/peering/peers/downstream/GFGEG POST should return a stream', function (done) {
    node.network.peering.peers.downstream.of('GFGEG', noErrorResult(function(json) {
      isStream(json);
    }, done));
  });

  testMerkle('/network/wallet', 'node.network.wallet.get', isWallet);

  it ('/network/wallet POST should return a wallet', function (done) {
    node.network.wallet.post('blabla-----BEGIN', noErrorResult(function(json) {
      isWallet(json);
    }, done));
  });

  it ('/network/wallet/ABCDE should return a wallet', function (done) {
    node.network.wallet.of('ABCDE', noErrorResult(function(json) {
      isWallet(json);
    }, done));
  });


  it ('/hdc/amendments/promoted should return an amendment', function (done) {
    node.hdc.amendments.current(noErrorResult(function(json) {
      isAmendment(json);
    }, done));
  });

  it ('/hdc/amendments/promoted/1 should return an amendment', function (done) {
    node.hdc.amendments.promoted(1, noErrorResult(function(json) {
      isAmendment(json);
    }, done));
  });

  it ('/hdc/amendments/view/1-AM/self should return an amendment', function (done) {
    node.hdc.amendments.view.self(1, 'AM', noErrorResult(function(json) {
      isAmendment(json);
    }, done));
  });

  testMerkle('/hdc/amendments/view/1-AM/signatures', 'async.apply(node.hdc.amendments.view.signatures, 1, \'AM\')', isSignature);

  it ('/hdc/amendments/votes should return an index of votes', function (done) {
    node.hdc.amendments.votes.get(noErrorResult(function(json) {
      isVoteIndex(json);
    }, done));
  });

  it ('/hdc/amendments/votes POST should return a vote', function (done) {
    node.hdc.amendments.votes.post('blabla-----BEGIN', noErrorResult(function(json) {
      isVote(json);
    }, done));
  });

  it ('/hdc/transactions/process should return a transaction', function (done) {
    node.hdc.transactions.process('blabla-----BEGIN', noErrorResult(function(json) {
      isTransaction(json);
    }, done));
  });

  it ('/hdc/transactions/last/10 should return a transaction', function (done) {
    node.hdc.transactions.lasts(10, noErrorResult(function(json) {
      isTransactionList(json);
    }, done));
  });

  it ('/hdc/transactions/sender/DEFG/view/0 should return a transaction', function (done) {
    node.hdc.transactions.view('DEFG', 0, noErrorResult(function(json) {
      isTransaction(json);
    }, done));
  });

  it ('/hdc/transactions/sender/DEFG/last/1 should return a transaction', function (done) {
    node.hdc.transactions.sender.lasts('DEFG', 1, null, noErrorResult(function(json) {
      isTransactionList(json);
    }, done));
  });

  it ('/hdc/transactions/sender/DEFG/last/1/2 should return a transaction', function (done) {
    node.hdc.transactions.sender.lasts('DEFG', 1, 2, noErrorResult(function(json) {
      isTransactionList(json);
    }, done));
  });

  it ('/hdc/transactions/refering/DEFG/4 should return a transaction', function (done) {
    node.hdc.transactions.refering('DEFG', 4, noErrorResult(function(json) {
      isTransactionList(json);
    }, done));
  });

  it ('/hdc/coins/list/HIJ should return a coin list', function (done) {
    node.hdc.coins.list('HIJ', noErrorResult(function(json) {
      isCoinList(json);
    }, done));
  });

  it ('/hdc/coins/view/HIJ-0-1/owner should return a coin owning properties', function (done) {
    node.hdc.coins.owner('HIJ', 0, 1, noErrorResult(function(json) {
      isCoinOwning(json);
    }, done));
  });

  it ('/hdc/coins/view/HIJ-0-1/history should return an history of property for a coin', function (done) {
    node.hdc.coins.history('HIJ', 0, 1, noErrorResult(function(json) {
      isCoinOwningHistory(json);
    }, done));
  });

  it ('/registry/parameters should return parameters', function (done) {
    node.registry.parameters(noErrorResult(function(json) {
      isParameters(json);
    }, done));
  });

  it ('/registry/community/members/LMN/current should return a membership', function (done) {
    node.registry.community.members.current('LMN', noErrorResult(function(json) {
      isMembership(json);
    }, done));
  });

  it ('/registry/community/members/LMN/history should return an history of memberships', function (done) {
    node.registry.community.members.history('LMN', noErrorResult(function(json) {
      isMembershipHistory(json);
    }, done));
  });

  it ('/registry/community/voters/LMN/current should return an voting request', function (done) {
    node.registry.community.voters.current('LMN', noErrorResult(function(json) {
      isVoting(json);
    }, done));
  });

  it ('/registry/community/voters/LMN/history should return an history of voting requests', function (done) {
    node.registry.community.voters.history('LMN', noErrorResult(function(json) {
      isVotingHistory(json);
    }, done));
  });

  it ('/registry/amendment/4 should return an amendment', function (done) {
    node.registry.amendment.proposed(4, noErrorResult(function(json) {
      isAmendment(json);
    }, done));
  });

  it ('/registry/amendment/4/AnyKey/vote should return a vote', function (done) {
    node.registry.amendment.vote(4, 'AnyKey', noErrorResult(function(json) {
      isVote(json);
    }, done));
  });

  it ('/registry/community/members POST should return a membership', function (done) {
    node.registry.community.members.post('blabla-----BEGIN', noErrorResult(function(json) {
      isMembership(json);
    }, done));
  });

  it ('/registry/community/voters POST should return a voting request', function (done) {
    node.registry.community.voters.post('blabla-----BEGIN', noErrorResult(function(json) {
      isVoting(json);
    }, done));
  });

  testMerkle('/hdc/transactions/sender/DEFG', 'async.apply(node.hdc.transactions.sender.get, \'DEFG\')', isTransaction);
  testMerkle('/hdc/transactions/recipient/DEFG', 'async.apply(node.hdc.transactions.recipient, \'DEFG\')', isTransaction);
  testMerkle('/registry/members', 'node.registry.community.members.get', isMembership);
  testMerkle('/registry/voters', 'node.registry.community.voters.get', isVoting);

  function testMerkle (url, methodName, leafTest) {

    it (url + ' should return a simple merkle', function (done) {
      var m = eval(methodName);
      m({}, noErrorResult(function(merkle) {
        isMerkleSimpleResult(merkle);
      }, done));
    });

    it (url + '?leaves=true should return a merkle with leaves', function (done) {
      var m = eval(methodName);
      m({leaves: true}, noErrorResult(function(merkle) {
        isMerkleLeavesResult(merkle);
      }, done));
    });

    it (url + '?leaf=AAAA should return a merkle with leaf', function (done) {
      var m = eval(methodName);
      m({leaf: 'AAAA'}, noErrorResult(function(merkle) {
        isMerkleLeafResult(merkle);
        leafTest(merkle.leaf.value);
      }, done));
    });
  }
});

function noErrorResult (f, done) {
  return function (err, res) {
    should.not.exist(err);
    should.exist(res);
    f(res);
    done();
  };
}

function isMerkleSimpleResult (json) {
  isMerkleResult(json);
  json.should.not.have.property('leaf');
  json.should.not.have.property('leaves');
}

function isMerkleLeafResult (json) {
  isMerkleResult(json);
  json.should.have.property('leaf');
  json.leaf.should.have.property('hash');
  json.leaf.should.have.property('value');
  json.should.not.have.property('leaves');
}

function isMerkleLeavesResult (json) {
  isMerkleResult(json);
  json.should.have.property('leaves');
  json.should.not.have.property('leaf');
  _(json.leaves).each(function (leaf) {
    leaf.should.be.a.String;
  });
}

function isMerkleResult (json) {
  json.should.have.property('depth');
  json.should.have.property('nodesCount');
  json.should.have.property('leavesCount');
  json.should.have.property('root');
}

function isPubKey (json) {
  json.should.have.property('signature');
  json.should.have.property('key');
  json.key.should.have.property('email');
  json.key.should.have.property('name');
  json.key.should.have.property('fingerprint');
  json.key.should.have.property('raw');
  json.key.should.not.have.property('_id');
  json.key.raw.should.not.match(/-----/g);
}

function isPeer (json) {
  json.should.have.property('version');
  json.should.have.property('currency');
  json.should.have.property('fingerprint');
  json.should.have.property('endpoints');
  json.should.have.property('signature');
  json.should.not.have.property('_id');
}

function isStream (json) {
  json.should.have.property('peers');
  json.peers.should.be.an.Array;
}

function isWallet (json) {
  json.should.have.property('signature');
  json.should.have.property('entry');
  json.entry.should.have.property('version');
  json.entry.should.have.property('currency');
  json.entry.should.have.property('fingerprint');
  json.entry.should.have.property('requiredTrusts');
  json.entry.should.have.property('hosters');
  json.entry.should.have.property('trusts');
  json.entry.hosters.should.be.an.Array;
  json.entry.trusts.should.be.an.Array;
}

function isMembership (json) {
  json.should.have.property('signature');
  json.should.have.property('membership');
  json.membership.should.have.property('version');
  json.membership.should.have.property('currency');
  json.membership.should.have.property('issuer');
  json.membership.should.have.property('membership');
  json.membership.should.have.property('sigDate');
  json.membership.should.have.property('raw');
  json.membership.should.not.have.property('_id');
  json.membership.raw.should.not.match(/-----/g);
}

function isMembershipHistory (json) {
  json.should.have.property('memberships');
  json.memberships.should.be.an.Array;
  json.memberships.forEach(function(ms){
    isMembership(ms);
  });
}

function isVoting (json) {
  json.should.have.property('signature');
  json.should.have.property('voting');
  json.voting.should.have.property('version');
  json.voting.should.have.property('currency');
  json.voting.should.have.property('issuer');
  json.voting.should.have.property('sigDate');
  json.voting.should.have.property('raw');
  json.voting.should.not.have.property('_id');
  json.voting.raw.should.not.match(/-----/g);
}

function isVotingHistory (json) {
  json.should.have.property('votings');
  json.votings.should.be.an.Array;
  json.votings.forEach(function(voting){
    isVoting(voting);
  });
}

function isSignature (json) {
  json.should.have.property('signature');
  json.should.have.property('issuer');
}

function isVoteIndex (json) {
  json.should.have.property('amendments');
}

function isVote (json) {
  json.should.have.property('signature');
  json.should.have.property('amendment');
  isAmendment(json.amendment);
}

function isCoinList (json) {
  json.should.have.property('coins');
  json.coins.should.be.an.Array;
}

function isCoinOwning (json) {
  json.should.have.property('coinid');
  json.should.have.property('owner');
  json.should.have.property('transaction');
  json.transaction.should.be.a.String;
}

function isCoinOwningHistory (json) {
  json.should.have.property('history');
  json.history.should.be.an.Array;
  json.history.forEach(function(coinOwning){
    isCoinOwning(coinOwning);
  });
}

function isParameters (json) {
  json.should.have.property('AMStart');
  json.should.have.property('AMFrequency');
  json.should.have.property('UDFrequency');
  json.should.have.property('UD0');
  json.should.have.property('UDPercent');
  json.should.have.property('CoinAlgo');
  json.should.have.property('Consensus');
  json.should.have.property('MSExpires');
  json.should.have.property('VTExpires');
}

function isAmendment (json) {
  var mandatories = [
    "version",
    "currency",
    "generated",
    "number",
    "votersRoot",
    "votersCount",
    "votersChanges",
    "membersRoot",
    "membersCount",
    "membersChanges",
    "raw"
  ];
  mandatories.forEach(function(prop){
    json.should.have.property(prop);
  });
  if (json.number > 0) {
    json.should.have.property('previousHash');
  }
  if (json.dividend > 0) {
    json.should.have.property('coinBase');
    json.should.have.property('coinList');
  }
  // Numbers
  json.version.should.be.a.Number;
  json.generated.should.be.a.Number;
  json.number.should.be.a.Number;
  if (json.dividend) {
    should.exist(json.dividend);
    should.exist(json.coinBase);
    should.exist(json.coinList);
    json.dividend.should.be.a.Number;
    json.coinBase.should.be.a.Number;
    json.coinList.should.be.an.Array;
  }
  json.membersCount.should.be.a.Number;
  json.votersCount.should.be.a.Number;
  // Strings
  json.currency.should.be.a.String;
  if (json.previousHash) {
    json.previousHash.should.be.a.String;
  }
  if (json.membersCount > 0) {
    json.membersRoot.should.be.a.String;
  } else {
    json.membersRoot.should.be.a.String;
  }
  if (json.votersCount > 0) {
    json.votersRoot.should.be.a.String;
  } else {
    json.votersRoot.should.be.a.String;
  }
  json.membersChanges.should.be.an.Array;
  json.membersChanges.forEach(function(change){
  });
  json.votersChanges.should.be.an.Array;
  json.votersChanges.forEach(function(change){
  });
}

function isTransactionList (json) {
  json.should.have.property('transactions');
  json.transactions.forEach(function(tx){
    isTransaction(tx);
  });
}

function isTransaction (json) {
  json.should.have.property('raw');
  json.should.have.property('transaction');
  var mandatories = [
    "version",
    "currency",
    "sender",
    "number",
    "recipient",
    "coins",
    "comment"
  ];
  mandatories.forEach(function(prop){
    json.transaction.should.have.property(prop);
  });
  if (json.transaction.number > 0) {
    json.transaction.should.have.property('previousHash');
  }
  // Numbers
  json.transaction.version.should.be.a.String;
  json.transaction.number.should.be.a.Number;
  json.transaction.number.should.not.be.below(0);
  // Strings
  json.transaction.currency.should.be.a.String;
  should.not.exist(json.transaction.type);
  should.not.exist(json.transaction.amounts);
  if (json.transaction.previousHash) {
    json.transaction.previousHash.should.be.a.String.and.match(/^[A-Z0-9]{40}$/);
  }
  json.transaction.coins.should.be.an.Array;
  json.transaction.coins.forEach(function(amount){
    amount.should.match(/^[A-Z\d]{40}-\d+-\d+(:[A-Z\d]{40}-\d+)?$/);
  });
}
