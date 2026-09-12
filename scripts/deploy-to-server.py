import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('104.236.103.42', username='root', password='954040025', timeout=15)

def run(cmd):
    print(f"\n>>> EXECUTING: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out.strip())
    if err:
        print("ERR/WARN:", err.strip())

# 1. Check directory & git status
run("cd /root/hornaweb && git remote -v && git status")

# 2. Check running services
run("systemctl status hornaweb 2>/dev/null || systemctl status nextjs 2>/dev/null || pm2 list 2>/dev/null || true")

# 3. Pull latest commits
run("cd /root/hornaweb && git pull origin main")

# 4. Build
run("cd /root/hornaweb && npm run build")

# 5. Restart service
run("systemctl restart hornaweb 2>/dev/null || pm2 restart all 2>/dev/null || true")
run("systemctl status hornaweb --no-pager 2>/dev/null || true")

ssh.close()
print("\n=== DEPLOYMENT COMPLETED! ===")
