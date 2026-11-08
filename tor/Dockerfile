# Tor hidden service for fs0ciety (replaces the unmaintained goldy/tor-hidden-service:latest).
# Alpine pinned, tor from the Alpine repository (maintained, security updates on each rebuild).
FROM alpine:3.22
RUN apk add --no-cache tor su-exec \
 && mkdir -p /var/lib/tor/data /var/lib/tor/hidden_service
COPY torrc /etc/tor/torrc
COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh
# Starts as root only to fix the ownership of the existing volume, then runs tor as the "tor" user.
ENTRYPOINT ["/entrypoint.sh"]
