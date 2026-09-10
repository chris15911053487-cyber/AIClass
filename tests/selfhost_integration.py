"""Test the configured local Docker/Node instance without revealing credentials."""
import os,json,re,urllib.request,urllib.error
from pathlib import Path
base=os.environ.get('ACADEMY_TEST_ORIGIN','http://127.0.0.1:8060')
secret=Path('.docker-admin-credentials.txt').read_text()
password=re.search(r'初始密码：([^\s]+)',secret).group(1)
def request(op='catalog',body=None,cookie=None,headers=None):
 h={'Origin':base,'Content-Type':'application/json',**(headers or {})}
 if cookie:h['Cookie']=cookie
 req=urllib.request.Request(base+'/api/platform?op='+op,data=json.dumps(body).encode() if body else None,headers=h)
 try:
  with urllib.request.urlopen(req) as r:return r.status,json.load(r),r.headers.get('Set-Cookie','').split(';')[0]
 except urllib.error.HTTPError as e:
  raw=e.read().decode()
  try:data=json.loads(raw)
  except:data={'error':raw[:100]}
  return e.code,data,''
assert request()[1]['adminAuth']=='password'
assert request('me',headers={'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'qqzhaohanqq@gmail.com'})[1]['user'] is None
assert request('admin')[0]==403
assert request(body={'op':'admin-login','username':'admin','password':'wrong-password'})[0]==401
status,_,cookie=request(body={'op':'admin-login','username':'admin','password':password});assert status==200
assert cookie.startswith('academy_session=')
status,admin,_=request('admin',cookie=cookie);assert status==200
original=admin['live'];revision=admin['revision'];draft=json.loads(json.dumps(original));draft['settings']['name']='Docker 测试学堂'
status,saved,_=request(body={'op':'save-draft','data':draft,'revision':revision},cookie=cookie);assert status==200,saved
assert request()[1]['settings']['name']==original['settings']['name']
assert request(body={'op':'save-draft','data':draft,'revision':revision},cookie=cookie)[0]==409
try:
 status,published,_=request(body={'op':'publish','data':draft,'revision':saved['revision']},cookie=cookie);assert status==200,published
 assert request()[1]['settings']['name']=='Docker 测试学堂'
 assert request(body={'op':'read','lessonId':'prompt-1'},cookie=cookie,headers={'Origin':'https://wrong.test'})[0]==403
finally:
 revision=request('admin',cookie=cookie)[1]['revision']
 assert request(body={'op':'publish','data':original,'revision':revision},cookie=cookie)[0]==200
assert request(body={'op':'logout'},cookie=cookie)[0]==200
assert request('admin',cookie=cookie)[0]==403
for path in ['/','/courses','/learn/prompt-1','/admin','/login','/api/health']:
 with urllib.request.urlopen(base+path) as r:assert r.status==200
print('PASS: independent admin login, spoofed identity rejected, draft isolation, publish, conflict handling, CSRF, logout, all key routes.')
