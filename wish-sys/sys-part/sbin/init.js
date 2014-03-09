var InitClass = function() {
}
InitClass.prototype = new Process();
InitClass.prototype.childList;
InitClass.prototype.state = 0;
InitClass.prototype.inittab;
InitClass.prototype.destLevel;
InitClass.prototype.Start = function() {
}
InitClass.prototype.Start.array;
InitClass.prototype.Start.index;
InitClass.prototype.modifyLevel = false;
InitClass.prototype.main = function(args) {
	this.childList = new Array();
	if (this.pid == 1) {
		Emulator.output("\ninit: we are pid 1");
		Emulator.output("\n      trying to daemonize");
		Emulator.output("\n      adding to scheduler job list");
		Kernel.Scheduler.add(this);
	} else {
		var uid = Kernel.ProcessManager.getUserByPID(this.pid);
		if (uid != 0) {
			this.files['stdout'].write("init: need to be root\n");
			this.exit(1);
		}
		if (args.length != 2) {
			this.files['stdout'].write("init: missing runlevel\n");
			this.exit(1);
		}
		if (!isNumber(args[1])) {
			this.files['stdout'].write("init: illegal runlevel\n");
			this.exit(1);
		}
		var tmp = new File("/tmp/destLevel.1");
		tmp.writeMode = MODE_OVRWD;
		tmp.notExistsMode = MODE_CREATE;
		tmp.write(parseInt(args[1]));
		tmp.close();
		var init = Kernel.ProcessManager.getProcess(1); // init has pid 1
		init.signalHandler(SIGUSR1);
		this.exit(0);
	}
}
InitClass.prototype.tick = function() {
	switch(this.state) {
	case 0:		
		this.state++;
		Emulator.output("\ninit: we are a daemon now ... yay ...");
		Emulator.output("\nreseting system runlevel");
		OS.runlevel = 0;
		Emulator.output("\nloading /etc/inittab.json ...");
		var file = new File("/etc/inittab.json");
		this.files[file.path] = file;
		file = file.read();
		file = file.replace(EOF, "");
		this.inittab = JSON.parse(file);
		break;
	case 1:
		this.state++;
		if (this.destLevel = this.inittab.initdefault)
			break;
		this.state = 100;
		break;
	case 2:
		this.state++;
		Emulator.output("\033[?25l\n");
		Emulator.output("destination runlevel=" + this.destLevel);
		break;
	case 3:
		this.Start.array = this.inittab.sysinit;
		this.Start.index = 0;
		this.state++;
		break;
	case 4:
		if (this.Start.index >= this.Start.array.length) {
			this.state = 5;
		} else {
			this.execProgram();
			this.Start.index++;
		}
		break;
	case 5:
		if (OS.runlevel == this.destLevel) {
			this.state = 30;
			break;
		} else				
			this.state = 6;
		OS.runlevel += Math.sign(this.destLevel - OS.runlevel);
		console.log("init: entering runlevel " + OS.runlevel);
		break;
	case 6:
		this.Start.array = this.getProgramsForRunlevel(OS.runlevel);
		this.Start.index = 0;
		this.state = 4;
		break;

	case 30:
		console.log("init: we are finished");
		this.state = 31;
		break;
	case 31:
		break;
	case 100: // input runlevel
		this.state++;
		Emulator.output("\nno default runlevel defined");
		Emulator.output("\ntype in destination level: \033[?25h");
	case 101:
		var keycode = Kernel.IO.inputBuffer.pop();
		if (!keycode)
			break;
		var char = KeyCodes.normalKey(keycode);
		if (isNumber(char)) {
			this.destLevel = parseInt(char);
			this.state = 2;
		}
		break;
	case SYSHALT:
		break;
	default:
		break;	
	}
}
InitClass.prototype.changeRunlevel = function() {
	var file = new File("/tmp/destLevel.1");
	var runlevel = file.read();
	this.destLevel = parseInt(runlevel);
	this.state = 5;
}
InitClass.prototype.getProgramsForRunlevel = function(level) {
	var array = eval("this.inittab.l" + level);
	if (array)
		return array;
	return  new Array();
}
InitClass.prototype.execProgram = function() {
	var command = this.Start.array[this.Start.index].command;
	var params = command.split(" ");
	var name = params[0];
	var files = this.Start.array[this.Start.index].files;
	var pathArray = new Array();

	var pid = Kernel.ProcessManager.exec(name, [], false);
	var prog = Kernel.ProcessManager.getProcess(pid);
	if (files)
		for (var i = 0; i < files.length; i++) {
			prog.files[files[i]] = this.files[files[i]];
		}
	console.log("init: starting program " + command)
	prog.main(params);
	console.log("init: process started with pid: " + prog.pid);
}
InitClass.prototype.signalHandler = function(signal) {
	switch(signal) {
	case SIGCHLD:
		var newChildList = Kernel.ProcessManager.getAllChilds(this.pid);
		var oldChilds = this.childList.diff(newChildList);
		var newChilds = newChildList.diff(this.childList);
		var logText = "init: We lost " + oldChilds.length + " kids and got " + newChilds.length + " new orphans (or selfmade kids)... : (";
		console.log(logText);
		for (var i = 0; i < oldChilds; i++)
			Kernel.ProcessManager.remove(oldChilds[i]);
		this.childList = newChildList;
		break;
	case SIGHUP:
		console.log("init: we lost File for stdout or stdin");
		break;
	case SIGALRM:
		console.log("init: we got alert signal, but we haven't set it")
		break;
	case SIGXCPU:
		console.log("init: we need too much time");
		break;
	case SIGUSR1:
		console.log("init: Got usr1 signal. Looking up new runlevel from env");
		this.changeRunlevel();
		break;
	case SIGUSR2:
		console.log("init: Got usr2 signal. why??");
		break;
	case SIGTERM:
		console.log("init: They want us to terminale! D:");
		console.log("init: Let's kill the kernel... Muahahahaha...");
		Kernel.shutdown();
		break;
	case SIGKILL:
		console.log("init: Got kill signal, shuting down.");
		console.log("init: remove signal handler.");
		this.signalHandler = function() {};
		Kernel.shutdown();
		break;
	default:  
		console.log("PID " + this.pid + " got Signal " + signal);
		// Kernel.ProcessManager.remove(this);
		break;
	}
}
