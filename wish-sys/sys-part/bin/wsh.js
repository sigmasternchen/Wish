const NO_INTERNAL_COMMAND = 1337;

WshClass = function() {
}
WshClass.prototype = new Process();
WshClass.prototype.iCommands = {
	"exit": function(params, own) {
			var rv = 0;
			if (params.length > 1)
				rv = parseInt(params[1]);
			Kernel.ProcessManager.quit(own);
			throw rv;
		}
}
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
	this.uid = Kernel.ProcessManager.getUserByPID(this.pid);
	this.username = Kernel.UserManager.getUserById(this.uid).username;
	if (args[2]) {
		this.Environment.array['HOME'] = args[2];
		this.Environment.array['PWD'] = args[2];
	} else if (!this.Environment.array['HOME']) {
		this.Environment.array['HOME'] = "/";
		this.Environment.array['PWD'] = "/";
	} else {
		this.Environment.array['PWD'] = this.Environment.array['HOME'];
	}
}
WshClass.prototype.tick = function() {
	var stdout = this.files['stdout'];
	var stdin = this.files['stdin'];
	switch(this.state) {
	case 0:
		stdout.write("Welcome to WishOS 0.1 (WOSKernel 0.9)\n\n");
		console.log("wsh: loading profile");
		var prof = new File("/etc/profile.d/env.json");
		var array = JSON.parse(prof.read().replace(EOF, ""));
		prof.close();
		for (var i = 0; i < array.length; i++) {
			while(array[i][1].indexOf("\\033") != -1) 
				array[i][1] = array[i][1].replace("\\033", "\033");
			console.log("wsh: set env." + array[i][0] + " = \"" + array[i][1] + "\"");
			this.Environment.array[array[i][0]] = array[i][1];
		}
		console.log("wsh: checking for home directory: " + this.Environment.array['HOME']);
		var file = new File(this.Environment.array['HOME']);
		if (!file.exists() || !(file.getPermissions() & PERM_D)) {
			console.log("wsh: home dir not found or not a directory");
			stdout.write("\033[31mHome directory not found. Using / instead.\n\n");
			this.Environment.array['HOME'] = "/";
			this.Environment.array['PWD'] = "/";
		}
		file.close();
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
			prompt = prompt.replace("\\$", (this.uid == 0) ? "#" : "$");
		while (prompt.indexOf("\\#") != -1)
			prompt = prompt.replace("\\#", (this.lastExitCode == 0) ? "" : this.lastExitCode);
		stdout.write(prompt);
		this.state++;
		break;
	case 2:
		var char = stdin.read(1);
		char = char.replace(EOF, "");
		if (!char.length)
			break;
		var code = char.charCodeAt(0);
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

	var quote = false;
	var parts = new Array();
	for (var i = 0; i < params.length; i++) {
		var tmp = params[i];
		var pos = 0;
		while ((pos = tmp.indexOf("\"", pos)) != -1) {
			if (tmp[pos - 1] != "\\")
				tmp = tmp.substring(0, pos) + tmp.substring(pos + 1);
			else 
				pos++;
		}	
		if (quote) {
			parts[parts.length - 1] += " " + tmp;
		} else {
			parts.push(tmp);
		}
		tmp = params[i];
		var pos = 0;
		while ((pos = tmp.indexOf("\"")) != -1) {
			var pos2 = tmp.indexOf("\\\"");
			if ((pos2 == -1) || (pos2 != pos - 1)) 
				quote = !quote;
			tmp = tmp.substring(pos + 1);
		}
	}
	// ignore quote
	if (quote) {
		var lparts = parts[parts.length - 1].split(" ");
		parts.splice(parts.length - 1, 1);
		for (var i = 0; i < lparts.length; i++)
			parts.push(lparts[i]);
	}
	params = parts;

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
	
	console.log("wsh: checking if internal command")
	var rv = this.internalCommand(params)
	
	if (rv != NO_INTERNAL_COMMAND) {
		return rv;
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

	var pid = Kernel.ProcessManager.exec(file, [], false);
	var prog = Kernel.ProcessManager.getProcess(pid);
	prog.files['stdin'] = this.files['stdin'];
	prog.files['stdout'] = this.files['stdout'];
	prog.Environment = this.Environment;
	console.log("wsh: program main start: " + file);
	prog.main(params);
	console.log("wsh: program main return");
}
WshClass.prototype.internalCommand = function(params) {
	if (this.iCommands[params[0]]) {
		console.log("wsh: internal command");
		console.log("wsh: executing internal representation");
		return this.iCommands[params[0]](params, this);
	} else { 
		console.log("wsh: no internal command");
		return NO_INTERNAL_COMMAND;
	}
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
