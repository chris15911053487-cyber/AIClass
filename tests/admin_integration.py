"""Local-only admin workflow test. Needs the local Sites teacher cookie jar."""
import http.cookiejar,urllib.request,urllib.error,json,sqlite3,pathlib,copy
root=pathlib.Path(__file__).resolve().parents[1]
p=next(p for p in (root/'.wrangler/state/v3/d1/miniflare-D1DatabaseObject').glob('*.sqlite') if p.name!='metadata.sqlite')
conn=sqlite3.connect(p);before=conn.execute('SELECT key,value,revision,updated_at FROM content').fetchall()
jar=http.cookiejar.MozillaCookieJar('/tmp/academy-teacher-cookies.txt');jar.load(ignore_discard=True,ignore_expires=True)
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar));base='http://localhost:3000'
def req(op='admin',data=None):
 import subprocess
 cmd=['curl','-s','-b','/tmp/academy-teacher-cookies.txt','-H','Origin: '+base,'-H','Content-Type: application/json',base+'/api/platform?op='+op,'-w','\n%{http_code}']
 if data:cmd+=['--data-binary',json.dumps(data)]
 result=subprocess.check_output(cmd).decode();body,status=result.rsplit('\n',1)
 return int(status),json.loads(body)

try:
 status,a=req();assert status==200,a
 d=copy.deepcopy(a['live']);d['courses'][0]['title']='本地测试课程标题'
 status,s=req(data={'op':'save-draft','data':d,'revision':a['revision']});assert status==200,s
 assert req('catalog')[1]['courses'][0]['title']!='本地测试课程标题'
 assert req(data={'op':'save-draft','data':d,'revision':a['revision']})[0]==409
 bad=copy.deepcopy(d);bad['courses'][0]['lessons'][0]['answer']=99
 assert req(data={'op':'publish','data':bad,'revision':s['revision']})[0]==400
 status,pub=req(data={'op':'publish','data':d,'revision':s['revision']});assert status==200,pub
 public=req('catalog')[1];assert public['courses'][0]['title']=='本地测试课程标题'
 assert public['courses'][0]['version']==a['live']['courses'][0]['version']+1
 assert 'answer' not in public['courses'][0]['lessons'][0]
 print('PASS: owner access, draft save, unpublished isolation, edit conflict, invalid answer rejection, publish visibility, version increment, answer isolation (8 checks).')
finally:
 conn.execute('DELETE FROM content')
 conn.executemany('INSERT INTO content(key,value,revision,updated_at) VALUES(?,?,?,?)',before)
 conn.commit();conn.close()
