// use this to minify the code
// https://skalman.github.io/UglifyJS-online/

var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var received = 0;
var myColor = Math.floor(Math.random() * 0x1000000);
var XHR;

getPoints(true);

// tidy up the color dictionary at the backend
// there would still be garbage, but it's better than nothing!
window.addEventListener('beforeunload', function(event) {
	if (typeof(XHR) !== 'undefined') XHR.abort(); // cancel the ongoing request for long polling

	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'removeColor', true);
	xhr.send(myColor);
});

/* working on long polling instead...
// get the data periodically
var intervalId = setInterval(function() {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'getPoints');
	xhr.onload = function () {
	    var points = JSON.parse(this.responseText);
	    drawPoints( points.slice( received ) );
	    received = points.length;
	};
	xhr.send();
}, 1000);

// clear the periodic function
// clearInterval(intervalId);
*/

function getPoints(init=false) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'getPoints?' + (init ? 'new&' : '') + myColor);
	xhr.onload = function () {
		XHR = getPoints(); // long polling
	    var points = JSON.parse(this.responseText);
	    drawPoints( points.slice( received ) );
	    received = points.length;
	};
	xhr.send();
	return xhr;
}

function draw(event) {
	var pos = getMousePos(canvas, event);
	drawPoint(pos, myColor);
	sendDataBack(pos);
}

// https://stackoverflow.com/a/17130415
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}

function drawPoint(pos, color) {
	ctx.beginPath();
	ctx.arc(pos.x, pos.y, 2.5, 0, 2 * Math.PI);
	ctx.fillStyle = '#' + color.toString(16);
	ctx.stroke()
	ctx.fill()
}

function drawPoints(pts) {
	//console.log(pts)
	for (let i = 0; i < pts.length; ++i) {
		drawPoint({x: pts[i][0], y: pts[i][1]}, pts[i][2]);
	}
}

function sendDataBack(pos) {
	while (typeof(XHR) == 'undefined');
	XHR.abort(); // cancel the ongoing request for long polling

	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'newPoint', true);
	xhr.onload = function () {
	    XHR = getPoints(); // long polling
	};
	xhr.send(pos.x + ',' + pos.y + ',' + myColor);
}