MINIMUM_CANVAS_WIDTH = 0;
MINIMUM_CANVAS_HEIGHT = 0;

/** Global function to hide the game canvas HTML element
	if the screen is too small to display it. */
function check_display_canvas() {
	if (window.innerWidth < MINIMUM_CANVAS_WIDTH) {
		document.getElementById("canvas").style.visibility = "hidden";
		document.getElementById("canvas").height = 0;
		document.getElementById("canvas-message").style.visibility = "visible";
	} else {
		document.getElementById("canvas").style.visibility = "visible";
		document.getElementById("canvas").height = MINIMUM_CANVAS_HEIGHT;
		document.getElementById("canvas-message").style.visibility = "hidden";
	}
}

/** Represents an HTML canvas on which a game is
	being played. */
function GameCanvas(width, height, groundLevel) {
	var thisCanvas = this;

	// Canvas properties
	this.canvas = document.createElement("canvas");
	this.canvasWidth = width || 800;
	MINIMUM_CANVAS_WIDTH = this.canvasWidth;
	this.canvasHeight = height || 600;
	MINIMUM_CANVAS_HEIGHT = this.canvasHeight;

	/** Creates the working game canvas for any browser. */
	this.prepare_canvas = function(canvasDiv) {
		// Create the canvas in a way that works with IE.
		this.canvas.setAttribute("width", this.canvasWidth);
		this.canvas.setAttribute("height", this.canvasHeight);
		this.canvas.setAttribute("id", "canvas");
		this.canvas.setAttribute("class", "canvas");
		canvasDiv.appendChild(this.canvas);
		
		if (typeof G_vmlCanvasManager != "undefined") {
			this.canvas = G_vmlCanvasManager.initElement(this.canvas);
		}

		this.context = document.getElementById("canvas").getContext("2d");
	}

	// Level properties
	this.levelOrder = [];
	this.levelDict = {};
	this.currentLevelName = "";

	/** Add a new level to this gameCanvas. */
	this.add_level = function(levelName, levelJSON) {
		var newLevel = new GameLevel(this, levelJSON);
		this.levelOrder.push(levelName);
		this.levelDict[levelName] = newLevel;
	}

	/** Change the level to the next in sequence, or the
		first if currently on the last level. */
	this.load_next_level = function() {
		this.reset_canvas();

		var levelName = this.currentLevelName;
		var levelIndex = this.levelOrder.indexOf(levelName);

		if (levelIndex+1 === this.levelOrder.length) {
			this.reset_game_timer();
			levelName = this.levelOrder[0];
		} else {
			levelName = this.levelOrder[levelIndex+1];
		}

		this.load_level(levelName);
	}

	/** Load current level settings to the canvas. */
	this.load_level = function(levelName) {
		this.currentLevelName = levelName;
		this.currentLevel = this.levelDict[levelName];

		this.load_default_boundaries();
		this.currentLevel.add_boxes(this.currentLevel.levelJSON["boxes"]);
		this.currentLevel.add_platforms(this.currentLevel.levelJSON["platforms"]);
		this.currentLevel.add_walls(this.currentLevel.levelJSON["walls"]);
		this.currentLevel.add_npcs(this.currentLevel.levelJSON["NPCs"]);

		this.spawn_player();
	}

	/** Spawn a new player character to the canvas. */
	this.spawn_player = function() {
		var xSpawn = this.currentLevel.levelJSON.xSpawn;
		var ySpawn = this.currentLevel.levelJSON.ySpawn;
		var player1 = this.currentLevel.add_npc(xSpawn, ySpawn);
		var bindings = new KeyBindings(player1);
		bindings.bind_defaults();
	}

	// Playtime object arrays
	this.platformAreas = [];
	this.wallAreas = [];
	this.characterList = [];

	/** Remove level assets from the gameWorld. */
	this.reset_canvas = function() {
		this.currentLevel.clear_intervals();
		this.currentLevel.objects.length = 0;
		this.platformAreas.length = 0;
		this.wallAreas.length = 0;
		this.characterList.length = 0;
	}

	/** Add two walls and two platforms to the canvas
		to form boundaries at the edges. */
	this.load_default_boundaries = function() {
		var level = this.currentLevel;
		level.add_wall(0, 0, this.canvasHeight);
		level.add_wall(this.canvasWidth, 0, this.canvasHeight);
		level.add_platform(0, this.canvasWidth, 0, true);
		level.add_platform(0, this.canvasWidth, this.canvasHeight);
	}

	/** Load an image to HTML from the /images/ folder. 
		Begin the animations for that image. */
	this.load_image = function(name, location) {
		if (!(name in this.images)) {
			this.images[name] = new Image();
			this.images[name].onload = this.resource_loaded();
			this.images[name].src = "images/" + location;
		}
	}

	/** Add resource to total number on page and draw_canvas_frame. 
		Needs the gameCanvas as a parameter since it is called 
		from an image element onload(). */
	this.resource_loaded = function() {
		this.numResourcesLoaded += 1;

		if (this.numResourcesLoaded === this.startDrawingLimit) {
			this.attemptDrawInterval = setInterval(function(){
				thisCanvas.attempt_draw_frame();
			}, 1000/this.canvasFPS);
		}
	}

	/** Attempt to draw the next frame of the canvas. */
	this.attempt_draw_frame = function() {
		if (!this.isPaused) {
			this.draw_canvas_frame();
			thisCanvas.numFramesDrawn += 1;
		}
	}

	/** Redraw all images on the canvas. */
	this.draw_canvas_frame = function() {
		this.clear_canvas();
		this.context.font = "12px sans-serif";

		if (this.displayFPS) {
			this.draw_fps();
		}

		if (this.displayCurrentTime) {
			this.draw_current_time();
		}

		if (this.bestSecondsPlayed !== 0.0) {
			this.draw_best_time();
		}

		if (this.displayLevelName) {
			this.draw_level_name();
		}

		this.characterList.forEach(function(character) {
			character.draw();
		});

		this.currentLevel.objects.forEach(function(object) {
			object.draw();
		});
	}

	/** Clear the canvas before drawing another frame. */
	this.clear_canvas = function() {
		this.canvas.width = this.canvas.width;		
	}

	// Physics properties
	this.groundLevel = groundLevel || 0;
	this.groundOffset = this.canvasHeight - this.groundLevel;
	this.images = {};
	this.numResourcesLoaded = 0;
	this.startDrawingLimit = 9; //images loaded
	this.numFramesDrawn = 0;

	// Gravity properties
	this.gravityRate = 15;
	this.gravityAmount = 3;
	this.gravityInterval = setInterval(function(){
		thisCanvas.tick_gravity();
	}, this.gravityRate);

	/** Reduce each character's yPosition until it
		reaches the ground or a solid object. */
	this.tick_gravity = function() {
		for (var ii=0; ii<this.characterList.length; ii++) {
			var thisChar = this.characterList[ii];

			if (!thisChar.is_at_yfloor()
					&& !thisChar.isJumping) {
				thisChar.yPosition -= this.gravityAmount;

				if (!thisChar.isAirborne) {
					thisChar.start_falling();
				}
			}
		}
	}

	this.canvasFPS = 30;
	this.currentFPS = 0;
	this.displayFPS = false;
	
	/** Add the fps tracker to this canvas. */
	this.add_fps = function() {
		this.displayFPS = true;

		// Start interval to track frames per second
		this.fpsInterval = setInterval(function(){
			thisCanvas.update_fps();
		}, 1000);
	}
	
	/** Update the fps for this canvas. */
	this.update_fps = function() {
		this.currentFPS = this.numFramesDrawn;
		this.numFramesDrawn = 0;
	}

	/** Create fps monitor in bottom left of screen */
	this.draw_fps = function() {
		fpsText = ("fps: " + this.currentFPS + "/" + this.canvasFPS
					+ " (" + this.numFramesDrawn + ")");
		this.context.fillText(fpsText, 5, this.canvasHeight-5);
	}

	this.currentSecondsPlayed = 0.0;
	this.bestSecondsPlayed = 0.0;
	this.displayCurrentTime = false;
	this.displayBestTime = false;
	
	/** Add the timer to this canvas. */
	this.add_timer = function() {
		this.displayCurrentTime = true;
		this.displayBestTime = true;

		// Start interval to track frames per second
		this.timerInterval = setInterval(function(){
			thisCanvas.update_timer();
		}, 100);
	}
	
	/** Update the timer for this game world. */
	this.update_timer = function() {
		if (!this.isPaused) {
			this.currentSecondsPlayed += 0.1;
		}
	}
	
	/** Reset the game timer and recalc the best time recorded. */
	this.reset_game_timer = function() {
		if (this.currentSecondsPlayed < this.bestSecondsPlayed
				|| this.bestSecondsPlayed == 0.0) {
			this.bestSecondsPlayed = this.currentSecondsPlayed;
		}
		this.currentSecondsPlayed = 0.0;
	}

	/** Draw the current playtime of this character. */
	this.draw_current_time = function() {
		var timerText = ("Current Time: " + this.currentSecondsPlayed.toFixed(1));
		this.context.fillText(timerText, 5, 35);
	}

	/** Draw the best playtime of this character. */
	this.draw_best_time = function() {
		var timerText = ("Best Time: " + this.bestSecondsPlayed.toFixed(1));
		this.context.fillText(timerText, 5, 50);
	}

	this.displayLevelName = false;

	/** Draw level name in top left of window. */
	this.draw_level_name = function() {
		var levelName = this.currentLevel.levelJSON['name'];
		var previousFont = this.context.font;
		this.context.font = "bold 16px sans-serif";
		this.context.fillText(levelName, 5, 20);
		this.context.font = previousFont;
	}

	this.isPaused = false;
	
	/** Pause all motion on this GameCanvas. */
	this.pause = function() {
		this.isPaused = true;
		clearInterval(this.gravityInterval);
	}
	
	/** Restore all motion on this GameCanvas. */
	this.unpause = function() {
		this.isPaused = false;
		this.gravityInterval = setInterval(function(){
			thisCanvas.tick_gravity();
		}, this.gravityRate);
	}
}


