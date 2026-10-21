"""Import original wallpapers and create gallery thumbnails, preserving originals."""
import json, shutil, sys, hashlib
from pathlib import Path
from PIL import Image, ImageOps

source = Path(sys.argv[1]) / 'Wallpapers' / 'Windows 7'
output = Path(__file__).resolve().parents[1] / 'public' / 'wallpapers'
output.mkdir(parents=True, exist_ok=True)
labels = {'Architecture':'Architektur','Characters':'Figuren','Landscapes':'Landschaften','Nature':'Natur','Scenes':'Szenen','Windows':'Windows',
          'Australia':'Australien','Brazil':'Brasilien','Canada':'Kanada','France':'Frankreich','Germany':'Deutschland','India':'Indien','Italy':'Italien','Japan':'Japan','Korea':'Korea','Mexico':'Mexiko','Netherlands':'Niederlande','Poland':'Polen','Russia':'Russland','South Africa':'Südafrika','Spain':'Spanien','Turkey':'Türkei','United Kingdom':'Großbritannien','United States':'USA'}
items = []
for file in sorted(source.rglob('*.jpg')):
    relative = file.relative_to(source)
    regional = relative.parts[0] == 'Desktop Regional'
    category = labels.get(relative.parts[1], relative.parts[1])
    group = ('Regionen – ' if regional else 'Windows 7 – ') + category
    filename = 'win7-' + '-'.join(relative.with_suffix('').parts).lower().replace(' ', '-') + '.jpg'
    shutil.copyfile(file, output / filename)
    thumbnail = 'thumb-' + filename
    with Image.open(file) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((320, 200), Image.Resampling.LANCZOS)
        image.save(output / thumbnail, quality=82, optimize=True)
    items.append({'name': category + ' · ' + file.stem, 'group':group, 'url':'/wallpapers/'+filename, 'thumbnail':'/wallpapers/'+thumbnail, 'source':relative.as_posix(), 'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(output / 'windows7.json').write_text(json.dumps(items, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Imported', len(items), 'original wallpapers with thumbnails')
