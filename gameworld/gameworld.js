/** Represents a gameCanvas (HTML canvas). */
function GameCanvas(width, height, groundLevel) {
	var thisCanvas = this;

	// Canvas properties
	this.canvas = document.createElement('canvas');
	this.canvasWidth = width || 800;
	this.canvasHeight = height || 600;

	// Physics properties
	this.groundLevel = groundLevel || 50;
	this.images = {};
	this.numResourcesLoaded = 0;
	this.startDrawingLimit = 9; //images loaded
	this.npcList = new Array();
	this.numFramesDrawn = 0;

	// Frames per second properties
	this.fps = 30;
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

	/** Add a new character to the gameCanvas. */
	this.add_npc = function(xloc, yloc) {
		var xloc = xloc || 0;
		var yloc = yloc || 0;

		newNPC = new GameCharacter(this, xloc, yloc);
		newNPC.load_assets();
		this.npcList.push(newNPC);

		return newNPC;
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
			}, 1000/this.fps);
		}
	}

	/** Redraw all images on the canvas. */
	this.redraw_canvas = function() {
		// Clear the canvas
		this.canvas.width = this.canvas.width;

		// Create fps monitor in bottom left of screen
		this.context.font = "bold 12px sans-serif";
		if (this.displayFPS) {
			fpsText = ("fps: " + this.currentFPS + "/" + this.fps
						+ " (" + this.numFramesDrawn + ")");
			this.context.fillText(fpsText, 5, this.canvasHeight-5);
		}

		// Draw each character bound to this world
		for (ii = 0; ii < this.npcList.length; ii++) {
			characterToDraw = this.npcList[ii];
			characterToDraw.draw_character(this.context);
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


/** Represents an in-game character. */
function GameCharacter(gameCanvas, xloc, yloc) {
	var thisChar = this;

	// Character assets
	this.characterImages = [];

	// Character states
	this.isFacingLeft = false;
	this.isMoving = false;
	this.isWalking = false;
	this.isRunning = false;
	this.isJumping = false;

	// Positional properties
	this.gameCanvas = gameCanvas
	this.xloc = xloc || 100;
	this.yloc = yloc || 500;

	// Movement properties
	this.stepAmt = 12;
	this.stepsPerSecond = 30;
	this.jumpHeight = 150;
	this.movementPadding = 100;
	this.runMultiplier = 2;

	// Breathing properties
	this.breathDirection = 1;
	this.breathInc = 0.1;
	this.breathAmt = 0;
	this.breathMax = 2;

	// Blinking properties
	this.maxEyeHeight = 14;
	this.curEyeHeight = this.maxEyeHeight;
	this.eyeOpenTime = 0;
	this.timeBtwBlinks = 4000;
	this.blinkUpdateTime = 200;

	// Character intervals
	this.breathInterval = setInterval(function(){
		thisChar.update_breath();
	}, 1000/this.gameCanvas.fps);

	this.blinkInterval = setInterval(function(){
		thisChar.update_blink();
	}, this.blinkUpdateTime);

	/** Load the images needed for this character to 
		the parent gameCanvas. */
	this.load_assets = function() {
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

		for (ii=0; ii<this.characterImages.length; ii++) {
			imageLocation = this.characterImages[ii].imageID;
			gameCanvas.load_image(imageLocation);
		}
	}

	/** Draw this character on the canvas. */
	this.draw_character = function(context) {
		var gameCanvas = this.gameCanvas,
			canvasWidth = gameCanvas.canvasWidth,
			canvasHeight = gameCanvas.canvasHeight;
		 	groundLevel = canvasHeight - gameCanvas.groundLevel,
		 	characterImages = this.characterImages,
		 	xx = this.xloc,
			yy = this.yloc,
		 	breathOffset = this.breathAmt;

	 	// Draw the character in a left position if facing left
 		//this.gameCanvas.context.translate(this.gameCanvas.width, 0);
	 	//this.gameCanvas.context.scale(-1, 1);

		// Adjust character vertical height if jumping
	 	if (this.isJumping) {
	 		jumpOffset = -this.jumpHeight+6;
	 	} else {
	 		jumpOffset = 0;
	 	}

/*
		// PUT LINES 250 - 292 INTO LOOPS

	 	imagesToLoad = [characterImages[2],
 						characterImages[1],
 						characterImages[0]];

		if (this.isJumping) {
			imagesToLoad.push(characterImages[8]);
			imagesToLoad.push(characterImages[4]);
			imagesToLoad.push(characterImages[6]);
		} else {
			imagesToLoad.push(characterImages[7]);
			imagesToLoad.push(characterImages[3]);
			imagesToLoad.push(characterImages[5]);
		}

		this.draw_all_images(imagesToLoad, xx, groundLevel, jumpOffset, breathOffset);
*/

		// Draw the character's shadow
		if (this.isJumping) {
			this.draw_ellipse(xx+40, groundLevel, 100-breathOffset, 4);
		} else {
			this.draw_ellipse(xx+40, groundLevel, 160-breathOffset, 6);
		}

		// Draw the character's back arm
		if (this.isJumping) {
 			this.draw_image(characterImages[8], xx, groundLevel, jumpOffset, breathOffset);
		} else {
 			this.draw_image(characterImages[7], xx, groundLevel, jumpOffset, breathOffset);
		}
		
		// Draw the character's legs
		if (this.isJumping) {
 			this.draw_image(characterImages[4], xx, groundLevel, jumpOffset, 0);
		} else {
 			this.draw_image(characterImages[3], xx, groundLevel, jumpOffset, 0);
		}

		// Draw the character's torso
 		this.draw_image(characterImages[2], xx, groundLevel, jumpOffset, 0);

 		// Draw the character's head
 		this.draw_image(characterImages[1], xx, groundLevel, jumpOffset, breathOffset);

 		// Draw the character's hair
 		this.draw_image(characterImages[0], xx, groundLevel, jumpOffset, breathOffset);
		
		// Draw the character's front arm
		if (this.isJumping) {
 			this.draw_image(characterImages[6], xx, groundLevel, jumpOffset, breathOffset);
		} else {
 			this.draw_image(characterImages[5], xx, groundLevel, jumpOffset, breathOffset);
		}

		// Draw the character's eyes
	 	eyeHeight = groundLevel-103-breathOffset;
	 	if (this.isJumping) {
			eyeHeight -= this.jumpHeight-6;
	 	}
		this.draw_ellipse(xx+46, eyeHeight, 8, this.curEyeHeight);
		this.draw_ellipse(xx+58, eyeHeight, 8, this.curEyeHeight);
	}

	/** Draw all images passed based on the character's current state. */
	this.draw_all_images = function(imagesToDraw, xPos, groundLevel, jumpOffset, breathOffset) {
	 	for (ii=0; ii<imagesToDraw.length; ii++) {
	 		this.draw_image(imagesToDraw[ii], xPos, groundLevel, jumpOffset, breathOffset);
	 	}
	}

	/** Draw a single image based on imageArguments, etc. */
	this.draw_image = function(imageArguments, xPos, yPos, jumpOffset, breathOffset) {
 		imageToDraw = this.gameCanvas.images[imageArguments["imageID"]];
 		drawWidth = xPos + imageArguments["xOffset"];
 		drawHeight = (yPos - imageArguments["yOffset"]
 					  + jumpOffset - breathOffset);
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
			this.breathAmt -= this.breathInc;
			if (this.breathAmt < -this.breathMax) {
				this.breathDirection = -1;
			}
		} else { 
			// Breath out (character falls)
			this.breathAmt += this.breathInc;
			if(this.breathAmt > this.breathMax) {
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
		if (!this.isJumping) {
			this.isJumping = true;
			this.jumpTimeout = setTimeout(thisChar.land_jump, 800);
		}
	}

	/** Land after completing a jump. */
	this.land_jump = function() {
		thisChar.isJumping = false;
		if (thisChar.isMoving == false) {
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

		this.xloc += stepAmount;
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
		this.stopMovingTimeout = setTimeout(function(){
			if (!thisChar.isJumping) {
				thisChar.stop_moving();
			}
		}, this.movementPadding);
	}

	/** Stop all movement. */
	this.stop_moving = function() {
		if (!thisChar.isMoving) {
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

	// Add one player and two NPCs to the world
	player1 = gameWorld.add_npc(0);
	npc1 = gameWorld.add_npc(400);
	npc2 = gameWorld.add_npc(650);

    // Bind keys for jumping
    Mousetrap.bind(['up','space'], function(e) {
    	if (e.preventDefault()) {
    		e.preventDefault();
    	} else {
    		// internet explorer
    		e.returnValue = false;
    	}
        player1.start_jumping();
    });

    // Bind keys for crouching
    Mousetrap.bind('down', function(e) {
    	if (e.preventDefault()) {
    		e.preventDefault();
    	} else {
    		// Internet explorer
    		e.returnValue = false;
    	}
        //player1.start_crouching();
        player1.stop_moving();
    });

    // Bind keys for moving left
    Mousetrap.bind('left', function() { 
    	console.log('left');
		player1.isMoving = true;
    	player1.isFacingLeft = true;
		player1.isWalking = true;
        player1.start_walking();
    });
    Mousetrap.bind('left', function() {
    	console.log('leftup');
		player1.isMoving = false;
		player1.slow_inertia();
    }, 'keyup');

    // Bind keys for moving right
    Mousetrap.bind('right', function() {
    	console.log('right');
		player1.isMoving = true;
    	player1.isFacingLeft = false;
		player1.isWalking = true;
        player1.start_walking();
    });
    Mousetrap.bind('right', function() {
    	console.log('rightup');
		player1.isMoving = false;
		player1.slow_inertia();
    }, 'keyup');

    // Bind keys for running
    Mousetrap.bind('r', function() { 
        player1.start_running();
    });
}