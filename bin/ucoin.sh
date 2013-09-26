#!/bin/bash

usage()
{
cat > /dev/stderr <<-EOF

  usage: $0 [-s server] [-p port] [-u pgpuser] [options] command
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] tx-issue <#amendment> <coins> [<comment>]
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] tx-transfert <recipient> [<comment>]
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] tx-fusion [<comment>]
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] clist [limit]
  usage: $0 [-s server] [-p port] [-u pgpuser] [options] cget <amount[:...]>

  Forge and send HDC documents to a uCoin server.

  Commands:

    current             Show current amendment of the contract
    contract            List all amendments constituting the contract
    lookup              Search for a public key
    peering             Show peering informations
    pubkey              Show pubkey of remote node
    index               List reiceved votes count for each amendment
    issue               Issue new coins
    transfert           Transfert property of coins (coins a read from STDIN)
    fusion              Fusion coins to make a bigger coin (coins a read from STDIN)

    clist               List coins of given user. May be limited by upper amount.
    cget                Get coins for given values in user account.

    vote-current [num]  Send a vote according for current amendment of a uCoin server.
    vote-next [num]     Send a vote for next amendment according to a uCoin server's state.

                        If [num] is provided, check the vote actually is about amendment
                        number [num] before signing and sending it (as server's contract
                        may have evolved between during process).

    send-pubkey [file]  Send signed public key [file] to a uCoin server.
    send-join [file]    Send join request [file] to a uCoin server.
    send-actu [file]    Send actu request [file] to a uCoin server.
    send-leave [file]   Send leave request [file] to a uCoin server.

                        If -u option is provided, [file] is ommited.
                        If [file] is not provided, it is read from STDIN.
                        Note: [file] may be forged using 'forge-*' commands.

  Options:
    -s server     uCoin server to look data in [default 'localhost']
    -p port       uCoin server port [default '8081']
    -u user       PGP key to use for signature
    -d dividend   Universal Dividend to apply with forge-vote
    -m power10    Minimal coin 10 power to apply with forge-vote
    -n            In conjunction with forge-vote: will forge vote for next amendment
    -v            Verbose mode
    -h            Help

EOF
}

SERVER=
PORT=
user=
dividend=
mincoin=
next=false
verbose=false
DEBUG=false
comment=
while getopts :hs:p:u:d:m:nvD OPT; do
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
      next=true
      ;;
    v)
      verbose=true
      ;;
    D)
      DEBUG=true
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
fi

if [ ! -z $mincoin ]; then
  ucoinsh="$ucoinsh -m $mincoin"
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
    gpg -s -a $uuser forge.ucoin.tmp >> forge.ucoin.tmp
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

