const SIGHUP = 1;
const SIGKILL = 9;
const SIGALRM = 14;
const SIGTERM = 15;
const SIGCHLD = 20;
const SIGXCPU = 24;
const SIGUSR1 = 30;
const SIGUSR2 = 31;

const APPND = 1;
const OVWRT = 2;

const FILE = 1;
const DIR = 2;

const SYSHALT = 31415926

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
		Kernel.msgOut("reseting kernel timer", true);
		Kernel.time = 0;
		Kernel.msgOut("register main timer (100ms)", true); // pre
		Kernel.msgOut("init filesystem", true);
		Kernel.Filesystem.init();
		Kernel.msgOut("init process manager", true);
		Kernel.ProcessManager.init();
		Kernel.msgOut("init scheduler", true);
		Kernel.Scheduler.init();		
		Kernel.msgOut("init kernel io", true);
		Kernel.IO.init();
		Kernel.msgOut("  register keyboard interrupt", true);
		Emulator.interrupts['key'] = Kernel.IO.key;
		Kernel.msgOut("  register power switch interrupt", true);
		Emulator.interrupts['powersw'] = Kernel.IO.powersw;
		Kernel.msgOut("loading /sbin/init.js");
		Kernel.ProcessManager.load("/sbin/init.js", Kernel.next);
		Kernel.state++;
		break;
	case 1:
		break;
	case 2:
		Kernel.msgSuccess(true);
		Kernel.msgOut("  creating class instance", true);
		var init = new InitClass();		
		init.init(0);
		Kernel.msgOut("  adding handler for stdio on /dev/tty1", true);
		init.files['stdin'] = Kernel.Filesystem.getFile("/dev/tty1/i");
		init.files['stdout'] = Kernel.Filesystem.getFile("/dev/tty1/o");
		Kernel.msgOut("  adding to process list", true);
		Kernel.ProcessManager.add(init);
		Kernel.msgOut("  starting init", true);
		init.main();
		Kernel.msgOut("register scheduler timer (1ms)", true);
		Kernel.msgOut("starting scheduler", true);
		Emulator.interrupts[0] = Kernel.Scheduler.tick;
		Kernel.state++;
		break;
	case 3:
		break;
	default:
		break;
	}
}
Kernel.next = function() {
	Kernel.state++;
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
	Emulator.output(text);
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
	Emulator.output(text);
}
Kernel.shutdown = function() {
	Emulator.output("\n\n\nShuting down...\nKilling all processes...\n");
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
		Emulator.output("sending sigkill to pid " + procs[i].pid + "...\n");
		try {
			procs[i].signalHandler(9);
		} catch (exception) {
		}	 
	}
	Emulator.output("all processes killed.\n\nRemoving event handlers\n\n");
	Emulator.interrupts = new Array();
	Emulator.output("System halt\n\n");
	
}

Kernel.Scheduler = function() {
}
Kernel.Scheduler.jobs;
Kernel.Scheduler.activ;
Kernel.Scheduler.working;
Kernel.Scheduler.init = function() {
	Kernel.msgOut("  init job list", true);
	Kernel.Scheduler.jobs = new Array();
	Kernel.Scheduler.activ = 0;
	Kernel.Scheduler.working = false;
}
Kernel.Scheduler.tick = function() {
	if (Kernel.Scheduler.working) {
		Kernel.Scheduler.jobs[Kernel.Scheduler.activ].signalHandler(SIGXCPU);
		Kernel.Scheduler.activ %= Kernel.Scheduler.jobs.length;
		return;
	}
	Kernel.Scheduler.working = true;
	Kernel.Scheduler.activ++;
	Kernel.Scheduler.activ %= Kernel.Scheduler.jobs.length;
	var pid = Kernel.Scheduler.jobs[Kernel.Scheduler.activ].pid;
	try {
		Kernel.Scheduler.jobs[Kernel.Scheduler.activ].tick();
	} catch (error) {
		console.log("Kernel: a wild error appeared in pid" + pid + ".tick:");
		console.dir(error);
	}
	Kernel.time++;
	Kernel.Scheduler.working = false;
}
Kernel.Scheduler.add = function(process) {
	if (!process.tick)
		return 2; // no tick method
	for (var i = 0; i < this.jobs.length; i++) {
		if (this.jobs[i].pid == process.pid)
			return 3; // no double processes
	}
	this.jobs.push(process);
	return 0;
}
Kernel.Scheduler.remove = function(process) {
	for (var i = 0; i < this.jobs.length; i++) {
		if (this.jobs[i].pid == process.pid) {
			if (this.activ == i)
				this.working = false;
			this.jobs.splice(i, i);
			return 0; // success
		}
	}
	return 1; // not in list
}

