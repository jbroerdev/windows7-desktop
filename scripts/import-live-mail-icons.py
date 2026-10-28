"""Import original artwork; never redraw mail icons.

Arguments: Windows_7_Icon-Pack.zip, German Live Mail menu reference PNG,
Japanese Live Mail menu reference PNG. Numbers identify the NhatPG pack.
"""
import io,sys,zipfile
from collections import deque
from pathlib import Path
from PIL import Image

out=Path(__file__).resolve().parents[1]/'public/icons/live-mail'
out.mkdir(exist_ok=True)
with zipfile.ZipFile(sys.argv[1]) as archive:
    for name,number in {'menu-info':'152','menu-security':'069','nav-feeds':'284'}.items():
        file=next(n for n in archive.namelist() if n.endswith('/'+number+'.png'))
        image=Image.open(io.BytesIO(archive.read(file))).convert('RGBA')
        image.thumbnail((32,32),Image.Resampling.LANCZOS)
        image.save(out/(name+'.png'))

references=[Image.open(sys.argv[2]).convert('RGBA'),Image.open(sys.argv[3]).convert('RGBA')]
regions=[('menu-new',0,(7,53,41,87)),('menu-save',1,(7,96,41,130)),
         ('menu-print',1,(7,142,41,176)),('menu-import',0,(7,190,41,224)),
         ('menu-export',0,(7,234,41,268)),('menu-exit',0,(7,371,41,405)),
         ('menu-account',0,(206,103,238,132)),('menu-news',0,(205,145,239,179))]
for name,index,box in regions:
    image=references[index].crop(box)
    # Remove only the connected menu background. White inside the original
    # document/printer artwork stays intact; no shapes or colors are repainted.
    width,height=image.size
    backgrounds=[image.getpixel((width-1,y))[:3] for y in range(height)]
    queue=deque([(x,y) for x in range(width) for y in (0,height-1)]+[(x,y) for y in range(height) for x in (0,width-1)])
    seen=set()
    while queue:
        x,y=queue.popleft()
        if not(0<=x<width and 0<=y<height) or (x,y) in seen:continue
        seen.add((x,y));pixel=image.getpixel((x,y));background=backgrounds[y]
        if max(abs(pixel[c]-background[c]) for c in range(3))>14:continue
        image.putpixel((x,y),(*pixel[:3],0))
        queue.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
    image.thumbnail((32,32),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(32,32));canvas.alpha_composite(image,((32-image.width)//2,(32-image.height)//2))
    canvas.save(out/(name+'.png'))
