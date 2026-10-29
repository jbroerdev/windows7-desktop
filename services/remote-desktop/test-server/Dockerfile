# Disposable integration fixture. No published ports; never use as a real desktop.
FROM debian:bookworm-slim
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends xrdp xorgxrdp xterm dbus-x11 && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash rdptest \
    && echo 'rdptest:isolated-test-only' | chpasswd \
    && echo 'exec xterm' > /home/rdptest/.xsession \
    && chown rdptest:rdptest /home/rdptest/.xsession \
    && adduser xrdp ssl-cert
COPY start.sh /start.sh
CMD ["sh","/start.sh"]
