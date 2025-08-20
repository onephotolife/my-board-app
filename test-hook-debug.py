#!/usr/bin/env python3
"""
Debug script to test Claude Code hooks integration
"""

import json
import sys
import subprocess
import os
from datetime import datetime

def test_hook_execution():
    """Test if hooks are being called by Claude Code"""
    
    print("=== HOOK DEBUG TEST ===")
    print(f"Time: {datetime.now().isoformat()}")
    print()
    
    # Check hook directory
    hooks_dir = os.path.expanduser("~/.claude/hooks")
    print(f"1. Checking hooks directory: {hooks_dir}")
    if os.path.exists(hooks_dir):
        print("   ✅ Directory exists")
        hooks = os.listdir(hooks_dir)
        for hook in hooks:
            hook_path = os.path.join(hooks_dir, hook)
            if os.path.isfile(hook_path):
                is_exec = os.access(hook_path, os.X_OK)
                print(f"   - {hook}: {'✅ executable' if is_exec else '❌ not executable'}")
    else:
        print("   ❌ Directory does not exist")
    
    print()
    
    # Check Claude Code process
    print("2. Checking Claude Code process:")
    try:
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        claude_procs = [line for line in result.stdout.split('\n') if 'claude' in line.lower() and 'grep' not in line]
        if claude_procs:
            print("   ✅ Claude Code is running")
            for proc in claude_procs[:3]:
                print(f"   {proc[:120]}...")
        else:
            print("   ❌ Claude Code process not found")
    except Exception as e:
        print(f"   ❌ Error checking process: {e}")
    
    print()
    
    # Check if hooks are being triggered
    print("3. Checking hook logs:")
    log_file = os.path.expanduser("~/.claude/hooks.log")
    if os.path.exists(log_file):
        print(f"   ✅ Log file exists: {log_file}")
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()
                recent_logs = lines[-5:] if len(lines) > 5 else lines
                print("   Recent entries:")
                for line in recent_logs:
                    try:
                        entry = json.loads(line.strip())
                        timestamp = entry.get('timestamp', 'unknown')
                        event = entry.get('event', 'unknown')
                        print(f"   - {timestamp}: {event}")
                    except:
                        pass
        except Exception as e:
            print(f"   ❌ Error reading log: {e}")
    else:
        print("   ❌ Log file does not exist")
    
    print()
    
    # Test hook script directly
    print("4. Testing user_prompt_submit.py hook directly:")
    hook_script = os.path.expanduser("~/.claude/hooks/user_prompt_submit.py")
    if os.path.exists(hook_script):
        test_payload = {
            "prompt": "Debug test",
            "session_id": "debug-" + str(os.getpid()),
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            result = subprocess.run(
                ['python3', hook_script],
                input=json.dumps(test_payload),
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                print("   ✅ Hook executed successfully")
                if result.stderr:
                    print("   Output (stderr):")
                    for line in result.stderr.split('\n')[:10]:
                        if line.strip():
                            print(f"   {line}")
            else:
                print(f"   ❌ Hook failed with code {result.returncode}")
                if result.stderr:
                    print(f"   Error: {result.stderr[:200]}")
        except subprocess.TimeoutExpired:
            print("   ❌ Hook timed out")
        except Exception as e:
            print(f"   ❌ Error executing hook: {e}")
    else:
        print("   ❌ Hook script not found")
    
    print()
    
    # Check environment variables
    print("5. Checking environment:")
    print(f"   PATH: {os.environ.get('PATH', 'not set')[:100]}...")
    print(f"   HOME: {os.environ.get('HOME', 'not set')}")
    print(f"   USER: {os.environ.get('USER', 'not set')}")
    
    print()
    print("=== ANALYSIS ===")
    
    # Analyze results
    issues = []
    
    if not os.path.exists(hooks_dir):
        issues.append("Hooks directory does not exist")
    
    if not os.path.exists(hook_script):
        issues.append("user_prompt_submit.py hook not found")
    elif not os.access(hook_script, os.X_OK):
        issues.append("Hook script is not executable")
    
    if not os.path.exists(log_file):
        issues.append("Hook log file does not exist - hooks may not be running")
    else:
        # Check if there are recent entries (within last hour)
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()
                if lines:
                    last_entry = json.loads(lines[-1].strip())
                    last_time = datetime.fromisoformat(last_entry.get('timestamp', '2000-01-01'))
                    time_diff = (datetime.now() - last_time).total_seconds()
                    if time_diff > 3600:  # More than 1 hour
                        issues.append(f"No recent hook activity (last: {time_diff/3600:.1f} hours ago)")
        except:
            pass
    
    if issues:
        print("⚠️  ISSUES FOUND:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("✅ All checks passed - hooks should be working")
    
    print()
    print("=== RECOMMENDATION ===")
    
    if issues:
        print("The hook system appears to have issues. Possible causes:")
        print("1. Claude Code may not be configured to use hooks")
        print("2. The hook may not be properly registered with Claude Code")
        print("3. There might be a permissions issue")
        print()
        print("Try the following:")
        print("1. Restart Claude Code")
        print("2. Check if hooks are enabled in Claude Code settings")
        print("3. Ensure the hook files have correct permissions (chmod +x)")
    else:
        print("The hook system appears to be configured correctly.")
        print("If notifications are still not showing:")
        print("1. Check macOS System Preferences > Notifications")
        print("2. Ensure Terminal has notification permissions")
        print("3. Check if Do Not Disturb mode is enabled")
        print("4. Try running: terminal-notifier -message 'Test' -title 'Test'")

if __name__ == "__main__":
    test_hook_execution()