/** Represents an HTML canvas on which a game is
	being played. */
function GameCanvas(width, height, groundLevel) {
	var thisCanvas = this;

	// Canvas properties
	this.canvas = document.createElement("canvas");
	this.canvasWidth = width || 800;
	this.canvasHeight = height || 600;

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

	// Parental properties
	this.characterList = [];
	this.levelObjects = [];
	this.platformAreas = [];
	this.wallAreas = [];

	// Physics properties
	this.groundLevel = groundLevel || 0;
	this.groundOffset = this.canvasHeight - this.groundLevel;
	this.images = {};
	this.numResourcesLoaded = 0;
	this.startDrawingLimit = 9; //images loaded
	this.numFramesDrawn = 0;

	// Gravity properties
	this.gravityRate = 25;
	this.gravityAmount = 4;
	this.gravityInterval = setInterval(function(){
		thisCanvas.tick_gravity();
	}, this.gravityRate);

	/** Reduce each character"s yPosition until it
		reaches the ground or a solid object. */
	this.tick_gravity = function() {
		for (ii = 0; ii < this.characterList.length; ii++) {
			thisChar = this.characterList[ii];

			if (!thisChar.is_at_yfloor()) {
				thisChar.yPosition -= this.gravityAmount;
				thisChar.start_falling();
			}
		}
	}

	/** Add a new level to this gameCanvas. */
	this.add_level = function() {
		newLevel = new GameLevel(this);
		this.currentLevel = newLevel;

		return newLevel;
	}

	/** Add a new character to this gameCanvas. */
	this.add_npc = function(xPosition, yPosition) {
		var xPosition = xPosition || 0;
		var yPosition = yPosition || 0;

		newNPC = new GameCharacter(this, xPosition, yPosition);
		newNPC.load_assets();
		this.characterList.push(newNPC);

		return newNPC;
	}

	/** Add a box object to the gameCanvas. */
	this.add_box = function(centerX, yBottom, width, yHeight, isFatal, isEndpoint) {
		var halfWidth = width / 2;
		var halfHeight = yHeight / 2;
		var leftX = centerX - halfWidth;
		var rightX = centerX + halfWidth;
		var topY = yBottom + yHeight;
		var isFatal = isFatal || false;
		var isEndpoint = isEndpoint || false;

		this.add_platform(leftX, rightX, topY, isFatal, isEndpoint);
		this.add_platform(leftX, rightX, yBottom);
		this.add_wall(leftX, yBottom, yHeight);
		this.add_wall(rightX, yBottom, yHeight);
	}

	/** Add a platform object to the gameCanvas. */
	this.add_platform = function(xStart, xEnd, yHeight, isFatal, isEndpoint) {
		isFatal = isFatal || false;
		isEndpoint = isEndpoint || false;
		newPlatform = new GamePlatform(this, xStart, xEnd, yHeight, 
									   isFatal, isEndpoint);
		this.levelObjects.push(newPlatform);
		this.platformAreas.push([newPlatform.xStart,
								 newPlatform.xEnd,
								 newPlatform.yHeight]);
	}

	/** Add a wall object to the gameCanvas. */
	this.add_wall = function(xPosition, yBottom, yHeight) {
		newWall = new GameWall(this, xPosition, yBottom, yHeight);
		this.levelObjects.push(newWall);
		this.wallAreas.push([newWall.xPosition,
							 newWall.yBottom,
							 newWall.yHeight]);
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

	/** Add resource to total number on page and redraw_canvas. 
		Needs the gameCanvas as a parameter since it is called 
		from an image element onload(). */
	this.resource_loaded = function() {
		this.numResourcesLoaded += 1;

		if (this.numResourcesLoaded === this.startDrawingLimit) {
			this.canvasInterval = setInterval(function(){
				thisCanvas.redraw_canvas();
				thisCanvas.numFramesDrawn += 1;
			}, 1000/this.canvasFPS);
		}
	}

	/** Clear the canvas before drawing another frame. */
	this.clear_canvas = function() {
		this.canvas.width = this.canvas.width;		
	}

	/** Redraw all images on the canvas. */
	this.redraw_canvas = function() {
		this.clear_canvas();
		this.context.font = "bold 12px sans-serif";

		if (this.displayFPS) {
			this.draw_fps();
		}

		if (this.displayTimer) {
			this.draw_life_timer();
		}

		// Draw each character bound to this world
		for (ii = 0; ii < this.characterList.length; ii++) {
			this.characterList[ii].draw();
		}

		// Draw each object bound to this world
		for (ii = 0; ii < this.levelObjects.length; ii++) {
			this.levelObjects[ii].draw();
		}
	}

	/** Create fps monitor in bottom left of screen */
	this.draw_fps = function() {
		fpsText = ("fps: " + this.currentFPS + "/" + this.canvasFPS
					+ " (" + this.numFramesDrawn + ")");
		this.context.fillText(fpsText, 5, this.canvasHeight-5);
	}

	/** Create lifetime timer in bottom left of screen */
	this.draw_life_timer = function() {
		timerText = ("lifetime: " + this.timerSeconds.toFixed(1));
		this.context.fillText(timerText, 5, this.canvasHeight-20);
	}

	// Frames per second properties
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

	// Level timer properties
	this.timerSeconds = 0.0;
	this.displayTimer = false;
	
	/** Add the level timer to this canvas. */
	this.add_timer = function() {
		this.displayTimer = true;

		// Start interval to track frames per second
		this.timerInterval = setInterval(function(){
			thisCanvas.update_timer();
		}, 100);
	}
	
	/** Update the level timer for this canvas. */
	this.update_timer = function() {
		this.timerSeconds += 0.1;
	}
	
	/** Update the level timer for this canvas. */
	this.reset_timer = function() {
		this.timerSeconds = 0.0;
	}
}


/** Represents an in-game platform. */
function GamePlatform(gameCanvas, xStart, xEnd, yHeight, isFatal, isEndpoint) {
	var thisPlatform = this;

	// Positional properties
	this.gameCanvas = gameCanvas;
	this.xStart = xStart;
	this.xEnd = xEnd;
	this.yHeight = yHeight;
	this.isFatal = isFatal || false;
	this.isEndpoint = isEndpoint || false;

	/** Draw this platform on the canvas. */
	this.draw = function() {
	 	var platformHeight = this.gameCanvas.groundOffset - this.yHeight;

		// Draw the platform on the canvas
		var context = this.gameCanvas.context;
		context.beginPath();
		context.moveTo(this.xStart, platformHeight);
		context.lineTo(this.xEnd, platformHeight);
		context.stroke();
		context.closePath();
	}

	this.fatalityRate = 500;
	if (this.isFatal) {
		this.fatlityInterval = setInterval(function(){
			thisPlatform.tick_check_fatalities();
		}, this.fatalityRate);
	}

	/** Check if each active character in the gameWorld is on the 
		platform, and if it is, kill and respawn it. */
	this.tick_check_fatalities = function() {
		var characters = this.gameCanvas.characterList;
		for (ii = 0; ii < characters.length; ii++) {
			if (characters[ii].yPosition === this.yHeight
					&& characters[ii].xPosition >= this.xStart
					&& characters[ii].xPosition <= this.xEnd) {
				characters[ii].respawn();
			}
		}
	}

	this.endpointRate = 500;
	if (this.isEndpoint) {
		this.endpointInterval = setInterval(function(){
			thisPlatform.tick_check_endpoints();
		}, this.endpointRate);
	}

	/** Check if each active character in the gameWorld is on the 
		platform, and if it is, teleport it to the next level. */
	this.tick_check_endpoints = function() {
		var characters = this.gameCanvas.characterList;
		for (ii = 0; ii < characters.length; ii++) {
			if (characters[ii].yPosition === this.yHeight
					&& characters[ii].xPosition >= this.xStart
					&& characters[ii].xPosition <= this.xEnd) {
				characters[ii].change_level();
			}
		}
	}
}


/** Represents an in-game wall. */
function GameWall(gameCanvas, xPosition, yBottom, yHeight) {
	this.gameCanvas = gameCanvas;
	this.xPosition = xPosition;
	this.yBottom = yBottom;
	this.yHeight = yHeight;

	/** Draw this wall on the canvas. */
	this.draw = function() {
		var groundOffset = this.gameCanvas.groundOffset;
		var yBottom = groundOffset - this.yBottom;
		var yTop = yBottom - this.yHeight;

		// Draw the wall on the canvas
		var context = this.gameCanvas.context;
		context.beginPath();
		context.moveTo(this.xPosition, yBottom);
		context.lineTo(this.xPosition, yTop);
		context.stroke();
		context.closePath();
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
			xCollisionLeft = this.xPosition - this.xCollisionRadius;
			xCollisionRight = this.xPosition;
		} else {
			xCollisionLeft = this.xPosition;
			xCollisionRight = this.xPosition + this.xCollisionRadius;
		}

		// Check every wall in the character"s game world
		wallAreas = this.gameCanvas.wallAreas;
		for (jj = 0; jj < wallAreas.length; jj++) {
			wallArea = wallAreas[jj];
			wallXPosition = wallArea[0];
			wallBottomY = wallArea[1];
			wallTopY = wallArea[1] + wallArea[2];

			// Is this wall within the characters collision box?
			// and is the character vertically within the walls
			// top and bottom vertical position
			if (xCollisionLeft <= wallXPosition
					&& xCollisionRight >= wallXPosition
					&& (this.yPosition + this.yCollisionHeight) >= wallBottomY
					&& this.yPosition < wallTopY) {
				return true;
			}
		}

		return false;
	}

	// Character Asset Lists
	this.characterImages = [];

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

	/** Return true if this character is on a platform
		or would be the next time gravity ticks. */
	this.is_at_yfloor = function() {
		this.find_yfloor(this.gameCanvas.platformAreas);

		nextYPosition = this.yPosition - this.gameCanvas.gravityAmount;
		
		if (nextYPosition <= this.yFloor) {
			this.yPosition = this.yFloor;
			return true;
		} else {
			return false;
		}
	}

	/** Return true if this character is directly below a platform. */
	this.is_below_yceiling = function() {
		this.find_yceiling(this.gameCanvas.platformAreas);

		var headLevel = this.yPosition + this.yCollisionHeight;
		var jumpLevel = headLevel + this.jumpHeight;

		if (jumpLevel <= this.yCeiling) {
			return true;
		} else {
			return false;
		}
	}

	/** Find the highest object below the character and set its
		floor so that it does not fall below it. */
	this.find_yfloor = function(platformAreas) {
		var newYFloor = 0;

		// Check every platform in the character"s game world
		for (jj = 0; jj < platformAreas.length; jj++) {
			platformArea = platformAreas[jj];
			platformStartX = platformArea[0];
			platformEndX = platformArea[1];
			platformY = platformArea[2];

			// Is this character above the current platform,
			// within its horizontal boundaries, and is the platform
			// above all other platforms the character above?
			if (this.yPosition >= platformY
					&& this.xPosition >= platformStartX
					&& this.xPosition <= platformEndX
					&& platformY > newYFloor) {
				newYFloor = platformY;
			}
		}

		this.yFloor = newYFloor;
	}

	/** Find the lowest object above the character and set its
		ceiling so that it cannot jump above it. */
	this.find_yceiling = function(platformAreas) {
		var newYCeiling = this.gameCanvas.canvasHeight;

		// Check every platform in the character"s game world
		for (jj = 0; jj < platformAreas.length; jj++) {
			var platformArea = platformAreas[jj];
			var platformStartX = platformArea[0];
			var platformEndX = platformArea[1];
			var platformY = platformArea[2];

			// Is this character below the current platform,
			// within its horizontal boundaries, and is the platform
			// below all other platforms the character below?
			if (this.yPosition <= platformY
					&& this.xPosition >= platformStartX
					&& this.xPosition <= platformEndX
					&& platformY < newYCeiling
					&& platformY > this.yPosition) {
				newYCeiling = platformY;
			}
		}

		this.yCeiling = newYCeiling;
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
		for (ii=0; ii<this.characterImages.length; ii++) {
			imageID = this.characterImages[ii].imageID;			
			imageLocation = this.characterImages[ii].imageLocation;
			gameCanvas.load_image(imageID, imageLocation);
		}
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
			backArm = this.characterImages[8];
			frontArm = this.characterImages[6];
			legs = this.characterImages[4];
		} else {
			backArm = this.characterImages[7];
			frontArm = this.characterImages[5];
			legs = this.characterImages[3];
		}

		// Set character static images
		torso = this.characterImages[2];
		head = this.characterImages[1];
		hat = this.characterImages[0];

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

	/** Draw a single image based on imageArguments, etc. */
	this.draw_image = function(imageArguments, xPos, yPos, breathOffset) {
 		imageToDraw = this.gameCanvas.images[imageArguments["imageID"]];
 		drawWidth = xPos + imageArguments["xOffset"];
 		drawHeight = (yPos - imageArguments["yOffset"] - breathOffset);
 		this.gameCanvas.context.drawImage(imageToDraw, drawWidth, drawHeight);
	}

	/** Draw the character"s shadow for the current frame. */
	this.draw_shadow = function(centerX) {
		var centerY = this.gameCanvas.groundOffset - this.yFloor;
		var shadowWidth = (100 - this.currentBreath
						   - (this.yPosition - this.yFloor) * 0.8);
		if (shadowWidth > 0) {
			this.draw_ellipse(centerX+5, centerY, 
							  shadowWidth, 4);
		}
	}

	/** Draw the character"s eyes for the current frame. */
	this.draw_eyes = function(xPos, yPos) {
	 	var eyeHeight = yPos - 88 - this.currentBreath;
		this.draw_ellipse(xPos+6, eyeHeight, 
						  6, this.curEyeHeight);
		this.draw_ellipse(xPos+16, eyeHeight, 
						  6, this.curEyeHeight);
	}

	/** Draw an ellipse on the canvas. */
	this.draw_ellipse = function(centerX, centerY, width, height, color) {
	 	context = this.gameCanvas.context;

		// Calculate coordinates for drawing curves
		halfWidth = width / 2;
		halfHeight = height / 2;
		leftX = centerX - halfWidth;
		rightX = centerX + halfWidth;
		topY = centerY - halfHeight;
		bottomY = centerY + halfHeight;

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
			this.blink();
		}
	}

	/** Make the character blink. */
	this.blink = function() {
		thisChar.curEyeHeight -= 1;
		if (thisChar.curEyeHeight <= 0) {
			thisChar.eyeOpenTime = 0;
			thisChar.curEyeHeight = thisChar.maxEyeHeight;
		} else {
			thisChar.blinkTimeout = setTimeout(thisChar.blink, 10);
		}
	}

	/** Make the character jump. */
	this.start_jumping = function() {
		if (!this.isAirborne) {
			this.yPosition += this.jumpHeight;
		}
	}

	/** Make the character fall. */
	this.start_falling = function() {
		if (!this.isAirborne) {
			this.isAirborne = true;
			this.checkAirborneInterval = setInterval(function(){
				if (thisChar.is_at_yfloor()) {
					thisChar.end_hangtime();
				}
			}, 50);
		}
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

		this.xPosition += stepAmount;
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
		this.gameCanvas.reset_timer();
	}

	/** Teleport the character to another level. */
	this.change_level = function() {
		this.xPosition = this.xSpawn;
		this.yPosition = this.ySpawn;
		this.isFacingLeft = false;
		this.isAirborne = false;
		this.stop_moving();
		this.gameCanvas.reset_timer();

		this.gameCanvas.currentLevel.delete_level();
		level2 = this.gameCanvas.add_level();
		level2.load_level(new JSONData().get_level_2());
		
		var player1 = gameCanvas.add_npc(75);
		var bindings = new KeyBindings(gameCanvas);
		bindings.bind_defaults(player1);
	}
}


