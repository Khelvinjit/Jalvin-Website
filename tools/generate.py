# -*- coding: utf-8 -*-
"""Regenerate data/products.json and every product illustration.

Run:  python3 tools/generate.py
"""
import json, os, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from products import P
import art

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img", "products")
os.makedirs(IMG, exist_ok=True)

items = []
for (pid, ms, en, cat, pack, price, cost, cap, (arch, params), note) in P:
    with open(os.path.join(IMG, pid + ".svg"), "w", encoding="utf-8") as f:
        f.write(art.render(pid, ms, cat, arch, params))
    items.append({
        "id": pid, "ms": ms, "en": en, "category": cat, "pack": pack,
        "price": round(price, 2), "cost": round(cost, 2), "cap": cap,
        "inStock": True, "note": note,
        "image": "assets/img/products/" + pid + ".svg",
    })

payload = {
    "updated": datetime.date.today().isoformat(),
    "note": "Edit prices in the admin panel, then export this file and upload it.",
    "products": items,
}
body = json.dumps(payload, ensure_ascii=False, indent=2)
with open(os.path.join(ROOT, "data", "products.js"), "w", encoding="utf-8") as f:
    f.write("/* Jalvin Fresh catalogue.\n"
            "   Edit prices in admin.html, click Export, and upload the file it gives you\n"
            "   over this one. Do not hand-edit unless you are comfortable with JSON. */\n")
    f.write("window.PRODUCTS_DATA = " + body + ";\n")
with open(os.path.join(ROOT, "data", "products.json"), "w", encoding="utf-8") as f:
    f.write(body + "\n")

# Contact sheet for eyeballing all the drawings at once.
cells = "".join(
    f'<figure><img src="../assets/img/products/{i["id"]}.svg" width="120" height="120" alt="">'
    f'<figcaption>{i["ms"]}</figcaption></figure>' for i in items)
with open(os.path.join(ROOT, "tools", "contact-sheet.html"), "w", encoding="utf-8") as f:
    f.write('<!doctype html><meta charset="utf-8"><title>Art contact sheet</title>'
            '<style>body{background:#FDFBF6;font:13px system-ui;margin:16px;display:flex;'
            'flex-wrap:wrap;gap:10px}figure{margin:0;width:124px;text-align:center}'
            'figcaption{margin-top:4px;color:#555}</style>' + cells)

print(f"{len(items)} products -> data/products.js (+ .json copy)")
print(f"{len(items)} SVGs -> assets/img/products/")
