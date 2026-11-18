#!/bin/sh
set -eu

# Railway mounts the volume after the image is built, before this entrypoint runs.
uploads=/app/cms/public/uploads
mkdir -p "$uploads"
if [ "$(id -u)" -eq 0 ]; then
  chown node:node "$uploads"
  exec gosu node:node "$@"
fi
exec "$@"
