#!/bin/bash

usage()
{
cat << EOF

  usage: $0 [options] command

  This script allow to forge HDC documents in accordance with a uCoin server data.

  Commands:

    Top level:

      current             Show current amendment of the contract
      contract            List all amendments constituting the contract
      lookup              Search for a public key
      peering             Show peering informations
      index               List reiceved votes count for each amendment
      tx-issue            Issue new coins

      vote-current [num]  Send a vote according for current amendment of a uCoin server.
      vote-next [num]     Send a vote for next amendment according to a uCoin server\'s state.

                          If [num] is provided, check the vote actually is about amendment
                          number [num] before signing and sending it (as server\'s contract
                          may have evolved between during process).

      send-pubkey [file]  Send signed public key [file] to a uCoin server.
      send-join [file]    Send join request [file] to a uCoin server.
      send-actu [file]    Send actu request [file] to a uCoin server.
      send-leave [file]   Send leave request [file] to a uCoin server.

                          If -u option is provided, [file] is ommited.
                          If [file] is not provided, it is read from STDIN.
                          Note: [file] may be forged using 'forge-*' commands.

    Lower level:

    forge-amendment Forge and sign the next amendment
    forge-vote      Forge and sign the current amendment
    forge-cert      Forge and sign a public key request
    forge-join      Forge and sign a joining membership
    forge-actu      Forge and sign an actualizing membership
    forge-leave     Forge and sign a leaving membership
    forge-issuance  Forge and sign an issuance transaction
    forge-transfert Forge and sign a transfert transaction
    upstatus        Send a membership request
    vote            Send a vote request

  Options:
    -s  uCoin server to look data in
    -p  uCoin server port
    -u  PGP key to use for signature
    -d  Universal Dividend to apply with forge-vote
    -m  Minimal coin 10 power to apply with forge-vote
    -n  In conjunction with forge-vote: will forge vote for next amendment
    -v  Verbose mode
    -h  Help

EOF
}

SERVER=
PORT=
user=
dividend=
mincoin=
next=false
verbose=false
comment=
while getopts :hs:p:u:d:m:nv OPT; do
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
  echo "Need a command."
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
    if $verbose; then
      echo "Does not match '$2'" >&2
      echo "$forged" >&2
    fi
    exit 1
  fi
  # Signature only if no error happened
  if [ $? -eq 0 ]; then
    signed="`echo '$forged' | unix2dos | gpg -s -a $uuser | unix2dos`"
    echo "$forged" | unix2dos
    echo "$signed" | unix2dos
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
  
  tx-issue)
    $ucoinsh -u $user forge-issuance $2 $3 $4 $5 > issuance.ucoin.tmp
    if [ $? -eq 0 ]; then
      $ucoin issue --transaction issuance.ucoin.tmp
    fi
    rm issuance.ucoin.tmp
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
    if [[ -z $2 ]] || [[ -z $3 ]] || [[ -z $4 ]]; then
      echo "Bad command. Usage: $0 -u [user] forge-issuance [amendment number] [amendment hash] coin1base,coin1pow[,...] [multiline comment]"
      exit 1
    fi
    if [[ ! -z $5 ]]; then
      comment="$5"
    fi
    sign "$ucoin forge-issuance $2 $3 --coins $4 --sender $fpr" "ISSUANCE"
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
    if [[ -z $2 ]] || [[ -z $3 ]] || [[ -z $4 ]]; then
      echo "Bad command. Usage: $0 -u [user] forge-issuance [recipient] issuer,number[,...] [multiline comment]"
      exit 1
    fi
    if [[ ! -z $4 ]]; then
      comment="$4"
    fi
    sign "$ucoin forge-transfert --recipient $2 --transfert $3 --sender $fpr" "TRANSFERT"
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