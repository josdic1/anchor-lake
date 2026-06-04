import os
from pathlib import Path

# --- CONFIGURATION ---
# Review order:
# project config -> entry -> routes -> state/providers -> hooks/utils -> styles -> feature code
FRONTEND_TRAIL = [
    "package.json",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "vite.config.ts",
    "eslint.config.js",
    "tailwind.config.js",
    "postcss.config.js",
    "index.html",
    "src/main.tsx",
    "src/App.tsx",
    "src/routes.tsx",
    "src/contexts/AuthContext.tsx",
    "src/contexts/DataContext.tsx",
    "src/providers/AuthProvider.tsx",
    "src/providers/ToastProvider.tsx",
    "src/providers/VisibilityProvider.tsx",
    "src/hooks/useAuth.ts",
    "src/hooks/useMobile.ts",
    "src/utils/api.ts",
    "src/utils/toastEmitter.ts",
    "src/index.css",
    "src/styles/basic.css",
]

# Folders that contain code important for integrity review
TARGET_DIRS = [
    "src/components",
    "src/pages",
    "src/admin",
    "src/mobile",
]

# Ignore full directories
SKIP_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".vite",
    ".idea",
    ".next",
    "coverage",
    "__pycache__",
}

# Ignore specific files that do not help code integrity review
SKIP_FILES = {
    "frontend_payload.txt",
    "package-lock.json",
    "README.md",
    "public/logo.svg",
}

# Relevant code/config file types for this frontend
INCLUDE_EXTS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".css",
    ".html",
    ".json",
}

OUTPUT_FILE = "frontend_payload.txt"


def normalize_rel_path(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def should_skip_file(rel_path: str, file_name: str) -> bool:
    if rel_path in SKIP_FILES:
        return True
    if file_name.startswith("."):
        return True
    return False


def is_included_file(file_name: str) -> bool:
    suffix = Path(file_name).suffix.lower()
    return suffix in INCLUDE_EXTS


def get_file_content(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            return f"// Error reading file with replacement mode: {e}"
    except Exception as e:
        return f"// Error reading file: {e}"


def language_hint(path: str) -> str:
    suffix = Path(path).suffix.lower()
    mapping = {
        ".ts": "ts",
        ".tsx": "tsx",
        ".js": "javascript",
        ".jsx": "jsx",
        ".css": "css",
        ".html": "html",
        ".json": "json",
    }
    return mapping.get(suffix, "")


def status_label(line_count: int) -> str:
    if line_count > 500:
        return "🚨 VERY LARGE FILE"
    if line_count > 250:
        return "⚠️ LARGE FILE"
    return "✅ REVIEWABLE"


def collect_trail_files(root: Path, processed_files: set[str], payloads: list[tuple[str, str]]) -> None:
    for rel_path in FRONTEND_TRAIL:
        abs_path = root / rel_path
        rel_norm = rel_path.replace("\\", "/")

        if not abs_path.exists() or not abs_path.is_file():
            continue

        if rel_norm in processed_files:
            continue

        payloads.append((rel_norm, get_file_content(abs_path)))
        processed_files.add(rel_norm)


def collect_target_dir_files(root: Path, processed_files: set[str], payloads: list[tuple[str, str]]) -> None:
    for target_dir in TARGET_DIRS:
        abs_target = root / target_dir
        if not abs_target.exists() or not abs_target.is_dir():
            continue

        for current_root, dirs, files in os.walk(abs_target):
            dirs[:] = sorted([d for d in dirs if d not in SKIP_DIRS])

            for file_name in sorted(files):
                if not is_included_file(file_name):
                    continue

                full_path = Path(current_root) / file_name
                rel_path = normalize_rel_path(full_path, root)

                if should_skip_file(rel_path, file_name):
                    continue

                if rel_path in processed_files:
                    continue

                payloads.append((rel_path, get_file_content(full_path)))
                processed_files.add(rel_path)


def collect_root_level_support_files(root: Path, processed_files: set[str], payloads: list[tuple[str, str]]) -> None:
    """
    Optional safety net:
    include relevant root/src files not already included and not inside target dirs.
    This helps catch important files added later without changing config.
    """
    for current_root, dirs, files in os.walk(root):
        rel_root = normalize_rel_path(Path(current_root), root)

        dirs[:] = sorted([d for d in dirs if d not in SKIP_DIRS])

        # Only scan project root and src-level trees for the safety net
        if rel_root != "." and not rel_root.startswith("src"):
            continue

        for file_name in sorted(files):
            if not is_included_file(file_name):
                continue

            full_path = Path(current_root) / file_name
            rel_path = normalize_rel_path(full_path, root)

            if should_skip_file(rel_path, file_name):
                continue

            if rel_path in processed_files:
                continue

            # Skip public assets and anything outside the intended frontend scope
            if rel_path.startswith("public/"):
                continue

            payloads.append((rel_path, get_file_content(full_path)))
            processed_files.add(rel_path)


def write_output(root: Path, payloads: list[tuple[str, str]]) -> None:
    output_path = root / OUTPUT_FILE

    with output_path.open("w", encoding="utf-8") as out:
        out.write("⚛️ FRONTEND BUNDLE FOR CODE INTEGRITY REVIEW\n")
        out.write("=" * 80 + "\n\n")
        out.write(f"PROJECT ROOT: {root.as_posix()}\n")
        out.write(f"TOTAL FILES: {len(payloads)}\n")
        out.write("INCLUDED TYPES: " + ", ".join(sorted(INCLUDE_EXTS)) + "\n\n")

        for index, (path, content) in enumerate(payloads, start=1):
            line_count = content.count("\n") + (1 if content else 0)
            status = status_label(line_count)
            lang = language_hint(path)

            out.write(f"--- BATCH {index} | {path} ---\n")
            out.write(f"STATUS: {status} ({line_count} lines)\n")
            out.write(f"FILE: {path}\n")
            out.write("```" + lang + "\n")
            out.write(content)
            if content and not content.endswith("\n"):
                out.write("\n")
            out.write("```\n")
            out.write("\n" + "=" * 80 + "\n\n")


def bundle() -> None:
    root = Path.cwd()
    processed_files: set[str] = set()
    payloads: list[tuple[str, str]] = []

    collect_trail_files(root, processed_files, payloads)
    collect_target_dir_files(root, processed_files, payloads)
    collect_root_level_support_files(root, processed_files, payloads)
    write_output(root, payloads)

    print(f"✨ Success! Bundled {len(payloads)} files into {OUTPUT_FILE}")


if __name__ == "__main__":
    bundle()
