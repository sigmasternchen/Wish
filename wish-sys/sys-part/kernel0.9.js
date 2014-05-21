const SIGHUP = 1;
const SIGKILL = 9;
const SIGALRM = 14;
const SIGTERM = 15;
const SIGCHLD = 20;
const SIGXCPU = 24;
const SIGUSR1 = 30;
const SIGUSR2 = 31;

const SYSHALT = 31415926;

const PERM_OX = 1 <<  0;
const PERM_OW = 1 <<  1;
const PERM_OR = 1 <<  2;
const PERM_GX = 1 <<  3;
const PERM_GW = 1 <<  4;
const PERM_GR = 1 <<  5;
const PERM_UX = 1 <<  6;
const PERM_UW = 1 <<  7;
const PERM_UR = 1 <<  8;
const PERM_D  = 1 <<  9;
const PERM_L  = 1 << 10;

const NO_PARENT = -1;
const NO_MOUNTPOINT = -1;
const NO_SOURCE = -1;

const FS_BASEFS = 1;
const FS_DEVFS  = 2;
const FS_PROCFS = 3;

// read modes
const MODE_FIFO  = 1;
const MODE_LIFO  = 2;
// write modes
const MODE_OVRWD = 3;
const MODE_APPND = 4;
// what should happen, if a file does not exist
const MODE_THROW  = 5;
const MODE_CREATE = 6;

// module types
const MODTYPE_BOOT = 1;
const MODTYPE_NORM = 2;


// special chars
const EOF = String.fromCharCode(26);

const OS_NAME = "Wish OS V 0.1"; // Wish-Isn't-a-SHell Operating System
const KERNEL = "Wodka Kernel V 0.9"; // Wish Os Dedicated Kernel Alpha

var OS = function() {
}
OS.system;
OS.runlevel;
OS.staticShift = 7;
OS.hostname = "wish";
OS.logo = "\033[32m" + 
"        .__       .__     \n" +
"__  _  _|__| _____|  |__  \n" +
"\\ \\/ \\/ /  |/  ___/  |  \\ \n" +
" \\     /|  |\\___ \\|   Y  \\\n" +
"  \\/\\_/ |__/____  >___|  /\n" +
"                \\/     \\/   \033[31mOS\033[0m\n";
OS.main = function(system) {
	console.log("OS: main");
	OS.system = system;
	console.log("OS: init Kernel");
	Kernel.init();
}