Kernel.ProcessManager = function() {
}
Kernel.ProcessManager.nextPid;
Kernel.ProcessManager.processList;
Kernel.ProcessManager.loadedList;
Kernel.ProcessManager.init = function() {
	Kernel.msgOut("  init process list", true);
	Kernel.ProcessManager.processList = new Array();
	Kernel.ProcessManager.loadedList = new Array();
	Kernel.ProcessManager.nextPid = 1;
}
Kernel.ProcessManager.add = function(process) {
	this.processList[process.pid] = process;
	if (process.parentId != 0)
		this.processList[process.parentId].signalHandler(SIGCHLD);
}
Kernel.ProcessManager.quit = function(process) {
	var parentId = process.parentId;	
	var pid = process.pid;
	console.log("Kernel: quiting pid: " + pid);
	Kernel.Scheduler.remove(process);
	if (pid != parentId)
		this.processList[parentId].signalHandler(SIGCHLD);
}
Kernel.ProcessManager.remove = function(process) {		
	this.processList.splice(process.pid, 1);
	var childs = this.getAllChilds(process.pid);
	for (var i = 0; i < childs.length; i++)
		childs[i].parentId = 1;
	if (childs.length > 0)
		this.processList[1].signalHandler(SIGCHLD);
}
Kernel.ProcessManager.load = function(path, loaded) {
	if (Kernel.ProcessManager.loadedList[path]) {
		loaded();
		return;
	}
	Kernel.ProcessManager.loadedList[path] = true;
	Emulator.Request.include(Kernel.Filesystem.getRealPath(path), loaded);
}
Kernel.ProcessManager.getAllChilds = function(pid) {
	var kids = new Array();
	for(var index in Kernel.ProcessManager.processList) {
		var proc = Kernel.ProcessManager.processList[index];
		if (proc.parentId == pid) {
			if (proc.exitCode === undefined)
				kids.push(proc);
		}
	}
	return kids;
}
Kernel.ProcessManager.getPid = function() {
	return Kernel.ProcessManager.nextPid++;
}
Kernel.ProcessManager.getClassNameFromFileName = function(name) {	
	name = name.split("/");	
	name = name[name.length - 1];	
	name = name[0].toUpperCase() + name.substring(1);
	name = name.split(".")[0];
	name += "Class";
	return name;
}

var Process = function(parentId) {	
}
Process.prototype.pid;
Process.prototype.userId;
Process.prototype.parentId;
Process.prototype.files;
Process.prototype.exitCode;
Process.prototype.init = function(parentId) {
	// DO NOT OVERWRITE
	this.pid = Kernel.ProcessManager.getPid();
	this.parentId = parentId;
	this.files = new Array();
}
Process.prototype.main = function(args) {

}
Process.prototype.tick = function() {
}
Process.prototype.exit = function(code) {
	this.exitCode = code;
	Kernel.ProcessManager.quit(this);
	throw code;
}
Process.prototype.signalHandler = function(signal) {
	switch(signal) {
	case SIGCHLD:
		break;
	case SIGHUP:
		//break;
	case SIGALRM:
		//break;
	case SIGTERM:
		//break;
	case SIGXCPU:
		//break;
	case SIGUSR1:
		//break;
	case SIGUSR2:
		//break;
	default: //SIGKILL 
		console.log("PID " + this.pid + " got Signal " + signal);
		this.exit(1);
		break;
	}
}

var File = function(path) {
	this.path = path;
}
File.prototype.path;
File.prototype.position = 0;
File.prototype.writeMode = APPND;
File.prototype.forceUpdate = function() {
	Kernel.Filesystem.update(this.path);
}
File.prototype.exists = function() {
	return Kernel.Filesystem.getFile(this.path).exists()
}
File.prototype.create = function() {
	Kernel.Filesystem.create(this.path, FILE);
}
File.prototype.read = function(length) {
	var val = Kernel.Filesystem.getFile(this.path).read(this.position, length);
	if (length)
		this.position += length;
	return val;
}
File.prototype.write = function(string) {
	this.writeFIFO(string);
}
File.prototype.writeFIFO = function(string) {
	Kernel.Filesystem.getFile(this.path).writeFIFO(string, this.writeMode);
}
File.prototype.writeLIFO = function(string) {
	Kernel.Filesystem.getFile(this.path).writeLIFO(string, this.writeMode);
}

var InnerFile = function(path) {
	this.path = path;
}
InnerFile.prototype = new File;
InnerFile.prototype.content;
InnerFile.prototype.exists = function() {
	return ((typeof this.content) != "number");
}
InnerFile.prototype.read = function(position, length) {
	if (!length)
		return this.content;
	return this.content.substring(position, position + length)
}
InnerFile.prototype.writeFIFO = function(string, mode) {
	if (mode == APPND)
		this.content += string;
	if (mode == OVWRT)
		this.content = string;
}
InnerFile.prototype.writeLIFO = function(string, mode) {
	if (mode == APPND)
		this.content = text + this.content;
	if (mode == OVWRT)
		this.content = string;
}

