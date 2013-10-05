var GettyClass = function() {
	// pseudo getty
}
GettyClass.prototype = new Process();
GettyClass.prototype.file = "";
GettyClass.prototype.login = "/sbin/login.js";
GettyClass.prototype.main = function(args) {
	console.log("getty: started");
	this.parseArgs(args);
	var pid = Kernel.ProcessManager.exec(this.login, [], false);
	var prog = Kernel.ProcessManager.getProcess(pid);
	prog.files['stdin'] = new File(this.file);
	prog.files['stdout'] = new File(this.file);
	prog.files['stdout'].writeMode = MODE_APPND;
	prog.main();
}
GettyClass.prototype.parseArgs = function(args) {
	if (args.length == 1) {
		var error = "getty: not enough arguments";
		if (this.files['stdout'])
			this.files['stdout'].write(error);
		else
			console.log(error);
		this.exit(1);
	}
	if (args.length > 2) {
		var error = "getty: too many arguments";
		if (this.files['stdout'])
			this.files['stdout'].write(error);
		else
			console.log(error);
		this.exit(1);
	}
	this.file = args[1];
	// TODO login
}
