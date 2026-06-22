import os
from PIL import Image

def process_icons():
    img_path = 'images/timeline/app-icon.png'
    print(f"Loading {img_path}...")
    img = Image.open(img_path).convert('RGBA')
    w, h = img.size
    
    # Bounding box of the squircle in the original image
    x_min, x_max = 206, 1842
    y_min, y_max = 206, 1842
    
    new_w = x_max - x_min
    new_h = y_max - y_min
    
    # Create a new transparent image of the cropped dimensions
    cropped = Image.new('RGBA', (new_w, new_h), (0, 0, 0, 0))
    
    r = 300 # Corner radius
    
    # Corner centers in original image coordinates
    cx_left, cx_right = x_min + r, x_max - r
    cy_top, cy_bottom = y_min + r, y_max - r
    
    print(f"Applying smooth squircle crop to bounding box ({new_w}x{new_h})...")
    
    for y_new in range(new_h):
        y = y_new + y_min
        for x_new in range(new_w):
            x = x_new + x_min
            
            # Determine if pixel is in a corner region in original coordinates
            in_top_left = (x < cx_left) and (y < cy_top)
            in_top_right = (x > cx_right) and (y < cy_top)
            in_bottom_left = (x < cx_left) and (y > cy_bottom)
            in_bottom_right = (x > cx_right) and (y > cy_bottom)
            
            original_pixel = img.getpixel((x, y))
            r_val, g_val, b_val, a_val = original_pixel
            
            dist_to_boundary = 999.0
            is_outside = False
            
            if in_top_left:
                dist = ((x - cx_left)**2 + (y - cy_top)**2)**0.5
                if dist > r:
                    is_outside = True
                else:
                    dist_to_boundary = r - dist
            elif in_top_right:
                dist = ((x - cx_right)**2 + (y - cy_top)**2)**0.5
                if dist > r:
                    is_outside = True
                else:
                    dist_to_boundary = r - dist
            elif in_bottom_left:
                dist = ((x - cx_left)**2 + (y - cy_bottom)**2)**0.5
                if dist > r:
                    is_outside = True
                else:
                    dist_to_boundary = r - dist
            elif in_bottom_right:
                dist = ((x - cx_right)**2 + (y - cy_bottom)**2)**0.5
                if dist > r:
                    is_outside = True
                else:
                    dist_to_boundary = r - dist
            else:
                # In the straight parts
                dist_to_boundary = min(x - x_min, x_max - x, y - y_min, y_max - y)
                
            if is_outside:
                continue
                
            # Apply anti-aliasing at the boundary
            if dist_to_boundary < 2.0:
                fraction = dist_to_boundary / 2.0
                new_a = int(a_val * fraction)
            else:
                new_a = a_val
                
            cropped.putpixel((x_new, y_new), (r_val, g_val, b_val, new_a))
            
    # Save the original high-resolution cropped source
    source_path = 'images/app-icon-source.png'
    cropped.save(source_path, 'PNG')
    print(f"Saved high-res cropped master to {source_path}")
    
    # Define sizes to generate
    # 1. 144x144 -> images/app-icon.png (overwrite or generate)
    # 2. 192x192 -> images/icon-192.png
    # 3. 512x512 -> images/icon-512.png
    sizes = {
        'images/app-icon.png': (144, 144),
        'images/icon-192.png': (192, 192),
        'images/icon-512.png': (512, 512)
    }
    
    for path, size in sizes.items():
        print(f"Resizing to {size[0]}x{size[1]} -> {path}...")
        resized = cropped.resize(size, Image.Resampling.LANCZOS)
        resized.save(path, 'PNG')
        print(f"Saved {path}")

if __name__ == '__main__':
    process_icons()