/** Represents a level of the game. */
function GameLevel(gameCanvas, levelJSON) {
	var thisLevel = this;

	this.gameCanvas = gameCanvas;
	this.levelJSON = levelJSON;
	this.intervals = [];
	this.objects = [];

	/** Clear all intervals associated with objects in this level. */
	this.clear_intervals = function() {
		this.intervals.forEach(function(interval){
			clearInterval(interval);
		});
	}

	/** Add a box object to the gameCanvas. */
	this.add_box = function (xLeft, xRight, yBottom, yHeight, isFatal, isEndpoint) {
		var isFatal = isFatal || false;
		var isEndpoint = isEndpoint || false;
		var yTop = yBottom + yHeight;

		this.add_platform(xLeft, xRight, yTop, isFatal, isEndpoint);
		this.add_platform(xLeft, xRight, yBottom);
		this.add_wall(xLeft, yBottom, yHeight);
		this.add_wall(xRight, yBottom, yHeight);
	}

	/** Add a list of box objects from JSON to this level. */
	this.add_boxes = function (boxArgs) {
		var boxArgs = boxArgs || [];
		boxArgs.forEach(function (box){
			thisLevel.add_box(box.xLeft, box.xRight, box.yBottom,
						 	  box.yHeight, box.isFatal, box.isEndpoint);
		});
	}

	/** Add a platform object to the gameCanvas. */
	this.add_platform = function (xLeft, xRight, yBottom, isFatal, isEndpoint) {
		var isFatal = isFatal || false;
		var isEndpoint = isEndpoint || false;
		var newPlatform = new CanvasLine(this.gameCanvas, xLeft, yBottom, 
									 	 xRight, yBottom, isFatal, isEndpoint);
		this.objects.push(newPlatform);
		this.gameCanvas.platformAreas.push([xLeft, xRight, yBottom]);
	}

	/** Add a list of platform objects from JSON to this level. */
	this.add_platforms = function (platformArgs) {
		var platformArgs = platformArgs || [];
		platformArgs.forEach(function (plat){
			thisLevel.add_platform(plat.xLeft, plat.xRight, plat.yBottom, 
								   plat.isFatal, plat.isEndpoint);
		});
	}

	/** Add a wall object to the gameCanvas. */
	this.add_wall = function (xPosition, yBottom, yHeight) {
		var newWall = new CanvasLine(this.gameCanvas, xPosition, yBottom, 
									 xPosition, yBottom+yHeight);
		this.objects.push(newWall);
		this.gameCanvas.wallAreas.push([xPosition, yBottom, yHeight]);
	}

	/** Add a list of wall objects from JSON to this level. */
	this.add_walls = function (wallArgs) {
		var wallArgs = wallArgs || [];
		wallArgs.forEach(function (wall){
			thisLevel.add_wall(wall.xPosition, wall.yBottom, wall.yHeight);
		});
	}

	/** Add a new character to this gameCanvas. */
	this.add_npc = function (xPosition, yPosition) {
		var xPosition = xPosition || 0;
		var yPosition = yPosition || 0;

		var newNPC = new GameCharacter(this.gameCanvas, xPosition, yPosition);
		newNPC.load_assets();
		this.gameCanvas.characterList.push(newNPC);

		return newNPC;
	}

	/** Add a list of npc objects from JSON to this level. */
	this.add_npcs = function (npcArgs) {
		var npcArgs = npcArgs || [];
		npcArgs.forEach(function (npc){
			thisLevel.add_npc(npc.xPosition, npc.yPosition);
		});
	}
}


