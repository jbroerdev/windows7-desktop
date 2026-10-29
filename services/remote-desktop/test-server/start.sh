#!/bin/sh
set -eu
mkdir -p /run/xrdp /run/dbus
dbus-daemon --system --fork
/usr/sbin/xrdp-sesman
exec /usr/sbin/xrdp --nodaemon