var Kernel = function() {
}
Kernel.time;
Kernel.state;
Kernel.machineTimerId;
Kernel.globalLog;
Kernel.init = function() {
	console.log("Kernel: init");
	Kernel.state = 0;
	console.log("Kernel: main timer (100ms)");
	Kernel.machineTimerId = Emulator.registerTimer(100, Kernel.machine);
	Kernel.globalLog = "";
}
Kernel.machine = function() {
	switch(Kernel.state) {
	case 0:
		Emulator.Output.shiftKey = OS.staticShift;
		Emulator.output("\033[2J\033[0;0H" + OS.logo);
		Kernel.wall("\nbooting kernel: " + KERNEL + "...")
		Kernel.msgOut("reseting kernel timer", true);
		Kernel.time = 0;
		Kernel.msgOut("register main timer (100ms)", true); // pre
		Kernel.wall("\nloading bootstraping modules...");
		Kernel.msgOut("   mod.vfs");
		Kernel.bootstrapModule("vfs");
		Kernel.next();
		break;
	case 1:
		break;
	case 2:
		Kernel.msgSuccess(true);
		Kernel.msgOut("   mod.devfs");
		Kernel.bootstrapModule("devfs");
		Kernel.next();
		break;
	case 3:
		break;
	case 4:
		Kernel.msgSuccess(true);
		Kernel.msgOut("   mod.basefs");
		Kernel.bootstrapModule("basefs");
		Kernel.next();
		break;
	case 5:
		break;
	case 6:
		Kernel.msgSuccess(true);
		Kernel.wall("\n   ... now we can proceed the normal way.");
		Kernel.wall("\ninit filesystem");
		Kernel.Filesystem.init();
		Kernel.next();
		break;
	case 7:
		break;
	case 8:
		Kernel.Filesystem.initCon();
		Kernel.wall("loading some modules...");
		
		Kernel.msgOut("   mod.io");
		Kernel.loadModule("io");
		Kernel.msgSuccess(true);
		
		Kernel.msgOut("   mod.processes");
		Kernel.loadModule("processes");
		Kernel.msgSuccess(true);
		
		Kernel.msgOut("   mod.users");
		Kernel.loadModule("users");
		Kernel.msgSuccess(true);
		
		Kernel.msgOut("   mod.scheduler");
		Kernel.loadModule("scheduler");
		Kernel.msgSuccess(true);
		
		Kernel.msgOut("init process manager");
		Kernel.ProcessManager.init();
	
		Kernel.wall("\ninit user manager");
		Kernel.UserManager.init();
		Kernel.msgOut("   update user db");
		Kernel.UserManager.update();
		Kernel.msgSuccess(true);
		
		Kernel.msgOut("init scheduler");
		Kernel.Scheduler.init();
		
		Kernel.wall("\ninit kernel io");
		Kernel.IO.init();
		Kernel.msgOut("  register keyboard interrupt");
		Emulator.interrupts['key'] = Kernel.IO.key;
		Kernel.msgSuccess(true);
		Kernel.msgOut("  register power switch interrupt");
		Emulator.interrupts['powersw'] = Kernel.IO.powersw;
		Kernel.msgSuccess(true);

		Kernel.msgOut("loading /sbin/init.js");
		var initpid = Kernel.ProcessManager.exec("/sbin/init.js", [], false);
		Kernel.msgSuccess(true);
		Kernel.msgOut("  adding handler for stdio on /dev/tty1", true);
		var init = Kernel.ProcessManager.processList[initpid];
		init.files['stdin'] = new File("/dev/tty1");
		init.files['stdin'].readMode = MODE_FIFO;
		init.files['stdout'] = new File("/dev/tty1");
		init.files['stdout'].writeMode = MODE_APPND;
		Kernel.msgOut("  starting init", true);
		init.main();
		Kernel.msgOut("register scheduler timer (1ms)");
		Emulator.interrupts[0] = Kernel.Scheduler.tick;
		Kernel.msgSuccess(true);
		Kernel.next();
		break;
	case 9:
		break;
	default:
		break;
	}
}
Kernel.next = function() {
	Kernel.state++;
}
Kernel.wall = function(text, noLogging) {
	Emulator.output(text);
	if (!noLogging) {
		while (text.indexOf("\n") > -1)
			text = text.replace("\n", "");
		while (text.indexOf("  ") > -1)
			text = text.replace("  ", " ");
		while (text.indexOf("\033") > -1)
			text = text.replace("\033", "");
		console.log("Kernel wall: " + text);
	}
}
Kernel.msgOut = function(text, success, color) {
	while (text.length < Emulator.Output.xsize - 12)
		text += " ";
	text = "\n" + text;
	if (color) {
		text = color + text;
		text += "\033[0m"
	}
	Kernel.globalLog += text;
	Kernel.wall(text);
	Kernel.msgSuccess(success);
}
Kernel.msgSuccess = function(success) {
	var text = "";
	if (success == true)
		text = "[ \033[32msuccess\033[0m ]";
	else if (success == false)
		text =  "[  \033[31mfailed\033[0m ]";
	else
		text = "";
	Kernel.globalLog += text;
	Kernel.wall(text, true);
}

Kernel.shutdown = function() {
	Kernel.wall("\n\n\nShuting down...\nKilling all processes...\n");
	var procs = new Array();
	for (var i in Kernel.ProcessManager.processList) {
		var proc = Kernel.ProcessManager.processList[i];
		if (proc)
			procs.push(proc);
	}
	//procs.reverse();
	for (var i = 0; i < procs.length; i++) {
		if (!procs[i].pid)
			continue;
		Kernel.wall("sending sigkill to pid " + procs[i].pid + "...\n");
		try {
			procs[i].signalHandler(9);
		} catch (exception) {
		}	 
	}
	Kernel.wall("all processes killed.\n\nRemoving event handlers\n\n");
	Emulator.interrupts = new Array();
	Kernel.wall("System halt\n\n");
	
}

Kernel.loadedModules = new Array();

Kernel.bootstrapModule = function(name) {
	console.log("Kernel: loading mod." + name + "; type=bootstrap");	
	var device = Emulator.Devices.getHarddisks();
	device = device[OS.system.hdd];
	var partition = device.partitions[OS.system.partition];
	var loadstring = device.name + "/" + partition.name;
	Emulator.Request.include(loadstring + "/kernel/mod." + name + ".js", Kernel.next);
	
	Kernel.loadedModules.push([name, (new Date()).getTime(), MODTYPE_BOOT]);
}

Kernel.loadModule = function(name) {
	console.log("Kernel: loading mod." + name + "; type=normal");
	
	(1 ? eval : 0)((new File("/kernel/mod." + name + ".js")).read().replace(EOF, ""));
	
	Kernel.loadedModules.push([name, (new Date()).getTime(), MODTYPE_NORM]);
}