#!/bin/bash

if [ "$(whoami)" = "root" ]; then
  cp -v ./completion.sh /etc/bash_completion.d/ucoin
fi
