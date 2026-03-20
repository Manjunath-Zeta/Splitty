import os
import re

APP_DIR = '/Users/manjunathuk/AntiGravityProjects/Splitty/app'
COMPONENTS_DIR = '/Users/manjunathuk/AntiGravityProjects/Splitty/components'
STORE_DESTRUCTURING_REGEX = re.compile(r'const\s*{\s*([^}]+)\s*}\s*=\s*useSplittyStore\(\)\s*;')

def fix_use_splitty_store(content):
    def replace_match(match):
        vars_str = match.group(1)
        vars = [v.strip() for v in vars_str.split(',')]
        replacements = []
        for v in vars:
            if not v:
                continue
            if ':' in v:
                # Handle aliasing e.g., friends: myFriends
                orig, alias = [part.strip() for part in v.split(':')]
                replacements.append(f"const {alias} = useSplittyStore(s => s.{orig});")
            else:
                replacements.append(f"const {v} = useSplittyStore(s => s.{v});")
        return '\n    '.join(replacements)

    return STORE_DESTRUCTURING_REGEX.sub(replace_match, content)

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    orig_content = content
    content = fix_use_splitty_store(content)

    # Replace TouchableOpacity with Pressable
    content = content.replace('<TouchableOpacity', '<Pressable')
    content = content.replace('</TouchableOpacity>', '</Pressable>')

    # Convert activeOpacity in simple lines
    # This is rudimentary, but handles common cases
    # We strip activeOpacity when it's just activeOpacity={num}
    content = re.sub(r'\s+activeOpacity=\{([^}]+)\}', '', content)

    # Replace SafeAreaView with View (since we'll rely on ScrollView contentInsetAdjustmentBehavior="automatic" or standard View inside tabs)
    content = content.replace('<SafeAreaView', '<View')
    content = content.replace('</SafeAreaView>', '</View>')
    content = content.replace(' SafeAreaView,', '')
    content = content.replace('SafeAreaView,', '')
    content = content.replace(', SafeAreaView', '')
    
    # Try to insert Pressable if TouchableOpacity was there
    if 'TouchableOpacity' in orig_content and 'Pressable' not in content:
         content = re.sub(r'import {([^}]+)} from \'react-native\';', lambda m: f"import {{{m.group(1)}, Pressable}} from 'react-native';" if 'Pressable' not in m.group(1) else m.group(0), content)
    content = content.replace(' TouchableOpacity,', '')
    content = content.replace('TouchableOpacity,', '')
    content = content.replace(', TouchableOpacity', '')

    if orig_content != content:
        print(f"Updated {filepath}")
        with open(filepath, 'w') as f:
            f.write(content)

for root_dir in [APP_DIR, COMPONENTS_DIR]:
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for f in filenames:
            if f.endswith('.tsx') or f.endswith('.ts'):
                process_file(os.path.join(dirpath, f))
