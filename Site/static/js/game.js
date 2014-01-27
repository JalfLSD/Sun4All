var circleSelected = null;
var spotCount = 0;
var clusterCount = 0;

var spots = new Array();
var clusters = new Array();

var taskId = 0;
var deferredTask;

var layer = new Kinetic.Layer();
var sun;
var stage;
var scale = 1;
var imageSize = 600;
var scaledImageSize = 600;
var inverted = false;
var currentImage = "";
var normalImage, invImage;
var selection = null;
var dragging = false;

var monthNames = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];

/* MISC Functions */
function ChangeImage(img, url) {
	img.src = url;
}

function openShareWindow(url) {
	window.open(url, "_blank", "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=yes, width=500, height=300");
}

document.onkeydown = function (evt) { 
	if (typeof evt.keyCode != "undefined" && evt.keyCode == 46) {
		removeSelectedCircle();
	}
};

/*** Main Functions ***/

function setupKinect() {
	stage = new Kinetic.Stage({
		container: 'pictureCanvas',
		width: imageSize,
		height: imageSize,
		x: 0,
		y: 0,
		draggable: false,
	});

	sun = new Kinetic.Image({
		x: 0,
		y: 0,
		id: "sunPicture",
		image: normalImage,
		width: imageSize,
		height: imageSize
	});

	// add the shape to the layer
	layer.add(sun);

	// add the layer to the stage
	stage.add(layer);

	stage.getContainer().addEventListener('mousedown', function(evt) {
		var shape = evt.targetNode;
		if (shape.className == "Circle") {
			setSelectedCircle(shape);
		} else {
			clearSelectedCircle();
		}

		var pos = stage.getMousePosition();
		if (selection != null) {
			if (selection.intersects(pos)) {
				document.body.style.cursor = 'move';
				return;
			}
			removeAreaSelection();
		}

		if (selection == null) {
			// Add a new selection
			pos.x -= stage.attrs.x;
			pos.y -= stage.attrs.y;
			selection = new Kinetic.Rect({
				x: pos.x / scale,
				y: pos.y / scale,
				width: 0,
				height: 0,
				id: "selection",
				stroke: 'red',
				strokeWidth: 1,
				draggable: true,
			});

			layer.add(selection);
			layer.draw();
			evt.cancelBubble = true;
			dragging = true;
		}
	});

	stage.getContainer().addEventListener('mouseup', function(evt) {
		dragging = false;
		document.body.style.cursor = 'default';

		if (selection != null && selection.getWidth() > 0) {
			// Enable buttons
			$("#btnAddSpot").removeAttr("disabled");
			$("#btnAddCluster").removeAttr("disabled");
		}
	});

	stage.getContainer().addEventListener('mousemove', function(evt) {
		if (dragging) {
			var pos = stage.getMousePosition();
			pos.x -= stage.attrs.x;
			pos.y -= stage.attrs.y;
			pos.x /= scale;
			pos.y /= scale;
			selection.attrs.width = pos.x - selection.attrs.x;
			selection.attrs.height = selection.attrs.width;
			layer.draw();
			evt.cancelBubble = true;
		}
	});

	// Keep the picture inside the div
	stage.on("dragmove", keepInViewPort);
	// Zoom events
	stage.getContainer().addEventListener("mousewheel", zoom, false);
	stage.getContainer().addEventListener("DOMMouseScroll", zoom, false); // firefox

	// Key mapping
	window.addEventListener('keydown', function(e) {
		var x = stage.attrs.x;
		var y = stage.attrs.y;
		if (e.keyCode == 37) //Left Arrow Key
			x += 10;
		if (e.keyCode == 38) //Up Arrow Key
			y += 10;
		if (e.keyCode == 39) //Right Arrow Key
			x -= 10;
		if (e.keyCode == 40) //Top Arrow Key
			y -= 10;

		// Refresh
		if (e.keyCode == 40 || e.keyCode == 39 || e.keyCode == 38 || e.keyCode == 37) {
			stage.setPosition(x, y);
			keepInViewPort();
			stage.draw();
		}
	});

	// Load images
	loadImages();
}

function invertImage() {
	inverted = !inverted;
	if (inverted) {
		$('#pictureCanvas').css('background-color', "black");
		sun.setImage(invImage);
	} else {
		$('#pictureCanvas').css('background-color', "white");
		sun.setImage(normalImage);
	}
	stage.draw();
}

function reset() {
	scale = 1;
	inverted = false;
	imageSize = 600;
	scaledImageSize = 600;
	stage.setPosition(0, 0);
	stage.setScale(scale);
	stage.draw();
}

function keepInViewPort(e) {
	if (stage.attrs.x < (imageSize - scaledImageSize)) {
		stage.attrs.x = imageSize - scaledImageSize;
	}
	if (stage.attrs.y < (imageSize - scaledImageSize)) {
		stage.attrs.y = imageSize - scaledImageSize;
	}
	if (stage.attrs.x > 0)
		stage.attrs.x = 0;
	if (stage.attrs.y > 0)
		stage.attrs.y = 0;
};

function doZoom(level) {
	stage.setScale(stage.getScale().x + level);
	// Avoid zoom-out
	if (stage.getScale().x < 1)
		stage.setScale(1);

	if (level > 0)
		stage.setPosition(stage.attrs.x - 2, stage.attrs.y - 2);
	else stage.setPosition(stage.attrs.x + 2, stage.attrs.y + 2);

	keepInViewPort();
	stage.draw();

	scale = stage.getScale().x + level;
	scaledImageSize = imageSize * scale;
}

function left() {
	var x = stage.attrs.x;
	var y = stage.attrs.y;
	x += 10; // left
	// Refresh
	stage.setPosition(x, y);
	keepInViewPort();
	stage.draw();
}

