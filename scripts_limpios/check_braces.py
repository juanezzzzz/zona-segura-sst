"""Sanity check: llaves, paréntesis y corchetes balanceados en JS."""
from pathlib import Path

def strip_strings_comments(code: str) -> str:
    out = []
    i = 0
    n = len(code)
    in_str = None  # ', ", o `
    while i < n:
        c = code[i]
        nxt = code[i + 1] if i + 1 < n else ''
        if in_str is None:
            if c == '/' and nxt == '/':
                j = code.find('\n', i)
                i = n if j == -1 else j
                continue
            if c == '/' and nxt == '*':
                j = code.find('*/', i + 2)
                i = n if j == -1 else j + 2
                continue
            if c in ("'", '"', '`'):
                in_str = c
                out.append(' ')
                i += 1
                continue
            out.append(c)
        else:
            if c == '\\' and i + 1 < n:
                i += 2
                continue
            if c == in_str:
                in_str = None
            elif in_str == '`':
                pass
        i += 1
    return ''.join(out)

for js in [
    r'C:\Users\Aprendiz Tarde\Desktop\zona segura\games\zona-segura-sena\js\main.js',
    r'C:\Users\Aprendiz Tarde\Desktop\zona segura\games\epp.js',
    r'C:\Users\Aprendiz Tarde\Desktop\zona segura\games\zona-segura-sena\js\sound.js',
]:
    code = Path(js).read_text(encoding='utf-8')
    clean = strip_strings_comments(code)
    op = clean.count('{') + clean.count('(') + clean.count('[')
    cl = clean.count('}') + clean.count(')') + clean.count(']')
    name = Path(js).name
    ok = 'OK' if op == cl else 'FAIL'
    print(f'{name}: {op} open / {cl} close -> {ok}')
