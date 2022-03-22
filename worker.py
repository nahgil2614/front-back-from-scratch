import threading
import sys
from socket import timeout
import numpy as np
import plotly.graph_objects as go

import utils
from denclue2D import Denclue2D

class worker:
    def __init__(self, clientInfo, points, pointsLock, workerSems, dcLock):
        self.clientInfo = clientInfo
        self.points = points
        self.pointsLock = pointsLock
        self.wsems = workerSems
        self.dcLock = dcLock

    def run(self):
        threading.Thread(target=self.serve).start()

    def serve(self):
        print('accepted')
        self.clientInfo['conSock'].settimeout(5)
        try:
            request = self.clientInfo['conSock'].recv(2048)
        except timeout:
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
            except OSError:
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
            
            # finish collecting data => start the computation for DENCLUE
            if requestedFile == 'dbscan.html' and self.clientInfo['addr'][0] == '127.0.0.1':
                threading.Thread(target=self.generate_denclue_html).start()

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
                toRemove = int(rpayload)
                if toRemove in self.wsems:
                    self.wsems.pop(toRemove)
            else:
                self.clientInfo['conSock'].send(utils.response404.encode())
                self.clientInfo['conSock'].close()
                sys.exit()

        self.clientInfo['conSock'].close()

    def generate_denclue_html(self):
        print('GENERATING...')
        with open('dcTemplate.html', 'r') as dcTpFile:
            dcHTML = dcTpFile.read()
        with self.pointsLock:
            x, y, _ = zip(*self.points)
        x, y = np.array(x) / 5, 100 - np.array(y) / 5

        fig = go.Figure(data=[go.Scatter(
            x = x,
            y = y,
            mode = 'markers',)
        ])

        # fig.update_xaxes(range=(np.linspace(0, 100, 50),[]))
        # fig.update_yaxes(range=(np.linspace(0, 100, 50),[]))
        originalDatasetDiv = fig.to_html(include_plotlyjs=False, full_html=False, default_width=400, default_height=400)

        dc = Denclue2D(x, y)
        dcDiv = dc.render_dens_fig()
        dcHTML = dcHTML.replace('{% Original data set %}', originalDatasetDiv).replace('{% The plot %}', dcDiv)
        with self.dcLock:
            with open('denclue.html', 'w') as dcFile:
                dcFile.write(dcHTML)
