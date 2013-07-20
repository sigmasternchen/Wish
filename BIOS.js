var BIOS = function() {
}
BIOS.logo = "\033[32m" + 
"        .__       .__     \n" +
"__  _  _|__| _____|  |__  \n" +
"\\ \\/ \\/ /  |/  ___/  |  \\ \n" +
" \\     /|  |\\___ \\|   Y  \\\n" +
"  \\/\\_/ |__/____  >___|  /\n" +
"                \\/     \\/   \033[31mBIOS\033[0m\n";
BIOS.hdds;
BIOS.lastKey;
BIOS.tickid;
BIOS.state;
BIOS.bootDevice;
BIOS.init = function() {
	console.log("BIOS: init");
	BIOS.lastKey = 0;
	console.log("BIOS: register key interrupt");
	Emulator.interrupts['key'] = BIOS.key;
}
BIOS.main = function() {
	console.log("BIOS: main");
	console.log("BIOS: register 100ms-timer");
	this.tickid = Emulator.registerTimer(100, BIOS.tick);
	console.log("BIOS: get hdds");
	this.hdds = Emulator.Devices.getHarddisks();
	var text = this.logo + "\n" + 
		"Keyboard: found at name=" + Emulator.input.name + "\n" + 
		"Monitor:  found at   id=" + Emulator.Output.screen.parentElement.id + "\n\n" + 
		"Harddisks: \n";
		for (var i = 0; i < this.hdds.length; i++) {
			text += "   " + i + ": "+ this.hdds[i].name + "\n";
		}
	Emulator.output(text);
	if (this.hdds.length == 0) {
		Emulator.output("No harddisks found. Please insert a bootable device and restart the computer..\n\n");
		Emulator.output("\033[31msystem halt\033[0m");
		console.log("BIOS: remove all event handlers");
		Emulator.interrupts = new Array();
		Emulator.unregisterTimer(this.tickid);
		return;
	}
	if (this.hdds.length > 1) {
		Emulator.output("\nPlease select booting device by pressing the device nr. ");
		this.state = 0;
	} else {
		this.state = 1;
	}
}
BIOS.key = function(keycode) {
	BIOS.lastKey = keycode;
}
BIOS.tick = function() {
	switch(BIOS.state) {
	case 0:
		if (isNumber(KeyCodes.normalKey(BIOS.lastKey))) {
			if (BIOS.hdds[BIOS.bootDevice = parseInt(KeyCodes.normalKey(BIOS.lastKey))])
				BIOS.state = 2;
		}
		break;
	case 1:
		BIOS.bootDevice = 0;
		BIOS.state = 2;
		break;
	case 2:
		Emulator.output("\n\nSearching for MBR on " + BIOS.hdds[BIOS.bootDevice].name + "...\n");
		if (!(mbr = BIOS.hdds[BIOS.bootDevice].mbr)) {
			console.log(mbr);
			Emulator.output("No MBR found. Please insert a bootable device and restart the computer...\n\n");
			Emulator.output("\033[31msystem halt\033[0m");
			console.log("BIOS: remove all event handlers");
			Emulator.interrupts = new Array();
			Emulator.unregisterTimer(BIOS.tickid);
		}
		Emulator.Request.include(BIOS.hdds[BIOS.bootDevice].name + "/" + mbr + "/init.js", BIOS.load);
		BIOS.state = 3;
		break;
	default:
		break;
	}
}
BIOS.load = function() {
	console.log("BIOS: stop BIOS");
	console.log("BIOS: remove all event handlers");
	Emulator.interrupts = new Array();
	Emulator.unregisterTimer(BIOS.tickid);
	console.log("BIOS: start MBR");
	try {
		MBR.main(BIOS.hdds[BIOS.bootDevice]);
	} catch (exception) {	
		console.dir(exception);
		Emulator.output("MBR is not bootable. Please insert a bootable device and restart the computer...\n\n");
		Emulator.output("\033[31msystem halt\033[0m");
	}
}
