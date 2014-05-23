var Emulator = function() {
}
Emulator.running = false;
Emulator.startable = false;
Emulator.input;
Emulator.interrupts;
Emulator.mainTickId;
Emulator.init = function(output, input, xsize, ysize) {
	console.log("Emulator: define output screen");
	this.Output.screen = output;
	console.log("Emulator: init output");
	this.Output.init(xsize, ysize);
	console.log("Emulator: define input");
	this.input = input;
	console.log("Emulator: define interrupt array");
	this.interrupts = new Array();
	console.log("Emulator: adding event-handlers");
	this.addEventHandlers();
	console.log("Emulator: init finished");
	this.startable = true;
}
Emulator.main = function() {
	if (!Emulator.startable) {
		console.log("Emulator: not startable");
		return;
	}
	Emulator.running = true;
	Emulator.Output.cursorOn();
	console.log("Emulator: init bios");
	BIOS.init();
	console.log("Emulator: running bios");
	BIOS.main();
}
Emulator.kill = function() {
	console.log("Emulator: got hardware kill signal (powersw)");
	if (Emulator.interrupts['powersw'])
		Emulator.interrupts['powersw']();
	else {
		Emulator.running = false;
		Emulator.startable = false;
		console.log("Emulator: no powersw-event defined -> killing");
		Emulator.interrupts = new Array();
		Emulator.output("\n\n\033[31mPOWER BUTTON PRESSED - SYSTEM HALT\nKill in 5s");
		window.setTimeout(function(){Emulator.output("\033[2D4s");}, 1000);
		window.setTimeout(function(){Emulator.output("\033[2D3s");}, 2000);
		window.setTimeout(function(){Emulator.output("\033[2D2s");}, 3000);
		window.setTimeout(function(){Emulator.output("\033[2D1s");}, 4000);
		window.setTimeout(function(){Emulator.shutdown()}, 5000);
	}
}
Emulator.shutdown = function() {
	Emulator.running = false;
	Emulator.startable = true;
	Emulator.output("\033[0m\033[2J\033[0;0H");
	Emulator.Output.cursorOff()
}
Emulator.addEventHandlers = function() {
	console.log("Emulator: adding unfocus-event");
	this.input.onblur = this.refocus;
	console.log("Emulator: adding key-press-event");
	//this.input.onkeypress = this.handleKeyPress;
	window.onkeypress = this.handleKeyPress;
	console.log("Emulator: adding key-down-event");
	//this.input.onkeydown = this.handleKeyDown;
	window.onkeydown = this.handleKeyDown;
	var timerid = window.setInterval(function() {/*for (var i = 0; i < 1000; i++)*/ Emulator.tick(0);}, 1);
	Emulator.mainTickId = timerid;
	console.log("Emulator: adding default 1ms (or cheated 0.1 ms) tick with tid=" + timerid);
	this.refocus();
}
Emulator.getKeyCode = function(e) {
	return window.event ? event.keyCode : e.which;
}
Emulator.genericKeyHandler = function(keycode) {
	if (Emulator.interrupts['key'])
		Emulator.interrupts['key'](keycode);
}
Emulator.handleKeyPress = function(e) {
	Emulator.genericKeyHandler(Emulator.getKeyCode(e), {
		"ctrl": e.ctrlKey, 
		"alt": e.altKey, 
		"altgr": e.altGraphKey
	});
}
Emulator.handleKeyDown = function(e) {
	var keycode = Emulator.getKeyCode(e);
	if (KeyCodes.isSpecialKey(keycode)) {
		Emulator.handleKeyPress(e);
		return false;
	}
	return true;
}
Emulator.refocus = function () {
	window.setTimeout(function() {
		Emulator.input.focus();
	}, 1);
	console.log("Emulator: refocus input");
}
Emulator.tick = function (time) {
	if (Emulator.interrupts[time])
		Emulator.interrupts[time]();
}
Emulator.registerTimer = function (time, routine) {
	var timerid = window.setInterval(routine, time);
	console.log("Emulator: timer startet t=" + time + " with tid=" + timerid);
	return timerid;
}
Emulator.unregisterTimer = function(timerid) {
	console.log("Emulator: timer cleared tid=" + timerid);
	window.clearInterval(timerid);
}
Emulator.output = function(text) {
	Emulator.ANSISequences.output(text);
}
Emulator.ANSISequences = function() {
}
Emulator.ANSISequences.ESC = "\033";
Emulator.ANSISequences.output = function(text) {
	var normalText = "";
	var specialText = "";
	var specialText2 = "";
	var state = 0;
	for(var i = 0; i < text.length; i++) {
		switch(state) {
		case 0:
			specialText = "";
			speacielText2 = "";
			if (text[i] != Emulator.ANSISequences.ESC)
				normalText += text[i];
			else
				state = 3;
			break;
		case 3:
			if (text[i] == "[")
				state = 1;
			else {
				normalText += " " + text[i];
				state = 0;
			}
			break;
		case 1:
			if (isNumber(text[i])) {
				specialText += text[i];
				break;
			} else {
				if (text[i] == '?') {
					state = 4;
					break;
				}
				if (text[i] == 's') {
					Emulator.Output.sxpos = Emulator.Output.xpos;
					Emulator.Output.sypos = Emulator.Output.ypos;
					state = 0;
					break;
				}
				if (text[i] == 'u') {
					Emulator.Output.normalOutput(normalText);
					Emulator.Output.cursorOff();
					Emulator.Output.xpos = Emulator.Output.sxpos;
					Emulator.Output.ypos = Emulator.Output.sypos;
					Emulator.Output.cursorOn();
					normalText = "";
					state = 0;
					break;
				}
				if (specialText.length < 1) {
					normalText += " [" + ((specialText2.length > 0) ? (specialText2 + ";") : "") + specialText;
					state = 0;
					break;
				}
				state = 2;
			}
		case 2:
			switch(text[i]) {
			case 'A':
				Emulator.Output.normalOutput(normalText);
				Emulator.Output.cursorOff();
				Emulator.Output.moveCursor(0, - parseInt(specialText), false);
				Emulator.Output.cursorOn();
				normalText = "";
				specialText = "";
				specialText2 = "";
				state = 0;
				break;
			case 'B':
				Emulator.Output.normalOutput(normalText);
				Emulator.Output.cursorOff();
				Emulator.Output.moveCursor(0, parseInt(specialText), false);
				Emulator.Output.cursorOn();
				normalText = "";
				specialText = "";
				specialText2 = "";
				state = 0;
				break;
			case 'C':
				Emulator.Output.normalOutput(normalText);
				Emulator.Output.cursorOff();
				Emulator.Output.moveCursor(parseInt(specialText), 0, false);
				Emulator.Output.cursorOn();
				normalText = "";
				specialText = "";
				specialText2 = "";
				state = 0;
				break;
			case 'D':
				Emulator.Output.normalOutput(normalText);
				Emulator.Output.cursorOff();
				Emulator.Output.moveCursor(- parseInt(specialText), 0, false);
				Emulator.Output.cursorOn();
				normalText = "";
				specialText = "";
				specialText2 = "";
				state = 0;
				break;
			case 'E':
				Emulator.Output.normalOutput(normalText);
				Emulator.Output.cursorOff();
				Emulator.Output.moveCursor(parseInt(specialText), 0, false);
				Emulator.Output.xpos = 0;
				Emulator.Output.cursorOn();
				normalText = "";
				specialText = "";
				specialText2 = "";
				state = 0;
				break;
			case 'F':
				Emulator.Output.cursorOff();
				Emulator.Output.normalOutput(normalText);
				Emulator.Output.moveCursor( - parseInt(specialText), 0, false);
				Emulator.Output.xpos = 0;
				Emulator.Output.cursorOn();
				normalText = "";
				specialText = "";
				specialText2 = "";
				state = 0;
				break;
			case 'G':
				Emulator.Output.normalOutput(normalText);
				Emulator.Output.cursorOff();
				Emulator.Output.xpos = (parseInt(specialText) >= Emulator.Output.xsize) ? (Emulator.Output.xsize - 1) : parseInt(specialText);
				Emulator.Output.cursorOn();
				normalText = "";
				specialText = "";
				specialText2 = "";
				state = 0;
				break;
			case ';':
				// TODO Wrong!
				specialText2 = specialText;
				specialText = "";
				state = 1;
				break;
			case 'H':
				if (specialText2.length == 0) {
					normalText += " [" + specialText + 'G';
					state = 0;
					break;
				}
				Emulator.Output.normalOutput(normalText);
				Emulator.Output.cursorOff();
				Emulator.Output.xpos = (parseInt(specialText) >= Emulator.Output.xsize) ? (Emulator.Output.xsize - 1) : parseInt(specialText);
				Emulator.Output.ypos = (parseInt(specialText2) >= Emulator.Output.ysize) ? (Emulator.Output.ysize - 1) : parseInt(specialText2);
				Emulator.Output.cursorOn();
				specialText = "";
				specialText2 = "";
				normalText = "";
				state = 0;
				break;
			case 'J':
				Emulator.Output.normalOutput(normalText);				
				normalText = "";
				switch(parseInt(specialText)) {
				case 0:
					var oldx = Emulator.Output.xpos;
					var oldy = Emulator.Output.ypos;
					var number = (Emulator.Output.ysize - oldy - 1) * Emulator.Output.xsize + (Emulator.Output.xsize - oldx - 1);
					var itext = "";
					for (var j = 0; j < number; j++)
						itext += " ";
					Emulator.Output.normalOutput(itext);
					Emulator.Output.cursorOff();
					Emulator.Output.xpos = oldx;
					Emulator.Output.ypos = oldy;
					Emulator.Output.cursorOn();
					break;
				case 1:
					var oldx = Emulator.Output.xpos;
					var oldy = Emulator.Output.ypos;
					Emulator.Output.cursorOff();
					Emulator.Output.xpos = 0;
					Emulator.Output.ypos = 0;
					Emulator.Output.cursorOn();
					var number = (oldy) * Emulator.Output.xsize + oldx;
					var itext = "";
					for (var j = 0; j < number; j++)
						itext += " ";
					Emulator.Output.normalOutput(itext);
					break;
				case 2: 
					var oldx = Emulator.Output.xpos;
					var oldy = Emulator.Output.ypos;
					Emulator.Output.cursorOff();
					Emulator.Output.xpos = 0;
					Emulator.Output.ypos = 0;
					var itext = "";
					for (var j = 0; j < (Emulator.Output.xsize * Emulator.Output.ysize); j++)
						itext += " ";
					Emulator.Output.normalOutput(itext);
					Emulator.Output.cursorOff();
					Emulator.Output.xpos = oldx;
					Emulator.Output.ypos = oldy;
					Emulator.Output.cursorOn();
					break;
				default:
					normalText = " [" + ((specialText2.length > 0) ? (specialText2 + ";") : "") + specialText;
					break;
				}
				specialText = "";
				specialText2 = "";
				state = 0;
				break;
			// TODO
			case 'm':
				Emulator.Output.normalOutput(normalText);
				normalText = "";

				switch(parseInt(specialText)) {
				case 0:
					Emulator.Output.color = "#fff";
					Emulator.Output.backgroundColor = "#000";
					Emulator.Output.bold = false;
					break;
				case 1:
					Emulator.Output.bold = true;
					break;
				case 30:
					Emulator.Output.color = "#000";
					break;
				case 31:
					Emulator.Output.color = "#f00";
					break;
				case 32:
					Emulator.Output.color = "#0f0";
					break;
				case 33:
					Emulator.Output.color = "#ff0";
					break;
				case 34:
					Emulator.Output.color = "#00f";
					break;
				case 35:
					Emulator.Output.color = "#f0f";
					break;
				case 36:
					Emulator.Output.color = "#0ff";
					break;
				case 37:
					Emulator.Output.color = "#fff";
					break;
				
				case 40:
					Emulator.Output.backgroundColor = "#000";
					break;
				case 41:
					Emulator.Output.backgroundColor = "#f00";
					break;
				case 42:
					Emulator.Output.backgroundColor = "#0f0";
					break;
				case 43:
					Emulator.Output.backgroundColor = "#ff0";
					break;
				case 44:
					Emulator.Output.backgroundColor = "#00f";
					break;
				case 45:
					Emulator.Output.backgroundColor = "#f0f";
					break;
				case 46:
					Emulator.Output.backgroundColor = "#0ff";
					break;
				case 47:
					Emulator.Output.backgroundColor = "#fff";
					break;
				default:
					normalText += " [" + ((specialText2.length > 0) ? (specialText2 + ";") : "") + specialText;
					state = 0;
					break;	
				}
				specialText = "";
				specialText2 = "";
				state = 0;
				break;
			default:
				normalText += " [" + ((specialText2.length > 0) ? (specialText2 + ";") : "") + specialText;
				state = 0;
				break;
			}
			break;
		case 4:
			if (text[i] == '2')
				state = 5;
			else {
				normalText += " [?" + text[i];
				state = 0;
			}
			break;
		case 5:
			if (text[i] == '5')
				state = 6;
			else {
				normalText += " [?2" + text[i];
				state = 0;
			}
			break;
		case 6:
			if (text[i] == 'l') {
				Emulator.Output.displayCursor = false;
				state = 0;
				break;
			}
			if (text[i] == 'h') {
				Emulator.Output.displayCursor = true;
				state = 0;
				break;
			}
			normalText += " [25" + text[i];
			state = 0;
			break;			
		default:
			break;
		}
	}
	if ((specialText2.length || specialText.length) > 0)
		normalText += " [" + ((specialText2.length > 0) ? (specialText2 + ";") : "") + specialText;
	Emulator.Output.normalOutput(normalText);
}

