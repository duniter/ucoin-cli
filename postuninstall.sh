echo "Remove bash completion script..."
COMPFILE=/etc/bash_completion.d/ucoin
if [ -e $COMPFILE ] && [ -f $COMPFILE ]; then
  echo "Remove $COMPFILE"
  rm $COMPFILE
fi
