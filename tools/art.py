# -*- coding: utf-8 -*-
"""Draws every product illustration as an SVG.

One shared canvas, one shared palette, ~28 shape archetypes. The point is that
53 drawings read as a single consistent set rather than 53 clip-arts, and that
the owner can drop a real photo into assets/img/products/ later to replace any
of them without touching code.
"""
import math

W = 160
BG = {
    "sayur":    "#E9F2E2",
    "ikan":     "#E3EDF3",
    "ayam":     "#F1E7D5",
    "nonhalal": "#F5E6E6",
}
SHADOW = "#000000"


# ---------- primitives -------------------------------------------------------
def g(angle, cx, cy, inner):
    if not angle:
        return inner
    return f'<g transform="rotate({angle:.1f} {cx:.1f} {cy:.1f})">{inner}</g>'


def leaf(cx, cy, w, h, fill, vein=None, angle=0):
    d = (f"M{cx:.1f} {cy:.1f} "
         f"C{cx-w:.1f} {cy-h*0.30:.1f} {cx-w*0.55:.1f} {cy-h:.1f} {cx:.1f} {cy-h:.1f} "
         f"C{cx+w*0.55:.1f} {cy-h:.1f} {cx+w:.1f} {cy-h*0.30:.1f} {cx:.1f} {cy:.1f} Z")
    s = f'<path d="{d}" fill="{fill}"/>'
    if vein:
        s += (f'<path d="M{cx:.1f} {cy-3:.1f} L{cx:.1f} {cy-h*0.80:.1f}" stroke="{vein}" '
              f'stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.5"/>')
    return g(angle, cx, cy, s)


def ell(cx, cy, rx, ry, fill, angle=0, op=1.0):
    return g(angle, cx, cy, f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" '
                            f'fill="{fill}" opacity="{op}"/>')


def shine(cx, cy, rx, ry, angle=-25, op=0.30):
    return ell(cx, cy, rx, ry, "#FFFFFF", angle, op)


def ground(cy=137, rx=46):
    return f'<ellipse cx="80" cy="{cy}" rx="{rx}" ry="7" fill="{SHADOW}" opacity="0.07"/>'


