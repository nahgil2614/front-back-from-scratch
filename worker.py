import threading, sys

import utils

class worker:
    def __init__(self, clientInfo, points, pointsLock, workerSems):
        self.clientInfo = clientInfo
        self.points = points
        self.pointsLock = pointsLock
        self.wsems = workerSems

    def run(self):
        threading.Thread(target=self.serve).start()

    def serve(self):
        print('accepted')
        self.clientInfo['conSock'].settimeout(5)
        try:
            request = self.clientInfo['conSock'].recv(2048)
        except:
            print('nothing interesting, moving on')
            self.clientInfo['conSock'].close()
            sys.exit()

        print('===== CLIENT FROM {} ====='.format(self.clientInfo['addr']))
        print(request.decode())
        print()

        if request.startswith(b'GET'):
            requestedFile = request.split(b' ')[1][1:].decode()
            if not requestedFile:
                requestedFile = 'index.html'
            try:
                # send the payload with the client's IP address :)
                payload = utils.getFile(requestedFile)
            except:
                if requestedFile.startswith('getPoints'):
                    query = requestedFile.split('?')[1].split('&')
                    if query[0] == 'new':
                        self.wsems[int(query[1])] = threading.Semaphore(0)
                        payload = str(self.points)
                    else:
                        self.wsems[int(query[0])].acquire()
                        payload = str(self.points)
                else:
                    self.clientInfo['conSock'].send(utils.response404.encode())
                    self.clientInfo['conSock'].close()
                    sys.exit()
            
            if requestedFile == 'index.html':
                payload = payload.format(self.clientInfo['addr'])
            header = utils.header.format(len(payload))
            response = header + payload
            self.clientInfo['conSock'].send(response.encode())

        elif request.startswith(b'POST'):
            rheader, rpayload = request.split(b'\r\n\r\n')
            requestedRoute = rheader.split(b' ')[1][1:].decode()
            if requestedRoute == 'newPoint':
                self.clientInfo['conSock'].send(utils.response200.encode())
                x, y, color = rpayload.split(b',')
                
                # critical - shared b/w workers
                with self.pointsLock:
                    self.points.append([float(x), float(y), int(color)])
                    for wsem in self.wsems.values():
                        wsem.release()
            elif requestedRoute == 'removeColor':
                self.wsems.pop(int(rpayload))
            else:
                self.clientInfo['conSock'].send(utils.response404.encode())
                self.clientInfo['conSock'].close()
                sys.exit()

        self.clientInfo['conSock'].close()