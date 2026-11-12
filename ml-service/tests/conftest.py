import sys
from pathlib import Path

# Allow `import config`, `import utils...` when running pytest from repo root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