# ---------- archetypes -------------------------------------------------------
def a_leafy(p):
    n, slim = p["n"], p.get("slim", False)
    lw, lh, spread = (11, 54, 70) if slim else (17, 46, 62)
    stems, leaves = [], []
    for i in range(n):
        t = (i / (n - 1)) - 0.5 if n > 1 else 0.0
        ang, tipx = t * spread, 80 + t * 20
        stems.append(f'<path d="M80 132 Q{80 + t * 9:.1f} 118 {tipx:.1f} 104" '
                     f'stroke="{p["stem"]}" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
        leaves.append(leaf(tipx, 106, lw * (1 - abs(t) * 0.22), lh * (1 - abs(t) * 0.16),
                           p["leaf"], p["dark"], ang))
    tie = f'<rect x="65" y="115" width="30" height="10" rx="5" fill="{p["dark"]}" opacity="0.8"/>'
    return ground() + "".join(stems) + "".join(leaves) + tie


def a_oblong(p):
    c = p["curve"]
    body = (f'<path d="M80 {44 - 4 * c:.1f} C{80 + 22 * c:.1f} {44:.1f} {80 + 24 * c:.1f} {112:.1f} '
            f'80 {120:.1f} C{80 - 24 * c:.1f} {112:.1f} {80 - 22 * c:.1f} {44:.1f} 80 {44 - 4 * c:.1f} Z" '
            f'fill="{p["body"]}"/>')
    dark = (f'<path d="M80 {44 - 4 * c:.1f} C{80 + 22 * c:.1f} {44:.1f} {80 + 24 * c:.1f} {112:.1f} '
            f'80 {120:.1f} C{80 + 6:.1f} {106:.1f} {80 + 9:.1f} {60:.1f} 80 {44 - 4 * c:.1f} Z" '
            f'fill="{p["dark"]}" opacity="0.5"/>')
    cap = (f'<path d="M69 45 Q80 33 91 45 Q80 52 69 45 Z" fill="{p["top"]}"/>'
           f'<path d="M80 44 L80 32" stroke="{p["top"]}" stroke-width="5" stroke-linecap="round"/>')
    return ground(128, 30) + body + dark + shine(70, 68, 5, 16, -8) + cap


def a_round(p):
    n = p.get("n", 3)
    ribbed = p.get("ribbed", False)
    out = [ground(130, 36)]
    pos = [(80, 88, 30)] if n == 1 else [(62, 96, 22), (98, 96, 22), (80, 70, 25)]
    for (cx, cy, r) in pos:
        out.append(ell(cx, cy, r, r * 0.92, p["body"]))
        out.append(ell(cx + r * 0.32, cy + r * 0.18, r * 0.62, r * 0.66, p["dark"], op=0.35))
        if ribbed:
            for k in (-0.5, 0, 0.5):
                out.append(f'<path d="M{cx + r * k:.1f} {cy - r * 0.88:.1f} Q{cx + r * k * 1.5:.1f} {cy:.1f} '
                           f'{cx + r * k:.1f} {cy + r * 0.85:.1f}" stroke="{p["dark"]}" stroke-width="1.8" '
                           f'fill="none" opacity="0.4"/>')
        out.append(shine(cx - r * 0.34, cy - r * 0.38, r * 0.22, r * 0.34))
        out.append(f'<path d="M{cx:.1f} {cy - r * 0.9:.1f} l0 -7" stroke="{p["top"]}" '
                   f'stroke-width="3.4" stroke-linecap="round"/>')
    return "".join(out)



def a_chili(p):
    n, small = p["n"], p.get("small", False)
    L, Wd = (30, 5.8) if small else (52, 9.5)
    out = [ground(134, 34)]
    for i in range(n):
        t = (i / (n - 1)) - 0.5 if n > 1 else 0.0
        ang = t * (96 if small else 62)
        cx = 80 + t * (62 if small else 46)
        cy = 56 + abs(t) * (22 if small else 16)
        body = (f'<path d="M{cx:.1f} {cy:.1f} '
                f'C{cx + Wd:.1f} {cy + L * 0.18:.1f} {cx + Wd * 1.35:.1f} {cy + L * 0.62:.1f} '
                f'{cx + Wd * 0.30:.1f} {cy + L:.1f} '
                f'C{cx + Wd * 0.10:.1f} {cy + L * 0.60:.1f} {cx - Wd:.1f} {cy + L * 0.30:.1f} '
                f'{cx:.1f} {cy:.1f} Z" fill="{p["body"]}"/>')
        body += (f'<path d="M{cx + Wd * 0.55:.1f} {cy + L * 0.16:.1f} '
                 f'C{cx + Wd * 1.25:.1f} {cy + L * 0.5:.1f} {cx + Wd * 1.1:.1f} {cy + L * 0.75:.1f} '
                 f'{cx + Wd * 0.30:.1f} {cy + L:.1f} '
                 f'C{cx + Wd * 0.8:.1f} {cy + L * 0.7:.1f} {cx + Wd * 0.85:.1f} {cy + L * 0.42:.1f} '
                 f'{cx + Wd * 0.55:.1f} {cy + L * 0.16:.1f} Z" fill="{p["dark"]}" opacity="0.4"/>')
        body += (f'<path d="M{cx:.1f} {cy + 1:.1f} q-3 -7 -8 -10" stroke="{p["stem"]}" '
                 f'stroke-width="3" fill="none" stroke-linecap="round"/>'
                 f'<path d="M{cx - 5:.1f} {cy - 2:.1f} q5 -3 10 1 q-4 5 -10 -1 Z" fill="{p["stem"]}"/>')
        out.append(g(ang, cx, cy, body))
    return "".join(out)


def a_bulb(p):
    n = p["n"]
    out = [ground(130, 36)]
    pos = [(80, 88, 28)] if n == 1 else (
        [(62, 96, 20), (98, 96, 20), (80, 72, 23)] if n == 3 else
        [(56, 100, 16), (104, 100, 16), (66, 76, 17), (94, 76, 17), (80, 94, 19)])
    for (cx, cy, r) in pos:
        out.append(f'<path d="M{cx:.1f} {cy - r:.1f} C{cx + r * 1.05:.1f} {cy - r * 0.5:.1f} '
                   f'{cx + r * 0.95:.1f} {cy + r:.1f} {cx:.1f} {cy + r:.1f} '
                   f'C{cx - r * 0.95:.1f} {cy + r:.1f} {cx - r * 1.05:.1f} {cy - r * 0.5:.1f} '
                   f'{cx:.1f} {cy - r:.1f} Z" fill="{p["body"]}"/>')
        if p.get("papery"):
            for k in (-0.45, 0.0, 0.45):
                out.append(f'<path d="M{cx + r * k * 0.5:.1f} {cy - r * 0.85:.1f} Q{cx + r * k * 1.3:.1f} '
                           f'{cy + r * 0.1:.1f} {cx + r * k * 0.55:.1f} {cy + r * 0.92:.1f}" '
                           f'stroke="{p["dark"]}" stroke-width="1.6" fill="none" opacity="0.45"/>')
        out.append(shine(cx - r * 0.4, cy - r * 0.2, r * 0.18, r * 0.36))
        out.append(f'<path d="M{cx:.1f} {cy - r + 2:.1f} l-2 -9 M{cx:.1f} {cy - r + 2:.1f} l3 -8" '
                   f'stroke="{p["top"]}" stroke-width="2.4" stroke-linecap="round" fill="none"/>')
    return "".join(out)


def a_root(p):
    knobs = p.get("knobs", False)
    out = [ground(132, 38)]
    for (cx, cy, rx, ry, ang) in [(66, 96, 24, 15, -18), (98, 82, 21, 13, 14)]:
        out.append(ell(cx, cy, rx, ry, p["body"], ang))
        out.append(ell(cx + 4, cy + 4, rx * 0.72, ry * 0.6, p["dark"], ang, 0.32))
        out.append(shine(cx - rx * 0.3, cy - ry * 0.4, rx * 0.3, ry * 0.3, ang))
        if knobs:
            out.append(ell(cx + rx * 0.75, cy - ry * 0.5, rx * 0.32, ry * 0.5, p["body"], ang + 35))
            out.append(ell(cx - rx * 0.8, cy + ry * 0.3, rx * 0.28, ry * 0.45, p["body"], ang - 30))
    return "".join(out)


def a_carrot(p):
    out = [ground(134, 34)]
    for (cx, ang) in [(68, -12), (94, 10)]:
        body = (f'<path d="M{cx:.1f} 58 C{cx + 13:.1f} 66 {cx + 9:.1f} 104 {cx:.1f} 124 '
                f'C{cx - 9:.1f} 104 {cx - 13:.1f} 66 {cx:.1f} 58 Z" fill="{p["body"]}"/>')
        body += (f'<path d="M{cx + 4:.1f} 64 C{cx + 12:.1f} 76 {cx + 8:.1f} 106 {cx:.1f} 124 '
                 f'C{cx + 4:.1f} 104 {cx + 7:.1f} 78 {cx + 4:.1f} 64 Z" fill="{p["dark"]}" opacity="0.4"/>')
        for yy in (76, 90, 104):
            body += (f'<path d="M{cx - 8:.1f} {yy} l7 3" stroke="{p["dark"]}" stroke-width="1.5" '
                     f'opacity="0.45" stroke-linecap="round"/>')
        for dx in (-9, 0, 9):
            body += (f'<path d="M{cx:.1f} 58 Q{cx + dx * 1.2:.1f} 46 {cx + dx * 1.6:.1f} 34" '
                     f'stroke="{p["top"]}" stroke-width="3.4" fill="none" stroke-linecap="round"/>')
        out.append(g(ang, cx, 90, body))
    return "".join(out)



def a_cabbage(p):
    out = [ground(132, 42)]
    out.append(f'<path d="M42 94 Q32 62 64 52 Q54 78 62 100 Z" fill="{p["dark"]}"/>')
    out.append(f'<path d="M118 94 Q128 62 96 52 Q106 78 98 100 Z" fill="{p["dark"]}"/>')
    out.append(ell(80, 90, 38, 36, p["dark"]))
    out.append(ell(80, 88, 34, 32, p["body"]))
    for (rx, ry, op) in [(27, 25, 0.60), (18, 17, 0.55), (9, 9, 0.5)]:
        out.append(f'<path d="M{80 - rx} 92 Q80 {92 - ry * 1.7:.1f} {80 + rx} 92" fill="none" '
                   f'stroke="{p["vein"]}" stroke-width="2.4" opacity="{op}"/>')
    out.append(f'<path d="M80 57 Q70 84 80 118" stroke="{p["vein"]}" stroke-width="2.4" fill="none" '
               f'opacity="0.55"/>')
    out.append(f'<path d="M80 57 Q92 86 80 118" stroke="{p["vein"]}" stroke-width="2" fill="none" '
               f'opacity="0.4"/>')
    out.append(shine(64, 70, 8, 12))
    return "".join(out)


def a_sprouts(p):
    """Bean sprouts: pale curved stems, split yellow head, thin tail."""
    out = [ground(132, 40)]
    layout = [(-42, 118, -30), (-25, 112, -18), (-8, 108, -6),
              (9, 108, 6), (26, 112, 18), (43, 118, 30),
              (-30, 102, -22), (0, 98, 0), (31, 102, 22)]
    for (dx, cy, ang) in layout:
        cx = 80 + dx * 0.82
        s = (f'<path d="M{cx:.1f} {cy:.1f} C{cx - 6:.1f} {cy - 14:.1f} {cx + 7:.1f} '
             f'{cy - 26:.1f} {cx + 1:.1f} {cy - 38:.1f}" stroke="{p["body"]}" stroke-width="5" '
             f'fill="none" stroke-linecap="round"/>'
             f'<path d="M{cx:.1f} {cy:.1f} C{cx - 6:.1f} {cy - 14:.1f} {cx + 7:.1f} '
             f'{cy - 26:.1f} {cx + 1:.1f} {cy - 38:.1f}" stroke="{p["dark"]}" stroke-width="1.6" '
             f'fill="none" stroke-linecap="round" opacity="0.45"/>'
             f'<ellipse cx="{cx + 1:.1f}" cy="{cy - 42:.1f}" rx="6.4" ry="5" fill="{p["tip"]}"/>'
             f'<path d="M{cx - 4:.1f} {cy - 43:.1f} q5 3 10 0" stroke="{p["dark"]}" '
             f'stroke-width="1.4" fill="none" opacity="0.45"/>')
        out.append(g(ang, cx, cy, s))
    return "".join(out)


def a_pod(p):
    n, L, ridged = p["n"], 62 * p.get("length", 1.0), p.get("ridged", False)
    out = [ground(134, 36)]
    for i in range(n):
        t = (i / (n - 1)) - 0.5 if n > 1 else 0
        ang, cx = t * 34, 80 + t * 34
        body = (f'<path d="M{cx:.1f} {90 - L / 2:.1f} C{cx + 10:.1f} {90 - L / 4:.1f} {cx + 10:.1f} '
                f'{90 + L / 4:.1f} {cx:.1f} {90 + L / 2:.1f} C{cx - 10:.1f} {90 + L / 4:.1f} '
                f'{cx - 10:.1f} {90 - L / 4:.1f} {cx:.1f} {90 - L / 2:.1f} Z" fill="{p["body"]}"/>')
        body += (f'<path d="M{cx + 3:.1f} {90 - L / 3:.1f} C{cx + 9:.1f} {90:.1f} {cx + 7:.1f} '
                 f'{90 + L / 3:.1f} {cx:.1f} {90 + L / 2:.1f} C{cx + 5:.1f} {90 + L / 4:.1f} '
                 f'{cx + 6:.1f} {90:.1f} {cx + 3:.1f} {90 - L / 3:.1f} Z" fill="{p["dark"]}" opacity="0.42"/>')
        if ridged:
            for k in (-4, 0, 4):
                body += (f'<path d="M{cx + k:.1f} {90 - L / 2.6:.1f} L{cx + k * 1.1:.1f} {90 + L / 2.6:.1f}" '
                         f'stroke="{p["dark"]}" stroke-width="1.4" opacity="0.45"/>')
            if p.get("warty"):
                for row in range(6):
                    f = row / 5.0
                    yy = 90 - L * 0.36 + f * (L * 0.72)
                    taper = 1.0 - abs(f - 0.5) * 1.5          # narrow at both tips
                    for k in (-1, 0, 1):
                        body += (f'<ellipse cx="{cx + k * 4.2 * taper:.1f}" cy="{yy:.1f}" '
                                 f'rx="{2.6 * taper + 0.8:.1f}" ry="{2.0 * taper + 0.7:.1f}" '
                                 f'fill="{p["dark"]}" opacity="0.5"/>')
        else:
            for k in range(4):
                yy = 90 - L / 2.8 + k * (L / 4.2)
                body += f'<ellipse cx="{cx:.1f}" cy="{yy:.1f}" rx="8" ry="5.5" fill="{p["dark"]}" opacity="0.3"/>'
        body += (f'<path d="M{cx:.1f} {90 - L / 2:.1f} l0 -8" stroke="{p["dark"]}" stroke-width="3" '
                 f'stroke-linecap="round"/>')
        out.append(g(ang, cx, 90, body))
    return "".join(out)


def a_longbean(p):
    out = [ground(134, 38)]
    for i, (cx, ang) in enumerate([(62, -14), (80, 2), (98, 16)]):
        body = (f'<path d="M{cx:.1f} 42 C{cx + 14:.1f} 70 {cx - 12:.1f} 96 {cx + 4:.1f} 128" '
                f'stroke="{p["body"]}" stroke-width="8" fill="none" stroke-linecap="round"/>')
        body += (f'<path d="M{cx:.1f} 42 C{cx + 14:.1f} 70 {cx - 12:.1f} 96 {cx + 4:.1f} 128" '
                 f'stroke="{p["dark"]}" stroke-width="2.4" fill="none" stroke-linecap="round" '
                 f'opacity="0.4" transform="translate(2.5 0)"/>')
        out.append(g(ang, cx, 90, body))
    out.append(f'<rect x="64" y="86" width="32" height="10" rx="5" fill="{p["dark"]}" opacity="0.75"/>')
    return "".join(out)


def a_lemongrass(p):
    out = [ground(134, 34)]
    for i in range(5):
        t = (i / 4.0) - 0.5
        ang, cx = t * 26, 80 + t * 26
        s = (f'<path d="M{cx:.1f} 126 L{cx:.1f} 74" stroke="{p["body"]}" stroke-width="9" '
             f'stroke-linecap="round"/>'
             f'<path d="M{cx + 2.5:.1f} 124 L{cx + 2.5:.1f} 76" stroke="{p["dark"]}" stroke-width="2.6" '
             f'opacity="0.45" stroke-linecap="round"/>'
             f'<path d="M{cx:.1f} 78 Q{cx - 6:.1f} 54 {cx - 12:.1f} 36" stroke="{p["leaf"]}" '
             f'stroke-width="4" fill="none" stroke-linecap="round"/>'
             f'<path d="M{cx:.1f} 78 Q{cx + 7:.1f} 56 {cx + 10:.1f} 40" stroke="{p["leaf"]}" '
             f'stroke-width="3.4" fill="none" stroke-linecap="round"/>')
        out.append(g(ang, cx, 110, s))
    out.append(f'<rect x="62" y="100" width="36" height="10" rx="5" fill="{p["dark"]}" opacity="0.7"/>')
    return "".join(out)



def a_mushroom(p):
    out = [ground(132, 38)]
    for (cx, cy, r, ang) in [(60, 86, 26, -18), (100, 96, 22, 16), (82, 66, 21, 4)]:
        s = (f'<path d="M{cx - r:.1f} {cy:.1f} Q{cx:.1f} {cy - r * 1.2:.1f} {cx + r:.1f} {cy:.1f} '
             f'Q{cx:.1f} {cy + r * 0.5:.1f} {cx - r:.1f} {cy:.1f} Z" fill="{p["body"]}"/>')
        for k in (-0.72, -0.44, -0.16, 0.16, 0.44, 0.72):
            s += (f'<path d="M{cx + r * k:.1f} {cy + 3:.1f} L{cx + r * k * 0.82:.1f} '
                  f'{cy - r * 0.78:.1f}" stroke="{p["dark"]}" stroke-width="1.7" opacity="0.65"/>')
        s += (f'<path d="M{cx - r:.1f} {cy:.1f} Q{cx:.1f} {cy + r * 0.5:.1f} {cx + r:.1f} {cy:.1f}" '
              f'stroke="{p["dark"]}" stroke-width="2" fill="none" opacity="0.5"/>')
        s += (f'<path d="M{cx - 6:.1f} {cy + 3:.1f} q6 {r * 0.85:.1f} 12 0 Z" fill="{p["stem"]}"/>'
              f'<path d="M{cx - 6:.1f} {cy + 3:.1f} q6 {r * 0.85:.1f} 12 0" stroke="{p["dark"]}" '
              f'stroke-width="1.4" fill="none" opacity="0.4"/>')
        out.append(g(ang, cx, cy, s))
    return "".join(out)


def a_corn(p):
    out = [ground(134, 34)]
    for (cx, ang) in [(64, -14), (96, 12), (80, 0)]:
        body = (f'<path d="M{cx:.1f} 42 C{cx + 15:.1f} 56 {cx + 15:.1f} 110 {cx:.1f} 126 '
                f'C{cx - 15:.1f} 110 {cx - 15:.1f} 56 {cx:.1f} 42 Z" fill="{p["body"]}"/>')
        for r in range(6):
            yy = 56 + r * 12
            for c in (-8, 0, 8):
                body += (f'<circle cx="{cx + c + (4 if r % 2 else 0):.1f}" cy="{yy:.1f}" r="3.1" '
                         f'fill="{p["dark"]}" opacity="0.4"/>')
        body += (f'<path d="M{cx - 13:.1f} 58 Q{cx - 26:.1f} 88 {cx - 12:.1f} 120" fill="{p["husk"]}" '
                 f'opacity="0.95"/>'
                 f'<path d="M{cx + 13:.1f} 58 Q{cx + 26:.1f} 88 {cx + 12:.1f} 120" fill="{p["husk"]}" '
                 f'opacity="0.8"/>')
        out.append(g(ang, cx, 90, body))
    return "".join(out)


def a_fish(p):
    sh = p["shape"]
    rx, ry = 40 * sh, 25 / (sh ** 0.7)
    cx, cy = 84, 86
    out = [ground(132, 42)]
    tail = (f'<path d="M{cx - rx + 2:.1f} {cy:.1f} L{cx - rx - 22:.1f} {cy - 19:.1f} '
            f'L{cx - rx - 16:.1f} {cy:.1f} L{cx - rx - 22:.1f} {cy + 19:.1f} Z" fill="{p["dark"]}"/>')
    dorsal = (f'<path d="M{cx - rx * 0.4:.1f} {cy - ry * 0.85:.1f} Q{cx - rx * 0.1:.1f} '
              f'{cy - ry - 17:.1f} {cx + rx * 0.35:.1f} {cy - ry * 0.75:.1f} Z" fill="{p["dark"]}"/>')
    body = f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="{p["body"]}"/>'
    belly = (f'<path d="M{cx - rx * 0.85:.1f} {cy + ry * 0.25:.1f} Q{cx:.1f} {cy + ry * 1.25:.1f} '
             f'{cx + rx * 0.8:.1f} {cy + ry * 0.2:.1f} Q{cx:.1f} {cy + ry * 0.6:.1f} '
             f'{cx - rx * 0.85:.1f} {cy + ry * 0.25:.1f} Z" fill="{p["belly"]}"/>')
    stripe = (f'<path d="M{cx - rx * 0.8:.1f} {cy - ry * 0.18:.1f} Q{cx:.1f} {cy - ry * 0.42:.1f} '
              f'{cx + rx * 0.8:.1f} {cy - ry * 0.1:.1f}" stroke="{p["stripe"]}" stroke-width="3" '
              f'fill="none" opacity="0.7" stroke-linecap="round"/>')
    fin = (f'<path d="M{cx - rx * 0.1:.1f} {cy + ry * 0.35:.1f} q13 6 5 17 q-10 -3 -11 -15 Z" '
           f'fill="{p["dark"]}" opacity="0.85"/>')
    gill = (f'<path d="M{cx + rx * 0.45:.1f} {cy - ry * 0.62:.1f} Q{cx + rx * 0.3:.1f} {cy:.1f} '
            f'{cx + rx * 0.45:.1f} {cy + ry * 0.62:.1f}" stroke="{p["dark"]}" stroke-width="2.2" '
            f'fill="none" opacity="0.55"/>')
    eye = (f'<circle cx="{cx + rx * 0.68:.1f}" cy="{cy - ry * 0.22:.1f}" r="4.6" fill="#FFFFFF"/>'
           f'<circle cx="{cx + rx * 0.68:.1f}" cy="{cy - ry * 0.22:.1f}" r="2.6" fill="#22201D"/>')
    out += [tail, dorsal, body, belly, stripe, fin, gill, eye,
            shine(cx - rx * 0.25, cy - ry * 0.55, rx * 0.22, ry * 0.16, -10, 0.35)]
    if p.get("whiskers"):
        out.append(f'<path d="M{cx + rx * 0.9:.1f} {cy + 3:.1f} q14 4 18 14 M{cx + rx * 0.9:.1f} '
                   f'{cy + 5:.1f} q16 -2 22 4" stroke="{p["dark"]}" stroke-width="1.8" fill="none" '
                   f'stroke-linecap="round"/>')
    return "".join(out)


def a_fishsteak(p):
    out = [ground(134, 40)]
    for (cx, cy, r, ang) in [(62, 98, 27, -10), (98, 76, 24, 13)]:
        s = (f'<rect x="{cx - r:.1f}" y="{cy - r * 0.86:.1f}" width="{r * 2:.1f}" '
             f'height="{r * 1.72:.1f}" rx="{r * 0.42:.1f}" fill="{p["skin"]}"/>'
             f'<rect x="{cx - r + 4:.1f}" y="{cy - r * 0.86 + 4:.1f}" width="{r * 2 - 8:.1f}" '
             f'height="{r * 1.72 - 8:.1f}" rx="{r * 0.32:.1f}" fill="{p["body"]}"/>'
             f'<path d="M{cx:.1f} {cy - r * 0.6:.1f} L{cx:.1f} {cy + r * 0.6:.1f}" '
             f'stroke="{p["dark"]}" stroke-width="2.2" opacity="0.45"/>'
             f'<path d="M{cx - r * 0.55:.1f} {cy - r * 0.2:.1f} q{r * 0.55:.1f} {r * 0.2:.1f} 0 '
             f'{r * 0.55:.1f}" stroke="{p["dark"]}" stroke-width="1.6" fill="none" opacity="0.3"/>'
             f'<path d="M{cx + r * 0.55:.1f} {cy - r * 0.2:.1f} q{-r * 0.55:.1f} {r * 0.2:.1f} 0 '
             f'{r * 0.55:.1f}" stroke="{p["dark"]}" stroke-width="1.6" fill="none" opacity="0.3"/>'
             f'<ellipse cx="{cx:.1f}" cy="{cy + r * 0.1:.1f}" rx="5.5" ry="4.4" fill="{p["bone"]}" '
             f'stroke="{p["dark"]}" stroke-width="1.2"/>')
        out.append(g(ang, cx, cy, s))
    return "".join(out)


def a_squid(p):
    out = [ground(140, 30)]
    out.append(f'<path d="M66 34 L52 22 L74 32 Z M94 34 L108 22 L86 32 Z" fill="{p["spot"]}" opacity="0.85"/>')
    out.append(f'<path d="M80 30 C99 38 101 70 93 90 L67 90 C59 70 61 38 80 30 Z" fill="{p["body"]}"/>')
    out.append(f'<path d="M80 30 C93 36 97 60 93 90 L83 90 C87 64 86 42 80 30 Z" fill="{p["spot"]}" opacity="0.32"/>')
    for i in range(7):
        t = (i / 6.0) - 0.5
        x = 80 + t * 26
        out.append(f'<path d="M{x:.1f} 88 C{x + t * 14:.1f} 104 {x + t * 30:.1f} 116 '
                   f'{x + t * 34:.1f} 134" stroke="{p["body"]}" stroke-width="6" fill="none" '
                   f'stroke-linecap="round"/>')
        out.append(f'<path d="M{x:.1f} 88 C{x + t * 14:.1f} 104 {x + t * 30:.1f} 116 '
                   f'{x + t * 34:.1f} 134" stroke="{p["spot"]}" stroke-width="2" fill="none" '
                   f'stroke-linecap="round" opacity="0.4"/>')
    for cy in (50, 62, 74):
        out.append(f'<circle cx="72" cy="{cy}" r="2.8" fill="{p["spot"]}" opacity="0.7"/>')
        out.append(f'<circle cx="89" cy="{cy + 6}" r="2.3" fill="{p["spot"]}" opacity="0.55"/>')
    out.append(f'<ellipse cx="72" cy="86" rx="3.4" ry="2.6" fill="#22201D" opacity="0.55"/>')
    out.append(f'<ellipse cx="88" cy="86" rx="3.4" ry="2.6" fill="#22201D" opacity="0.55"/>')
    return "".join(out)


def a_prawn(p):
    s = p["size"]
    out = [ground(134, 38)]
    for (cx, cy, ang, sc) in [(66, 92, -18, 1.0), (98, 76, 16, 0.9)]:
        body = []
        for i in range(6):
            a = -50 + i * 34
            r = 26 * s * sc
            px = cx + math.cos(math.radians(a)) * r
            py = cy + math.sin(math.radians(a)) * r
            body.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{9 * s * sc:.1f}" '
                        f'ry="{7.5 * s * sc:.1f}" fill="{p["body"]}" '
                        f'transform="rotate({a + 90:.1f} {px:.1f} {py:.1f})"/>')
            body.append(f'<path d="M{px:.1f} {py - 6 * s * sc:.1f} l0 {12 * s * sc:.1f}" '
                        f'stroke="{p["stripe"]}" stroke-width="1.6" opacity="0.5" '
                        f'transform="rotate({a + 90:.1f} {px:.1f} {py:.1f})"/>')
        head = (f'<path d="M{cx + 16 * s * sc:.1f} {cy - 20 * s * sc:.1f} q16 2 18 16 q-12 8 -22 2 Z" '
                f'fill="{p["dark"]}"/>')
        tail = (f'<path d="M{cx - 14 * s * sc:.1f} {cy + 20 * s * sc:.1f} l-12 10 l6 2 l-2 9 l14 -12 Z" '
                f'fill="{p["dark"]}"/>')
        ant = (f'<path d="M{cx + 30 * s * sc:.1f} {cy - 14 * s * sc:.1f} q16 -6 22 -18 '
               f'M{cx + 30 * s * sc:.1f} {cy - 12 * s * sc:.1f} q18 0 26 -8" stroke="{p["dark"]}" '
               f'stroke-width="1.7" fill="none" stroke-linecap="round"/>')
        eye = f'<circle cx="{cx + 28 * s * sc:.1f}" cy="{cy - 15 * s * sc:.1f}" r="2.8" fill="#22201D"/>'
        out.append(g(ang, cx, cy, "".join(body) + head + tail + ant + eye))
    return "".join(out)


