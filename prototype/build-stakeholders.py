"""Builds barq-stakeholders.html = the prototype + the stakeholder layer (briefing, registration, comments)."""
import re, pathlib
here = pathlib.Path(__file__).parent
base = (here / 'barq-prototype.html').read_text(encoding='utf-8')
addon = (here / 'stakeholders-addon.html').read_text(encoding='utf-8')
part = lambda tag: re.search(rf'<!--{tag}-->\n(.*?)<!--/{tag}-->', addon, re.S).group(1)
out = base.replace('<title>BARQ نموذج تفاعلي</title>', '<title>BARQ عرض الشركاء</title>', 1)
out = out.replace('</style>', part('CSS') + '</style>', 1)
old = '<div class="device"><div class="screen" id="app"></div></div>'
assert old in out
deck = re.search(r'<div class="deck">.*?</nav>\n</div>\n', out, re.S).group(0)
out = out.replace(deck, '').replace(old, part('HTML').replace('<div class="brief" id="brief"></div>', '<div class="brief-col" style="display:contents"></div>'), 1)
# the deck (language + screen jumps) sits on top of the briefing column
out = out.replace('<div class="brief-col" style="display:contents"></div>', '<div class="brief-wrap" style="display:flex;flex-direction:column;gap:14px;min-width:0">' + deck + '<div class="brief" id="brief"></div></div>', 1)
out = out.rstrip() + '\n' + part('JS')
(here / 'barq-stakeholders.html').write_text(out, encoding='utf-8')
print('ok', len(out))
