import os
import re

files = []
for root, _, fs in os.walk('app'):
    for f in fs:
        if f.endswith('.tsx') or f.endswith('.ts'): files.append(os.path.join(root, f))
for root, _, fs in os.walk('components'):
    for f in fs:
        if f.endswith('.tsx') or f.endswith('.ts'): files.append(os.path.join(root, f))

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    needs_pressable = '<Pressable' in content
    needs_view = '<View' in content
    
    match = re.search(r'import\s+{([^}]+)}\s+from\s+[\'"]react-native[\'"]', content, re.DOTALL)
    if not match:
        continue
    
    imports = [x.strip() for x in match.group(1).split(',')]
    changed = False
    
    if needs_pressable and 'Pressable' not in imports:
        imports.append('Pressable')
        changed = True
    if needs_view and 'View' not in imports:
        imports.append('View')
        changed = True
        
    if changed:
        imports = [i for i in imports if i] # remove empty
        new_import = 'import {\n    ' + ',\n    '.join(imports) + '\n} from \'react-native\''
        content = content[:match.start()] + new_import + content[match.end():]
        print(f"Fixed {filepath}")
        with open(filepath, 'w') as f:
            f.write(content)