case "$cmd" in
  
  pubkey)
    $ucoin pubkey 2> /dev/null
    ;;
  
  upstatus)
    # Must have a readable file parameter
    if [ -z $2 ] || [ ! -e $2 ] || [ ! -r $2 ]; then
      echo "Parameter must be a readable file" >&2
      exit 1
    fi
    echo "`$ucoin join --membership $2`"
    ;;
  
  vote)
    # Must have a readable file parameter
    if [ -z $2 ] || [ ! -e $2 ] || [ ! -r $2 ]; then
      echo "Parameter must be a readable file" >&2
      exit 1
    fi
    echo "`$ucoin vote --votefile $2`"
    ;;
  
  vote-current)
    if [[ ! -z $user ]]; then
      user="-u $user"
    fi
    current=`$ucoinsh $user forge-vote $2`
    if ! echo "$current" | grep "Does not match" > /dev/null ; then
      echo "$current" > current.ucoin.tmp
      echo "`$ucoinsh vote current.ucoin.tmp`"
      rm current.ucoin.tmp
    fi
    ;;
  
  vote-next)
    if [[ ! -z $user ]]; then
      user="-u $user"
    fi
    next=`$ucoinsh $user -n forge-vote $2`
    if ! echo "$current" | grep "Does not match" > /dev/null ; then
      echo "$next" > next.ucoin.tmp
      echo "`$ucoinsh vote next.ucoin.tmp`"
      rm next.ucoin.tmp
    fi
    ;;
  
  send-pubkey)
    pubkey=`fromFileOrForge forge-cert $2`
    echo "$pubkey" > pubkey.ucoin.tmp
    echo "`$ucoin pks-add --key pubkey.ucoin.tmp`"
    rm pubkey.ucoin.tmp
    ;;
  
  send-join)
    join=`fromFileOrForge forge-join $2`
    echo "$join" > join.ucoin.tmp
    echo "`$ucoin join --membership join.ucoin.tmp`"
    rm join.ucoin.tmp
    ;;
  
  send-actu)
    join=`fromFileOrForge forge-actu $2`
    echo "$join" > join.ucoin.tmp
    echo "`$ucoin join --membership join.ucoin.tmp`"
    rm join.ucoin.tmp
    ;;
  
  send-leave)
    join=`fromFileOrForge forge-leave $2`
    echo "$join" > join.ucoin.tmp
    echo "`$ucoin join --membership join.ucoin.tmp`"
    rm join.ucoin.tmp
    ;;
  
  issue)
      $DEBUG && $ucoinsh -u $user forge-issuance $2 $3 $4 > issuance.ucoin.tmp
    ! $DEBUG && $ucoinsh -u $user forge-issuance $2 $3 $4 > issuance.ucoin.tmp
    if [ $? -eq 0 ]; then
      $ucoin issue --transaction issuance.ucoin.tmp
    fi
    rm issuance.ucoin.tmp
    ;;
  
  transfert)
    coins=`cat`
      $DEBUG && $ucoinsh -u $user forge-transfert $2 $3 $coins > transfert.ucoin.tmp
    ! $DEBUG && $ucoinsh -u $user forge-transfert $2 $3 $coins > transfert.ucoin.tmp
    if [ $? -eq 0 ]; then
      $ucoin transfert --transaction transfert.ucoin.tmp
    fi
    rm transfert.ucoin.tmp
    ;;
  
  fusion)
    coins=`cat`
      $DEBUG && $ucoinsh -u $user forge-fusion $coins $2 > fusion.ucoin.tmp
    ! $DEBUG && $ucoinsh -u $user forge-fusion $coins $2 > fusion.ucoin.tmp
    if [ $? -eq 0 ]; then
      $ucoin fusion --transaction fusion.ucoin.tmp
    fi
    rm fusion.ucoin.tmp
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
    if [ -z $user ]; then
      echo "Requires -u option."
      exit 1
    fi
    fpr=`gpg --fingerprint $user | grep = | sed -e "s/.*= //g" | sed -e "s/ //g"`
    if [ -z $fpr ]; then
      exit 1
    fi
    $ucoin coins-list $fpr $2
    ;;
  
  cget)
    if [ -z $user ]; then
      echo "Requires -u option."
      exit 1
    fi
    fpr=`gpg --fingerprint $user | grep = | sed -e "s/.*= //g" | sed -e "s/ //g"`
    if [ -z $fpr ]; then
      exit 1
    fi
    $ucoin coins-get $fpr --pay $2
    ;;

  forge-vote)
    cmd=
    if $next ; then
      cmd="$ucoin forge-amendment"
      if [ ! -z $dividend ]; then
        cmd="$cmd --dividend $dividend"
      fi
      if [ ! -z $mincoin ]; then
        cmd="$cmd --mincoin $mincoin"
      fi
    else
      cmd="$ucoin am-current"
    fi
    sign "$cmd" "Number: $2"
    ;;

  forge-issuance)
    if [ -z $user ]; then
      echo "Requires -u option."
      exit 1
    fi
    fpr=`gpg --fingerprint $user | grep = | sed -e "s/.*= //g" | sed -e "s/ //g"`
    if [ -z $fpr ]; then
      exit 1
    fi
    if [[ -z $2 ]] || [[ -z $3 ]]; then
      $verbose && echo "Bad command. Usage: $0 -u [user] forge-issuance <#amendment> <coin1base,coin1pow[,...]> [<multiline comment>]"
      exit 1
    fi
    if [[ ! -z $4 ]]; then
      comment="$4"
    fi
    sign "$ucoin forge-issuance $2 --coins $3 --sender $fpr" "ISSUANCE"
    ;;

  forge-transfert)
    if [ -z $user ]; then
      echo "Requires -u option."
      exit 1
    fi
    fpr=`gpg --fingerprint $user | grep = | sed -e "s/.*= //g" | sed -e "s/ //g"`
    if [ -z $fpr ]; then
      exit 1
    fi
    if [[ -z $2 ]] || [[ -z $3 ]]; then
      $verbose && echo "Bad command. Usage: $0 -u [user] forge-transfert <recipient> [<multiline comment>]" >&2
      exit 1
    fi
    if [[ ! -z $4 ]]; then
      comment="$4"
    fi
    sign "$ucoin forge-transfert --recipient $2 --pay $3 --sender $fpr" "TRANSFERT"
    ;;

  forge-fusion)
    if [ -z $user ]; then
      echo "Requires -u option."
      exit 1
    fi
    fpr=`gpg --fingerprint $user | grep = | sed -e "s/.*= //g" | sed -e "s/ //g"`
    if [ -z $fpr ]; then
      exit 1
    fi
    if [[ -z $2 ]]; then
      $verbose && echo "Bad command. Usage: $0 -u [user] forge-fusion <coin1base,coin1pow[,...]> [<multiline comment>]"
      exit 1
    fi
    if [[ ! -z $3 ]]; then
      comment="$3"
    fi
    sign "$ucoin forge-fusion --pay $2 --sender $fpr" "FUSION"
    ;;

  forge-cert)
    if [ -z $user ]; then
      echo "Requires -u option."
      exit 1
    fi
    sign "gpg -a --export $user"
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

  forge-amendment)
    sign "$ucoin forge-amendment"
    ;;

  **)
    echo "Bad command." >&2
    usage >&2
    exit 1
    ;;
esac