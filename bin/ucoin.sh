#!/bin/bash

usage()
{
cat > /dev/stderr <<-EOF

  usage: $0 [-s server] [-p port] [-u pgpuser] [options] <command>
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] join|actualize|leave
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] voter
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] clist [limit]
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] cget <value1[,...]>
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] transfer <recipient> [<comment>]

  Forge and send uCoin documents to a uCoin server.

  Free commands:

    peering         Show peering informations
    pubkey          Show pubkey of remote node
    current         Show current amendment of the contract
    contract        List all amendments constituting the contract
    lookup          Search for a public key
    index           List reiceved votes count for each amendment

  Requiring -u option:

    vote-current    Send a vote for currently promoted amendment
    vote-initial    Send a vote for initial amendment (AM0)

    host-(add|rm)   (Add|Remove) given key fingerprint to hosts managing transactions of key -u
    trust-(add|rm)  (Add|Remove) given key fingerprint to hosts key -u trust for receiving transactions
    wallet          Show wallet resulting of host-* and trust-* commands
    pub-wallet      Publish wallet returned by 'wallet' command

    transfer        Transfers property of coins (coins are read from STDIN)
    clist           List coins of given user. May be limited by upper amount.
    cget            Get coins for given values in user account.

    send-pubkey     Send signed public key [file] to a uCoin server.
                    If -u option is provided, [file] is ommited.
                    If [file] is not provided, it is read from STDIN.
                    Note: [file] may be forged using 'forge-*' commands.

    join            Send membership request to either join, stay in, or leave the community.
    actualize
    leave         
    
    voter           Send a voting request to be taken in account as new voter.

  Options:

    -s server     uCoin server to look data in [default 'localhost']
    -p port       uCoin server port [default '8081']
    -u user       PGP key to use for signature
    -c            Responds 'yes' on confirmation questions.
    -v            Verbose mode
    -h            Help

EOF
}

APP_DIR="$HOME/.ucoin"
hostFile='hosts'
trustFile='trusts'
trustMinFile='trustsMin'
SERVER=
PORT=
user=
dividend=
mincoin=
votes=
timestamp=
confirm=true
communityChanges=false
verbose=false
DEBUG=false
comment=
fpr=
date=
while getopts :hs:p:u:t:d:m:n:vDcC OPT; do
  case "$OPT" in
    s)
      SERVER="$OPTARG"
      ;;
    p)
      PORT="$OPTARG"
      ;;
    u)
      user="$OPTARG"
      ;;
    d)
      dividend="$OPTARG"
      ;;
    m)
      mincoin="$OPTARG"
      ;;
    n)
      votes="$OPTARG"
      ;;
    t)
      timestamp="$OPTARG"
      ;;
    v)
      verbose=true
      ;;
    D)
      DEBUG=true
      ;;
    c)
      confirm=false
      ;;
    C)
      communityChanges=true
      ;;
    h)
      usage
      exit 0
      ;;
    ?)
      echo "Bad parameters." >&2
      usage >&2
      exit 1
      ;;
  esac
done

# Remove the switches we parsed above
shift `expr $OPTIND - 1`

