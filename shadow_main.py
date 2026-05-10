import sys
try:
    print("Attempting to import app from orchestrator...")
    from orchestrator import app
    print("Successfully imported app!")
except Exception as e:
    import traceback
    print(f"FATAL IMPORT ERROR: {e}")
    traceback.print_exc()
    raise
