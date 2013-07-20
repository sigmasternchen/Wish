var LoginClass = function() {
}
LoginClass.prototype = new Process();
LoginClass.prototype.state = 0;
LoginClass.prototype.childList = new Array();
LoginClass.prototype.username;
LoginClass.prototype.password;
LoginClass.prototype.users;
LoginClass.prototype.user;
LoginClass.prototype.main = function(args) {
	console.log("login: loading /lib/sha256.js");
	Kernel.ProcessManager.load("/lib/sha256.js", nothing);
	console.log("login: loading /lib/utf8.js");
	Kernel.ProcessManager.load("/lib/utf8.js", nothing);
	console.log("login: adding to scheduler job list");
	Kernel.Scheduler.add(this);	
}
LoginClass.prototype.tick = function() {	
	var stdout = this.files['stdout'];
	var stdin = this.files['stdin'];
	switch(this.state) {
	case 0:
		stdout.write("\033[?25h\033[0;0H");
		if (OS.staticShift)
			stdout.write("\033[0:" + (OS.staticShift - 1) + "H");
		stdout.write("\033[0J");
		this.state++;
		break;
	case 1:
		this.username = new Array();
		this.password = new Array();
		stdout.write(OS.hostname + " login: ");
		this.state++;
		break;
	case 2:
		var code = stdin.read();
		if (!code)
			break;
		if (KeyCodes.isEnter(code)) {
			this.state++;
			stdout.write("\n");
			break;
		}
		if (KeyCodes.isBackspace(code)) {
			if (!this.username.length)
				break;
			this.username.pop();
			stdout.write("\033[1D \033[1D");
			break;
		}
		var char = KeyCodes.normalKey(code);
		this.username.push(char);
		stdout.write(char);
		break;
	case 3:
		stdout.write("password: ");
		this.state++;
		break;
	case 4:
		var code = stdin.read();
		if (!code)
			break;
		if (KeyCodes.isEnter(code)) {
			this.state++;
			stdout.write("\n");
			break;
		}
		if (KeyCodes.isBackspace(code)) {
			if (!this.password.length)
				break;
			this.password.pop();
			break;
		}
		var char = KeyCodes.normalKey(code);
		this.password.push(char);
		break;
	case 5:
		this.username = this.username.join("");
		this.password = Sha256.hash(this.password.join(""));
		this.files['passwd'] = Kernel.Filesystem.getFile("/etc/passwd.json");
		Kernel.Filesystem.update("/etc/passwd.json");
		this.users = JSON.parse(this.files['passwd'].read());
		this.state++;
		break;
	case 6:
		for (var i = 0; i < this.users.length; i++) {
			if (this.users[i].username == this.username) {
				if (this.users[i].password == this.password) {
					this.state = 7;
					this.user = this.users[i];
				}
			}
		}
		if (this.state == 6) {
			this.state = 1;
			stdout.write("\n");
			stdout.write("Login incorrect\n");
		}
		break;
	case 7:
		stdout.write("\n");
		console.log("login: okay, user='" + this.user.username + "' shell='" + this.user.shell + "' dir='" + this.user.home + "'");
		Emulator.Output.shiftKey = 1;
		OS.staticShift = 1;
		this.execProgram(this.user);
		this.state++;
		break;
	case 8:
		break;
	default:
		break;
	}
}
LoginClass.prototype.execProgram = function(user) {
	var name = user.shell;
	params = [name, user.username, user.home];
	var pathArray = new Array();
	pathArray[0] = ["stdout", this.files['stdout'].path];
	pathArray[1] = ["stdin", this.files['stdin'].path];
	var s = "";
	s += "var func = function () { ";
	s += "	try {";
	s += "		var prog = new " + Kernel.ProcessManager.getClassNameFromFileName(name) + "();";
	s += "	} catch (exception) {";
	s += "		console.dir(exception);";
	s += "	}"; 
	s += "	prog.init(" + this.pid + ");";
	s += "	var paths = JSON.parse('" + JSON.stringify(pathArray) + "');";
	s += "	for(var i = 0; i < paths.length; i++) {";
	s += "		prog.files[paths[i][0]] = Kernel.Filesystem.getFile(paths[i][1]);";
	s += "	}";
	s += "	Kernel.ProcessManager.add(prog);";
	s += "	console.log(\"login: start shell '" + name + "'...\");";
	s += "	try {";
	s += "		prog.main(JSON.parse('" + JSON.stringify(params) + "'));";
	s += "	} catch (exception) {";
	s += "		console.dir(exception);";
	s += "	}"; 
	s += "}";
	eval(s);
	Kernel.ProcessManager.load(name, func);
}
LoginClass.prototype.signalHandler = function(signal) {	
	switch(signal) {
	case SIGCHLD:
		var newChildList = Kernel.ProcessManager.getAllChilds(this.pid);
		var oldChilds = this.childList.diff(newChildList);
		var newChilds = newChildList.diff(this.childList);
		if (newChilds.length)
			console.log("login: we got " + newChilds.length + " new kid(s)... : )")
		if (oldChilds.length) {
			console.log("login: we lost " + oldChilds.length + " kid(s) (should be client shell)"); 
			console.log("login: trying to restart");
			this.state = 0; 
		}
		for (var i = 0; i < oldChilds; i++)
			Kernel.ProcessManager.remove(oldChilds[i]);
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

