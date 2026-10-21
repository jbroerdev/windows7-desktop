"""Import selected artwork from the user-provided NhatPG Windows 7 icon pack."""
import io,sys,zipfile
from pathlib import Path
from PIL import Image
mapping={'library-documents':'005','library-music':'007','library-pictures':'006','library-videos':'008','computer':'177','drive':'109','folder':'033','folder-full':'218','home':'184','explorer':'011','notepad':'013','photo-app':'426','programs':'033','help':'073','settings':'015','network':'183','desktop':'009','documents':'041','downloads':'001','pictures':'042','music':'040','videos':'004'}
out=Path(__file__).resolve().parents[1]/'public'/'icons'
with zipfile.ZipFile(sys.argv[1]) as archive:
    for label,number in mapping.items():
        name=next(n for n in archive.namelist() if n.endswith('/'+number+'.png'))
        image=Image.open(io.BytesIO(archive.read(name))).convert('RGBA')
        for size,suffix in [(256,''),(16,'-16')]:
            icon=image.copy();icon.thumbnail((size,size),Image.Resampling.LANCZOS)
            icon.save(out/(label+suffix+'.png'))
print('Imported',len(mapping),'icons in large and 16px sizes')
