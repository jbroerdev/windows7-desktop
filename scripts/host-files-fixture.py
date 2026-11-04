"""Private, temporary Unix HTTP agent used only by Linux integration tests."""
import http.server, socketserver, sys, json
from host_files import HostFiles

socket_path, state = sys.argv[1:]
files = HostFiles(state)
class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            data=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))))
            result=files.execute(self.path.removeprefix('/files/'),data);status=200
        except FileNotFoundError as error:result={'error':str(error)};status=404
        except FileExistsError as error:result={'error':str(error)};status=409
        except PermissionError as error:result={'error':str(error)};status=403
        except Exception as error:result={'error':str(error)};status=400
        raw=json.dumps(result).encode();self.send_response(status);self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    def log_message(self,*args):pass
class Server(socketserver.UnixStreamServer):pass
with Server(socket_path,Handler) as server:
    print('READY',flush=True)
    server.serve_forever()
