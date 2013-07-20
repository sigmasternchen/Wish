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
	var stdout = this.files['stdout'];
	if (this.pid == 1) {
		stdout.write("\ninit: we are pid 1");
		stdout.write("\n      trying to daemonize");
		stdout.write("\n      adding to scheduler job list");
		Kernel.Scheduler.add(this);
	} else {

	}
}
InitClass.prototype.tick = function() {
	var stdout = this.files['stdout'];
	var stdin = this.files['stdin'];
	switch(this.state) {
	case 0:		
		this.state++;
		stdout.write("\ninit: we are a daemon now ... yay ...");
		stdout.write("\nreseting system runlevel");
		OS.runlevel = 0;
		stdout.write("\nloading /etc/inittab.json ...");
		var file = Kernel.Filesystem.getFile("/etc/inittab.json");
		this.files[file.path] = file;
		this.inittab = JSON.parse(file.read());
		break;
	case 1:
		this.state++;
		if (this.destLevel = this.inittab.initdefault)
			break;
		this.state = 100;
		break;
	case 2:
		this.state++;
		stdout.write("\033[?25l\n");
		stdout.write("destination runlevel=" + this.destLevel);
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
		stdout.write("\nno default runlevel defined");
		stdout.write("\ntype in destination level: \033[?25h");
	case 101:
		var keycode = stdin.read();
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
	Kernel.Filesystem.update("/tmp/destLevel.1");
	var runlevel = Kernel.Filesystem.getFile("/tmp/destLevel.1").read();
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
	if (files)
		for (var i = 0; i < files.length; i++) {
			pathArray.push([files[i], this.files[files[i]].path]);
		}
	var s = "";
	s += "var func = function () { ";
	s += "	try {";
	s += "		var prog = new " + Kernel.ProcessManager.getClassNameFromFileName(name) + "();";
	s += "	} catch (exception) {";
	s += "		console.dir(exception);";
	s += "	}"; 
	s += "	prog.init(1);";
	s += "	var paths = JSON.parse('" + JSON.stringify(pathArray) + "');";
	s += "	for(var i = 0; i < paths.length; i++) {";
	s += "		prog.files[paths[i][0]] = Kernel.Filesystem.getFile(paths[i][1]);";
	s += "	}";
	s += "	Kernel.ProcessManager.add(prog);";
	s += "	console.log(\"init: start command '" + command + "'...\");";
	s += "	try {";
	s += "		prog.main(JSON.parse('" + JSON.stringify(params) + "'));";
	s += "	} catch (exception) {";
	s += "		console.dir(exception);";
	s += "	}"; 
	s += "}";
	eval(s);
	Kernel.ProcessManager.load(name, func);
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
		Kernel.shutdown();
		break;
	default:  
		console.log("PID " + this.pid + " got Signal " + signal);
		// Kernel.ProcessManager.remove(this);
		break;
	}
}
