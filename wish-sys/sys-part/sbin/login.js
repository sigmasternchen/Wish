var LoginClass = function() {
}
LoginClass.prototype = new Process();
LoginClass.prototype.state = 0;
LoginClass.prototype.childList = new Array();
LoginClass.prototype.username;
LoginClass.prototype.password;
LoginClass.prototype.cpassword;
LoginClass.prototype.users;
LoginClass.prototype.user;
LoginClass.prototype.main = function(args) {
	console.log("login: loading /lib/sha256.js");
	Kernel.ProcessManager.lib("/lib/sha256.js");
	console.log("login: loading /lib/utf8.js");
	Kernel.ProcessManager.lib("/lib/utf8.js");
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
			stdout.write("\033[" + (OS.staticShift - 1) + ";0H");
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
		var char = stdin.read(1);
		char = char.replace(EOF, "");
		if (!(char.length))
			break;
		var code = (new String(char)).charCodeAt(0);
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
		this.username.push(char);
		stdout.write(char);
		break;
	case 3:
		stdout.write("password: ");
		this.state++;
		break;
	case 4:
		var char = stdin.read(1);
		char = char.replace(EOF, "");
		if (!char.length)
			break;
		var code = (new String(char)).charCodeAt(0);
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
		this.password.push(char);
		break;
	case 5:
		this.username = this.username.join("");
		this.cpassword = Sha256.hash(this.password.join(""));
		var file = new File("/etc/passwd.json");
		this.users = JSON.parse(file.read().replace(EOF, ""));
		file.close();
		this.state++;
		break;
	case 6:
		for (var i = 0; i < this.users.length; i++) {
			if (this.users[i].username == this.username) {
				if (this.users[i].password == this.cpassword) {
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
	var pid = Kernel.ProcessManager.exec(name, [], false);
	var prog = Kernel.ProcessManager.getProcess(pid);
	prog.files['stdin'] = this.files['stdin'];
	prog.files['stdout'] = this.files['stdout'];
	Kernel.UserManager.changeProcessUser(pid, this.user.username, this.password.join());
	this.password = new Array();
	console.log("login: program startet: " + name);
	prog.main(params);
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

