# the most basic response
header = '''HTTP/1.1 200 OK
Content-Length: {}
Content-Type: text/html
Connection: keep-alive

'''

response200 = '''HTTP/1.1 200 OK
Connection: keep-alive

'''

response404 = '''HTTP/1.1 404 Not Found
Connection: close

'''

def getFile(file):
	index = open(file, 'r')
	payload = index.read()
	index.close()
	return payload