var AppStream = function() {
}
AppStream.prototype = new File;
AppStream.prototype.content = new Array();
AppStream.prototype.eof = false;
AppStream.prototype.isFile = false;
AppStream.prototype.fromFile = function(file) {
	var array = file.read().split("");
	array.reverse();
	for (var i = 0; i < array.length; i++)
		this.content.push(array[i]);
	this.isFile = true;
}
AppStream.prototype.read = function() {
	var char = this.content.pop();	
	this.eof = this.isFile && (!this.content.length);
	if (char)
		return char.charCodeAt(0);
}
AppStream.prototype.writeFIFO = function(string) {
	this.content.input.reverse();
	for (var i = 0; i < string.length; i++)
		this.content.push(char);
	this.content.reverse();
}
AppStream.prototype.writeLIFI = function(string) {
	for(var i = 0; i < string.length; i++)
		this.content.push(string[i]);
}

Kernel.Filesystem = function() {
}
Kernel.Filesystem.devices;
Kernel.Filesystem.root;
Kernel.Filesystem.files;
Kernel.Filesystem.init = function() {
	Kernel.msgOut("  geting device list", true);
	Kernel.Filesystem.devices = Emulator.Devices.getAll();
	var hdd = Kernel.Filesystem.devices.harddisks[OS.system.hdd];
	var partition = hdd.partitions[OS.system.partition];
	Kernel.msgOut("  generating root path", true);
	Kernel.Filesystem.root = hdd.name + "/" + partition.name;
	Kernel.Filesystem.files = new Array();

}
Kernel.Filesystem.create = function(name, type) {
	var file = new InnerFile(name);
	file.content = "";
	Kernel.Filesystem.files[name] = file;
}
Kernel.Filesystem.getFile = function(path) {
	if (Kernel.Filesystem.files[path])
		return Kernel.Filesystem.files[path];
	return Kernel.Filesystem.update(path);
	console.log("Kernel: get file " + path);
}
Kernel.Filesystem.update = function(path) {
	var file = new InnerFile(path);
	file.content = Emulator.Request.get(Kernel.Filesystem.getRealPath(path), "", false, ret);
	Kernel.Filesystem.files[path] = file;
	return file;
}
Kernel.Filesystem.shortenPath = function(name) {
	var index;
	while ((index = name.indexOf("/../")) != -1) {
		name = name.replace("/../", "/");
		var index2 = 0;
		var index3 = -1;
		while(index2 < index) {
			index3 = index2;
			index2 = name.indexOf("/", index3 + 1);
		}
		if (index3 == -1)
			return undefined;
		name = name.substring(0, index3) + name.substring(index);
	}
	while ((index = name.indexOf("/./")) != -1)
		name = name.replace("/./", "/");
	return name;
}
Kernel.Filesystem.getRealPath = function(name) {
	name = Kernel.Filesystem.shortenPath(name);
	return Kernel.Filesystem.root + name;
}
Kernel.Filesystem.addTTY = function(path, output, input) {
	var out = new InnerFile(path + "/o");
	out.output = output;
	out.writeFIFO = function(string) {
		this.output(string);
	}
	out.writeLIFI = function(string) {
		this.output(string.reverse());
	}
	out.read = function() {
		return "";
	}
	var inp = new InnerFile(path + "/i");
	inp.input = input;
	inp.writeFIFO = function(string) {
		var input = this.input();
		input.reverse();
		for (var i = 0; i < string.length; i++)
			input.push(char);
		input.reverse();
	}
	inp.writeLIFI = function(string) {
		for(var i = 0; i < string.length; i++)
			this.input().push(string[i]);
	}
	inp.read = function() {
		return this.input().pop();
	}
	Kernel.Filesystem.files[path + "/o"] = out;
	Kernel.Filesystem.files[path + "/i"] = inp
}
Kernel.Filesystem.getDirectory = function(path) {
	console.log("Kernel: trying to read directory " + path);
	var response = Emulator.Request.get(Kernel.Filesystem.getRealPath("/lib/kernel/files.php"), "scandir=" + encodeURIComponent(path), false, ret);
	response = JSON.parse(response);
	if (response.error) {
		console.log("Kernel: error on reading: " + response.error);
		return response;
	}
	return response;
}


Kernel.IO = function() {
}
Kernel.IO.inputBuffer;
Kernel.IO.init = function() {
	Kernel.msgOut("  generating /dev/tty1", true);
	Kernel.Filesystem.addTTY("/dev/tty1", Kernel.IO.output, Kernel.IO.input);
	Kernel.IO.inputBuffer = new Array();
}
Kernel.IO.key = function(code) {
	Kernel.IO.inputBuffer.push(code);
}
Kernel.IO.powersw = function() {
	console.log("Kernel: power switch pressed, but no action defined");
}
Kernel.IO.input = function() {
	return Kernel.IO.inputBuffer;
}
Kernel.IO.output = function(string) {
	Emulator.output(string);
}