Emulator.Output = function() {
}
Emulator.Output.screen;
Emulator.Output.xsize;
Emulator.Output.ysize;
Emulator.Output.xpos;
Emulator.Output.ypos;
Emulator.Output.sxpos;
Emulator.Output.sypos;
Emulator.Output.color;
Emulator.Output.backgroundColor;
Emulator.Output.bold;
Emulator.Output.displayCursor;
Emulator.Output.shiftKey = 1;
Emulator.Output.init = function(xsize, ysize) {
	console.log("Emulator: define matrix size");
	this.xsize = xsize;
	this.ysize = ysize;
	console.log("Emulator: reseting cursor position");
	this.xpos = 0;
	this.ypos = 0;	
	this.displayCursor = true;
	console.log("Emulator: seting default style");
	this.color = "#fff";
	this.backgroundColor = "#000";
	this.bold = false;
	console.log("Emulator: generating matrix");
	this.generateMatrix();
}
Emulator.Output.generateMatrix = function() {
	var matrix = "<table id=\"matrix\">";
	for (var i = 0; i < this.ysize; i++) {
		matrix += "<tr>";
		for (var j = 0; j < this.xsize; j++) {
			matrix += "<td> </td>";
		}
		matrix += "</tr>";
	}
	matrix += "</table>";
	this.screen.innerHTML = matrix;
	this.screen = document.getElementById("matrix");
}
Emulator.Output.getCursor = function() {
	return Emulator.Output.screen.getElementsByTagName("tr")[Emulator.Output.ypos].getElementsByTagName("td")[Emulator.Output.xpos];
}
Emulator.Output.cursorOff = function() {
	if(document.getElementById("cursor") != undefined) {
		document.getElementById("cursor").style.borderColor = Emulator.Output.backgroundColor;
		document.getElementById("cursor").id = undefined;
	}
}
Emulator.Output.cursorOn = function() {
	if (Emulator.Output.displayCursor) {
		Emulator.Output.getCursor().style.borderColor = Emulator.Output.color;
		Emulator.Output.getCursor().id = "cursor";
	}
}
Emulator.Output.insert = function(char) {
	var cell = Emulator.Output.getCursor();
	cell.style.color = Emulator.Output.color;
	cell.style.backgroundColor = Emulator.Output.backgroundColor;
	cell.style.borderColor = Emulator.Output.backgroundColor;
	if (Emulator.Output.bold)
		cell.style.fontWeight = "bold";
	else
		cell.style.fontWeight = "normal";
	Emulator.Output.getCursor().innerHTML = char;
}
Emulator.Output.moveCursor = function(x, y, lbreak) {
	Emulator.Output.xpos += x;
	Emulator.Output.ypos += y;
	if (lbreak) {
		if (Emulator.Output.xpos >= Emulator.Output.xsize)
			Emulator.Output.ypos++;
		if (Emulator.Output.xpos < 0)
			Emulator.Output.ypos--;		
		Emulator.Output.xpos %= Emulator.Output.xsize;
		while (Emulator.Output.ypos >= Emulator.Output.ysize) {
			Emulator.Output.lineShift();
		}
	} else {
		if (Emulator.Output.xpos >= Emulator.Output.xsize)
			Emulator.Output.xpos = Emulator.Output.xsize - 1;
		if (Emulator.Output.xpos < 0)
			Emulator.Output.xpos = 0;
		if (Emulator.Output.ypos >= Emulator.Output.ysize)
			Emulator.Output.ypos = Emulator.Output.ysize - 1;
		if (Emulator.Output.ypos < 0)
			Emulator.Output.ypos = 0;
	}
}
Emulator.Output.lineShift = function() {
	for (var i = Emulator.Output.shiftKey; i < Emulator.Output.ysize; i++) {
		for (var j = 0; j < Emulator.Output.xsize; j++) {
			var to = Emulator.Output.screen.getElementsByTagName("tr")[i - 1].getElementsByTagName("td")[j];
			var from = Emulator.Output.screen.getElementsByTagName("tr")[i].getElementsByTagName("td")[j];
			to.innerHTML = from.innerHTML;
			to.style.color = from.style.color;
			to.style.fontWeight = from.style.fontWeight;
			to.style.backgroundColor = from.style.backgroundColor;
		}
	}
	for (var j = 0; j < Emulator.Output.xsize; j++) {
		var to = Emulator.Output.screen.getElementsByTagName("tr")[Emulator.Output.ysize - 1].getElementsByTagName("td")[j];
		to.innerHTML = "";
		to.style.color = Emulator.Output.color;
		to.style.backgroundColor = Emulator.Output.backgroundColor;
		if (Emulator.Output.bold)
			to.style.fontWeight = "bold";
		else
			to.style.fontWeight = "normal";
	}
	if (--Emulator.Output.ypos < 0)
		Emulator.Output.ypos = 0;
}
Emulator.Output.normalOutput = function(text) {
	Emulator.Output.cursorOff();
	for(var i = 0; i < text.length; i++) {
		if (KeyCodes.isEnter(text.charCodeAt(i))) {
			Emulator.Output.moveCursor(0, 1, true);
			Emulator.Output.xpos = 0;
		} else {
			Emulator.Output.insert(text[i]);
			Emulator.Output.moveCursor(1, 0, true);
		}
	}
	Emulator.Output.cursorOn();
}

