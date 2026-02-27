# Database Backup System

Automated PostgreSQL backup and restore system for ClinicalVision AI.

## Features

- ✅ **Automated Daily Backups** via systemd timer
- ✅ **Compressed Backups** using gzip
- ✅ **Integrity Verification** with SHA-256 checksums
- ✅ **Retention Policy** (30 days, max 90 backups)
- ✅ **Metadata Tracking** for each backup
- ✅ **Safe Restore** with pre-restore safety backup
- ✅ **Logging** via systemd journal

## Quick Start

### Manual Backup

```bash
# Create backup in default location (./backups)
./scripts/backup_database.sh

# Create backup in custom location
./scripts/backup_database.sh /path/to/backup/directory
```

### Manual Restore

```bash
# Interactive restore (will prompt for confirmation)
./scripts/restore_database.sh backups/clinicalvision_20260113_120000.sql.gz

# Force restore without confirmation (use with caution!)
./scripts/restore_database.sh backups/clinicalvision_20260113_120000.sql.gz --force
```

## Automated Backups Setup

### Installation (Production)

1. **Copy systemd files:**
```bash
sudo cp scripts/clinicalvision-backup.service /etc/systemd/system/
sudo cp scripts/clinicalvision-backup.timer /etc/systemd/system/
```

2. **Edit service file paths:**
```bash
sudo nano /etc/systemd/system/clinicalvision-backup.service

# Update these paths to match your installation:
# WorkingDirectory=/opt/clinicalvision/backend
# EnvironmentFile=/opt/clinicalvision/backend/.env
# ExecStart=/opt/clinicalvision/backend/scripts/backup_database.sh /var/backups/clinicalvision
```

3. **Create backup directory:**
```bash
sudo mkdir -p /var/backups/clinicalvision
sudo chown clinicalvision:clinicalvision /var/backups/clinicalvision
sudo chmod 750 /var/backups/clinicalvision
```

4. **Enable and start timer:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable clinicalvision-backup.timer
sudo systemctl start clinicalvision-backup.timer
```

5. **Verify timer is active:**
```bash
sudo systemctl status clinicalvision-backup.timer
sudo systemctl list-timers --all | grep clinicalvision
```

### Testing the Service

```bash
# Test backup service manually
sudo systemctl start clinicalvision-backup.service

# Check status
sudo systemctl status clinicalvision-backup.service

# View logs
sudo journalctl -u clinicalvision-backup.service -n 50
```

## Backup Schedule

Default schedule: **Daily at 2:00 AM**

- Runs 15 minutes after system boot (if powered off during scheduled time)
- Has 0-30 minute randomized delay to avoid load spikes
- Persistent (catches up if system was offline)

### Customizing Schedule

Edit the timer file to change schedule:

```bash
sudo nano /etc/systemd/system/clinicalvision-backup.timer
```

Examples:
- **Every 6 hours:** `OnCalendar=*-*-* 00,06,12,18:00:00`
- **Twice daily:** `OnCalendar=*-*-* 02,14:00:00`
- **Weekly:** `OnCalendar=Sun 02:00:00`

After changes:
```bash
sudo systemctl daemon-reload
sudo systemctl restart clinicalvision-backup.timer
```

## Backup Format

Each backup creates three files:

1. **Backup file:** `clinicalvision_YYYYMMDD_HHMMSS.sql.gz`
   - Compressed SQL dump
   - Plain format (human-readable when decompressed)
   - No ownership/ACL information (portable)

2. **Checksum file:** `clinicalvision_YYYYMMDD_HHMMSS.sql.gz.sha256`
   - SHA-256 hash for integrity verification
   - Format: `<hash>  <filename>`

3. **Metadata file:** `clinicalvision_YYYYMMDD_HHMMSS.sql.gz.meta`
   - JSON with backup details
   - Timestamp, database info, size, checksum
   - Postgres version used

## Retention Policy

**Default Settings:**
- Keep backups for **30 days**
- Maximum **90 backups** total
- Oldest backups removed first when limit exceeded

**Customizing Retention:**

Edit `scripts/backup_database.sh`:
```bash
RETENTION_DAYS=30   # Change retention period
MAX_BACKUPS=90      # Change maximum backup count
```

## Restore Process

The restore script:

1. Verifies backup integrity (checksum)
2. Shows backup metadata
3. Prompts for confirmation (unless `--force`)
4. Creates safety backup of current database
5. Terminates existing connections
6. Drops and recreates database
7. Restores from backup
8. Verifies restoration (table count check)
9. Rolls back to safety backup if restore fails

## Monitoring

### View Backup Logs

```bash
# Recent logs
sudo journalctl -u clinicalvision-backup.service -n 100

