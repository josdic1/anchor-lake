import os

# --- UNIVERSAL CONFIGURATION ---
# The script will SEARCH for these filenames anywhere in your project
CORE_FILENAMES = {"main.py", "database.py", "config.py", "env.py", "pyproject.toml", "Taskfile.yml"}
TARGET_EXTENSIONS = {".py", ".sh", ".toml", ".yml", ".yaml", ".sql"}
SKIP_DIRS = {".venv", "venv", "__pycache__", ".git", "node_modules", "dist", "build"}
OUTPUT_FILE = "project_payload.txt"

def get_file_info(path):
    ext = os.path.splitext(path)[1]
    lang_map = {".py": "python", ".sh": "bash", ".toml": "toml", ".yml": "yaml", ".yaml": "yaml", ".sql": "sql"}
    lang = lang_map.get(ext, "text")
    if "Taskfile" in path: lang = "yaml"
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            return content, lang
    except Exception as e:
        return f"# Error reading file: {e}", "text"

def bundle():
    processed_files = set()
    core_payloads = []
    other_payloads = []

    print("🔍 Searching for project files...")

    for root, dirs, files in os.walk("."):
        # Prune hidden and ignored directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        
        for file in sorted(files):
            full_path = os.path.join(root, file)
            abs_path = os.path.abspath(full_path)
            ext = os.path.splitext(file)[1]

            # 1. Check if it's a Core file we want prioritized
            if file in CORE_FILENAMES:
                content, lang = get_file_info(full_path)
                core_payloads.append((full_path, content, lang))
                processed_files.add(abs_path)
            
            # 2. Otherwise, check if it's a relevant source file
            elif ext in TARGET_EXTENSIONS and file != "__init__.py":
                content, lang = get_file_info(full_path)
                other_payloads.append((full_path, content, lang))
                processed_files.add(abs_path)

    all_payloads = core_payloads + other_payloads

    if not all_payloads:
        print("❌ No relevant files found. Check your directory!")
        return

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write(f"🚀 UNIFIED PROJECT BUNDLE\n{'='*50}\n\n")

        for i, (path, content, lang) in enumerate(all_payloads):
            line_count = content.count('\n')
            status = "⚠️ LARGE" if line_count > 250 else "✅ OPTIMAL"
            
            out.write(f"--- BATCH {i+1} | {path} ---\n")
            out.write(f"STATUS: {status} ({line_count} lines)\n")
            out.write(f"### FILE: {path}\n")
            out.write(f"```{lang}\n{content}\n```\n")
            out.write("\n" + "="*50 + "\n\n")

    print(f"✨ Success! {len(all_payloads)} files bundled into {OUTPUT_FILE}")
    print(f"📍 Priority Files found: {len(core_payloads)}")

if __name__ == "__main__":
    bundle()