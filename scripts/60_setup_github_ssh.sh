#!/usr/bin/env bash
set -euo pipefail

mkdir -p /root/.ssh
if [ ! -f /root/.ssh/id_ed25519 ]; then
  ssh-keygen -t ed25519 -C "srv925512-pwlos" -f /root/.ssh/id_ed25519 -N ""
fi

eval "$(ssh-agent -s)"
ssh-add /root/.ssh/id_ed25519

echo "----- COPY THIS KEY INTO GITHUB (Settings -> SSH keys) -----"
cat /root/.ssh/id_ed25519.pub
echo "-----------------------------------------------------------"
echo "After adding the key in GitHub, run: ssh -T git@github.com"
