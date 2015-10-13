/** Represents an HTML canvas on which a game is
	being played. */
function GameCanvas(width, height, groundLevel) {
	var thisCanvas = this;

	// Canvas properties
	this.canvas = document.createElement('canvas');
	this.canvasWidth = width || 800;
	this.canvasHeight = height || 600;

	// Frames per second properties
	this.canvasFPS = 30;
	this.currentFPS = 0;
	this.displayFPS = false;

	/** Creates the working game canvas for any browser. */
	this.prepare_canvas = function(canvasDiv) {
		// Create the canvas in a way that works with IE.
		this.canvas.setAttribute('width', this.canvasWidth);
		this.canvas.setAttribute('height', this.canvasHeight);
		this.canvas.setAttribute('id', 'canvas');
		canvasDiv.appendChild(this.canvas);
		
		if (typeof G_vmlCanvasManager != 'undefined') {
			this.canvas = G_vmlCanvasManager.initElement(this.canvas);
		}

		this.context = document.getElementById('canvas').getContext("2d");
	}

	// Parental properties
	this.characterList = [];
	this.platformList = [];
	this.wallList = [];
	this.platformAreas = [];

	// Physics properties
	this.groundLevel = groundLevel || 0;
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

	/** Reduce each character's yPosition until it
		reaches the ground or a solid object. */
	this.tick_gravity = function() {
		for (ii = 0; ii < this.characterList.length; ii++) {
			thisChar = this.characterList[ii];

			// Find the highest object beneath this character
			thisChar.find_yfloor(this.platformAreas);

			// Do nothing if character is currently on a platform
			if (thisChar.is_above_ground_level()
					&& !thisChar.is_at_yfloor()) {
				thisChar.yPosition -= this.gravityAmount;
				thisChar.start_falling();
			}
		}
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

	/** Add a platform object to the gameCanvas. */
	this.add_platform = function(xStart, xEnd, yHeight) {
		newPlatform = new GamePlatform(this, xStart, xEnd, yHeight);
		this.platformList.push(newPlatform);
		
		this.platformAreas.push([newPlatform.xStart,
								newPlatform.xEnd,
								newPlatform.yHeight]);

		return newPlatform;
	}

	/** Add a wall object to the gameCanvas. */
	this.add_wall = function(xPosition, yStart, yHeight) {
		newWall = new GameWall(this, xPosition, yStart, yHeight);
		this.wallList.push(newWall);

		return newWall;
	}

	/** Load an image to HTML from the /images/ folder. 
	Begin the animations for that image. */
	this.load_image = function(name) {
		if (!(name in this.images)) {
			this.images[name] = new Image();
			this.images[name].onload = this.resource_loaded();
			this.images[name].src = "images/" + name + ".png";
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

	/** Redraw all images on the canvas. */
	this.redraw_canvas = function() {
		// Clear the canvas
		this.canvas.width = this.canvas.width;

		// Create fps monitor in bottom left of screen
		this.context.font = "bold 12px sans-serif";
		if (this.displayFPS) {
			fpsText = ("fps: " + this.currentFPS + "/" + this.canvasFPS
						+ " (" + this.numFramesDrawn + ")");
			this.context.fillText(fpsText, 5, this.canvasHeight-5);
		}

		// Draw each character bound to this world
		for (ii = 0; ii < this.characterList.length; ii++) {
			characterToDraw = this.characterList[ii];
			characterToDraw.draw_character();
		}

		// Draw each platform bound to this world
		for (ii = 0; ii < this.platformList.length; ii++) {
			platformToDraw = this.platformList[ii];
			platformToDraw.draw_platform();
		}

		// Draw each wall bound to this world
		for (ii = 0; ii < this.wallList.length; ii++) {
			wallToDraw = this.wallList[ii];
			wallToDraw.draw_wall();
		}
	}
	
	/** Update the fps for this canvas. */
	this.update_fps = function() {
		this.currentFPS = this.numFramesDrawn;
		this.numFramesDrawn = 0;
	}
	
	/** Add the fps tracker to this canvas. */
	this.add_fps = function() {
		this.displayFPS = true;

		// Start interval to track frames per second
		this.fpsInterval = setInterval(function(){
			thisCanvas.update_fps();
		}, 1000);
	}
}



/** Represents an in-game platform. */
function GamePlatform(gameCanvas, xStart, xEnd, yHeight) {
	// Positional properties
	this.gameCanvas = gameCanvas
	this.xStart = xStart;
	this.xEnd = xEnd;
	this.yHeight = yHeight;

	/** Draw this platform on the canvas. */
	this.draw_platform = function() {
		// Get generic properties to gameWorld
		var gameCanvas = this.gameCanvas,
			canvasHeight = gameCanvas.canvasHeight,
		 	groundLevel = canvasHeight - gameCanvas.groundLevel;

	 	// Translate cartesian properties into gameCanvas
	 	platformHeight = groundLevel - this.yHeight;

		// Draw the platform on the canvas
		context = gameCanvas.context;
		context.beginPath();
		context.moveTo(this.xStart, platformHeight);
		context.lineTo(this.xEnd, platformHeight);
		context.stroke();
		context.closePath();
	}
}



/** Represents an in-game wall. */
function GameWall(gameCanvas, xPosition, yStart, yHeight) {
	// Positional properties
	this.gameCanvas = gameCanvas;
	this.xPosition = xPosition;
	this.yStart = yStart;
	this.yHeight = yHeight;

	/** Draw this wall on the canvas. */
	this.draw_wall = function() {
		// Get generic properties to gameWorld
		var yStart = this.gameCanvas.yheight -this.gameCanvas.groundLevel,
			xEnd = this.xStart + this.xWidth,
			yEnd = this.yStart + this.yHeight;

		// Draw the platform on the canvas
		context = gameCanvas.context;
		context.beginPath();
		context.moveTo(this.xPosition, yStart);
		context.lineTo(this.xPosition, yEnd);
		context.stroke();
		context.closePath();
	}
}



/** Represents an in-game character. */
function GameCharacter(gameCanvas, xPosition, yPosition) {
	var thisChar = this;

	// Positional properties
	this.gameCanvas = gameCanvas;
	this.xPosition = xPosition || 100;
	this.yPosition = yPosition || 0;
	this.yFloor = 0;

	// Character Asset Lists
	this.characterImages = [];

	// Default images for now
	this.characterImages = [
		{
			'imageID': 'hair',
			'location': 'hair.png',
			'yOffset': 171,
			'xOffset': -37,
		}, {
			'imageID': 'head',
			'location': 'head.png',
			'yOffset': 160,
			'xOffset': -10,
		}, {
			'imageID': 'torso',
			'location': 'torso.png',
			'yOffset': 80,
			'xOffset': 0,
		}, {
			'imageID': 'legs',
			'location': 'legs.png',
			'yOffset': 30,
			'xOffset': 0,
		}, {
			'imageID': 'legs-jump',
			'location': 'legs-jump.png',
			'yOffset': 36,
			'xOffset': 0,
		}, {
			'imageID': 'front-arm',
			'location': 'front-arm.png',
			'yOffset': 80,
			'xOffset': -15,
		}, {
			'imageID': 'front-arm-jump',
			'location': 'front-arm-jump.png',
			'yOffset': 80,
			'xOffset': -40,
		}, {
			'imageID': 'back-arm',
			'location': 'back-arm.png',
			'yOffset': 80,
			'xOffset': 40,
		}, {
			'imageID': 'back-arm-jump',
			'location': 'back-arm-jump.png',
			'yOffset': 80,
			'xOffset': 40,
		}
	];

	// Character States
	this.isFacingLeft = false;
	this.isMoving = false;
	this.isWalking = false;
	this.isRunning = false;
	this.isJumping = false;
	this.isFalling = false;
	this.isLoggingEnabled = false;

	/** Return true if this character is above ground level. */
	this.is_above_ground_level = function() {
		if (this.yPosition > 0) {
			return true;
		} else {
			return false;
		}
	}

	/** Return true if this character is directly ON a platform. */
	this.is_at_yfloor = function() {
		if (this.yPosition === this.yFloor) {
			return true;
		} else {
			return false;
		}
	}

	/** Find the highest object below the player and set its
		floor so that it does not fall below it. */
	this.find_yfloor = function(platformAreas) {
		var newYFloor = 0;

		// Check every platform in the character's game world
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

	// Movement properties
	this.stepAmt = 12;
	this.stepsPerSecond = 30;
	this.timeBeforeMovementStop = 100;
	this.jumpHeight = 180;
	this.runMultiplier = 2;

	/** Breathing properties */
	this.breathDirection = 1;
	this.breathInc = 0.1;
	this.currentBreath = 0;
	this.breathMax = 2;
	this.breathInterval = setInterval(function(){
		thisChar.update_breath();
	}, 1000/this.gameCanvas.canvasFPS);

	/** Blinking properties */
	this.maxEyeHeight = 14;
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
			imageLocation = this.characterImages[ii].imageID;
			gameCanvas.load_image(imageLocation);
		}
	}

	/** Draw this character on the canvas. */
	this.draw_character = function() {
		var gameCanvas = this.gameCanvas,
			canvasWidth = gameCanvas.canvasWidth,
			canvasHeight = gameCanvas.canvasHeight,
		 	groundLevel = canvasHeight - gameCanvas.groundLevel,
		 	characterImages = this.characterImages,
		 	xx = this.xPosition,
		 	breathOffset = this.currentBreath;

	 	// Draw the character in a left position if facing left
	 	if (this.isFacingLeft) {
	 		gameCanvas.context.scale(-1, 1);
	 		xx *= -1;
 		}

	 	// Set character y position relative to game world
	 	yy = groundLevel - this.yPosition;

	 	// Determine if character is in air or not
	 	isAirborne = (this.isJumping || this.isFalling);

		/*
		// PUT LINES 250 - 292 INTO LOOPS

	 	imagesToLoad = [characterImages[2],
 						characterImages[1],
 						characterImages[0]];

		if (isAirborne) {
			imagesToLoad.push(characterImages[8]);
			imagesToLoad.push(characterImages[4]);
			imagesToLoad.push(characterImages[6]);
		} else {
			imagesToLoad.push(characterImages[7]);
			imagesToLoad.push(characterImages[3]);
			imagesToLoad.push(characterImages[5]);
		}

		this.draw_all_images(imagesToLoad, xx, groundLevel, breathOffset);
		*/

		// Draw the character's shadow
		var shadowHeight = groundLevel - this.yFloor;
		var shadowWidth = 160 - (this.yPosition - this.yFloor) * 0.8;
		if (shadowWidth > 0) {
			if (isAirborne) {
				this.draw_ellipse(xx+40, shadowHeight, shadowWidth-breathOffset, 4);
			} else {
				this.draw_ellipse(xx+40, shadowHeight, shadowWidth-breathOffset, 6);
			}
		}

		// Draw the character's back arm
		if (isAirborne) {
 			this.draw_image(characterImages[8], xx, yy, breathOffset);
		} else {
 			this.draw_image(characterImages[7], xx, yy, breathOffset);
		}
		
		// Draw the character's legs
		if (isAirborne) {
 			this.draw_image(characterImages[4], xx, yy, 0);
		} else {
 			this.draw_image(characterImages[3], xx, yy, 0);
		}

		// Draw the character's torso
 		this.draw_image(characterImages[2], xx, yy, 0);

 		// Draw the character's head
 		this.draw_image(characterImages[1], xx, yy, breathOffset);

 		// Draw the character's hair
 		this.draw_image(characterImages[0], xx, yy, breathOffset);
		
		// Draw the character's front arm
		if (isAirborne) {
 			this.draw_image(characterImages[6], xx, yy, breathOffset);
		} else {
 			this.draw_image(characterImages[5], xx, yy, breathOffset);
		}

		// Draw the character's eyes
	 	eyeHeight = yy-103-breathOffset;
		this.draw_ellipse(xx+46, eyeHeight, 8, this.curEyeHeight);
		this.draw_ellipse(xx+58, eyeHeight, 8, this.curEyeHeight);

	 	// Flip the canvas back around after drawing
	 	if (this.isFacingLeft) {
	 		gameCanvas.context.scale(-1, 1);
 		}
	}

	/** Draw all images passed based on the character's current state. */
	this.draw_all_images = function(imagesToDraw, xPos, groundLevel, breathOffset) {
	 	for (ii=0; ii<imagesToDraw.length; ii++) {
	 		this.draw_image(imagesToDraw[ii], xPos, groundLevel, breathOffset);
	 	}
	}

	/** Draw a single image based on imageArguments, etc. */
	this.draw_image = function(imageArguments, xPos, yPos, breathOffset) {
 		imageToDraw = this.gameCanvas.images[imageArguments["imageID"]];
 		drawWidth = xPos + imageArguments["xOffset"];
 		drawHeight = (yPos - imageArguments["yOffset"] - breathOffset);
 		this.gameCanvas.context.drawImage(imageToDraw, drawWidth, drawHeight);
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
		if (!this.isJumping &&
				!this.isFalling) {
			this.isJumping = true;
			this.yFloor = 0;
			this.yPosition += this.jumpHeight;

			this.hangtimeEndInterval = setInterval(function(){
				if (thisChar.is_at_yfloor()
					|| !thisChar.is_above_ground_level()) {
					thisChar.end_hangtime();
				}
			}, 50);
		}
	}

	/** Make the character fall. */
	this.start_falling = function() {
		if (!this.isFalling) {
			this.isFalling = true;
			this.yFloor = 0;

			this.hangtimeEndInterval = setInterval(function(){
				if (thisChar.is_at_yfloor()
					|| !thisChar.is_above_ground_level()) {
					thisChar.end_hangtime();
				}
			}, 50);
		}
	}

	/** Land after hanging in the air from
		falling or jumping. */
	this.end_hangtime = function() {
		thisChar.isJumping = false;
		thisChar.isFalling = false;
		clearInterval(thisChar.hangtimeEndInterval);
		if (thisChar.isMoving === false) {
			thisChar.slow_inertia();
		}
	}

	/** Make the character walk. */
	this.start_walking = function() {
    	clearTimeout(this.stopMovingTimeout);
		this.step_forward();

		if (this.isWalking) {
			clearInterval(this.stepInterval);
			this.stepInterval = setInterval(function(){
				thisChar.step_forward();
			}, 1000/this.stepsPerSecond);
		}
	}

	/** Step in the directino the character is facing. */
	this.step_forward = function() {
		var stepAmount = this.stepAmt;

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
			this.runTimeout = setTimeout(thisChar.stop_running, 2000);
		}
	}

	/** Stop running. */
	this.stop_running = function() {
		this.isRunning = false;
	}

	/** Finish up any remaining movement. */
	this.slow_inertia = function() {
		this.isMoving = false;
		this.stopMovingTimeout = setTimeout(function(){
			if (!thisChar.isJumping) {
				thisChar.stop_moving();
			}
		}, this.timeBeforeMovementStop);
	}

	/** Stop all movement. */
	this.stop_moving = function() {
		if (!this.isMoving) {
			clearInterval(this.stepInterval);
			this.isWalking = false;
			this.isRunning = false;
		}
	}
}



/** Window onload actions. */
window.onload = function () {
	// Initialize the game world
	var gameWorld = new GameCanvas(width=800, height=500, groundLevel=50);
	gameWorld.prepare_canvas(document.getElementById("canvas-div"));
	gameWorld.add_fps();

	// Add environment objects to the game world
	gameWorld.add_platform(xStart=0, xEnd=800, yHeight=0);
	gameWorld.add_platform(xStart=300, xEnd=600, yHeight=100);
	gameWorld.add_platform(xStart=20, xEnd=250, yHeight=200);
	gameWorld.add_platform(xStart=350, xEnd=500, yHeight=300);
	gameWorld.add_platform(xStart=500, xEnd=700, yHeight=420);
	gameWorld.add_wall(xPosition=300, yStart=0, yHeight=100);

	// Add one player and two NPCs to the world
	player1 = gameWorld.add_npc(100);
	npc1 = gameWorld.add_npc(500, 200);
	npc2 = gameWorld.add_npc(650);

    // Bind keys for moving left
    Mousetrap.bind(['a', 'left'], function() { 
		player1.isMoving = true;
    	player1.isFacingLeft = true;
		player1.isWalking = true;
        player1.start_walking();
    });
    Mousetrap.bind(['a', 'left'], function() {
		if (player1.isFacingLeft) {
			player1.slow_inertia();
		}
    }, 'keyup');

    // Bind keys for moving right
    Mousetrap.bind(['d', 'right'], function() {
		player1.isMoving = true;
    	player1.isFacingLeft = false;
		player1.isWalking = true;
        player1.start_walking();
    });
    Mousetrap.bind(['d', 'right'], function() {
		if (!player1.isFacingLeft) {
			player1.slow_inertia();
		}
    }, 'keyup');

    // Bind keys for jumping
    Mousetrap.bind(['w', 'up', 'space'], function(e) {
    	// Remove default behavior of buttons (page scrolling)
    	if (e.preventDefault()) {
    		e.preventDefault();
    	} else {
    		e.returnValue = false; //IE
    	}
        player1.start_jumping();
    });

    // Bind keys for crouching
    Mousetrap.bind(['s', 'down'], function(e) {
    	// Remove default behavior of buttons (page scrolling)
    	if (e.preventDefault()) {
    		e.preventDefault();
    	} else {
    		e.returnValue = false; //IE
    	}
        //player1.start_crouching();
        player1.stop_moving();
    });

    // Bind keys for running
    Mousetrap.bind('r', function() { 
        player1.start_running();
    });
}