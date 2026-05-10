import sys
try:
    from orchestrator import app
except Exception as e:
    import traceback
    print(f"FATAL IMPORT ERROR: {e}", file=sys.stderr)
    traceback.print_exc()
    sys.exit(1)
