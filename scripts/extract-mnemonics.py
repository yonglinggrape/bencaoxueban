import zipfile, xml.etree.ElementTree as ET, re, sys, io, sqlite3
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

z = zipfile.ZipFile('T:/claude_new/data/中药快快记.docx')
xml_content = z.read('word/document.xml')
tree = ET.fromstring(xml_content)
paragraphs = []
for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    texts = [node.text for node in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
    if texts:
        paragraphs.append(''.join(texts))
text = '\n'.join(paragraphs)

# Use entire document, skip TOC
content = text[5500:]

# Find all herb groups - use broader pattern
groups = list(re.finditer(r'第\s*\d+\s*组\s*\(\s*\d+\s*味\s*\)\s*[—\-]*\s*([^\n]+)', content))
print(f'Found {len(groups)} groups')

herb_data = {}
for g in groups:
    herbs_str = g.group(1)
    herb_names = [h.strip().rstrip('。，').replace('( ', '').replace(' )', '').replace('(', '').replace(')', '') for h in re.split(r'[、,，]', herbs_str) if h.strip()]

    group_start = g.end()
    # Find end of this group: either next group, or next page number, or section header
    end_patterns = [
        r'第\s*\d+\s*组\s*\(\s*\d+\s*味',
        r'\d{3}\s+中药功效',
        r'\([一二三四五六七八九十]+\)\s*[清解活化利温理消驱止活化安平开补收]',
    ]
    group_end = None
    for pat in end_patterns:
        m = re.search(pat, content[group_start:group_start+1200])
        if m:
            group_end = group_start + m.start()
            break
    if not group_end:
        group_end = group_start + 1200
    group_content = content[group_start:group_end]

    for hname in herb_names:
        clean_name = hname.strip()
        if len(clean_name) < 2:
            continue
        if clean_name in ['说明', '口诀', '提示', '记忆', '联想', '药名', '功效', '记忆方案', '药名、功效']:
            continue

        # Try to find this herb's mnemonic
        pat = re.escape(clean_name) + r'[\s\S]*?口\s*诀\s*[：:]\s*([^说\n]+)'
        m = re.search(pat, group_content)
        if not m:
            continue

        mnemonic_text = m.group(1).strip()
        # Also get 说明 text
        note = ''
        after_mnemonic = group_content[m.end():m.end()+500]
        note_m = re.search(r'说\s*明\s*[：:]\s*(.+?)(?=\d{3}\s+中药|第\s*\d+\s*组|$)', after_mnemonic)
        if note_m:
            note = note_m.group(1).strip()

        full = '【口诀】' + mnemonic_text
        if note:
            full += '\n【提示】' + note
        herb_data[clean_name] = full

print(f'Extracted {len(herb_data)} herbs with mnemonics')

# Name mapping
name_map = {'紫苏': '紫苏叶', '柽柳': '西河柳', '生石膏': '石膏', '生地黄': '地黄'}

# Directly update database
db = sqlite3.connect('T:/claude_new/dev.db')
updated = 0
for docx_name, mnemonic in herb_data.items():
    db_name = name_map.get(docx_name, docx_name)
    try:
        cur = db.execute('UPDATE HerbCard SET mnemonic = ? WHERE name = ?', (mnemonic, db_name))
        if cur.rowcount > 0:
            updated += 1
        else:
            # Herb not found in DB, skip silently
            pass
    except Exception as e:
        print(f'  Error updating {db_name}: {e}')
db.commit()

# Count total
total = db.execute('SELECT COUNT(*) FROM HerbCard WHERE mnemonic IS NOT NULL').fetchone()[0]
db.close()

print(f'Updated {updated} herbs in database')
print(f'Total herbs with mnemonics: {total}')