if [ $# -eq 0 ]; then
  echo "Need a command." >&2
  usage >&2
  exit 1
fi

executable=$0
if [ -L $LINK ]; then
  # Production link
  executable=`readlink $executable`
fi
if [[ "$executable" != /* ]]; then
  wdir=`echo $0 | sed -e "s/\(.*\)\/\([^\/]*\)/\1/g"`
  executable=$wdir/${executable}
  if [[ $executable != *ucoin.sh ]]; then
    executable=${executable}/ucoin.sh
  fi
fi
cwd=`echo $executable | sed -e "s/\(.*\)\/\([^\/]*\)/\1/g"`
cmd="$1"
ucoin="$cwd/ucoin"
ucoinsh="$executable"

if [ ! -z $SERVER ]; then
  ucoin="$ucoin -h $SERVER"
  ucoinsh="$ucoinsh -s $SERVER"
fi

if [ ! -z $PORT ]; then
  ucoin="$ucoin -p $PORT"
  ucoinsh="$ucoinsh -p $PORT"
fi

if [ ! -z $dividend ]; then
  ucoinsh="$ucoinsh -d $dividend"
  ucoin="$ucoin --dividend $dividend"
fi

if [ ! -z $votes ]; then
  ucoinsh="$ucoinsh -n $votes"
  ucoin="$ucoin --votes $votes"
fi

if [ ! -z $timestamp ]; then
  ucoinsh="$ucoinsh -t $timestamp"
  ucoin="$ucoin --timestamp $timestamp"
fi

if $verbose; then
  ucoinsh="$ucoinsh -v"
  echo "Called: $0 $@"
  echo "ucoin: $ucoin"
  echo "ucoinsh: $ucoinsh"
fi

sign()
{
  # If signature requires user
  command=$1
  if [ ! -z $user ]; then
    uuser="-u $user"
  fi
  if [[ ! -z $comment ]]; then
    forged=`$command --comment "$comment"`
  else
    forged=`$command`
  fi
  if [[ ! -z $2 ]] && ! echo "$forged" | grep "$2" > /dev/null; then
    $DEBUG && echo "DEBUG" >&2
    $DEBUG && echo "Does not match '$2'" >&2
    $DEBUG && echo "$forged" >&2
    exit 1
  fi
  # Signature only if no error happened
  if [ $? -eq 0 ]; then
    echo "$forged" | unix2dos > forge.ucoin.tmp
    if [[ -e forge.ucoin.tmp.asc ]]; then
      rm forge.ucoin.tmp.asc
    fi
    gpg -sb -a $uuser forge.ucoin.tmp >> forge.ucoin.tmp
    unix2dos forge.ucoin.tmp 2> /dev/null
    cat forge.ucoin.tmp
    cat forge.ucoin.tmp.asc
    rm forge.ucoin.tmp
    rm forge.ucoin.tmp.asc
  fi
}

fromFileOrForge()
{
  var=""
  if [ ! -z $user ]; then
    # Read from selfcall
    var=`$ucoinsh -u $user $1`
  elif [ -z $2 ]; then
    # Read from STDIN
    var=`cat`
  elif [ ! -e $2 ] || [ ! -r $2 ]; then
    # Read from file
    if [ ! -e $2 ];then
      echo "File does not exist" >&2;
    elif [ ! -r $2 ];then
      echo "File must be readable" >&2;
    fi
    exit 1
  else
    var=`cat $2`
  fi
  echo "$var"
}

confirmThat()
{
  ok=false
  while ! $ok ; do
    read -p "$1" choice
    case $choice in
      [yYoO])
        ok=true
        true
        ;;
      [nN])
        ok=true
        false
        ;;
      **)
        ;;
    esac
  done
}

case "$cmd" in

  join|actualize|leave|voter|wallet|pub-wallet)
    if [[ ! -z $2 ]]; then
      date=$2
    else
      date=`date +%s`
    fi
    ;;
esac

case "$cmd" in

  send-pubkey|wallet|pub-wallet|host-add|host-rm|trust-min|trust-add|trust-rm|forge-transfer|clist|cget|vote|join|actualize|leave|voter|vote-initial|vote-initial|vote-current)
    if [ -z $user ]; then
      echo "Requires -u option."
      exit 1
    fi
    fpr=`gpg --fingerprint $user | grep = | sed -e "s/.*= //g" | sed -e "s/ //g"`

    if [ -z $fpr ]; then
      exit 1
    fi
    ;;
esac

FPR_DIR=
HOSTS_FILE=
TRUSTS_FILE=
TRUSTS_MIN_FILE=
case "$cmd" in

  wallet|pub-wallet|host-add|host-rm|trust-min|trust-add|trust-rm)
    # $HOME/.ucoin/ must be a dir
    if [[ -e $APP_DIR ]] && [[ ! -d $APP_DIR ]]; then
      echo "$APP_DIR must be a directory" >&2
      exit 1
    fi
    FPR_DIR="$APP_DIR/$fpr"
    # Create $HOME/.ucoin/$FPR dir, to save host/trust configurations for a given key
    [[ ! -e $FPR_DIR ]] && mkdir -p $FPR_DIR
    if [[ -e $FPR_DIR ]] && [[ ! -d $FPR_DIR ]]; then
      echo "$FPR_DIR must be a directory" >&2
      exit 1
    fi
    case "$cmd" in

      host-add|host-rm|trust-add|trust-rm)
        if ! echo $2 | grep "^[A-Z\d]{40}$" -P >/dev/null ; then
          echo "Require a PGP key SHA-1 hash as argument" >&2
          exit 1
        fi
        ;;
    esac
    HOSTS_FILE="$FPR_DIR/$hostFile" && touch $HOSTS_FILE
    TRUSTS_FILE="$FPR_DIR/$trustFile" && touch $TRUSTS_FILE
    TRUSTS_MIN_FILE="$FPR_DIR/$trustMinFile" && touch $TRUSTS_MIN_FILE
    ;;
esac

case "$cmd" in
  
  sign)
    sign "cat" 2> /dev/null
    ;;
  
  pubkey)
    $ucoin pubkey 2> /dev/null
    ;;
  
  host-add)
    echo $2 >> $HOSTS_FILE
    sort -u $HOSTS_FILE -o "$HOSTS_FILE"
    ;;
  
  host-rm)
    sed -i "/$2/d" $HOSTS_FILE
    ;;
  
  trust-min)
    echo $2 > $TRUSTS_MIN_FILE
    ;;
  
  trust-add)
    echo $2 >> $TRUSTS_FILE
    sort -u $TRUSTS_FILE -o "$TRUSTS_FILE"
    ;;
  
  trust-rm)
    sed -i "/$2/d" $TRUSTS_FILE
    ;;
  
  wallet)
    echo "Date: $date"
    echo -n "RequiredTrusts: "
    cat $TRUSTS_MIN_FILE
    echo "Hosters:"
    cat $HOSTS_FILE
    echo "Trusts:"
    cat $TRUSTS_FILE
    ;;
  
  pub-wallet)
    PUB_FILE="$FPR_DIR/pub"
    currency=`$ucoin currency`
    echo "Version: 1" > $PUB_FILE
    echo "Currency: $currency" >> $PUB_FILE
    echo "Key: $fpr" >> $PUB_FILE
    echo "Date: $date" >> $PUB_FILE
    echo -n "RequiredTrusts: " >> $PUB_FILE
    cat $TRUSTS_MIN_FILE >> $PUB_FILE
    echo "Hosters:" >> $PUB_FILE
    cat $HOSTS_FILE >> $PUB_FILE
    echo "Trusts:" >> $PUB_FILE
    cat $TRUSTS_FILE >> $PUB_FILE
    unix2dos $PUB_FILE 2>/dev/null
    sign "cat $PUB_FILE" | $ucoin pub-wallet
    ;;
  
  vote)
    # Must have a readable file parameter
    if [ -z $2 ]; then
      # Read from STDIN
      amendment=`cat`
    elif [ -e $2 ] && [ -r $2 ]; then
      # Read from file
      amendment=`cat $2`
    else
      echo "Parameter must be a readable file" >&2
      exit 1
    fi
    echo "------------------------"
    echo "Amendment to sign:"
    echo "------------------------"
    echo "$amendment"
    echo "------------------------"
    echo "$amendment" > am.ucoin.tmp
    if ! $confirm || confirmThat "You are about to vote for this amendment by signing and sending it. Do wish to continue? [y/n] "; then
      echo "Signing amendment..."
      sign "cat am.ucoin.tmp"  > vote.ucoin.tmp
      $ucoinsh send-vote vote.ucoin.tmp
    else
      echo "Aborting..."
    fi
    if [[ -e am.ucoin.tmp ]]; then
      rm am.ucoin.tmp
    fi
    if [[ -e vote.ucoin.tmp ]]; then
      rm vote.ucoin.tmp
    fi
    ;;
  
  vote-initial)
    $ucoin am-initial $2 $3 > am.ucoin.tmp
    amendment=`cat am.ucoin.tmp`
    rm am.ucoin.tmp
    echo "------------------------"
    echo "Amendment to sign:"
    echo "------------------------"
    echo "$amendment"
    echo "------------------------"
    echo "$amendment" > am.ucoin.tmp
    if ! $confirm || confirmThat "You are about to vote for this amendment by signing and sending it. Do wish to continue? [y/n] "; then
      echo "Signing amendment..."
      sign "cat am.ucoin.tmp"  > vote.ucoin.tmp
      $ucoinsh send-vote vote.ucoin.tmp
    else
      echo "Aborting..."
    fi
    if [[ -e am.ucoin.tmp ]]; then
      rm am.ucoin.tmp
    fi
    if [[ -e vote.ucoin.tmp ]]; then
      rm vote.ucoin.tmp
    fi
    ;;
  
  vote-current)
    $ucoin am-current > am.ucoin.tmp
    amendment=`cat am.ucoin.tmp`
    rm am.ucoin.tmp
    echo "------------------------"
    echo "Amendment to sign:"
    echo "------------------------"
    echo "$amendment"
    echo "------------------------"
    echo "$amendment" > am.ucoin.tmp
    if ! $confirm || confirmThat "You are about to vote for this amendment by signing and sending it. Do wish to continue? [y/n] "; then
      echo "Signing amendment..."
      sign "cat am.ucoin.tmp"  > vote.ucoin.tmp
      $ucoinsh send-vote vote.ucoin.tmp
    else
      echo "Aborting..."
    fi
    if [[ -e am.ucoin.tmp ]]; then
      rm am.ucoin.tmp
    fi
    if [[ -e vote.ucoin.tmp ]]; then
      rm vote.ucoin.tmp
    fi
    ;;
  
  send-vote)
    # Must have a readable file parameter
    if [ -z $2 ]; then
      # Read from STDIN
      var=`cat`
    elif [ -e $2 ] && [ -r $2 ]; then
      # Read from file
      var=$2
    else
      echo "Parameter must be a readable file" >&2
      exit 1
    fi
    $ucoin vote --votefile "$var"
    ;;
  
  send-pubkey)
    pubkey=`fromFileOrForge forge-cert $2`
    echo "$pubkey" > pubkey.ucoin.tmp
    echo "`$ucoin pks-add --key pubkey.ucoin.tmp`"
    rm pubkey.ucoin.tmp
    ;;
  
  transfer)
    coins=`cat`
      $DEBUG && $ucoinsh -u $user forge-transfer $2 $3 $coins > transfer.ucoin.tmp
    ! $DEBUG && $ucoinsh -u $user forge-transfer $2 $3 $coins > transfer.ucoin.tmp
    if [ $? -eq 0 ]; then
      $ucoin transfer --transaction transfer.ucoin.tmp
    fi
    rm transfer.ucoin.tmp
    ;;
  
  lookup)
    # Must have a search parameter
    if [ -z $2 ]; then
      echo "Need a search parameter" >&2
      exit 1
    fi
    echo "`$ucoin pks-lookup --search $2`"
    ;;
  
  contract)
    echo "`$ucoin am-contract`"
    ;;
  
  current)
    echo "`$ucoin am-current`"
    ;;
  
  index)
    echo "`$ucoin index`"
    ;;
  
  peering)
    echo "`$ucoin peer`"
    ;;
  
  clist)
    $ucoin coins-list $fpr $2
    ;;
  
  cget)
    $ucoin coins-get $fpr --pay $2
    ;;
  
  join)
    currency=`$ucoin currency`
    echo "Version: 1" > ms.ucoin.tmp
    echo "Currency: $currency" >> ms.ucoin.tmp
    echo "Registry: MEMBERSHIP" >> ms.ucoin.tmp
    echo "Issuer: $fpr" >> ms.ucoin.tmp
    echo "Date: $date" >> ms.ucoin.tmp
    echo "Membership: IN" >> ms.ucoin.tmp
    $ucoin msvt-trailer >> ms.ucoin.tmp
    sign "cat ms.ucoin.tmp" > ms.ucoin.tmp.asc
    $ucoin update-membership --membership ms.ucoin.tmp.asc
    rm ms.ucoin.tmp
    rm ms.ucoin.tmp.asc
    ;;
  
  actualize)
    currency=`$ucoin currency`
    echo "Version: 1" > ms.ucoin.tmp
    echo "Currency: $currency" >> ms.ucoin.tmp
    echo "Registry: MEMBERSHIP" >> ms.ucoin.tmp
    echo "Issuer: $fpr" >> ms.ucoin.tmp
    echo "Date: $date" >> ms.ucoin.tmp
    echo "Membership: IN" >> ms.ucoin.tmp
    $ucoin msvt-trailer >> ms.ucoin.tmp
    sign "cat ms.ucoin.tmp" > ms.ucoin.tmp.asc
    $ucoin update-membership --membership ms.ucoin.tmp.asc
    rm ms.ucoin.tmp
    rm ms.ucoin.tmp.asc
    ;;
  
  leave)
    currency=`$ucoin currency`
    echo "Version: 1" > ms.ucoin.tmp
    echo "Currency: $currency" >> ms.ucoin.tmp
    echo "Registry: MEMBERSHIP" >> ms.ucoin.tmp
    echo "Issuer: $fpr" >> ms.ucoin.tmp
    echo "Date: $date" >> ms.ucoin.tmp
    echo "Membership: OUT" >> ms.ucoin.tmp
    $ucoin msvt-trailer >> ms.ucoin.tmp
    sign "cat ms.ucoin.tmp" > ms.ucoin.tmp.asc
    $ucoin update-membership --membership ms.ucoin.tmp.asc
    rm ms.ucoin.tmp
    rm ms.ucoin.tmp.asc
    ;;
  
  voter)
    currency=`$ucoin currency`
    key=$2
    if [[ -z $key ]]; then
      key=$fpr
    fi
    echo "Version: 1" > voting.ucoin.tmp
    echo "Currency: $currency" >> voting.ucoin.tmp
    echo "Registry: VOTING" >> voting.ucoin.tmp
    echo "Issuer: $fpr" >> voting.ucoin.tmp
    echo "Date: $date" >> voting.ucoin.tmp
    $ucoin msvt-trailer >> voting.ucoin.tmp
    sign "cat voting.ucoin.tmp" > voting.ucoin.tmp.asc
    $ucoin update-voting --voting voting.ucoin.tmp.asc
    rm voting.ucoin.tmp
    rm voting.ucoin.tmp.asc
    ;;

  forge-transfer)
    if [[ -z $2 ]] || [[ -z $3 ]]; then
      echo "Bad command. Usage: $0 -u [user] forge-transfer <recipient> [<multiline comment>]" >&2
      exit 1
    fi
    if [[ ! -z $4 ]]; then
      comment="$4"
    fi
    sign "$ucoin forge-transfer --recipient $2 --pay $3 --sender $fpr"
    ;;

  forge-cert)
    if [ -z $user ]; then
      echo "Requires -u option."
      exit 1
    fi
    gpg -a --export $user
    ;;

  forge-join)
    sign "$ucoin forge-join"
    ;;

  forge-actu)
    sign "$ucoin forge-actu"
    ;;

  forge-leave)
    sign "$ucoin forge-leave"
    ;;

  forge-am)
    changes=""
    if $communityChanges; then
      changes=`cat`
    fi
    mchanges="$changes"
    vchanges=""
    if echo "$changes" | grep ";" > /dev/null; then
      mchanges=`echo $changes | sed -e "s/;.*//g"`
      vchanges=`echo $changes | sed -e "s/.*;//g"`
    fi
    $ucoin forge-amendment --mchanges "\"$mchanges\"" --vchanges "\"$vchanges\""
    ;;

  members)
    $ucoin members $2
    ;;

  **)
    echo "Bad command." >&2
    usage >&2
    exit 1
    ;;
esac
