var MBR = function() {
}
MBR.main = function(device) {
	console.log("MBR: main");
	console.log("MBR: start Boot Loader");
	Loader.main(device);
}

var Loader = function() {
}
Loader.logo = "\033[32m" + 
"        .__       .__     \n" +
"__  _  _|__| _____|  |__  \n" +
"\\ \\/ \\/ /  |/  ___/  |  \\ \n" +
" \\     /|  |\\___ \\|   Y  \\\n" +
"  \\/\\_/ |__/____  >___|  /\n" +
"                \\/     \\/   \033[31mLoader\033[0m\n";
Loader.tickid;
Loader.state;
Loader.device;
Loader.config;
Loader.main = function(device) {
	console.log("Loader: main");
	console.log("Loader: register 100ms-timer");
	Loader.tickid = Emulator.registerTimer(100, Loader.tick);
	console.log("Loader: register key interrupt");
	Emulator.interrupts['key'] = Loader.key;
	Loader.device = device;
	var text = "\033[2J\033[0;0H\033[?25l" + Loader.logo + "\033[s";
	Emulator.output(text);
	Loader.state = 0;
}
Loader.key = function(keycode) {
	if (KeyCodes.isEnter(keycode)) {
		Loader.boot();
		return;
	}
	var char = KeyCodes.normalKey(keycode);
	if (char == 'w') Loader.selected--;
	if (char == 's') Loader.selected++;
	Loader.selected %= Loader.config.systems.length;
	if (Loader.selected < 0)
		Loader.selected += Loader.config.systems.length;
	Loader.outputSystems();
}
Loader.tick = function() {
	switch(Loader.state) {
	case 0:
		console.log("Loader: load config");
		Loader.config = JSON.parse(Emulator.Request.get(Loader.device.name + "/" + Loader.device.mbr + "/config.json", "", false, ret))
		Loader.selected = Loader.config.default;
		Loader.state++;
		break;
	case 1:
		Loader.outputSystems();
		Loader.state++;
		break;
	case 2:
		break;
	case 3:
		Emulator.output(".");
		break;
	default:
		break;
	}
}
Loader.outputSystems = function() {
	console.log("Loader: display menu");
	var systems = Loader.config.systems;
	var text = "\033[u\n\n\n\n";
	for(var i = 0; i < systems.length; i++) {
		var string = "-> " + systems[i].label + " " + systems[i].kernel;
		var length = Emulator.Output.xsize - string.length - 10
		text += "\033[5C\033[46m\033[31m" + ((i == Loader.selected) ? "->" : "  ") + " \033[30m" + systems[i].label + " \033[34m" + systems[i].kernel;
		for (var j = 0; j < length; j++)
			text += " ";
		text += "\033[0m\n";
	}
	text += "\n\nSelect OS to boot... [w, s]";
	Emulator.output(text);
}
Loader.boot = function() {
	var device = Emulator.Devices.getHarddisks();
	var system = Loader.config.systems[Loader.selected];
	device = device[system.hdd];
	var partition = device.partitions[system.partition];
	var loadstring = device.name + "/" + partition.name + "/" + system.kernel
	Emulator.output("\n\nTrying to boot " + loadstring + "..");
	Loader.state = 3;
	Emulator.Request.include(loadstring, Loader.finished);
}
Loader.finished = function() {
	console.log("Loader: stop BIOS");
	console.log("loader: remove all event handlers");
	Emulator.interrupts = new Array();
	Emulator.unregisterTimer(Loader.tickid);
	console.log("Loader: start OS");
	var system = Loader.config.systems[Loader.selected];
	try {
		OS.main(system);
		Emulator.output("\nKernel loaded successfully.");
	} catch (exception) {	
		console.dir(exception);
		Emulator.output("\nFailed to load kernel...\n\n");
		Emulator.output("\033[31msystem halt\033[0m");
	}
}