def a_crab(p):
    out = [ground(132, 44)]
    for i in range(3):
        for sgn in (-1, 1):
            a = 12 + i * 22
            x1, y1 = 80 + sgn * 26, 88 + i * 8
            out.append(f'<path d="M{x1:.1f} {y1:.1f} q{sgn * 20:.1f} {4 + i * 3:.1f} {sgn * 28:.1f} '
                       f'{18 + i * 4:.1f}" stroke="{p["dark"]}" stroke-width="5" fill="none" '
                       f'stroke-linecap="round"/>')
    for sgn in (-1, 1):
        cx = 80 + sgn * 40
        out.append(f'<path d="M{80 + sgn * 24:.1f} 76 q{sgn * 14:.1f} -10 {sgn * 22:.1f} -16" '
                   f'stroke="{p["claw"]}" stroke-width="6" fill="none" stroke-linecap="round"/>')
        out.append(f'<path d="M{cx + sgn * 6:.1f} 56 q{sgn * 14:.1f} -8 {sgn * 4:.1f} -14 '
                   f'q{-sgn * 14:.1f} 2 {-sgn * 10:.1f} 12 Z" fill="{p["claw"]}"/>')
        out.append(f'<path d="M{cx + sgn * 6:.1f} 56 q{sgn * 16:.1f} 4 {sgn * 8:.1f} 12 '
                   f'q{-sgn * 14:.1f} -2 {-sgn * 12:.1f} -10 Z" fill="{p["dark"]}"/>')
    out.append(f'<path d="M46 84 Q80 58 114 84 Q80 112 46 84 Z" fill="{p["body"]}"/>')
    out.append(f'<path d="M52 86 Q80 68 108 86 Q80 96 52 86 Z" fill="{p["dark"]}" opacity="0.35"/>')
    for x in (70, 90):
        out.append(f'<circle cx="{x}" cy="76" r="3.4" fill="#FFFFFF"/>')
        out.append(f'<circle cx="{x}" cy="76" r="2" fill="#22201D"/>')
    return "".join(out)


