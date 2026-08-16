"""Safely add try/catch to async functions in JS files."""
import re
import sys
from pathlib import Path

def add_try_catch_to_async_functions(file_path):
    """Add try/catch to async functions that don't have them."""
    path = Path(file_path)
    if not path.exists():
        print(f"SKIP: {file_path} (not found)")
        return 0
    
    content = path.read_text(encoding='utf-8')
    original = content
    
    # Pattern: async function name(params) {
    # Find all async function declarations
    pattern = r'async\s+function\s+(\w+)\s*\([^)]*\)\s*\{'
    
    matches = list(re.finditer(pattern, content))
    count = 0
    
    for match in reversed(matches):  # Process in reverse to preserve positions
        func_start = match.start()
        func_name = match.group(1)
        
        # Find the opening brace position
        brace_pos = content.index('{', match.end() - 1)
        
        # Find matching closing brace
        brace_count = 0
        func_end = -1
        for i in range(brace_pos, len(content)):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    func_end = i
                    break
        
        if func_end == -1:
            continue
        
        # Extract function body
        body_start = brace_pos + 1
        body_end = func_end
        body = content[body_start:body_end]
        
        # Check if already has try/catch
        if 'try {' in body or 'try{' in body:
            continue
        
        # Check if function has meaningful body
        # Simple body check - skip very short functions or ones with just console.log
        stripped = body.strip()
        if len(stripped) < 20:
            continue
        if stripped.startswith('console.') or stripped.startswith('//'):
            continue
        
        # Add try/catch
        indent = '  '
        wrapped_body = indent + 'try {\n'
        for line in body.split('\n'):
            wrapped_body += indent + '  ' + line.lstrip() + '\n'
        wrapped_body += indent + '} catch (e) {\n'
        wrapped_body += indent + '  console.error(`[' + func_name + '] error:`, e);\n'
        wrapped_body += indent + '}'
        
        # Replace in content
        new_content = content[:body_start] + wrapped_body + content[body_end+1:]
        content = new_content
        count += 1
        print(f"  FIX: {func_name}")
    
    if count > 0:
        path.write_text(content, encoding='utf-8')
        print(f"{file_path}: +{count} functions wrapped")
    else:
        print(f"{file_path}: no changes needed")
    
    return count

if __name__ == '__main__':
    files = [
        'src/renderer/js/views/download.js',
        'src/renderer/js/views/home.js',
        'src/renderer/js/views/local.js',
        'src/renderer/js/views/playlist.js',
        'src/renderer/js/views/search.js',
        'src/renderer/js/views/settings.js',
        'src/utils/onlineCover.js',
    ]
    
    total = 0
    for f in files:
        total += add_try_catch_to_async_functions(f)
    
    print(f"\nTotal fixed: {total}")