# Follow live logs
sudo journalctl -u clinicalvision-backup.service -f

# Today's logs
sudo journalctl -u clinicalvision-backup.service --since today
```

### List Backups

```bash
# List all backups with details
ls -lh /var/backups/clinicalvision/

# Count backups
ls /var/backups/clinicalvision/*.sql.gz | wc -l

# Total backup size
du -sh /var/backups/clinicalvision/
```

### Verify Backup Integrity

```bash
# Verify checksum
cd /var/backups/clinicalvision/
sha256sum -c clinicalvision_20260113_120000.sql.gz.sha256

# View metadata
cat clinicalvision_20260113_120000.sql.gz.meta
```

## Troubleshooting

### Backup Fails

1. **Check database connectivity:**
```bash
psql -h localhost -U clinicalvision -d clinicalvision -c "SELECT version();"
```

2. **Check disk space:**
```bash
df -h /var/backups/clinicalvision/
```

3. **Check permissions:**
```bash
ls -la /var/backups/clinicalvision/
```

4. **View detailed logs:**
```bash
sudo journalctl -u clinicalvision-backup.service -n 200 --no-pager
```

### Restore Fails

1. **Verify backup integrity:**
```bash
sha256sum -c backup_file.sql.gz.sha256
```

2. **Check backup format:**
```bash
gunzip -c backup_file.sql.gz | head -n 20
```

3. **Verify database exists:**
```bash
psql -h localhost -U postgres -c "\l"
```

4. **Check for connection errors:**
```bash
cat /tmp/restore_log.txt
```

## Security Considerations

- Backups contain **sensitive patient data** - store securely
- Restrict backup directory permissions: `750` or `700`
- Consider **encrypting** backups for additional security:
  ```bash
  # Encrypt backup
  gpg --symmetric --cipher-algo AES256 backup_file.sql.gz
  
  # Decrypt backup
  gpg --decrypt backup_file.sql.gz.gpg > backup_file.sql.gz
  ```
- Use **separate storage** for production backups (not same server)
- Implement **offsite backups** for disaster recovery

## Advanced Usage

### Backup to Remote Storage

```bash
# Backup and upload to S3
./scripts/backup_database.sh /tmp/backup && \
  aws s3 cp /tmp/backup/*.sql.gz s3://my-backups/clinicalvision/

# Backup and rsync to remote server
./scripts/backup_database.sh ./backups && \
  rsync -avz ./backups/ user@backup-server:/backups/clinicalvision/
```

### Automated Testing

```bash
# Test backup and restore in loop
for i in {1..5}; do
  echo "Test iteration $i"
  ./scripts/backup_database.sh /tmp/test_backup
  LATEST=$(ls -t /tmp/test_backup/*.sql.gz | head -1)
  ./scripts/restore_database.sh "$LATEST" --force
  echo "Test $i completed"
done
```

### Custom Backup Script

```bash
#!/bin/bash
# custom_backup.sh - Backup with notifications

# Run backup
if ./scripts/backup_database.sh /var/backups/clinicalvision; then
  echo "Backup successful" | mail -s "Backup OK" admin@example.com
else
  echo "Backup failed!" | mail -s "BACKUP FAILED" admin@example.com
fi
```

## Maintenance

### Monthly Tasks

- [ ] Verify backups are being created
- [ ] Check backup sizes (should be consistent)
- [ ] Test restore process with latest backup
- [ ] Review retention policy (adjust if needed)
- [ ] Check disk space on backup storage

### Quarterly Tasks

- [ ] Perform test restore to staging environment
- [ ] Verify backup checksums
- [ ] Review and update backup documentation
- [ ] Test disaster recovery procedures

## Support

For issues or questions:
- Check logs: `sudo journalctl -u clinicalvision-backup.service`
- Review backup metadata files
- Verify environment variables in `.env`
- Consult PostgreSQL documentation

## License

Part of ClinicalVision AI - See main project LICENSE
