import cv2
import numpy as np
from PIL import Image
import os

net = cv2.dnn.readNetFromONNX('scripts/u2net_human_seg.onnx')

candidates = [
    'juan-ticona',
    'yilmer-gonzales',
    'abimael-huaman',
    'isaac-cahuana',
    'jhonny-curinambe',
    'danny-taboada'
]

mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

for slug in candidates:
    in_path = f'public/assets/images/candidatos/{slug}@1.5x.webp'
    if not os.path.exists(in_path):
        print(f"Warning: {in_path} does not exist!")
        continue
        
    img_bgr = cv2.imread(in_path)
    H, W = img_bgr.shape[:2]
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    
    # 512x512 input
    resized = cv2.resize(img_rgb, (512, 512)).astype(np.float32) / 255.0
    normalized = (resized - mean) / std
    blob = np.transpose(normalized, (2, 0, 1))[np.newaxis, :, :, :]
    
    net.setInput(blob)
    output = net.forward()
    
    pred = output[0, 0]
    pred = (pred - pred.min()) / (pred.max() - pred.min() + 1e-8)
    
    mask_full = cv2.resize(pred, (W, H))
    
    # Threshold to find candidate body
    binary = np.where(mask_full > 0.4, 255, 0).astype(np.uint8)
    
    # Fill any internal holes (e.g. collar, buttons, shirt folds, helmet shadows)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled_binary = np.zeros_like(binary)
    cv2.drawContours(filled_binary, contours, -1, 255, thickness=-1)
    
    # For pixels where filled_binary == 255, ensure mask_full is at least 0.95
    # This prevents any translucent spots inside shirt/collar
    mask_combined = np.maximum(mask_full, (filled_binary.astype(float) / 255.0))
    
    # Smooth antialiasing on edges
    alpha_smooth = cv2.GaussianBlur(mask_combined, (3, 3), 0.8)
    alpha = (np.clip(alpha_smooth, 0.0, 1.0) * 255).astype(np.uint8)
    
    # Combine RGB and Alpha
    rgba = np.dstack([img_rgb, alpha])
    pil_img = Image.fromarray(rgba)
    
    out_png = f'public/assets/images/candidatos/{slug}-cutout.png'
    out_webp = f'public/assets/images/candidatos/{slug}-cutout.webp'
    
    # Save PNG
    pil_img.save(out_png, format='PNG')
    # Save WebP with high quality
    pil_img.save(out_webp, format='WEBP', quality=95, method=6)
    
    # Check stats
    torso_holes = np.sum((alpha[700:1100, 200:640] < 50))
    print(f"Processed {slug:20s}: PNG={os.path.getsize(out_png)//1024}KB, WEBP={os.path.getsize(out_webp)//1024}KB | Torso holes={torso_holes}")

print("All candidate cutouts generated successfully!")
