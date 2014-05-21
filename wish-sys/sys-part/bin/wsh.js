const NO_INTERNAL_COMMAND = 1337;

WshClass = function() {
}
WshClass.prototype = new Process();
WshClass.prototype.iCommands = {
	"exit": function(args, own) {
		var rv = 0;
		if (args.length > 1)
			rv = parseInt(args[1]);
		own.exitCode = rv;
		Kernel.ProcessManager.quit(own);
		throw rv;
		return 0; // not necessary
	},
	"cd": function(args, own) {
		var stdout = own.files['stdout'];
		var env = own.Environment.global;
		var folder = "";
		if (args.length == 1) {
			folder = env['HOME'];
		} else {
			folder = args[1];
		}
		if (folder.substring(0, 1) != "/")
			folder = env['PWD'] + "/" + folder;
		try {
			folder = Kernel.Filesystem.shortenPath(folder);
		} catch (e) {
			return 0;
		}
		var file = new File(folder);
		if (!file.exists()) {
			stdout.write("wsh: cd: no such file or directory: " + folder + "\n");
			return 2;
		}
		if (!(file.getPermissions() & PERM_D)) {
			stdout.write("wsh: cd: not a directory: " + folder + "\n");
			this.exit(1);
		}
		var uid = Kernel.ProcessManager.getUserByPID(Kernel.ProcessManager.getCurrentPID());
		if (uid != 0) {
			if (uid == file.getOwner()) {
				if (!(file.getPermissions() & PERM_UX)) {
					stdout.write("wsh: cd: permission denied: " + folder + "\n");
					return 3;
				}
			} else if (Kernel.UserManager.isUserIdInGroupId(uid, file.getGroup())) {
				if (!(file.getPermissions() & PERM_GX)) {
					stdout.write("wsh: cd: permission denied: " + folder + "\n");
					return 3;
				}
			} else {
				if (!(file.getPermissions() & PERM_OX)) {
					stdout.write("wsh: cd: permission denied: " + folder + "\n");
					return 3;
				}
			}
		}
		
		env['PWD'] = folder;
		
		return 0;
	},
	"export": function(args, own) {
		if (args.length == 1) {
			for (var key in own.Environment.global) {
				if (typeof own.Environment.global[key] == "object")
					continue;
				console.log(key);
				var tmp = own.Environment.global[key];
				while (tmp.indexOf("\033") > -1)
					tmp = tmp.replace("\033", "\\033");
				own.files['stdout'].write(key + "=" + tmp + "\n");
			}
			return 0;
		}
		if (args.length == 2) {
			if (own.Environment.local[args[1]]) {
				own.Environment.global[args[1]] = own.Environment.local[args[1]];
			} else {
				own.Environment.global[args[1]] = "";
			}
			return 0;
		}
		return 1;
	},
	"echo": function(args, own) {
		args.splice(0,1); // we do not want to echo the "echo"
		own.files["stdout"].write(args.join(" ")+"\n");
		return 0;
	},
	"pwd": function(args, own) {
		own.files['stdout'].write(this.Environment.global['PWD'] + "\n");
		return 0;
	}
}
WshClass.prototype.state = 0;
WshClass.prototype.input = new Array();
WshClass.prototype.childList = new Array();
WshClass.prototype.main = function(args) {
	console.log("wsh " + this.pid + ": adding to scheduler job list");
	Kernel.Scheduler.add(this);
	this.uid = Kernel.ProcessManager.getUserByPID(this.pid);
	this.username = Kernel.UserManager.getUserById(this.uid).username;
	if (args > 1) {
		this.Environment.global['HOME'] = args[1];
	} else if (!this.Environment.global['HOME']) {
		this.Environment.global['HOME'] = "/";
	} else {
	}
}
WshClass.prototype.tick = function() {
	var stdout = this.files['stdout'];
	var stdin = this.files['stdin'];
	switch(this.state) {
	case 0:
		stdout.write("Welcome to " + OS_NAME + " (" + KERNEL + ")\n\n");
		console.log("wsh " + this.pid + ": loading profile");
		var prof = new File("/etc/profile.d/env.json");
		var array = JSON.parse(prof.read().replace(EOF, ""));
		prof.close();
		for (var i = 0; i < array.length; i++) {
			while(array[i][1].indexOf("\\033") != -1) 
				array[i][1] = array[i][1].replace("\\033", "\033");
			if (this.Environment.global[array[i][0]])
				continue;
			console.log("wsh " + this.pid + ": set env." + array[i][0] + " = \"" + array[i][1] + "\"");
			this.Environment.global[array[i][0]] = array[i][1];
		}
		
		if (!this.Environment.global['PWD'])
			this.Environment.global['PWD'] = this.Environment.global['HOME'];
		
		console.log("wsh " + this.pid + ": checking for working directory: " + this.Environment.global['PWD']);
		var file = new File(this.Environment.global['PWD']);
		if (!file.exists() || !(file.getPermissions() & PERM_D)) {
			console.log("wsh " + this.pid + ": home dir not found or not a directory");
			stdout.write("\033[31mHome directory not found. Using / instead.\n\n");
			this.Environment.global['HOME'] = "/";
			this.Environment.global['PWD'] = "/";
		}
		file.close();
		
		this.Environment.global['USER'] = this.uid;
		this.Environment.global['SHELL'] = "/bin/wsh";
		
		this.Environment.local = clone(this.Environment.global);
		this.Environment.local['$'] = this.pid;
		this.Environment.local['#'] = 0;
		this.state++;
		break;
	case 1:
		var prompt = this.Environment.local['PS1'];
		while (prompt.indexOf("\\w") != -1)
			prompt = prompt.replace("\\w", this.Environment.global['PWD'].replace(this.Environment.local['HOME'], "~/"));
		while (prompt.indexOf("\\u") != -1)
			prompt = prompt.replace("\\u", this.username);
		while (prompt.indexOf("\\u") != -1)
			prompt = prompt.replace("\\u", OS.hostname);
		while (prompt.indexOf("\\$") != -1)
			prompt = prompt.replace("\\$", (this.uid == 0) ? "#" : "$");
		while (prompt.indexOf("\\#") != -1)
			prompt = prompt.replace("\\#", (this.Environment.local['#'] == 0) ? "" : this.Environment.local['#']);
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
		this.Environment.local['#'] = 127;
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
			if (this.Environment.local[params[i].substring(1)])
				params[i] = this.Environment.local[params[i].substring(1)];
			else
				params[i] = "";
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
			this.Environment.local[name] = value;
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
	
	console.log("wsh " + this.pid + ": checking if internal command")
	var rv = this.internalCommand(params)
	
	if (rv != NO_INTERNAL_COMMAND) {
		this.input = new Array();
		this.Environment.local['#'] = rv;
		return;
	}
	
	var ok = false;
	var name = params[0];
	var file = "";
	if (name.substring(0, 1) == "/") 
		file = name + ".js";
	else if (name.indexOf("/") != -1)
		file = this.Environment.global['PWD'] + name + ".js";
	else {
		var paths = this.Environment.local['PATH'].split(":");
		for (var i = 0; i < paths.length; i++) {
			file = paths[i] + "/" + name + ".js";
			console.log("wsh " + this.pid + ": trying: " + file);
			if (this.tryFile(file)) {
				ok = true;
				break;
			}
		}
		
	}
	if (this.tryFile(file)) {
		console.log("wsh " + this.pid + ": files exists... yay....");
		ok = true;
	}
	if (!ok) {
		this.state = 4;
		return;
	}
	this.input = new Array();
	
	this.state = 3;
	
	var pid = Kernel.ProcessManager.exec(file, [], false);
	var prog = Kernel.ProcessManager.getProcess(pid);
	prog.files['stdin'] = this.files['stdin'];
	prog.files['stdout'] = this.files['stdout'];
	prog.Environment.global = clone(this.Environment.global);
	console.log("wsh " + this.pid + ": program main start: " + file);
	prog.main(params);
	console.log("wsh " + this.pid + ": program main return");
}
WshClass.prototype.internalCommand = function(params) {
	if (this.iCommands[params[0]]) {
		console.log("wsh " + this.pid + ": internal command");
		console.log("wsh " + this.pid + ": executing internal representation");
		return this.iCommands[params[0]](params, this);
	} else { 
		console.log("wsh " + this.pid + ": no internal command");
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
			console.log("wsh " + this.pid + ": we got " + newChilds.length + " new kid(s)... : )")
		if (oldChilds.length) {
			console.log("wsh " + this.pid + ": we lost " + oldChilds.length + " kid(s)");
			this.state = 1; 
		}
		for (var i = 0; i < oldChilds.length; i++) {
			this.Environment.local['#'] = oldChilds[i].exitCode;
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
