#!/bin/bash

usage()
{
cat << EOF

  usage: $0 [options] command

  This script allow to forge HDC documents in accordance with a uCoin server data.

  Commands:

    forge-vote    Forge and sign the current amendment
    forge-cert    Forge and sign a public key request
    forge-join    Forge and sign a joining membership
    forge-actu    Forge and sign an actualizing membership
    forge-leave   Forge and sign a leaving membership
    current       Show current amendment of the contract
    contract      List all amendments constituting the contract
    lookup        Search for a public key
    peering       Show peering informations
    upstatus      Send a membership request
    vote          Send a vote request
    index         List reiceved votes count for each amendment

    send-pubkey [file]  Send a public key to a uCoin server. The file must contain the public key in ASCII armor format,
                        followed by a signature of it in ASCII armored format too. This file may be obtained with 
                        'forge-cert' command. If [file] is not provided, it is read from STDIN.

  Options:
    -s  uCoin server to look data in
    -p  uCoin server port
    -u  PGP key to use for signature
    -d  Universal Dividend to apply with forge-vote
    -m  Minimal coin 10 power to apply with forge-vote
    -n  In conjunction with forge-vote: will forge vote for next amendment
    -h  Help

EOF
}

SERVER=
PORT=
user=
dividend=
mincoin=
next=false
while getopts :hs:p:u:d:m:n OPT; do
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

cwd=`echo $0 | sed -e "s/\(.*\)\/\([^\/]*\)/\1/g"`
cwd="`pwd`/$cwd"
cmd="$1"
vucoin="$cwd/ucoin"

if [ ! -z $SERVER ]; then
  vucoin="$vucoin -h $SERVER"
fi

if [ ! -z $PORT ]; then
  vucoin="$vucoin -p $PORT"
fi

sign()
{
  # If signature requires user
  command=$@
  if [ ! -z $user ]; then
    uuser="-u $user"
  fi
  forged=`$command`
  # Signature only if no error happened
  if [ $? -eq 0 ]; then
    signed="`echo '$forged' | unix2dos | gpg -s -a $uuser --batch | unix2dos`"
    echo "$forged" | unix2dos
    echo "$signed" | unix2dos
  fi
}

case "$cmd" in
  
  upstatus)
    # Must have a readable file parameter
    if [ -z $2 ] || [ ! -e $2 ] || [ ! -r $2 ]; then
      echo "Parameter must be a readable file" >&2
      exit 1
    fi
    echo "`$vucoin join --membership $2`"
    ;;
  
  vote)
    # Must have a readable file parameter
    if [ -z $2 ] || [ ! -e $2 ] || [ ! -r $2 ]; then
      echo "Parameter must be a readable file" >&2
      exit 1
    fi
    echo "`$vucoin vote --votefile $2`"
    ;;
  
  send-pubkey)
    pubkey=""
    if [ ! -z $user ]; then
      # Read from selfcall
      pubkey=`$0 -u $user forge-cert`
    elif [ -z $2 ]; then
      # Read from STDIN
      pubkey=`cat`
    elif [ ! -e $2 ] || [ ! -r $2 ]; then
      # Read from file
      if [ ! -e $2 ];then
        echo "File does not exist" >&2;
      elif [ ! -r $2 ];then
        echo "File must be readable" >&2;
      fi
      exit 1
    else
      pubkey=`cat $2`
    fi
    echo "$pubkey" > pubkey.ucoin.tmp
    echo "`$vucoin pks-add --key pubkey.ucoin.tmp`"
    rm pubkey.ucoin.tmp
    ;;
  
  lookup)
    # Must have a search parameter
    if [ -z $2 ]; then
      echo "Need a search parameter" >&2
      exit 1
    fi
    echo "`$vucoin pks-lookup --search $2`"
    ;;
  
  contract)
    echo "`$vucoin am-contract`"
    ;;
  
  current)
    echo "`$vucoin am-current`"
    ;;
  
  index)
    echo "`$vucoin index`"
    ;;
  
  peering)
    echo "`$vucoin peer`"
    ;;

  forge-vote)
    cmd=
    if $next ; then
      cmd="$vucoin forge-amendment"
      if [ ! -z $dividend ]; then
        cmd="$cmd --dividend $dividend"
      fi
      if [ ! -z $mincoin ]; then
        cmd="$cmd --mincoin $mincoin"
      fi
    else
      cmd="$vucoin am-current"
    fi
    sign "$cmd"
    ;;

  forge-cert)
    if [ -z $user ]; then
      echo "Requires -u option."
      exit 1
    fi
    sign "gpg -a --export $user"
    ;;

  forge-join)
    sign "$vucoin forge-join"
    ;;

  forge-actu)
    sign "$vucoin forge-actu"
    ;;

  forge-leave)
    sign "$vucoin forge-leave"
    ;;

  **)
    echo "Bad command." >&2
    usage >&2
    exit 1
    ;;
esac