def a_shellfish(p):
    out = [ground(132, 40)]
    for (cx, cy, r, ang) in [(60, 98, 21, -14), (99, 92, 19, 12), (80, 70, 18, 3)]:
        out.append(f'<path d="M{cx - r:.1f} {cy + r * 0.35:.1f} Q{cx:.1f} {cy - r * 1.05:.1f} '
                   f'{cx + r:.1f} {cy + r * 0.35:.1f} Q{cx:.1f} {cy + r * 0.75:.1f} '
                   f'{cx - r:.1f} {cy + r * 0.35:.1f} Z" fill="{p["body"]}" '
                   f'transform="rotate({ang} {cx} {cy})"/>')
        for k in (-0.6, -0.3, 0, 0.3, 0.6):
            out.append(f'<path d="M{cx + r * k * 0.85:.1f} {cy + r * 0.3:.1f} L{cx + r * k * 0.5:.1f} '
                       f'{cy - r * 0.6:.1f}" stroke="{p["dark"]}" stroke-width="1.5" opacity="0.5" '
                       f'transform="rotate({ang} {cx} {cy})"/>')
        out.append(f'<path d="M{cx - r:.1f} {cy + r * 0.35:.1f} Q{cx:.1f} {cy + r * 0.72:.1f} '
                   f'{cx + r:.1f} {cy + r * 0.35:.1f}" stroke="{p["line"]}" stroke-width="2" fill="none" '
                   f'transform="rotate({ang} {cx} {cy})"/>')
    return "".join(out)