Emulator.Request = function() {
}
Emulator.Request.get = function(file, parameter, background, after) {
	var http = new XMLHttpRequest();
	if(parameter){
		http.open("GET", file + "?" + parameter, background);
	}else{
		http.open("GET", file, background);
	}
	if (background) {
		http.onreadystatechange = function() {
			if (http.readyState == 4) {
				if (http.status != 200)
					after(http.status);
				else
					after(http.responseText);
			}
		};
	}
	http.send(null);
	if (!background) 
		if (http.status != 200)
			return after(http.status);
		else
			return after(http.responseText);
}
Emulator.Request.post = function(file, getParameters, postParameters, background, after) {
	var http = new XMLHttpRequest();
	http.open("POST", file + "?" + getParameter, background);
	http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	http.setRequestHeader("Content-length", postParameters.length);
	http.setRequestHeader("Connection", "close");
	if (background) {
		http.onreadystatechange = function() {
			if (http.readyState == 4) {
				after(http.responseText);
			}
		};
	}
	http.send(postParameters);
	if (!background) 
		return after(http.responseText);
}
Emulator.Request.include = function(file, loaded) {
	console.log("Emulator: including file: " + file);
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.onload = loaded;
	script.src = file;
	document.head.appendChild(script);
}

Emulator.Devices = function() {
}
Emulator.Devices.getAll = function() {
	return JSON.parse(Emulator.Request.get("devices.json", "", false, ret));
}
Emulator.Devices.getHarddisks = function() {
	return Emulator.Devices.getAll().harddisks;
}
