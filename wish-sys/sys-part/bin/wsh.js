WshClass = function() {
}
WshClass.prototype = new Process();
WshClass.prototype.state = 0;
WshClass.prototype.Environment = function() {
}
WshClass.prototype.Environment.array = new Array();
WshClass.prototype.input = new Array();
WshClass.prototype.lastExitCode = 0;
WshClass.prototype.childList = new Array();
WshClass.prototype.main = function(args) {
	console.log("wsh: adding to scheduler job list");
	Kernel.Scheduler.add(this);
	this.username = args['1'];
	this.Environment.array['HOME'] = args[2];
	this.Environment.array['PWD'] = args[2];
}
WshClass.prototype.tick = function() {
	var stdout = this.files['stdout'];
	var stdin = this.files['stdin'];
	switch(this.state) {
	case 0:
		stdout.write("Welcome to WishOS 0.1 (WOSKernel 0.1)\n\n");
		console.log("wsh: loading profile");
		this.files['profile.d'] = new File("/etc/profile.d/env.json");
		var array = JSON.parse(this.files['profile.d'].read());
		for (var i = 0; i < array.length; i++) {
			while(array[i][1].indexOf("\\033") != -1) 
				array[i][1] = array[i][1].replace("\\033", "\033");
			this.Environment.array[array[i][0]] = array[i][1];
		}
		var files = Kernel.Filesystem.getDirectory(this.Environment.array['HOME']);
		if (files.error) {
			stdout.write("\033[31mHome directory not found. Using / instead.\n\n");
			this.Environment.array['HOME'] = "/";
			this.Environment.array['PWD'] = "/";
		}
		this.state++;
		break;
	case 1:
		var prompt = this.Environment.array['PS1'];
		while (prompt.indexOf("\\w") != -1)
			prompt = prompt.replace("\\w", this.Environment.array['PWD'].replace(this.Environment.array['HOME'], "~/"));
		while (prompt.indexOf("\\u") != -1)
			prompt = prompt.replace("\\u", this.username);
		while (prompt.indexOf("\\u") != -1)
			prompt = prompt.replace("\\u", OS.hostname);
		while (prompt.indexOf("\\$") != -1)
			prompt = prompt.replace("\\$", (this.username == "root") ? "#" : "$");
		while (prompt.indexOf("\\#") != -1)
			prompt = prompt.replace("\\#", (this.lastExitCode == 0) ? "" : this.lastExitCode);
		stdout.write(prompt);
		this.state++;
		break;
	case 2:
		var code = stdin.read();
		if (!code)
			break;
		if (KeyCodes.isBackspace(code)) {
			if (!this.input.length)
				break;
			this.input.pop();
			stdout.write("\033[1D \033[1D");
			break;
		}
		if (KeyCodes.isEnter(code)) {
			stdout.write("\n");	
			this.parseLine();
			break;
		}
		var char = KeyCodes.normalKey(code);
		this.input.push(char);
		stdout.write(char);
		break;
	case 3:
		break;
	case 4:
		this.state = 1;
		var params = this.input.join("").split(" ");
		for (var i = 0; i < params.length; i++)
			if (params[i].length == 0)
				params.splice(i, 1);
		stdout.write("wsh: command not found: " + params[0] + "\n");
		this.lastExitCode = 127;
		this.input = new Array();
		break;
	default:
		break;
	}
}
WshClass.prototype.parseLine = function() {	
	this.state = 1;
	var command = this.input.join("");
	var params = command.split(" ");
	for(var i = 0; i < params.length; i++)
		if (params[i].length == 0)
			params.splice(i, 1);

	if (params.length == 0) {
		this.input = new Array();
		return;
	}


	for (var i = 0; i < params.length; i++) {
		if (params[i][0] == "$") {
			if (this.Environment.array[params[i].substring(1)])
				params[i] = this.Environment.array[params[i].substring(1)];
		}
	}
	

	if (params[0].indexOf("=") != -1) {
		do {
			var array = params[0].split("=");
			if (!array[0].length) {
				params[0].substring(1);
				break;
			}
			var name = array[0];
			array.splice(0, 1);
			var value = array.join("=");
			this.Environment.array[name] = value;
			params.splice(0, 1);
		} while (false);
	}

	for(var i = 0; i < params.length; i++)
		if (params[i].length == 0)
			params.splice(i, 1);

	if (params.length == 0) {
		this.input = new Array();
		return;
	}

	var ok = false;
	var name = params[0];
	var file = "";
	if (name.substring(0, 1) == "/") 
		file = name + ".js";
	else if (name.indexOf("/") != -1)
		file = this.Environment.array['PWD'] + name + ".js";
	else {
		var paths = this.Environment.array['PATH'].split(":");
		for (var i = 0; i < paths.length; i++) {
			file = paths[i] + "/" + name + ".js";
			console.log("wsh: trying: " + file);
			if (this.tryFile(file)) {
				ok = true;
				break;
			}
		}
		
	}
	if (this.tryFile(file)) {
		console.log("wsh: files exists... yay....");
		ok = true;
	}
	if (!ok) {
		this.state = 4;
		return;
	}
	this.input = new Array();
	
	this.state = 3;
	var pathArray = new Array();
	pathArray[0] = ["stdout", this.files['stdout'].path];
	pathArray[1] = ["stdin", this.files['stdin'].path];
	var s = "";
	s += "var func = function () { ";
	s += "	try {";
	s += "		var prog = new " + Kernel.ProcessManager.getClassNameFromFileName(file) + "();";
	s += "	} catch (exception) {";
	s += "		console.dir(exception);";
	s += "	}"; 
	s += "	prog.init(" + this.pid + ");";
	s += "	var paths = JSON.parse('" + JSON.stringify(pathArray) + "');";
	s += "	for(var i = 0; i < paths.length; i++) {";
	s += "		prog.files[paths[i][0]] = Kernel.Filesystem.getFile(paths[i][1]);";
	s += "	}";
	s += "	Kernel.ProcessManager.add(prog);";
	s += "	console.log(\"wsh: start command '" + file + "'...\");";
	s += "	try {";
	s += "		prog.main(JSON.parse('" + JSON.stringify(params) + "'));";
	s += "	} catch (exception) {";
	s += "		console.log(\"Prozess \" + prog.pid + \": \");";
	s += "		console.dir(exception);";
	s += "	}"; 
	s += "}";
	eval(s);
	Kernel.ProcessManager.load(file, func);
}
WshClass.prototype.tryFile = function(name) {
	var file = new File(name);
	return file.exists();
}
WshClass.prototype.signalHandler = function(signal) {
	switch(signal) {
	case SIGCHLD:
		var newChildList = Kernel.ProcessManager.getAllChilds(this.pid);
		var oldChilds = this.childList.diff(newChildList);
		var newChilds = newChildList.diff(this.childList);
		if (newChilds.length)
			console.log("wsh: we got " + newChilds.length + " new kid(s)... : )")
		if (oldChilds.length) {
			console.log("wsh: we lost " + oldChilds.length + " kid(s)");
			this.state = 1; 
		}
		for (var i = 0; i < oldChilds.length; i++) {
			this.lastExitCode = oldChilds[i].exitCode;
			Kernel.ProcessManager.remove(oldChilds[i]);
		}
		this.childList = newChildList;
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