def a_wholechicken(p):
    ink = p["dark"]
    out = [ground(134, 40)]
    body = "M50 92 C50 60 110 56 114 88 C118 118 92 130 77 128 C58 126 50 114 50 92 Z"
    out.append(f'<path d="M54 70 q-10 -13 1 -20 q9 -5 12 6 Z" fill="{ink}"/>')
    out.append(f'<path d="{body}" fill="{p["body"]}" stroke="{ink}" stroke-width="2.4" '
               f'stroke-linejoin="round"/>')
    out.append(f'<path d="M88 60 C110 62 118 74 114 90 C109 74 99 64 88 60 Z" fill="{ink}" opacity="0.35"/>')
    out.append(f'<path d="M62 84 C76 74 98 79 102 96 C93 110 70 107 62 84 Z" fill="{p["wing"]}" '
               f'stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>')
    out.append(f'<path d="M68 86 C78 80 93 84 99 95" stroke="{ink}" stroke-width="1.7" fill="none" '
               f'opacity="0.55"/>')
    out.append(f'<path d="M99 124 q11 7 4 11 M73 128 q-3 9 6 9" stroke="{ink}" stroke-width="3.6" '
               f'fill="none" stroke-linecap="round"/>')
    out.append(shine(68, 76, 9, 6, -20, 0.32))
    return "".join(out)


