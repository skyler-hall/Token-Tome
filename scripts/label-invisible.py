"""
label-invisible.py
---------------------------------------------------------------
Step 2 of 2 for rebuilding data/vocab.json (runs after build-vocab.mjs).

Some tokens render as blank space: zero width spaces, direction marks,
old control codes, and accent marks meant to sit on another letter.
This script gives each one a readable name from the Unicode database,
like "zero width space x2", and marks it as kind "i" (invisible) or
"m" (combining mark).

Uses only the Python standard library.
---------------------------------------------------------------
"""
import json
import pathlib
import unicodedata

VOCAB = pathlib.Path(__file__).resolve().parent.parent / "data" / "vocab.json"

# Unicode categories that render as nothing on their own
INVISIBLE_CATEGORIES = {"Mn", "Me", "Mc", "Cf", "Zs", "Zl", "Zp", "Cc", "Co", "Cn", "Cs"}
# Characters that look blank even though their category says otherwise
BLANK_LOOKING = {0x2800, 0x3164, 0x115F, 0x1160, 0xFFA0, 0x180E, 0x034F, 0xFFFC}
NORMAL_WHITESPACE = " \n\t\r"


def is_invisible(ch):
    if ch in NORMAL_WHITESPACE:
        return False
    return unicodedata.category(ch) in INVISIBLE_CATEGORIES or ord(ch) in BLANK_LOOKING


def name_of(ch):
    if unicodedata.category(ch) == "Cc":
        return "control code"
    return unicodedata.name(ch, "unnamed character").lower()


def label_for(text, core):
    unique = list(dict.fromkeys(core))
    if len(unique) == 1:
        label = name_of(unique[0]) + (f" ×{len(core)}" if len(core) > 1 else "")
    elif len(unique) == 2:
        label = name_of(unique[0]) + " + " + name_of(unique[1])
    else:
        label = name_of(unique[0]) + f" + {len(unique) - 1} more"
    if text.startswith(" "):
        label = " " + label
    if text.rstrip(" ") != text.rstrip(" \n\r"):
        label += " + line break"
    return label


def main():
    data = json.loads(VOCAB.read_text(encoding="utf-8"))
    words, kinds, glosses = data["words"], list(data["kinds"]), data["glosses"]
    changed = 0
    for i, text in enumerate(words):
        if str(i) in glosses or kinds[i] == "s":
            continue
        core = text.strip(NORMAL_WHITESPACE)
        if not core or not all(is_invisible(c) for c in core):
            continue
        marks_only = all(unicodedata.category(c) in ("Mn", "Me", "Mc") for c in core)
        controls_only = all(unicodedata.category(c) == "Cc" for c in core)
        if marks_only:
            desc = "A mark that sits on or under another letter, so by itself it looks empty."
        elif controls_only:
            desc = "An old computer control code. It shows up in messy text copied from the web."
        else:
            desc = "Takes up no visible space. It quietly controls how text joins, breaks, or flows."
        words[i] = label_for(text, core)
        kinds[i] = "m" if marks_only else "i"
        glosses[str(i)] = [" ".join(f"U+{ord(c):04X}" for c in text), desc]
        changed += 1
    data["kinds"] = "".join(kinds)
    VOCAB.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Labeled {changed} invisible tokens")


if __name__ == "__main__":
    main()
