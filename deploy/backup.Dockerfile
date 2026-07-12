FROM alpine:3.20
RUN apk add --no-cache postgresql16-client bash tzdata dcron
WORKDIR /app
COPY scripts/backup.sh /app/scripts/backup.sh
RUN chmod +x /app/scripts/backup.sh
COPY deploy/backup-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