def a_chickencut(p):
    kind = p["kind"]
    ink, lw = p["dark"], 2.2
    out = [ground(134, 38)]

    def piece(d, cx, cy, ang, fill=None):
        f = fill or p["body"]
        return (f'<path d="{d}" fill="{f}" stroke="{ink}" stroke-width="{lw}" '
                f'stroke-linejoin="round" transform="rotate({ang} {cx} {cy})"/>')

    if kind == "breast":
        for (cx, cy, ang) in [(62, 98, -14), (99, 80, 12)]:
            out.append(piece(
                f"M{cx - 26:.1f} {cy:.1f} C{cx - 23:.1f} {cy - 23:.1f} {cx + 13:.1f} "
                f"{cy - 25:.1f} {cx + 26:.1f} {cy - 5:.1f} C{cx + 31:.1f} {cy + 14:.1f} "
                f"{cx - 5:.1f} {cy + 23:.1f} {cx - 26:.1f} {cy:.1f} Z", cx, cy, ang))
            out.append(f'<path d="M{cx - 13:.1f} {cy - 7:.1f} q14 -6 27 3" stroke="{ink}" '
                       f'stroke-width="1.8" fill="none" opacity="0.5" '
                       f'transform="rotate({ang} {cx} {cy})"/>')
    elif kind == "drum":
        for (cx, cy, ang) in [(59, 96, -26), (102, 86, 20)]:
            out.append(f'<path d="M{cx:.1f} {cy - 26:.1f} l0 12" stroke="{ink}" stroke-width="12" '
                       f'stroke-linecap="round" transform="rotate({ang} {cx} {cy})"/>')
            out.append(f'<path d="M{cx:.1f} {cy - 26:.1f} l0 12" stroke="#F8F2E7" stroke-width="8.4" '
                       f'stroke-linecap="round" transform="rotate({ang} {cx} {cy})"/>')
            out.append(f'<path d="M{cx - 7:.1f} {cy - 30:.1f} q7 -6 14 0 q-7 6 -14 0 Z" '
                       f'fill="#F8F2E7" stroke="{ink}" stroke-width="2" stroke-linejoin="round" '
                       f'transform="rotate({ang} {cx} {cy})"/>')
            out.append(piece(f"M{cx:.1f} {cy - 18:.1f} C{cx + 23:.1f} {cy - 14:.1f} "
                             f"{cx + 24:.1f} {cy + 24:.1f} {cx:.1f} {cy + 27:.1f} "
                             f"C{cx - 24:.1f} {cy + 24:.1f} {cx - 23:.1f} {cy - 14:.1f} "
                             f"{cx:.1f} {cy - 18:.1f} Z", cx, cy, ang))
            out.append(f'<path d="M{cx + 8:.1f} {cy - 6:.1f} q9 10 4 22" stroke="{ink}" '
                       f'stroke-width="1.8" fill="none" opacity="0.4" '
                       f'transform="rotate({ang} {cx} {cy})"/>')
    elif kind == "wing":
        for (cx, cy, ang) in [(60, 96, -20), (100, 78, 24), (82, 110, 4)]:
            out.append(f'<path d="M{cx + 15:.1f} {cy + 3:.1f} q13 5 15 16" stroke="{ink}" '
                       f'stroke-width="11" fill="none" stroke-linecap="round" '
                       f'transform="rotate({ang} {cx} {cy})"/>')
            out.append(f'<path d="M{cx + 15:.1f} {cy + 3:.1f} q13 5 15 16" stroke="{p["body"]}" '
                       f'stroke-width="7" fill="none" stroke-linecap="round" '
                       f'transform="rotate({ang} {cx} {cy})"/>')
            out.append(piece(f"M{cx - 20:.1f} {cy:.1f} q8 -19 25 -15 q17 4 15 19 q-2 15 -19 13 "
                             f"q-17 -2 -21 -17 Z", cx, cy, ang))
            out.append(f'<path d="M{cx - 11:.1f} {cy - 5:.1f} q12 -6 22 3" stroke="{ink}" '
                       f'stroke-width="1.8" fill="none" opacity="0.5" '
                       f'transform="rotate({ang} {cx} {cy})"/>')
    else:  # fillet — thin slices, stacked
        for (cx, cy, ang) in [(58, 102, -12), (80, 87, 6), (102, 72, 20)]:
            out.append(piece(f"M{cx - 28:.1f} {cy:.1f} q10 -15 30 -13 q23 2 27 11 q-6 13 -29 13 "
                             f"q-23 0 -28 -11 Z", cx, cy, ang))
            out.append(f'<path d="M{cx - 17:.1f} {cy - 2:.1f} q18 -6 35 1" stroke="{ink}" '
                       f'stroke-width="1.8" fill="none" opacity="0.5" '
                       f'transform="rotate({ang} {cx} {cy})"/>')
    return "".join(out)


