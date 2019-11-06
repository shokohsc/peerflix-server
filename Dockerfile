FROM asapach/peerflix-server

USER root
RUN apk add --no-cache curl
USER app
