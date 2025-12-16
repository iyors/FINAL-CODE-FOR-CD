"""
SmartFeeder Launcher - All-in-One
Starts Flask server and opens browser automatically
"""
import webbrowser
import time
import sys
import os
from threading import Thread
import subprocess

def start_flask_inline():
    """Start Flask app directly in this process"""
    try:
        # Import Flask app
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        # Import the Flask app from app.py
        from app import app
        
        # Run Flask in a separate thread
        def run_flask():
            app.run(host='127.0.0.1', port=8080, debug=False, use_reloader=False)
        
        flask_thread = Thread(target=run_flask, daemon=True)
        flask_thread.start()
        
        return True
    except Exception as e:
        print(f"ERROR starting Flask: {e}")
        return False

def wait_for_server(url="http://127.0.0.1:8080", timeout=30):
    """Wait for Flask server to become available"""
    try:
        import requests
    except ImportError:
        print("Installing requests library...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        import requests
    
    print("Waiting for server to start...")
    for i in range(timeout * 10):
        try:
            response = requests.get(url, timeout=0.5)
            if response.status_code == 200:
                return True
        except requests.exceptions.RequestException:
            time.sleep(0.1)
    return False

def open_browser():
    """Open application in browser or Chrome app mode"""
    url = "http://127.0.0.1:8080"
    
    # Try Chrome app mode first
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe")
    ]
    
    for chrome_path in chrome_paths:
        if os.path.exists(chrome_path):
            try:
                subprocess.Popen([
                    chrome_path,
                    f"--app={url}",
                    "--window-size=1280,800"
                ])
                return True
            except:
                pass
    
    # Fallback to default browser
    webbrowser.open(url)
    return True

def main():
    print("=" * 60)
    print("    SMART FEEDER SYSTEM")
    print("=" * 60)
    print()
    
    print("Starting Flask server...")
    if not start_flask_inline():
        print("\nERROR: Failed to start Flask server")
        input("\nPress Enter to exit...")
        sys.exit(1)
    
    # Wait for server to be ready
    if not wait_for_server():
        print("\nERROR: Flask server did not respond in time")
        input("\nPress Enter to exit...")
        sys.exit(1)
    
    print("✓ Server started successfully!")
    print("✓ Opening application...")
    
    # Open browser
    open_browser()
    
    print()
    print("=" * 60)
    print("  ✓ SMART FEEDER IS NOW RUNNING!")
    print("  ✓ Access at: http://127.0.0.1:8080")
    print("=" * 60)
    print()
    print("Press Ctrl+C to stop the application")
    print("Or close this window to exit")
    print()
    
    # Keep running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        sys.exit(0)

if __name__ == "__main__":
    main()