def a_offal(p):
    """Liver lobes (dark) plus two gizzards (lighter)."""
    out = [ground(132, 38)]
    for (cx, cy, s, ang) in [(62, 98, 1.0, -14), (98, 92, 0.85, 16)]:
        w, h = 26 * s, 20 * s
        out.append(f'<path d="M{cx - w:.1f} {cy:.1f} '
                   f'C{cx - w:.1f} {cy - h * 1.5:.1f} {cx - w * 0.1:.1f} {cy - h * 1.4:.1f} '
                   f'{cx + w * 0.15:.1f} {cy - h * 0.5:.1f} '
                   f'C{cx + w * 0.5:.1f} {cy - h * 1.25:.1f} {cx + w:.1f} {cy - h * 0.7:.1f} '
                   f'{cx + w * 0.85:.1f} {cy + h * 0.2:.1f} '
                   f'C{cx + w * 0.7:.1f} {cy + h:.1f} {cx - w * 0.6:.1f} {cy + h * 1.15:.1f} '
                   f'{cx - w:.1f} {cy:.1f} Z" fill="{p["body"]}" '
                   f'transform="rotate({ang} {cx} {cy})"/>')
        out.append(shine(cx - w * 0.35, cy - h * 0.45, w * 0.22, h * 0.2, ang, 0.25))
    for (cx, cy, ang) in [(86, 64, 14), (62, 66, -18)]:
        out.append(f'<path d="M{cx:.1f} {cy - 13:.1f} C{cx + 16:.1f} {cy - 11:.1f} {cx + 15:.1f} '
                   f'{cy + 10:.1f} {cx:.1f} {cy + 13:.1f} C{cx - 15:.1f} {cy + 10:.1f} '
                   f'{cx - 16:.1f} {cy - 11:.1f} {cx:.1f} {cy - 13:.1f} Z" fill="{p["second"]}" '
                   f'transform="rotate({ang} {cx} {cy})"/>')
        out.append(f'<path d="M{cx:.1f} {cy - 11:.1f} L{cx:.1f} {cy + 11:.1f}" stroke="{p["dark"]}" '
                   f'stroke-width="1.8" opacity="0.4" transform="rotate({ang} {cx} {cy})"/>')
    return "".join(out)


