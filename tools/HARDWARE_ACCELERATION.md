# Hardware Acceleration Verification

This guide helps verify that hardware acceleration is working correctly on PixelPlein kiosk displays.

## Prerequisites

Hardware acceleration requires:
1. ✅ **User in `video` group** - Access to GPU devices
2. ✅ **User in `render` group** - Access to GPU rendering (modern systems)
3. ✅ **X11 running** - Display server with DRI/DRM access
4. ✅ **GPU drivers loaded** - Kernel modules for GPU
5. ✅ **Chromium flags** - Enable GPU acceleration

All of these are configured by `tools/install.sh`.

## Quick Verification

### 1. Check User Groups

```bash
# As pixelplein user
groups

# Should output:
# pixelplein video audio plugdev netdev render
```

### 2. Check GPU Devices

```bash
ls -la /dev/dri/
# Should show: card0, renderD128 (or similar)

# Check permissions
ls -la /dev/dri/card0
# Should be: crw-rw---- 1 root video

# Verify user can access
sudo -u pixelplein test -r /dev/dri/card0 && echo "✓ GPU accessible" || echo "✗ GPU NOT accessible"
```

### 3. Check GPU Info

```bash
# Install mesa-utils if needed
apt-get install mesa-utils

# Check OpenGL renderer (as pixelplein user)
sudo -u pixelplein DISPLAY=:0 glxinfo | grep -i "renderer\|vendor"

# Expected output examples:
# Generic:    OpenGL renderer string: Mesa DRI Intel(R) HD Graphics
# Raspberry Pi: OpenGL renderer string: V3D 4.2
```

### 4. Check Chromium GPU Status

Once the kiosk is running, you can check GPU status:

**Method A: Via Chromium flags (if you can access it)**
1. Temporarily modify kiosk script to not use `--kiosk` mode
2. Navigate to `chrome://gpu`
3. Check "Graphics Feature Status" - should show "Hardware accelerated" for most features

**Method B: Via console logs**
```bash
# View kiosk logs and check for GPU messages
journalctl -u pixelplein-kiosk -n 100 | grep -i gpu

# Good signs:
# - "GPU process started"
# - "Using GPU device"
# - "GPU compositing on all pages enabled"

# Bad signs:
# - "GPU process launch failed"
# - "GPU disabled"
# - "Software rendering"
```

### 5. Check DRM/KMS Status

```bash
# Check if DRM/KMS is available
ls -la /dev/dri/

# Check loaded kernel modules
lsmod | grep -E "drm|i915|amdgpu|nouveau|vc4"

# Raspberry Pi should show: vc4
# Intel should show: i915, drm
# AMD should show: amdgpu, drm
```

## Platform-Specific Setup

### Raspberry Pi

**GPU Configuration** (done by install.sh):
```bash
# /boot/firmware/config.txt
gpu_mem=128
```

**Verify VC4 driver**:
```bash
lsmod | grep vc4
# Should show: vc4, drm_kms_helper, drm

dmesg | grep -i vc4
# Should show VC4 initialization messages
```

**Check GPU memory**:
```bash
vcgencmd get_mem gpu
# Should show: gpu=128M
```

### Intel (NUC / x86)

**Check i915 driver**:
```bash
lsmod | grep i915
# Should show: i915, drm, drm_kms_helper

dmesg | grep -i i915
# Should show GPU initialization
```

**Check GuC/HuC firmware** (modern Intel):
```bash
dmesg | grep -i "guc\|huc"
# GuC/HuC improve performance and power management
```

### AMD

**Check amdgpu driver**:
```bash
lsmod | grep amdgpu
# Should show: amdgpu, drm, drm_kms_helper

dmesg | grep -i amdgpu
```

## Chromium Flags Reference

Our kiosk script uses these GPU-related flags:

```bash
--ignore-gpu-blocklist       # Allow GPU even if blocklisted (embedded devices)
--enable-gpu-rasterization   # Use GPU for rasterization (faster rendering)
--enable-zero-copy           # Reduce memory copies (better performance)
```

**Flags we intentionally DO NOT use**:
- ❌ `--disable-gpu` - Would disable all GPU acceleration
- ❌ `--disable-software-rasterizer` - Would break fallback rendering
- ❌ `--disable-accelerated-2d-canvas` - Would disable canvas acceleration
- ❌ `--disable-accelerated-video-decode` - Would disable video decode acceleration

## Performance Testing

### 1. Canvas Performance Test

Create a test page with animated canvas:

```html
<!DOCTYPE html>
<html>
<head><title>Canvas Test</title></head>
<body>
<canvas id="c" width="1920" height="1080"></canvas>
<script>
const c = document.getElementById('c').getContext('2d');
let frame = 0;
function draw() {
  c.fillStyle = `hsl(${frame % 360}, 50%, 50%)`;
  c.fillRect(0, 0, 1920, 1080);
  for (let i = 0; i < 1000; i++) {
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(Math.random()*1920, Math.random()*1080, 50, 50);
  }
  frame++;
  requestAnimationFrame(draw);
}
draw();
</script>
</body>
</html>
```

**Expected**: Smooth 60fps animation

### 2. Video Decode Test

Play a 1080p H.264 video. Check CPU usage:

```bash
# While video is playing
top -u pixelplein

# With hardware decode: Chromium should use ~10-20% CPU
# Without hardware decode: Chromium will use 60-100% CPU
```

### 3. WebGL Test

