from pathlib import Path
p=Path('/yt2009/back/backend.js');s=p.read_text();s=s.replace('app.listen(config.port, () => {','app.listen(config.port, "127.0.0.1", () => {');p.write_text(s)
p=Path('/yt2009/back/yt2009utils.js');s=p.read_text();
for name,code in {
 'isAuthorized':'if(req.headers["x-desktop-user"]) return true;',
 'get_used_token':'if(req.headers["x-desktop-user"]) return req.headers["x-desktop-user"];',
 'get_subscriptions':'if(req.headers["x-desktop-subscriptions"]) return JSON.parse(Buffer.from(req.headers["x-desktop-subscriptions"], "base64url").toString());'
}.items():
 needle='"'+name+'": function(req) {'
 if needle not in s:raise ValueError('Unsupported upstream subscription/auth interface: '+name)
 s=s.replace(needle,needle+'\n        '+code,1)
p.write_text(s)