/** Represents a line on the game canvas. */
function CanvasLine(gameCanvas, xStart, yStart, xEnd, yEnd, isFatal, isEndpoint) {
	var thisLine = this;

	this.gameCanvas = gameCanvas;
	this.xStart = xStart;
	this.yStart = yStart;
	this.xEnd = xEnd;
	this.yEnd = yEnd;
	this.isFatal = isFatal || false;
	this.isEndpoint = isEndpoint || false;
	this.tickRate = 500;

	/** Draw this line on the canvas. */
	this.draw = function () {
		var yStartFixed = this.gameCanvas.groundOffset - this.yStart;
		var yEndFixed = this.gameCanvas.groundOffset - this.yEnd;

		// Draw the wall on the canvas
		var context = this.gameCanvas.context;
		context.beginPath();
		context.moveTo(this.xStart, yStartFixed);
		context.lineTo(this.xEnd, yEndFixed);
		context.stroke();
		context.closePath();
	}

	if (this.isFatal) {
		var level = this.gameCanvas.currentLevel;
		level.intervals.push(setInterval(function(){
			thisLine.tick_check_fatalities();
		}, this.tickRate));
	}

	/** Check if each active character in the gameWorld is on this 
		line, and if it is, kill and respawn it. */
	this.tick_check_fatalities = function() {
		this.gameCanvas.characterList.forEach(function(character){
			if (character.is_on_line(thisLine)) {
				character.respawn();
			}
		});
	}

	if (this.isEndpoint) {
		var level = this.gameCanvas.currentLevel;
		level.intervals.push(setInterval(function(){
			thisLine.tick_check_endpoints();
		}, this.tickRate));
	}

	/** Check if each active character in the gameWorld is on this 
		line, and if it is, teleport it to the next level. */
	this.tick_check_endpoints = function() {
		this.gameCanvas.characterList.forEach(function(character){
			if (character.is_on_line(thisLine)) {
				thisLine.gameCanvas.load_next_level();
			}
		});
	}
}