Visit: `https://get.webgl.org/`

Should show: "Your browser supports WebGL"

Or test with:
```bash
# As pixelplein user
sudo -u pixelplein DISPLAY=:0 chromium-browser --new-window https://get.webgl.org/
```

## Troubleshooting

### Issue: GPU Not Detected

**Symptoms**:
- `glxinfo` shows "llvmpipe" (software renderer)
- `/dev/dri/card0` missing or inaccessible

**Solutions**:
```bash
# Check if GPU driver modules are loaded
lsmod | grep -E "drm|i915|amdgpu|vc4|nouveau"

# If missing, load module manually (example for Raspberry Pi)
sudo modprobe vc4

# Make permanent
echo "vc4" | sudo tee -a /etc/modules

# Reboot
sudo reboot
```

### Issue: Permission Denied on /dev/dri

**Symptoms**:
- `/dev/dri/card0` exists but not accessible
- Error: "Failed to open DRM device"

**Solutions**:
```bash
# Check user groups
groups pixelplein

# Add to video group if missing
sudo usermod -aG video pixelplein

# Add to render group if missing (modern systems)
sudo usermod -aG render pixelplein

# Log out and back in (or reboot)
sudo reboot
```

### Issue: GPU Blocklisted

**Symptoms**:
- Chromium logs: "GPU blocklisted"
- Software rendering despite working GPU

**Solution**:
Our kiosk script already uses `--ignore-gpu-blocklist`, but verify:
```bash
grep "ignore-gpu-blocklist" /opt/pixelplein/tools/pixelplein-kiosk.sh
```

### Issue: Raspberry Pi Black Screen

**Symptoms**:
- Screen goes black after boot
- No X11 session

**Solutions**:
```bash
# Check GPU memory allocation
grep gpu_mem /boot/firmware/config.txt
# Should be: gpu_mem=128

# If missing, add it
echo "gpu_mem=128" | sudo tee -a /boot/firmware/config.txt
sudo reboot

# Check vc4 driver (fkms or kms)
grep dtoverlay /boot/firmware/config.txt
# Should have: dtoverlay=vc4-kms-v3d or dtoverlay=vc4-fkms-v3d

# Try fkms if kms doesn't work
sudo sed -i 's/vc4-kms-v3d/vc4-fkms-v3d/' /boot/firmware/config.txt
sudo reboot
```

### Issue: Intel GPU Not Working

**Symptoms**:
- Software rendering on Intel hardware
- `lsmod | grep i915` shows nothing

**Solutions**:
```bash
# Load i915 module
sudo modprobe i915

# Make permanent
echo "i915" | sudo tee -a /etc/modules

# Check kernel parameters
cat /proc/cmdline
# Should NOT have: i915.modeset=0

# Update grub if needed (x86)
sudo nano /etc/default/grub
# Add: GRUB_CMDLINE_LINUX="i915.modeset=1"
sudo update-grub
sudo reboot
```

### Issue: Poor Video Performance

**Symptoms**:
- High CPU usage during video playback
- Stuttering/dropped frames

**Check video decode acceleration**:
```bash
# Install vainfo (Intel/AMD)
apt-get install vainfo

# Check VA-API support (as pixelplein user)
sudo -u pixelplein DISPLAY=:0 vainfo

# Expected output:
# - VA-API version
# - VAProfile list (H264, VP8, etc.)

# For Raspberry Pi, check V4L2 (kernel 6.1+)
ls -la /dev/video*
```

**Enable VA-API in Chromium** (if not working):
Edit kiosk script to add:
```bash
--enable-features=VaapiVideoDecoder \
--enable-accelerated-video-decode \
```

## Benchmarking

### FPS Counter

Temporarily enable FPS counter in kiosk:
```bash
# Edit kiosk script to add:
--show-fps-counter \
```

### GPU Process Monitoring

```bash
# Watch GPU usage
watch -n 1 'sudo -u pixelplein DISPLAY=:0 glxinfo | grep "OpenGL renderer"'

# Watch CPU usage
watch -n 1 'top -bn1 | grep chromium'
```

### Chrome Tracing

For detailed performance analysis:
1. Modify kiosk to enable remote debugging:
   ```bash
   --remote-debugging-port=9222 \
   ```
2. From another machine: `http://kiosk-ip:9222`
3. Use Chrome DevTools → Performance tab

## Expected Performance

### With Hardware Acceleration ✅

- **Idle CPU**: 5-15%
- **Photo transitions**: 10-25% CPU
- **Video playback (1080p)**: 10-30% CPU
- **Smooth 60fps**: Yes
- **`glxinfo` renderer**: Hardware GPU (Intel HD, V3D, AMDGPU)

### Without Hardware Acceleration ❌

- **Idle CPU**: 20-40%
- **Photo transitions**: 40-70% CPU
- **Video playback (1080p)**: 70-100% CPU
- **Smooth 60fps**: No (drops to 20-40fps)
- **`glxinfo` renderer**: llvmpipe (software)

## See Also

- [Chromium GPU Flags](https://peter.sh/experiments/chromium-command-line-switches/#gpu)
- [Raspberry Pi VC4 Driver](https://www.raspberrypi.com/documentation/computers/config_txt.html#vc4)
- [Intel i915 Driver](https://wiki.archlinux.org/title/Intel_graphics)
- [VA-API](https://wiki.archlinux.org/title/Hardware_video_acceleration)
