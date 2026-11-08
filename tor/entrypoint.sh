#!/bin/sh
# The hidden service keys come from the previous image (other uid): hand them to the "tor" user,
# with the permissions tor requires (700 on the directories), then drop root and start tor.
set -eu
HS=/var/lib/tor/hidden_service/frontend
mkdir -p "$HS" /var/lib/tor/data
chown -R tor:tor /var/lib/tor
chmod 700 /var/lib/tor/hidden_service "$HS" /var/lib/tor/data
exec su-exec tor tor -f /etc/tor/torrc