function right() {
	var x = stage.attrs.x;
	var y = stage.attrs.y;
	x -= 10; // left
	// Refresh
	stage.setPosition(x, y);
	keepInViewPort();
	stage.draw();
}

function up() {
	var x = stage.attrs.x;
	var y = stage.attrs.y;
	y += 10; // left
	// Refresh
	stage.setPosition(x, y);
	keepInViewPort();
	stage.draw();
}

function down() {
	var x = stage.attrs.x;
	var y = stage.attrs.y;
	y -= 10; // left
	// Refresh
	stage.setPosition(x, y);
	keepInViewPort();
	stage.draw();
}

function zoom(evt) {
	// cross-browser wheel delta
	var e = window.event || evt; // old IE support
	var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

	doZoom(delta * 0.030);
};

function loadImages() {
	// Loading..
	$('#pictureCanvas').hide();
	$('#loadingPicture').show();
	$("#btnInvert").attr('disabled', 'disabled');

	// Set the image description
	var parts = currentImage.split("_");
	var date = new Date('19' + parts[3], parts[2] - 1, parts[1]);
	$('#lblImage').text('This is an image taken in ' + monthNames[date.getMonth()] + ', ' + parts[1] + ' - 19' + parts[3]);

	normalImage = new Image();
	normalImage.onload = function () {
		// Show image
		$('#pictureCanvas').show();
		$('#loadingPicture').hide();

		sun.setImage(normalImage);
		stage.draw();
	};
	normalImage.src = "http://societic.ibercivis.es/sun4all/static/sunimages/" + currentImage;

	invImage = new Image();
	invImage.onload = function() {
		$("#btnInvert").removeAttr("disabled");
	};
	invImage.src = "http://societic.ibercivis.es/sun4all/static/sunimages/inv/" + currentImage;
}

function drawSelection(color) {
	var r = selection.attrs.width / 2;

	var circle = new Kinetic.Circle({
		radius: r,
		stroke: color,
		name: "spot",
		x: selection.attrs.x + r,
		y: selection.attrs.y + r,
		strokeWidth: 1
	});

	layer.add(circle);
	layer.draw();
	return circle;
}

function setSelectedCircle(circle) {
	circleSelected = circle;
	$("#removerSpotOrCluster").removeAttr("disabled");
}

function clearSelectedCircle() {
	circleSelected = null;
	$("#removerSpotOrCluster").prop("disabled", 'true');
}

function removeSelectedCircle() {
	if (circleSelected == null) return; 

	var r = circleSelected.attrs.radius;
	var entryType = circleSelected.getStroke() == 'yellow' ? 'spot' : 'cluster';
	var entry = createAnEntry(entryType, circleSelected.attrs.x - r, circleSelected.attrs.y - r, r * 2);
	
	if (entryType == 'spot') {
		spots.splice(spots.indexOf(entry), 1);
		spotCount--;
		$('#lblspotCount').text('Spots count: ' + spotCount);
	} else {
		clusters.splice(clusters.indexOf(entry), 1);
		clusterCount--;
		$('#lblclusterCount').text('Clusters count: ' + clusterCount);
	}
	
	circleSelected.remove();
	layer.draw();
	clearSelectedCircle();
}

function addSpot() {
	spots[spotCount] = createAnEntry("spot", selection.attrs.x, selection.attrs.y, selection.attrs.width);
	spotCount++;
	$('#lblspotCount').text('Spots count: ' + spotCount);
	circle = drawSelection("yellow");
	setSelectedCircle(circle);
	$('#pictureCanvas').show();
}

function addCluster() {
	clusters[clusterCount] = createAnEntry("cluster", selection.attrs.x, selection.attrs.y, selection.attrs.width);
	clusterCount++;
	$('#lblclusterCount').text('Clusters count: ' + clusterCount);
	circle = drawSelection("blue");
	setSelectedCircle(circle);
	$('#pictureCanvas').show();
}

function createAnEntry(type, posX, posY, shapeWidth) {
	return "~" + type + ":{" + posX + "," + posY + "," + shapeWidth + "," + shapeWidth + "}";
}

function startOver() {
	spotCount = 0;
	clusterCount = 0;
	spots = new Array();
	clusters = new Array();
	$('#lblclusterCount').text('Clusters count: ' + clusterCount);
	$('#lblspotCount').text('Spots count: ' + spotCount);

	//reset canvas
	var selections = layer.get('.spot');
	for (var i = 0; i < selections.length; i++)
		selections[i].remove();

	clearSelectedCircle();
	removeAreaSelection();
	reset();
	layer.draw();

	//reset textbox
	$('#txtObservation').val('');
}

function removeAreaSelection() {
	if (selection == null) return;

	selection.remove();
	selection = null;
	$("#btnAddSpot").prop("disabled", 'true');
	$("#btnAddCluster").prop("disabled", 'true');
}

//Start a new game round
function start(task, deferred) {
	// Get task info
	taskId = task.id;
	deferredTask = deferred;

	// start!
	currentImage = task.info.image;
	inverted = true;
	reset();
	loadImages();
}

function done() {
	var answer = spotCount + "~" + clusterCount + "~" + $('#txtObservation').val();
	// add spots
	for (i = 0; i < spotCount; i++) {
		answer += spots[i];
	}
	// add clusters
	for (i = 0; i < clusterCount; i++) {
		answer += clusters[i];
	}
	pybossa.saveTask(taskId, answer).done(
			function (data) {
				// Show dialog
				$('#completedDialog').modal('show');
				// Fade out the pop-up after a 1000 miliseconds
				//setTimeout(function() { $("#success").fadeOut() }, 1000);             
				startOver();
				deferredTask.resolve();
			});
}