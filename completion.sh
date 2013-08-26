_ucoin() 
{
  local cur prev opts base
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  #
  #  The basic options we'll complete.
  #
  opts="current contract lookup peering index vote-current vote-next send-pubkey send-join send-actu send-leave forge-vote forge-cert forge-join forge-actu forge-leave"


  #
  #  Complete the arguments to some of the basic commands.
  #
  case "${prev}" in
    current)
      ;;
    contract)
      ;;
    lookup)
      ;;
    peering)
      ;;
    index)
      ;;
    vote-current)
      ;;
    vote-next)
      ;;
    send-pubkey)
      COMPREPLY=($(compgen -W "`ls`" -- ${cur}))
      ;;
    send-join)
      COMPREPLY=($(compgen -W "`ls`" -- ${cur}))
      ;;
    send-actu)
      COMPREPLY=($(compgen -W "`ls`" -- ${cur}))
      ;;
    send-leave)
      COMPREPLY=($(compgen -W "`ls`" -- ${cur}))
      ;;
    forge-vote)
      ;;
    forge-cert)
      ;;
    forge-join)
      ;;
    forge-actu)
      ;;
    forge-leave)
      ;;
    upstatus)
      COMPREPLY=($(compgen -W "`ls`" -- ${cur}))
      ;;
    vote)
      COMPREPLY=($(compgen -W "`ls`" -- ${cur}))
      ;;
    *)
      COMPREPLY=($(compgen -W "${opts}" -- ${cur}))
      ;;
    esac

  return 0
}
complete -F _ucoin ucoin