/** Represents an in-game character. */
function GameCharacter(gameCanvas, xPosition, yPosition) {
	var thisChar = this;

	// Related objects
	this.gameCanvas = gameCanvas;

	// Character states
	this.isFacingLeft = false;
	this.isPlanningMovement = false;
	this.isWalking = false;
	this.isRunning = false;
	this.isAirborne = false;
	this.isJumping = false;

	// Positional properties
	this.xPosition = xPosition || 100;
	this.yPosition = yPosition || 0;
	this.yFloor = 0;
	this.yCeiling = this.gameCanvas.canvasHeight;

	// Collision properties
	this.xCollisionRadius = 60;
	this.yCollisionHeight = 120;

	/** Return true if this character is colliding with a wall. */
	this.is_colliding = function() {
		// Recalculate characters collision box based on direction
		if (this.isFacingLeft) {
			var xCollisionLeft = this.xPosition - this.xCollisionRadius;
			var xCollisionRight = this.xPosition;
		} else {
			var xCollisionLeft = this.xPosition;
			var xCollisionRight = this.xPosition + this.xCollisionRadius;
		}

		// Check every wall in the character"s game world
		wallAreas = this.gameCanvas.wallAreas;
		for (var ii=0; ii<wallAreas.length; ii++) {
			var area = wallAreas[ii];
			var wallXPosition = area[0];
			var wallBottomY = area[1];
			var wallTopY = area[1] + area[2];

			// Is this wall within the characters collision box?
			// and is the character vertically within the walls
			// top and bottom vertical position
			if (xCollisionLeft <= wallXPosition
					&& xCollisionRight >= wallXPosition
					&& (thisChar.yPosition + thisChar.yCollisionHeight) >= wallBottomY
					&& thisChar.yPosition < wallTopY) {
				return true;
			}
		}

		return false;
	}

	// Default images for now
	this.characterImages = [
		{
			"imageID": "soldier-helmet",
			"imageLocation": "soldier-helmet.png",
			"xOffset": -23,
			"yOffset": 120,
		}, {
			"imageID": "head",
			"imageLocation": "head.png",
			"xOffset": -18,
			"yOffset": 105,
		}, {
			"imageID": "torso",
			"imageLocation": "torso.png",
			"xOffset": -20,
			"yOffset": 80,
		}, {
			"imageID": "legs",
			"imageLocation": "legs.png",
			"xOffset": -20,
			"yOffset": 40,
		}, {
			"imageID": "legs-jump",
			"imageLocation": "legs-jump.png",
			"xOffset": -20,
			"yOffset": 40,
		}, {
			"imageID": "front-arm",
			"imageLocation": "front-arm.png",
			"xOffset": -25,
			"yOffset": 70,
		}, {
			"imageID": "front-arm-jump",
			"imageLocation": "front-arm-jump.png",
			"xOffset": -45,
			"yOffset": 75,
		}, {
			"imageID": "back-arm",
			"imageLocation": "back-arm.png",
			"xOffset": 10,
			"yOffset": 70,
		}, {
			"imageID": "back-arm-jump",
			"imageLocation": "back-arm-jump.png",
			"xOffset": 20,
			"yOffset": 75,
		}
	];

	/** Return true if this character is on a line. */
	this.is_on_line = function(canvasLine) {
		if (this.yPosition === canvasLine.yStart
				&& this.xPosition >= canvasLine.xStart
				&& this.xPosition <= canvasLine.xEnd) {
			return true;
		} else {
			return false;
		}
	}

	/** Find the highest object below the character and set its
		floor so that it does not fall below it. */
	this.find_yfloor = function() {
		var newYFloor = 0;

		// Check every platform in the character"s game world
		this.gameCanvas.platformAreas.forEach(function(area){
			var platformStartX = area[0];
			var platformEndX = area[1];
			var platformY = area[2];

			// Is this character above the current platform,
			// within its horizontal boundaries, and is the platform
			// above all other platforms the character above?
			if (thisChar.yPosition >= platformY
					&& thisChar.xPosition >= platformStartX
					&& thisChar.xPosition <= platformEndX
					&& platformY > newYFloor) {
				newYFloor = platformY;
			}
		});

		this.yFloor = newYFloor;
	}

	/** Return true if this character is on a platform
		or would be the next time gravity ticks. */
	this.is_at_yfloor = function() {
		this.find_yfloor();

		var nextYPosition = this.yPosition - this.gameCanvas.gravityAmount;
		
		if (nextYPosition <= this.yFloor) {
			this.yPosition = this.yFloor;
			return true;
		} else {
			return false;
		}
	}

	/** Find the lowest object above the character and set its
		ceiling so that it cannot jump above it. */
	this.find_yceiling = function() {
		var newYCeiling = this.gameCanvas.canvasHeight;

		// Check every platform in the character"s game world
		this.gameCanvas.platformAreas.forEach(function(area){
			var platformStartX = area[0];
			var platformEndX = area[1];
			var platformY = area[2];

			// Is this character below the current platform,
			// within its horizontal boundaries, and is the platform
			// below all other platforms the character below?
			if (thisChar.yPosition <= platformY
					&& thisChar.xPosition >= platformStartX
					&& thisChar.xPosition <= platformEndX
					&& platformY < newYCeiling
					&& platformY > thisChar.yPosition) {
				newYCeiling = platformY;
			}
		});

		this.yCeiling = newYCeiling;
	}

	/** Return true if this character is directly below a platform. */
	this.is_below_yceiling = function() {
		this.find_yceiling();
		var headLevel = this.yPosition + this.yCollisionHeight;
		if (headLevel <= this.yCeiling) {
			return true;
		} else {
			return false;
		}
	}

	/** Movement properties */
	this.stepSize = 12;
	this.stepsPerSecond = 30;
	this.millisBeforeMovementStop = 100;
	this.jumpHeight = 120;
	this.runMultiplier = 2;
	this.millisBeforeRunStop = 2000;

	/** Breathing properties */
	this.breathDirection = 1;
	this.breathInc = 0.1;
	this.currentBreath = 0;
	this.breathMax = 2;
	this.breathInterval = setInterval(function(){
		thisChar.update_breath();
	}, 1000/this.gameCanvas.canvasFPS);

	/** Blinking properties */
	this.maxEyeHeight = 10;
	this.curEyeHeight = this.maxEyeHeight;
	this.eyeOpenTime = 0;
	this.timeBtwBlinks = 4000;
	this.blinkUpdateTime = 200;
	this.blinkInterval = setInterval(function(){
		thisChar.update_blink();
	}, this.blinkUpdateTime);

	/** Load the images needed for this character to 
		the parent gameCanvas. */
	this.load_assets = function() {
		var gameCanvas = this.gameCanvas;
		this.characterImages.forEach(function(image){
			gameCanvas.load_image(image.imageID, image.imageLocation);
		});
	}

	/** Draw a single frame of this character on the canvas. */
	this.draw = function() {
		var xPosAdjusted = this.xPosition;
		var yPosAdjusted = (this.gameCanvas.groundOffset
						    - this.yPosition);

	 	// Draw the character in a reverse position if facing left
	 	if (this.isFacingLeft) {
	 		this.gameCanvas.context.scale(-1, 1);
	 		xPosAdjusted *= -1;
 		}

		// Set the character"s dynamic images if jumping or falling
		if (this.isAirborne) {
			var backArm = this.characterImages[8];
			var frontArm = this.characterImages[6];
			var legs = this.characterImages[4];
		} else {
			var backArm = this.characterImages[7];
			var frontArm = this.characterImages[5];
			var legs = this.characterImages[3];
		}

		// Set character static images
		var torso = this.characterImages[2];
		var head = this.characterImages[1];
		var hat = this.characterImages[0];

		// Draw each part of the character
 		this.draw_shadow(xPosAdjusted);

		this.draw_image(backArm, xPosAdjusted, yPosAdjusted, this.currentBreath);
		this.draw_image(legs, xPosAdjusted, yPosAdjusted, 0);
 		this.draw_image(torso, xPosAdjusted, yPosAdjusted, 0);
		this.draw_image(frontArm, xPosAdjusted, yPosAdjusted, this.currentBreath);
 		this.draw_image(head, xPosAdjusted, yPosAdjusted, this.currentBreath);
 		this.draw_image(hat, xPosAdjusted, yPosAdjusted, this.currentBreath);

 		this.draw_eyes(xPosAdjusted, yPosAdjusted);

	 	// Flip the canvas back around after drawing
	 	if (this.isFacingLeft) {
	 		this.gameCanvas.context.scale(-1, 1);
 		}
	}

	/** Draw a single image based on imageArgs, etc. */
	this.draw_image = function(imageArgs, xPos, yPos, breathOffset) {
 		var imageToDraw = this.gameCanvas.images[imageArgs["imageID"]];
 		var drawWidth = xPos + imageArgs["xOffset"];
 		var drawHeight = (yPos - imageArgs["yOffset"] - breathOffset);
 		this.gameCanvas.context.drawImage(imageToDraw, drawWidth, drawHeight);
	}

	/** Draw the character"s shadow for the current frame. */
	this.draw_shadow = function(centerX) {
		var centerY = this.gameCanvas.groundOffset - this.yFloor;
		var shadowWidth = (100 - this.currentBreath
						   - (this.yPosition - this.yFloor) * 0.8);
		if (shadowWidth > 0) {
			this.draw_ellipse(centerX+5, centerY, shadowWidth, 4);
		}
	}

	/** Draw the character"s eyes for the current frame. */
	this.draw_eyes = function(xPos, yPos) {
	 	var eyeHeight = yPos - 88 - this.currentBreath;
		this.draw_ellipse(xPos+6, eyeHeight, 6, this.curEyeHeight);
		this.draw_ellipse(xPos+16, eyeHeight, 6, this.curEyeHeight);
	}

	/** Draw an ellipse on the canvas. */
	this.draw_ellipse = function(centerX, centerY, width, height, color) {
	 	var context = this.gameCanvas.context;

		// Calculate coordinates for drawing curves
		var leftX = centerX - width/2;
		var rightX = centerX + width/2;
		var topY = centerY - height/2;
		var bottomY = centerY + height/2;

		// Draw the left and right curves of the ellipse
		context.beginPath();
		context.moveTo(centerX, topY);
		context.bezierCurveTo(rightX, topY, rightX, bottomY, centerX, bottomY);
		context.bezierCurveTo(leftX, bottomY, leftX, topY, centerX, topY);

		// Fill the ellipse with color
		context.fillStyle = color || "black";
		context.fill();

		context.closePath();
	}

	/** Determine whether the character should breathe in or out next. */
	this.update_breath = function() {
		if (this.breathDirection === 1) {
			// Breath in (character rises)
			this.currentBreath -= this.breathInc;
			if (this.currentBreath < -this.breathMax) {
				this.breathDirection = -1;
			}
		} else { 
			// Breath out (character falls)
			this.currentBreath += this.breathInc;
			if(this.currentBreath > this.breathMax) {
				this.breathDirection = 1;
			}
		}
	}

	/** Determine whether the character should blink next. */
	this.update_blink = function() {
		this.eyeOpenTime += this.blinkUpdateTime;

		if (this.eyeOpenTime >= this.timeBtwBlinks) {
			this.animate_blink();
		}
	}

	/** Make the character blink over a few frames. */
	this.animate_blink = function() {
		thisChar.curEyeHeight -= 1;
		if (thisChar.curEyeHeight <= 0) {
			thisChar.eyeOpenTime = 0;
			thisChar.curEyeHeight = thisChar.maxEyeHeight;
		} else {
			thisChar.blinkTimeout = setTimeout(thisChar.animate_blink, 10);
		}
	}

	/** Make the character jump as much as it is able. */
	this.attempt_jump = function() {
		if (!this.isAirborne) {
			this.isJumping = true;

			var jumpIncrement = this.jumpHeight / 12;
			var maxHeight = this.yPosition + this.jumpHeight;
			this.jumpUpInterval = setInterval(function(){
				thisChar.ascend(maxHeight, jumpIncrement);
			}, this.gameCanvas.gravityRate);

			this.start_falling();
		}
	}

	/** Make the character ascend upward. */
	this.ascend = function(maxHeight, jumpIncrement) {
		if (thisChar.yPosition < maxHeight) {
			thisChar.yPosition += jumpIncrement;
		} else {
			clearInterval(thisChar.jumpUpInterval);
			thisChar.isJumping = false;
		}
	}

	/** Make the character fall. */
	this.start_falling = function() {
		this.isAirborne = true;
		this.checkAirborneInterval = setInterval(function(){
			if (thisChar.is_at_yfloor()) {
				thisChar.end_hangtime();
			}
		}, 50);
	}

	/** Land after hanging in the air from
		falling or jumping. */
	this.end_hangtime = function() {
		thisChar.isAirborne = false;
		clearInterval(thisChar.checkAirborneInterval);
		if (!thisChar.isPlanningMovement) {
			thisChar.attempt_movement_stop();
		}
	}

	/** Make the character walk. */
	this.start_walking = function() {
    	clearTimeout(this.stopMovingTimeout);
		if (!this.is_colliding()) {
			this.step_forward();

			// Reset the step interval
			if (this.isWalking) {
				clearInterval(this.stepInterval);

				this.stepInterval = setInterval(function(){
					if (!thisChar.is_colliding()) {
						thisChar.step_forward();
					}
				}, 1000/this.stepsPerSecond);
			}
		}
	}

	/** Step in the directino the character is facing. */
	this.step_forward = function() {
		var stepAmount = this.stepSize;
		if (this.isFacingLeft) {
			stepAmount *= -1;
		}
		if (this.isRunning) {
			stepAmount *= this.runMultiplier;
		}
		if (!this.gameCanvas.isPaused) {
			this.xPosition += stepAmount;
		}
	}

	/** Make the character start running. */
	this.start_running = function() {
		if (!this.isRunning) {
			this.isRunning = true;
			this.runTimeout = setTimeout(thisChar.stop_running,
										 thisChar.millisBeforeRunStop);
		}
	}

	/** Stop running. */
	this.stop_running = function() {
		thisChar.isRunning = false;
		thisChar.attempt_movement_stop();
	}

	/** Attempt to stop all movement, unless further
		user input is received. */
	this.attempt_movement_stop = function() {
		this.isPlanningMovement = false;

		// Allow time for new input to be entered
		this.stopMovingTimeout = setTimeout(function(){
			if (!this.isPlanningMovement
					&& !thisChar.isAirborne) {
				thisChar.stop_moving();
			}
		}, this.millisBeforeMovementStop);
	}

	/** Stop all movement. */
	this.stop_moving = function() {
		clearInterval(this.stepInterval);
		this.isWalking = false;
		this.isRunning = false;
	}

	// Respawn properties
	this.xSpawn = this.xPosition;
	this.ySpawn = this.yPosition;

	/** Respawn the character. */
	this.respawn = function() {
		this.xPosition = this.xSpawn;
		this.yPosition = this.ySpawn;
		this.isFacingLeft = false;
		this.isAirborne = false;
		this.stop_moving();
	}
}


