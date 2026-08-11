"""
Launch MusicDL Electron app and capture console output to debug homepage loading issue.
"""
import subprocess
import time
import sys
import os

WORK_DIR = r"C:\Users\59443\WorkBuddy\2026-06-06-19-21-10\music-downloader"

# Launch the Electron app and capture stdout/stderr
proc = subprocess.Popen(
    ["node", ".", "dist/main/index.js"],
    cwd=WORK_DIR,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    env={**os.environ, "NODE_ENV": "production"},
    text=True,
    encoding="utf-8",
    errors="replace",
)

print("=== Electron app started (PID: {}) ===".format(proc.pid))
print("Waiting 20s for homepage to load...\n")

start = time.time()
while time.time() - start < 20:
    # Read stdout
    while True:
        line = proc.stdout.readline()
        if not line:
            break
        print(f"[MAIN] {line.rstrip()}")

    # Read stderr
    while True:
        line = proc.stderr.readline()
        if not line:
            break
        print(f"[ERR]  {line.rstrip()}")

    if proc.poll() is not None:
        print(f"\n=== Process exited with code {proc.returncode} ===")
        break

    time.sleep(0.1)

# Final read
for line in proc.stdout.readlines():
    print(f"[MAIN] {line.rstrip()}")
for line in proc.stderr.readlines():
    print(f"[ERR]  {line.rstrip()}")

# Terminate
try:
    proc.terminate()
    proc.wait(timeout=5)
except:
    proc.kill()

print("\n=== Done ===")
