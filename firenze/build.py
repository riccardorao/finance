#!/usr/bin/env python3
"""Assembla la console del modello in un unico file HTML.

  python3 firenze/build.py                       → firenze/dividendo-firenze-it.html  (file autonomo, si apre in un browser)
  python3 firenze/build.py --artifact PERCORSO   → variante senza doctype per la pubblicazione come artefatto
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
SCRIPTS = ["vendor/pdf-lib.min.js", "vendor/fontkit.umd.min.js", "fonts.js", "model.js", "draw.js",
           "deck_a.js", "deck_b.js", "deck_c.js", "app.js"]

def read(p):
    return (SRC / p).read_text(encoding="utf-8")

def scripts():
    out = []
    for s in SCRIPTS:
        code = read(s).replace("\ufffd", "\\uFFFD")   # il carattere di sostituzione dentro le stringhe delle librerie
        assert "</script" not in code, s
        out.append("<script>\n" + code + "\n</script>")
    return "\n".join(out)

HEAD = """<title>Il Dividendo di Firenze</title>
<meta name="claude:viewport-fit-sides" content="cover">
"""

def artifact():
    return (HEAD + "<style>\n" + read("app.css") + "</style>\n" + read("app.body.html") + "\n" + scripts() + "\n")

def standalone():
    return ("<!doctype html>\n<html lang=\"it\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
            + HEAD + "<style>\n" + read("app.css") + "</style>\n</head>\n<body>\n" + read("app.body.html") + "\n" + scripts() + "\n</body>\n</html>\n")

if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--artifact":
        pathlib.Path(sys.argv[2]).write_text(artifact(), encoding="utf-8")
        print("artefatto →", sys.argv[2], round(len(artifact()) / 1024), "KB")
    else:
        out = ROOT / "dividendo-firenze-it.html"
        out.write_text(standalone(), encoding="utf-8")
        print("file autonomo →", out, round(len(standalone()) / 1024), "KB")