/** Represents key bindings for a character. */
function KeyBindings(gameCanvas) {
	this.gameCanvas = gameCanvas;

	this.bind_defaults = function(character) {
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
	        character.start_jumping();
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
	    Mousetrap.bind("r", function() { 
	        character.start_running();
	    });

	    // Bind key for respawning
	    Mousetrap.bind("c", function() { 
	        character.respawn();
	    });
	} 
}


/** Represents a level of the game. */
function GameLevel(gameCanvas) {
	var thisLevel = this;

	this.gameCanvas = gameCanvas;

	/** Load level settings from a JSON object. */
	this.load_level = function(levelJSON) {
		this.add_boxes(levelJSON["boxes"]);
		this.add_platforms(levelJSON["platforms"]);
		this.add_walls(levelJSON["walls"]);
		this.add_npcs(levelJSON["NPCs"]);
	}

	/** Remove level settings from the gameWorld. */
	this.delete_level = function(levelJSON) {
		this.gameCanvas.levelObjects = [];
		this.gameCanvas.platformAreas = [];
		this.gameCanvas.wallAreas = [];
		this.gameCanvas.characterList = [];
	}

	/** Add a list of box objects to this level. */
	this.add_boxes = function(boxArgs) {
		for (var ii = 0; ii < boxArgs.length; ii++) {
			this.gameCanvas.add_box(boxArgs[ii].centerX,
									boxArgs[ii].yBottom,
									boxArgs[ii].width,
									boxArgs[ii].yHeight,
									boxArgs[ii].isFatal,
									boxArgs[ii].isEndpoint);
		}
	}

	/** Add a list of platform objects to this level. */
	this.add_platforms = function(platformArgs) {
		for (var ii = 0; ii < platformArgs.length; ii++) {
			this.gameCanvas.add_platform(platformArgs[ii].xStart,
										 platformArgs[ii].xEnd,
										 platformArgs[ii].yHeight,
										 platformArgs[ii].isFatal,
										 platformArgs[ii].isEndpoint);
		}
	}

	/** Add a list of wall objects to this level. */
	this.add_walls = function(wallArgs) {
		for (var ii = 0; ii < wallArgs.length; ii++) {
			this.gameCanvas.add_wall(wallArgs[ii].xPosition,
									 wallArgs[ii].yBottom,
									 wallArgs[ii].yHeight);
		}
	}

	/** Add a list of npc objects to this level. */
	this.add_npcs = function(npcArgs) {
		for (var ii = 0; ii < npcArgs.length; ii++) {
			this.gameCanvas.add_npc(npcArgs[ii].xPosition,
									npcArgs[ii].yPosition);
		}
	}
}