/** Represents key bindings for a character. */
function KeyBindings(character) {
	this.character = character;

	this.bind_defaults = function() {
		var character = this.character;

		// Bind keys for moving left
	    Mousetrap.bind(["a", "left"], function() { 
			character.isPlanningMovement = true;
	    	character.isFacingLeft = true;
			character.isWalking = true;
	        character.start_walking();
	        //console.log("left");
	    });
	    Mousetrap.bind(["a", "left"], function() {
			if (character.isFacingLeft) {
				character.attempt_movement_stop();
			}
	        //console.log("left_up");
	    }, "keyup");

	    // Bind keys for moving right
	    Mousetrap.bind(["d", "right"], function() {
			character.isPlanningMovement = true;
	    	character.isFacingLeft = false;
			character.isWalking = true;
	        character.start_walking();
	        //console.log("right");
	    });
	    Mousetrap.bind(["d", "right"], function() {
			if (!character.isFacingLeft) {
				character.attempt_movement_stop();
			}
	        //console.log("right_up");
	    }, "keyup");

	    // Bind keys for jumping
	    Mousetrap.bind(["w", "up", "space"], function(e) {
	    	// Remove default behavior of buttons (page scrolling)
	    	if (e.preventDefault()) {
	    		e.preventDefault();
	    	} else {
	    		e.returnValue = false; //IE
	    	}
	        character.attempt_jump();
	    });

	    // Bind keys for crouching
	    Mousetrap.bind(["s", "down"], function(e) {
	    	// Remove default behavior of buttons (page scrolling)
	    	if (e.preventDefault()) {
	    		e.preventDefault();
	    	} else {
	    		e.returnValue = false; //IE
	    	}
	        //character.start_crouching();
	        character.stop_moving();
	    });

	    // Bind key for running
	    Mousetrap.bind("q", function() { 
	        character.start_running();
	    });

	    // Bind key for respawning
	    Mousetrap.bind("c", function() { 
	        character.respawn();
	    });

	    // Bind key for pausing
	    Mousetrap.bind("z", function() {
	    	var canvas = character.gameCanvas;
	    	if (canvas.isPaused) {
	    		canvas.unpause();
	    	} else {
	    		canvas.pause();
	    	}
	    });
	}
}


window.onload = function () {	
	// Create a new game world with desired settings
	var gameCanvas = new GameCanvas(width=900, height=600, groundLevel=50);
	gameCanvas.prepare_canvas(document.getElementById("canvas-div"));
	gameCanvas.add_fps();
	gameCanvas.add_timer();
	gameCanvas.displayLevelName = true;
	check_display_canvas();

	// Add levels to the game world from levels.js
	LEVELS.forEach(function (level) {
		gameCanvas.add_level(level.name, level);
	});

	gameCanvas.load_level("Level 1");
}