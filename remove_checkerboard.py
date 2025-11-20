#!/usr/bin/env python3
"""
Remove baked-in checkerboard background from image using flood fill
"""

from PIL import Image
import sys

def remove_checkerboard(input_path, output_path, target_bg=(15, 15, 20)):
    print(f"Processing {input_path}...")
    img = Image.open(input_path).convert("RGB")
    width, height = img.size
    pixels = img.load()
    
    # Define the checkerboard colors (approximate)
    # Based on analysis: 255 (white) and 232 (light gray)
    # We'll use a tolerance
    
    def is_checkerboard_color(color):
        r, g, b = color
        # White-ish
        if r > 250 and g > 250 and b > 250:
            return True
        # Gray-ish (232 is E8 hex)
        if 220 < r < 245 and 220 < g < 245 and 220 < b < 245:
            return True
        return False

    # Queue for flood fill
    queue = []
    visited = set()
    
    # Start from corners
    corners = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    
    for x, y in corners:
        if is_checkerboard_color(pixels[x, y]):
            queue.append((x, y))
            visited.add((x, y))
            
    print(f"Starting flood fill from {len(queue)} corners...")
    
    processed_count = 0
    while queue:
        x, y = queue.pop(0)
        
        # Replace pixel
        pixels[x, y] = target_bg
        processed_count += 1
        
        # Check neighbors
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            
            if 0 <= nx < width and 0 <= ny < height:
                if (nx, ny) not in visited:
                    if is_checkerboard_color(pixels[nx, ny]):
                        visited.add((nx, ny))
                        queue.append((nx, ny))
                        
    print(f"✅ Processed {processed_count} pixels.")
    img.save(output_path)
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    remove_checkerboard("public/hero/image.png", "public/hero/image.png")
