# Ninth Life - Portrait Processing Pipeline
# Sorts Gemini downloads by timestamp, renames to {archetype}-{season}.png
#
# Usage:
#   python process.py kitten
#   python process.py noble
#   python process.py gentle

from pathlib import Path
import shutil
import sys

try:
    from PIL import Image
except ImportError:
    print("Install Pillow first:")
    print("  pip install pillow")
    sys.exit(1)

# Config
RAW_DIR = Path("portraits/raw")
OUT_DIR = Path("portraits")
TARGET_SIZE = 512  # resize to 512x512

# Your generation order (oldest first)
SEASON_ORDER = ["spring", "autumn", "summer", "winter"]

ARCHETYPES = ["alert", "plain", "kitten", "noble", "gentle", "wild", "elder", "mythic"]

RAW_DIR.mkdir(parents=True, exist_ok=True)

def resize_if_needed(input_path, output_path):
    img = Image.open(input_path)
    if img.width != TARGET_SIZE or img.height != TARGET_SIZE:
        img = img.resize((TARGET_SIZE, TARGET_SIZE), Image.LANCZOS)
        img.save(output_path, "PNG")
        print("    Resized to " + str(TARGET_SIZE) + "x" + str(TARGET_SIZE))
    else:
        shutil.copy2(input_path, output_path)
    print("    Saved: " + str(output_path))

def main():
    if len(sys.argv) < 2:
        print("Usage: python process.py <archetype>")
        print()
        print("Archetypes: " + ", ".join(ARCHETYPES))
        print()
        print("Example:")
        print("  1. Generate 4 cats in Gemini (spring, recolor to autumn/summer/winter)")
        print("  2. Download all 4 into portraits/raw/")
        print("  3. Run: python process.py kitten")
        print("  4. Script sorts by timestamp, renames to kitten-spring.png etc.")
        return

    archetype = sys.argv[1].lower().strip()

    if archetype not in ARCHETYPES:
        print("Unknown archetype: " + archetype)
        print("Valid archetypes: " + ", ".join(ARCHETYPES))
        print()
        confirm = input("Use '" + archetype + "' anyway? (y/n): ").strip().lower()
        if confirm != "y":
            return

    raw_files = (
        list(RAW_DIR.glob("*.png")) +
        list(RAW_DIR.glob("*.jpg")) +
        list(RAW_DIR.glob("*.jpeg")) +
        list(RAW_DIR.glob("*.webp"))
    )

    if not raw_files:
        print("No images found in " + str(RAW_DIR.resolve()))
        print("Drop your 4 Gemini downloads there first.")
        return

    if len(raw_files) != 4:
        print("Expected 4 images (one per season), found " + str(len(raw_files)))
        print("Files found:")
        for f in raw_files:
            print("  " + f.name)
        print()
        if len(raw_files) < 4:
            print("Generate all 4 seasons first, then drop them all in raw/")
            return
        else:
            print("Too many files. Remove extras and keep only the 4 seasons.")
            return

    raw_files.sort(key=lambda f: f.stat().st_mtime)

    print()
    print("Archetype: " + archetype)
    print()
    for i, f in enumerate(raw_files):
        season = SEASON_ORDER[i]
        size_kb = f.stat().st_size // 1024
        print("  " + f.name + " (" + str(size_kb) + " KB)  ->  " + archetype + "-" + season + ".png")

    print()
    confirm = input("Look correct? (y/n): ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        return

    print()
    for i, f in enumerate(raw_files):
        season = SEASON_ORDER[i]
        out_name = archetype + "-" + season + ".png"
        out_path = OUT_DIR / out_name
        print("  [" + str(i + 1) + "/4] " + f.name + " -> " + out_name)
        resize_if_needed(f, out_path)
        print()

    cleanup = input("Delete raw files? (y/n): ").strip().lower()
    if cleanup == "y":
        for f in raw_files:
            f.unlink()
        print("  Raw files deleted.")

    print()
    print("Done! " + archetype + " portraits ready.")
    print()
    print("Next steps:")
    print("  git add portraits/")
    print('  git commit -m "Add ' + archetype + ' portraits"')
    print("  git push")

if __name__ == "__main__":
    main()
