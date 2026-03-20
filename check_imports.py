import os
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
    
    # Simple check for imports from react-native
    import_rn_block = ''
    for line in content.split('\n'):
        if line.startswith('import ') and 'react-native' in line:
            import_rn_block += line + '\n'
        elif import_rn_block and not import_rn_block.rstrip().endswith(';'):
            import_rn_block += line + '\n'
            if ');' in line or "';" in line or '";' in line:
                break
    
    if needs_pressable and 'Pressable' not in import_rn_block:
        print(f"Missing Pressable: {filepath}")
        
    if needs_view and 'View' not in import_rn_block:
        print(f"Missing View: {filepath}")
