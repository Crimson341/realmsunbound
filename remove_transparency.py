#!/usr/bin/env python3
"""
Remove transparency from PNG image and replace with solid dark background
"""

from PIL import Image
import os

def remove_transparency(input_path, output_path, background_color=(15, 15, 20)):
    """
    Remove transparency from PNG and replace with solid background
    
    Args:
        input_path: Path to input PNG with transparency
        output_path: Path to save output PNG
        background_color: RGB tuple for background (default: dark stone color)
    """
    # Open the image
    img = Image.open(input_path)
    
    # Convert to RGBA if not already
    img = img.convert('RGBA')
    
    # Create a new image with the background color
    background = Image.new('RGB', img.size, background_color)
    
    # Paste the original image on top using its alpha channel as mask
    background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
    
    # Save the result
    background.save(output_path, 'PNG')
    print(f"✅ Saved image without transparency to: {output_path}")
    print(f"   Background color: RGB{background_color}")

if __name__ == "__main__":
    input_file = "public/hero/image.png"
    output_file = "public/hero/image.png"
    
    # Dark stone/slate background matching your theme
    # RGB(15, 15, 20) is very close to stone-950
    dark_bg = (15, 15, 20)
    
    remove_transparency(input_file, output_file, dark_bg)
