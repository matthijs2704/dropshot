#!/bin/bash
# Start PixelPlein screen services after install.
set -euo pipefail

PROVISIONER_URL=http://127.0.0.1:3987

if [[ $EUID -ne 0 ]]; then
	echo "ERROR: Run as root: sudo pixelplein-start" >&2
	exit 1
fi

echo "Starting PixelPlein services..."
systemctl daemon-reload
systemctl start pixelplein-provisioner
systemctl start pixelplein-kiosk

echo ""
echo "Service status:"
systemctl --no-pager --lines=0 status pixelplein-provisioner pixelplein-kiosk || true

echo ""
if systemctl is-active --quiet pixelplein-kiosk; then
	echo "Kiosk service is running. Cage/Wayland should own tty1 shortly."
else
	echo "Kiosk service is not active yet."
	echo "On a fresh install, reboot once so tty/session permissions are clean:"
	echo "  sudo reboot"
fi

echo ""
echo "Provisioner:"
echo "  ${PROVISIONER_URL}"
echo ""
echo "Logs:"
echo "  journalctl -u pixelplein-provisioner -f"
echo "  journalctl -u pixelplein-kiosk -f"
