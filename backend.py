#TODO: make a url map to restrict the files the client can access

from socket import *
import threading

from worker import worker

# use socket to send HTTP packets
# HTTP use TCP, so we use TCP
sock = socket(AF_INET, SOCK_STREAM)
sock.bind(('', 80))

# process many clients at a time
sock.listen()

print('The server is on')

# all the point
points = []

# the Lock so that `points` is not messed up
pointsLock = threading.Lock()

# for the long polling - only send data when `points` has new changes
workerSems = dict()

# for rendering DENCLUE's fig
dcLock = threading.Lock()

# main loop - to serve the web
while True:
	clientInfo = {}
	clientInfo['conSock'], clientInfo['addr'] = sock.accept()
	worker(clientInfo, points, pointsLock, workerSems, dcLock).run()

	# print(workerSems)
	# how to stop this loop and write points to a file?