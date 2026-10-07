# Importa módulos e aulas do documento "Combo Vitalício — Módulos e Aulas" (Google Doc exportado como texto/Markdown)
# e gera src/catalogo-aulas.json, lido por src/catalogo.js.
#
# Uso: python3 -I src/importar_doc.py <documento.md>
#
# Regras (decisões a validar com a equipe estão em docs/catalogo-proposta.md, item 3):
# - Títulos de módulos e aulas são copiados do documento, sem edição (só remove caracteres corrompidos).
# - Duração e link não existem no documento: ficam vazios.
# - Módulos que não são aula (links de ao vivo, grupo, suporte, Zoom) e módulos "Bônus" não entram no plano.
# - Seções sem título de trilha no documento foram associadas por conteúdo (ver MAPA).
import json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
lines = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8').split('\n')

def clean(s):
    s = re.sub(r'\*\*', '', s).replace('\\', '')
    s = re.sub(r'[\u0080-\u009f]|ð', '', s)  # restos de emoji corrompido
    return re.sub(r'\s+', ' ', s).strip()

secs, top = [], None
for raw in lines:
    t = raw.strip()
    if not t:
        continue
    if t.startswith('# '):
        top = clean(t[2:]); continue
    if t.startswith('## '):
        secs.append({'top': top, 'title': clean(t[3:]), 'items': []}); continue
    if secs and not t.startswith('**') and not t.startswith('- '):
        secs[-1]['items'].append(clean(t))

# Trilha do documento -> curso_id do catálogo
PREFIX = {'[FEP]': 'FEP', '[FEB]': 'BTX', '[FEF]': 'FIOS', '[ATDS]': 'ATD', '[CPX]': 'CPX', '[FEC]': 'CORP', '[IAR]': 'RINO',
          '[IAPO]': 'OLH', '[CAC]': 'COMP', '[IPL]': 'LAB', '[IFF]': 'FF', '[IFF10+]': 'FF10', '[FEBio]': 'BIO'}
# Seções sem prefixo: associadas pelo conteúdo
MAPA = {'Anatomia em cadáveres': 'CAD', 'Laboratório de anatomia em cadáver fresco': 'CAD', 'Protocolo Glabela': 'CTX'}
TOP_ANAT = 'Conteúdos complementares'  # módulos por terço da face, com "Comece por aqui" e certificado: Formação em Anatomia
FORA = re.compile(r'Aulas Ao Vivo|Acesso ao grupo|Suporte Médico|Link Ao Vivo|Zoom|Dias 9 e 10 de fevereiro|Imersão Avançada em Rinomodelação$|^\[?[A-Za-z0-9+]*\]? ?Bônus|^Bônus', re.I)
AULA_FORA = re.compile(r'Pegue aqui o link|link do Zoom|\(em breve\)', re.I)

courses = {}
skipped = []
for s in secs:
    title, cid = s['title'], None
    m = re.match(r'(\[[^\]]+\])\s*(.*)', title)
    if m and m.group(1) in PREFIX:
        cid, mod = PREFIX[m.group(1)], m.group(2)
        if s['top'] and 'Conteúdos adicionais' in s['top']:
            cid = None  # conteúdos de convidados: complementares, fora do plano
    elif title in MAPA:
        cid, mod = MAPA[title], title
    elif s['top'] == TOP_ANAT:
        cid, mod = 'ANAT', title
    else:
        mod = title
    # A imersão de rinomodelação repetida dentro da FEP é a mesma trilha RINO
    if not cid or FORA.search(mod if cid != 'RINO' else re.sub(r'Imersão Avançada em Rinomodelação$', '', mod)):
        skipped.append(f"{s['top']} › {title} ({len(s['items'])} itens)")
        continue
    items = [i for i in s['items'] if not AULA_FORA.search(i)]
    if not items:
        skipped.append(f"{s['top']} › {title} (vazio)")
        continue
    courses.setdefault(cid, []).append({'titulo': mod, 'aulas': items})

out = {'fonte': 'Google Doc "Combo_Vitalicio_Modulos_e_Aulas_COMPLETO" (07/10/2026)', 'cursos': courses, 'fora_do_plano': skipped}
(root / 'src' / 'catalogo-aulas.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
for cid, mods in courses.items():
    print(cid, len(mods), 'módulos', sum(len(m['aulas']) for m in mods), 'aulas')
print('fora do plano:', len(skipped))
