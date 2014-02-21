var markSelected = null;
var spotCount = 0;
var clusterCount = 0;

var spots = new Array();
var clusters = new Array();

var taskId = 0;

var layer = new Kinetic.Layer();
var sun;
var stage;
var scale = 1;
var imageSize = 600;
var scaledImageSize = 600;
var inverted = false;
var currentImage = "";
var normalImage, invImage;
var clusterArea = null;
var DEFAULT_CROSS_WIDTH = 12;

/* MISC Functions */
function ChangeImage(img, url) {
	img.src = url;
}

function openShareWindow(url) {
	window.open(url, "_blank", "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=yes, width=500, height=300");
}

document.onkeydown = function (evt) { 
	if (typeof evt.keyCode != "undefined" && evt.keyCode == 46) {
		removeSelectedMark();
	}
};

$('body').on('mousedown', function(evt) {
	if (evt.target.tagName == "BODY") {
		document.body.style.cursor = 'default';	
		$("#btnAddSpot").removeAttr("disabled");
		$("#btnAddCluster").removeAttr("disabled");
		$("#removeSpotOrCluster").prop("disabled", 'true');	
	}
});

/*** Main Functions ***/

function handleMouseOverShape() {
	document.body.style.cursor = 'move';
}

function handleMouseOutShape() {
	if ($("#btnAddSpot").is(":disabled") ||
			$("#btnAddCluster").is(":disabled")) {
		document.body.style.cursor = 'crosshair';
	} else {
		document.body.style.cursor = 'default';	
	}
}

function handleMouseClickShape() {
	setSelectedMark(findMark(this));
}

function CrossShape(posX, posY, color, width) {
	this.width = width;

	this.shape = new Kinetic.Shape({
		x: posX,
		y: posY,
		drawFunc: function(context) {
			var halfWidth = width/2;
			context.beginPath();
			context.moveTo((-1)*halfWidth, 0);
			context.lineTo(halfWidth, 0);
			context.moveTo(0, (-1)*halfWidth);
			context.lineTo(0, halfWidth);
			context.closePath();
			context.fillStrokeShape(this);
		},
		drawHitFunc: function(context) {
			var startPointX = (-1)*(width/2);
			var startPointY = (-1)*(width/2);

			// a rectangle around the cross
			context.beginPath();
			context.moveTo(startPointX, startPointY);
			context.lineTo(startPointX+width, startPointY);
			context.lineTo(startPointX+width, startPointY+width);
			context.lineTo(startPointX, startPointY+width);
			context.closePath();
			context.fillStrokeShape(this);
		},				
		stroke: color,
		strokeWidth: 2,
		draggable: true
	});

	this.shape.on('mouseover', handleMouseOverShape);
	this.shape.on('mouseout', handleMouseOutShape);
	this.shape.on("click", handleMouseClickShape);
}

CrossShape.prototype.getShape = function(){
	return this.shape;
}

CrossShape.prototype.getPosition = function(){
	return this.shape.getPosition();
}

CrossShape.prototype.getWidth = function(){
	return this.width;
}

CrossShape.prototype.getClassName = function(){
	return "Cross";
}

function createCluster(posX, posY) {
	var origX = posX / scale;
	var origY = posY / scale;

	clusterArea = new Kinetic.Rect({
					x: origX,
					y: origY,
					width: 0,
					height: 0,
					id: "selection",
					stroke: 'blue',
					strokeWidth: 1,
					draggable: true,
				});
	
	clusterArea.on("mouseover", handleMouseOverShape);
	clusterArea.on("mouseout", handleMouseOutShape);
	clusterArea.on("click", handleMouseClickShape);

	clusters[clusterCount] = clusterArea;
	clusterCount++;
	$('#lblclusterCount').text(clusterCount);

	setSelectedMark(clusterArea);
	layer.add(clusterArea);
	layer.draw();
}

function createSpot(posX, posY) {
	var origX = posX / scale;
	var origY = posY / scale;
	var cross = new CrossShape(origX, origY, "yellow", DEFAULT_CROSS_WIDTH);

	spots[spotCount] = cross;
	spotCount++;
	$('#lblspotCount').text(spotCount);

	setSelectedMark(cross);
	layer.add(cross.getShape());
	layer.draw();
}

function createSpotEntry(posX, posY, shapeWidth) {
	return "~spot:{" + posX + "," + posY + "}";
}

