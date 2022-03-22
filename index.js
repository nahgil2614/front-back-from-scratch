// use this to minify the code
// https://skalman.github.io/UglifyJS-online/

let canvas = document.getElementById("myCanvas");
let ctx = canvas.getContext("2d");
let points;
let received = 0;
let myColor = Math.floor(Math.random() * 0x1000000);
let XHR;

let downloadBtn = document.getElementById('downloadBtn');
let dbscanBtn = document.getElementById('dbscanBtn');

downloadBtn.addEventListener('click', initialize_for_dbscan_and_optics);

getPoints(true);

if (!localStorage.hasOwnProperty('downloaded')) {
	localStorage.setItem('downloaded', 'F');
}
if (localStorage.getItem('downloaded') === 'F') {
	dbscanBtn.classList.add('disabled');
}
else {
	dbscanBtn.addEventListener('click', () => window.location='./dbscan.html');
}

// tidy up the color dictionary at the backend
// there would still be garbage, but it's better than nothing!
window.addEventListener('beforeunload', function(event) {
	if (typeof(XHR) !== 'undefined') XHR.abort(); // cancel the ongoing request for long polling

	let xhr = new XMLHttpRequest();
	xhr.open('POST', 'removeColor', true);
	xhr.send(myColor);
});

function getPoints(init=false) {
	let xhr = new XMLHttpRequest();
	xhr.open('GET', 'getPoints?' + (init ? 'new&' : '') + myColor);
	xhr.onload = function () {
		XHR = getPoints(); // long polling
	    points = JSON.parse(this.responseText);
	    drawPoints( points.slice( received ) );
	    received = points.length;
	};
	xhr.send();
	return xhr;
}

function draw(event) {
	let pos = getMousePos(canvas, event);
	drawPoint(pos, myColor);
	sendDataBack(pos);
}

// https://stackoverflow.com/a/17130415
function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
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

	let xhr = new XMLHttpRequest();
	xhr.open('POST', 'newPoint', true);
	xhr.onload = function () {
	    XHR = getPoints(); // long polling
	};
	xhr.send(pos.x + ',' + pos.y + ',' + myColor);
}

function initialize_for_dbscan_and_optics() {
	// preprocess the point
	points_ = points.map(tmp => [tmp[0] / 5, 100 - tmp[1] / 5]);

	let link = document.createElement('a');
    link.download = 'points1.json';
    link.href = "data:application/octet-stream;charset=utf-8;base64," + btoa(JSON.stringify({"dataset_name": "points1", "data": points_.map(pair => ({"x": pair[0], "y": pair[1]}))}));
    link.click();

    link.download = 'points2.json';
    link.href = "data:application/octet-stream;charset=utf-8;base64," + btoa(JSON.stringify(points_.concat([[-35.71428571428571,100],[135.71428571428572,0]])));
    link.click();

    // for DBSCAN
	localStorage.setItem('points', JSON.stringify(points_));

	if (localStorage.getItem('downloaded') === 'F') {
		localStorage.setItem('downloaded', 'T');
		dbscanBtn.classList.remove('disabled');
		dbscanBtn.addEventListener('click', () => window.location='./dbscan.html');
	}
}