import os
import re

base_dir = r"c:\Users\LENOVO\Desktop\PyAgenT"

# 1. replace in files
for root, dirs, files in os.walk(base_dir):
    if '.git' in root or '.venv' in root or '__pycache__' in root or '.egg-info' in root:
        continue
    for file in files:
        if file.endswith('.pyc') or file == 'fix_urls.py' or file == 'rename.py':
            continue
        file_path = os.path.join(root, file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for incorrect replacements in domains
            if 'pyagentt.com' in content:
                print(f"Fixing API URL in {file_path}")
                content = content.replace('api.pyagentt.com', 'api.dexscreener.com')
                content = content.replace('pyagentt.com', 'dexscreener.com')
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