function createClusterEntry(posX, posY, shapeWidth) {
	return "~cluster:{" + posX + "," + posY + "," + shapeWidth + "," + shapeWidth + "}";
}

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

		var target = evt.targetNode;

		if ($("#btnAddSpot").is(":enabled") && $("#btnAddCluster").is(":enabled") || 
				typeof target != "undefined" && target.className != "Image") return;

		var pos = stage.getMousePosition();
		pos.x -= stage.attrs.x;
		pos.y -= stage.attrs.y;

		if ($("#btnAddSpot").is(":disabled")) {
			createSpot(pos.x, pos.y);
		} else {
			createCluster(pos.x, pos.y);
		}
		evt.cancelBubble = true;
	});
	
	stage.getContainer().addEventListener('mouseup', function(evt) {
		if ($("#btnAddCluster").is(":enabled")) return;
		
		clusterArea = null;
	});

	stage.getContainer().addEventListener('mousemove', function(evt) {
		
		if ($("#btnAddCluster").is(":enabled")) return;
		
		if (clusterArea != null) {
			var pos = stage.getMousePosition();
			pos.x -= stage.attrs.x;
			pos.y -= stage.attrs.y;
			pos.x /= scale;
			pos.y /= scale;
			clusterArea.attrs.width = pos.x - clusterArea.attrs.x;
			clusterArea.attrs.height = clusterArea.attrs.width;
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

	if (level > 0) {
		stage.setPosition(stage.attrs.x - 2, stage.attrs.y - 2);
	}
	else {
		stage.setPosition(stage.attrs.x + 2, stage.attrs.y + 2);
	}

	keepInViewPort();
	stage.draw();

	scale = stage.getScale().x;
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
	$('#lblImage').text(getDataTakenInfo(date));

	normalImage = new Image();
	normalImage.onload = function () {
		// Show image
		$('#pictureCanvas').show();
		$('#loadingPicture').hide();

		sun.setImage(normalImage);
		stage.draw();
	};
	normalImage.src = "http://societic.ibercivis.es/sun4all/sunimages/" + currentImage;

	invImage = new Image();
	invImage.onload = function() {
		$("#btnInvert").removeAttr("disabled");
	};
	invImage.src = "http://societic.ibercivis.es/sun4all/sunimages/inv/" + currentImage;
}

function findMark(shape) {
	var marks = shape.getClassName() == 'Rect' ? clusters : spots;
	for (var i = 0; i < marks.length; i++) {
		var pos = shape.getPosition();
		var markPos = marks[i].getPosition();
		if (pos.x == markPos.x && pos.y == markPos.y) {
			return marks[i];
		}
	}
}

function setSelectedMark(mark) {
	markSelected = mark;
	$("#removeSpotOrCluster").removeAttr("disabled");
}

function clearSelectedMark() {
	markSelected = null;
	$("#removeSpotOrCluster").prop("disabled", 'true');
}

function removeSelectedMark() {
	if (markSelected == null) return; 

	var entryType = markSelected.getClassName() == 'Cross' ? 'spot' : 'cluster';

	if (entryType == 'spot') {
		spots.splice(spots.indexOf(markSelected), 1);
		spotCount--;
		$('#lblspotCount').text(spotCount);
		markSelected.getShape().remove();
		
	} else {
		clusters.splice(clusters.indexOf(markSelected), 1);
		clusterCount--;
		$('#lblclusterCount').text(clusterCount);
		markSelected.remove();
	}

	layer.draw();
	clearSelectedMark();
}

function enableAddSpot() {
	document.body.style.cursor = "crosshair";
	$("#btnAddSpot").prop("disabled", 'true');
	$("#btnAddCluster").removeAttr("disabled");
}

function enableAddCluster() {
	document.body.style.cursor = "crosshair";
	$("#btnAddCluster").prop("disabled", 'true');
	$("#btnAddSpot").removeAttr("disabled");
}

function startOver() {
	//reset canvas
	for (var i = 0; i < spots.length; i++)
		spots[i].getShape().remove();

	for (var i = 0; i < clusters.length; i++)
		clusters[i].remove();

	spotCount = 0;
	clusterCount = 0;
	spots = new Array();
	clusters = new Array();
	$('#lblclusterCount').text(clusterCount);
	$('#lblspotCount').text(spotCount);

	clearSelectedMark();
	reset();
	layer.draw();

	//reset textbox
	$('#txtObservation').val('');
}

//Start a new game round
function start(data) {

	var task = data.task;
	if ($.isEmptyObject(task)) return;

	// Get task info
	taskId = task.id;

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
		var spot = spots[i];
		var pos = spot.getPosition();
		answer += createSpotEntry(pos.x, pos.y);
	}
	// add clusters
	for (i = 0; i < clusterCount; i++) {
		var cluster = clusters[i];
		var pos = cluster.getPosition();
		answer += createClusterEntry(pos.x, pos.y, cluster.getWidth());
	}

	//console.log(answer);
	pybossa.saveTask(taskId, answer).done(
			function (data) {
				// Show dialog
				$('#completedDialog').modal('show');
				// Fade out the pop-up after a 1000 miliseconds
				//setTimeout(function() { $("#success").fadeOut() }, 1000);             
				startOver();
				pybossa.newTask(app_shortname).done(function(data) {
					start(data);
				});
			});
}