/** Represents a JSON data store. */
function JSONData() {
	/** Return the JSON data for level 1. */
	this.get_level_1 = function() {
		jsonData = {
			"boxes": [
				{"centerX": 400, "yBottom": 30, "width": 200, "yHeight": 30, }, 
				{"centerX": 650, "yBottom": 30, "width": 200, "yHeight": 60, },
				{"centerX": 700, "yBottom": 280, "width": 100, "yHeight": 30, "isEndpoint": true},
			],
			"platforms": [
				{"xStart": 0, "xEnd": 800, "yHeight": 0, }, 
				{"xStart": 20, "xEnd": 250, "yHeight": 125, },
				{"xStart": 325, "xEnd": 500, "yHeight": 185, },
				{"xStart": 20, "xEnd": 250, "yHeight": 250, },
				{"xStart": 325, "xEnd": 500, "yHeight": 325, },
				{"xStart": 150, "xEnd": 300, "yHeight": 400, "isFatal": true},
			],
			"walls": [
				{"xPosition": 0, "yBottom": 0, "yHeight": 1000, },
				{"xPosition": 800, "yBottom": 0, "yHeight": 1000, },
			],
			"NPCs": [
				{"xPosition": 450, "yPosition": 200, },
				{"xPosition": 600, "yPosition": 150, },
				{"xPosition": 100, "yPosition": 700, },
			],
		};
		return jsonData;
	}

	/** Return the JSON data for level 2. */
	this.get_level_2 = function() {
		jsonData = {
			"boxes": [
				{"centerX": 400, "yBottom": 30, "width": 200, "yHeight": 30, }, 
				{"centerX": 700, "yBottom": 280, "width": 100, "yHeight": 30, "isFatal": true},
			],
			"platforms": [
				{"xStart": 0, "xEnd": 800, "yHeight": 0, }, 
				{"xStart": 20, "xEnd": 250, "yHeight": 125, },
				{"xStart": 325, "xEnd": 500, "yHeight": 185, },
			],
			"walls": [
				{"xPosition": 0, "yBottom": 0, "yHeight": 1000, },
				{"xPosition": 800, "yBottom": 0, "yHeight": 1000, },
			],
			"NPCs": [
				{"xPosition": 450, "yPosition": 200, },
			],
		};
		return jsonData;
	}
}


/** Window onload actions. */
window.onload = function () {
	// Initialize the game world
	var gameCanvas = new GameCanvas(width=800, height=500, groundLevel=50);
	gameCanvas.prepare_canvas(document.getElementById("canvas-div"));
	gameCanvas.add_fps();
	gameCanvas.add_timer();

	// Add the states for level 1
	level1 = gameCanvas.add_level();
	level1.load_level(new JSONData().get_level_1());

	// Player controlled character
	var player1 = gameCanvas.add_npc(75);
	var bindings = new KeyBindings(gameCanvas);
	bindings.bind_defaults(player1);
}