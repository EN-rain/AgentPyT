import os
import re

base_dir = r"c:\Users\LENOVO\Desktop\PyAgenT"

# 1. replace in files
for root, dirs, files in os.walk(base_dir):
    if '.git' in root or '.venv' in root or '__pycache__' in root or '.egg-info' in root:
        continue
    for file in files:
        if file.endswith('.pyc') or file == 'rename.py':
            continue
        file_path = os.path.join(root, file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'dexscreener' in content.lower() or 'dex screener' in content.lower():
                # replacements
                content = re.sub(r'dexscreener_cli', 'pyagentt_cli', content)
                content = re.sub(r'Dexscreener', 'PyAgentT', content)
                content = re.sub(r'dexscreener', 'pyagentt', content)
                content = re.sub(r'Dex screener', 'PyAgentT', content, flags=re.IGNORECASE)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

# 2. rename files and folders
for root, dirs, files in os.walk(base_dir, topdown=False):
    if '.git' in root or '.venv' in root or '__pycache__' in root or '.egg-info' in root:
        continue
    for name in files + dirs:
        if 'dexscreener' in name.lower() or 'dex screener' in name.lower():
            new_name = name.replace('dexscreener', 'pyagentt').replace('Dexscreener', 'PyAgentT').replace('Dex screener', 'PyAgentT')
            old_path = os.path.join(root, name)
            new_path = os.path.join(root, new_name)
            try:
                os.rename(old_path, new_path)
                print(f"Renamed {old_path} to {new_path}")
            except Exception as e:
                print(f"Error renaming {old_path}: {e}")
