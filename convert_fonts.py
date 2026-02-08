import os
import sys
from fontTools.ttLib import TTFont

def convert_to_woff2(font_path):
    try:
        font = TTFont(font_path)
        new_path = os.path.splitext(font_path)[0] + '.woff2'
        font.flavor = 'woff2'
        font.save(new_path)
        print(f"Converted {font_path} to {new_path}")
    except Exception as e:
        print(f"Failed to convert {font_path}: {e}")

def main():
    fonts_dir = "src/app/fonts"
    for filename in os.listdir(fonts_dir):
        if filename.endswith((".otf", ".ttf")):
            path = os.path.join(fonts_dir, filename)
            convert_to_woff2(path)

if __name__ == "__main__":
    main()
