import webbrowser
import subprocess
import time
import sys
import os

def main():
    print("=" * 60)
    print("    SMART FEEDER SYSTEM - STARTING...")
    print("=" * 60)
    print()
    
    # Get paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    app_path = os.path.join(script_dir, "app.py")
    
    # Check if app.py exists
    if not os.path.exists(app_path):
        print(f"ERROR: app.py not found!")
        print(f"Looking in: {script_dir}")
        input("\nPress Enter to exit...")
        sys.exit(1)
    
    print(f"✓ Found app.py at: {app_path}")
    print()
    
    # Start Flask server (VISIBLE window so you can see errors)
    print("Starting Flask server...")
    print("If you see errors below, that's the problem!")
    print("-" * 60)
    
    try:
        # Start Flask in a NEW visible terminal window
        if sys.platform == "win32":
            # Windows: Open new CMD window
            subprocess.Popen(
                f'start cmd /k "python {app_path}"',
                shell=True,
                cwd=script_dir
            )
        else:
            # Linux/Mac
            subprocess.Popen(
                [sys.executable, app_path],
                cwd=script_dir
            )
        
        print("-" * 60)
        print("✓ Flask server started in new window")
        print()
        
        # Wait a bit for server to start
        print("Waiting 5 seconds for server to initialize...")
        time.sleep(5)
        
        # Open browser
        url = "http://127.0.0.1:8080"
        print(f"Opening browser at: {url}")
        
        # Try Chrome app mode
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe")
        ]
        
        chrome_found = False
        for chrome_path in chrome_paths:
            if os.path.exists(chrome_path):
                subprocess.Popen([
                    chrome_path,
                    f"--app={url}",
                    "--window-size=1280,800"
                ])
                chrome_found = True
                break
        
        if not chrome_found:
            webbrowser.open(url)
        
        print()
        print("=" * 60)
        print("  ✓ SMART FEEDER IS NOW RUNNING!")
        print(f"  ✓ Access at: {url}")
        print("=" * 60)
        print()
        print("INSTRUCTIONS:")
        print("1. Check the OTHER WINDOW for Flask server output")
        print("2. If you see errors there, that's what we need to fix")
        print("3. To stop: Close the Flask server window (the other CMD)")
        print()
        input("Press Enter to close this launcher window...")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        input("\nPress Enter to exit...")
        sys.exit(1)

if __name__ == "__main__":
    main()