def a_meatslab(p):
    layers = p.get("layers", False)
    out = [ground(134, 40)]
    out.append(f'<path d="M38 66 q42 -14 84 0 q6 26 0 50 q-42 14 -84 0 q-6 -24 0 -50 Z" fill="{p["body"]}"/>')
    if layers:
        for i, yy in enumerate((78, 92, 106)):
            out.append(f'<path d="M40 {yy} q40 -10 80 0" stroke="{p["fat"]}" stroke-width="7" '
                       f'fill="none" opacity="0.95"/>')
            out.append(f'<path d="M40 {yy + 6} q40 -10 80 0" stroke="{p["dark"]}" stroke-width="2" '
                       f'fill="none" opacity="0.3"/>')
    else:
        out.append(f'<path d="M38 66 q42 -14 84 0 q2 10 2 16 q-44 -12 -86 0 q-1 -8 0 -16 Z" '
                   f'fill="{p["fat"]}" opacity="0.9"/>')
        for yy in (92, 104):
            out.append(f'<path d="M52 {yy} q28 -8 56 0" stroke="{p["fat"]}" stroke-width="2.6" '
                       f'fill="none" opacity="0.7"/>')
    out.append(f'<path d="M38 66 q42 -14 84 0 q6 26 0 50 q-42 14 -84 0 q-6 -24 0 -50 Z" fill="none" '
               f'stroke="{p["dark"]}" stroke-width="2.4" opacity="0.55"/>')
    return "".join(out)


def a_ribs(p):
    out = [ground(134, 40)]
    out.append(f'<path d="M36 62 q44 -12 88 0 q4 28 0 54 q-44 12 -88 0 q-4 -26 0 -54 Z" fill="{p["body"]}"/>')
    for i in range(4):
        x = 50 + i * 20
        out.append(f'<path d="M{x} 62 q3 28 0 54" stroke="{p["dark"]}" stroke-width="2.4" fill="none" '
                   f'opacity="0.45"/>')
        out.append(f'<ellipse cx="{x:.1f}" cy="116" rx="6" ry="4.4" fill="{p["bone"]}"/>')
        out.append(f'<ellipse cx="{x:.1f}" cy="62" rx="5.4" ry="4" fill="{p["bone"]}" opacity="0.85"/>')
    out.append(f'<path d="M36 62 q44 -12 88 0 q4 28 0 54 q-44 12 -88 0 q-4 -26 0 -54 Z" fill="none" '
               f'stroke="{p["dark"]}" stroke-width="2.4" opacity="0.5"/>')
    return "".join(out)


def a_minced(p):
    out = [ground(136, 40), ell(80, 98, 46, 26, p["dark"])]
    out.append(ell(80, 94, 44, 24, p["body"]))
    rnd = [(58, 84, 12), (78, 78, 14), (100, 86, 12), (66, 98, 11), (92, 100, 12), (80, 92, 10)]
    for i, (cx, cy, r) in enumerate(rnd):
        out.append(ell(cx, cy, r, r * 0.6, p["light"] if i % 2 else p["body"], -20 + i * 14))
    for i in range(9):
        cx = 50 + (i * 9) % 60
        cy = 80 + (i * 13) % 30
        out.append(f'<path d="M{cx:.1f} {cy:.1f} q6 -4 11 1" stroke="{p["dark"]}" stroke-width="2.4" '
                   f'fill="none" opacity="0.35" stroke-linecap="round"/>')
    return "".join(out)


def a_trotter(p):
    out = [ground(134, 38)]
    for (cx, cy, ang) in [(64, 92, -20), (100, 84, 16)]:
        s = (f'<path d="M{cx:.1f} {cy - 26:.1f} q16 4 15 22 q-1 16 -15 20 q-14 -4 -15 -20 '
             f'q-1 -18 15 -22 Z" fill="{p["body"]}"/>'
             f'<path d="M{cx - 9:.1f} {cy + 16:.1f} q9 10 18 0 l3 14 q-12 8 -24 0 Z" fill="{p["hoof"]}"/>'
             f'<path d="M{cx:.1f} {cy + 22:.1f} l0 12" stroke="{p["dark"]}" stroke-width="2" opacity="0.6"/>'
             f'<path d="M{cx - 8:.1f} {cy - 12:.1f} q8 -5 16 0" stroke="{p["dark"]}" stroke-width="2" '
             f'fill="none" opacity="0.4"/>')
        out.append(g(ang, cx, cy, s))
    return "".join(out)


def a_sausage(p):
    out = [ground(134, 38)]
    for i, (cx, ang) in enumerate([(62, -16), (80, 2), (98, 18)]):
        s = (f'<path d="M{cx:.1f} 50 q11 0 11 12 l0 56 q0 12 -11 12 q-11 0 -11 -12 l0 -56 q0 -12 11 -12 Z" '
             f'fill="{p["body"]}"/>'
             f'<path d="M{cx + 3:.1f} 56 l0 62" stroke="{p["dark"]}" stroke-width="5" opacity="0.4" '
             f'stroke-linecap="round"/>')
        for yy in (66, 82, 98):
            s += (f'<ellipse cx="{cx - 3:.1f}" cy="{yy}" rx="3.2" ry="2.4" fill="{p["dark"]}" opacity="0.45"/>')
        s += (f'<path d="M{cx - 11:.1f} 50 q11 -8 22 0" stroke="{p["tie"]}" stroke-width="3" fill="none" '
              f'stroke-linecap="round"/>')
        out.append(g(ang, cx, 84, s))
    return "".join(out)


ARCHETYPES = {
    "leafy": a_leafy, "oblong": a_oblong, "round": a_round, "chili": a_chili, "bulb": a_bulb,
    "root": a_root, "carrot": a_carrot, "cabbage": a_cabbage, "sprouts": a_sprouts, "pod": a_pod,
    "longbean": a_longbean, "lemongrass": a_lemongrass, "mushroom": a_mushroom, "corn": a_corn,
    "fish": a_fish, "fishsteak": a_fishsteak, "squid": a_squid, "prawn": a_prawn, "crab": a_crab,
    "shellfish": a_shellfish, "wholechicken": a_wholechicken, "chickencut": a_chickencut,
    "offal": a_offal, "meatslab": a_meatslab, "ribs": a_ribs, "minced": a_minced,
    "trotter": a_trotter, "sausage": a_sausage,
}


def xml_escape(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


def render(product_id, name, cat, archetype, params):
    inner = ARCHETYPES[archetype](params)
    name = xml_escape(name)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{W}" height="{W}" '
        f'role="img" aria-label="{name}">'
        f'<title>{name}</title>'
        f'<rect width="{W}" height="{W}" rx="20" fill="{BG[cat]}"/>'
        f'{inner}</svg>'
    )
