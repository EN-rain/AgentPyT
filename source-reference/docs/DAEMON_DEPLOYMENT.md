# Daemon Deployment Guide

> Run PyAgenT tasks continuously in production

## 🐧 Linux (systemd)

### 1. Create Service File

```bash
sudo tee /etc/systemd/system/pyagentt-daemon.service << 'EOF'
[Unit]
Description=PyAgenT Task Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=%I
WorkingDirectory=/home/%I/pyagentt
ExecStart=/home/%I/pyagentt/.venv/bin/pyagentt task daemon --all --poll-seconds 5 --default-interval-seconds 120
Restart=always
RestartSec=3
Environment=PYTHONUNBUFFERED=1
Environment=DS_CACHE_TTL_SECONDS=10

[Install]
WantedBy=multi-user.target
EOF
```

### 2. Configure for Your User

```bash
# Replace YOUR_USER with your actual username
sudo systemctl daemon-reload
sudo systemctl enable pyagentt-daemon@YOUR_USER
sudo systemctl start pyagentt-daemon@YOUR_USER
```

### 3. Monitor

```bash
# View logs
sudo journalctl -u pyagentt-daemon@YOUR_USER -f

# Check status
sudo systemctl status pyagentt-daemon@YOUR_USER

# Restart
sudo systemctl restart pyagentt-daemon@YOUR_USER
```

---

## 🪟 Windows (Task Scheduler)

### 1. Create Batch Script

Create `C:\PyAgenT\daemon.bat`:

```batch
@echo off
cd /d C:\PyAgenT
.venv\Scripts\pyagentt.exe task daemon --all --poll-seconds 5 --default-interval-seconds 120
```

### 2. Create Scheduled Task

**PowerShell (Admin):**

```powershell
$action = New-ScheduledTaskAction -Execute "C:\PyAgenT\daemon.bat" -WorkingDirectory "C:\PyAgenT"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "PyAgenT Daemon" -Action $action -Trigger $trigger -Settings $settings -Principal $principal

# Start immediately
Start-ScheduledTask -TaskName "PyAgenT Daemon"
```

### 3. Monitor

```powershell
# Check status
Get-ScheduledTask -TaskName "PyAgenT Daemon"

# View recent history
Get-ScheduledTaskInfo -TaskName "PyAgenT Daemon"
```

---

## 🍎 macOS (launchd)

### 1. Create LaunchDaemon

```bash
# For user-level daemon
mkdir -p ~/Library/LaunchAgents
cat > ~/Library/LaunchAgents/com.pyagentt.daemon.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pyagentt.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/YOUR_USER/pyagentt/.venv/bin/pyagentt</string>
        <string>task</string>
        <string>daemon</string>
        <string>--all</string>
        <string>--poll-seconds</string>
        <string>5</string>
        <string>--default-interval-seconds</string>
        <string>120</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USER/pyagentt</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USER/.pyagentt/daemon.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USER/.pyagentt/daemon.error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PYTHONUNBUFFERED</key>
        <string>1</string>
        <key>DS_CACHE_TTL_SECONDS</key>
        <string>10</string>
    </dict>
</dict>
</plist>
EOF
```

### 2. Load and Start

```bash
# Load
launchctl load ~/Library/LaunchAgents/com.pyagentt.daemon.plist

# Start
launchctl start com.pyagentt.daemon

# Check status
launchctl list | grep pyagentt
```

### 3. Monitor

```bash
# View logs
tail -f ~/.pyagentt/daemon.log

# View errors
tail -f ~/.pyagentt/daemon.error.log
```

---

## 📊 Operational Guidelines

### Task Status Management

| Status | Meaning | Action |
|--------|---------|--------|
| `todo` | Ready to run | Daemon will pick up |
| `running` | Currently executing | Wait for completion |
| `done` | Completed successfully | Review logs if needed |
| `blocked` | Error occurred | Investigate and unblock |

### Best Practices

1. **Test alerts before enabling**
   ```bash
   pyagentt task test-alert my-task --with-scan
   ```

2. **Review run history regularly**
   ```bash
   pyagentt task runs --limit 50
   ```

3. **Set appropriate intervals**
   - High-frequency: 60-120 seconds (risk of rate limits)
   - Standard: 300-600 seconds (recommended)
   - Low-frequency: 1800+ seconds (background monitoring)

4. **Monitor API health**
   ```bash
   pyagentt rate-stats
   ```

### Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Tasks not running | Daemon not started | Check service status |
| Rate limit errors | Too frequent | Increase intervals |
| Alerts not firing | Webhook misconfigured | Test with `task test-alert` |
| High memory usage | Too many tasks | Archive old runs |
| Duplicate alerts | Cooldown too low | Increase `cooldown_seconds` |

---

## 🔒 Security Considerations

1. **Run as unprivileged user** — Never run as root/admin
2. **Secure .env files** — Restrict permissions: `chmod 600 .env`
3. **Validate webhooks** — Use HTTPS URLs only
4. **Rotate API keys** — Regular key rotation for Moralis
5. **Monitor logs** — Watch for unusual activity
