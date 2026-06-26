import urllib.request
import json

token = "" # I will fetch a token from DB? Or just look at the error message.
req = urllib.request.Request("http://localhost:8000/api/v1/portal/asns", method="GET")
try:
    with urllib.request.urlopen(req) as f:
        print(f.read().decode())
except urllib.error.HTTPError as e:
    print(f"Error: {e.code} {e.reason}")
    print(e.read().decode())
