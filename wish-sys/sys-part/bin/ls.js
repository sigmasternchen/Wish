var LsClass = function() {
}
LsClass.prototype = new Process();
LsClass.prototype.main = function(args) {
	var stdout = this.files['stdout'];
	var env = Kernel.ProcessManager.processList[this.parentId].Environment.array; // ugly, change this
	var folder = "";
	if (args.length == 1) {
		folder = env['PWD'];
	} else {
		folder = args[1];
	}
	var files = Kernel.Filesystem.getDirectory(folder);
	if (files.error) {
		stdout.write("ls: cannot access " + folder + ": " + files.error + "\n");
		this.exit(2);
	}
	for (var i = 0; i < files.length; i++) {
		if (files[i].substring(0, 1) != ".")
			stdout.write(files[i] + "\n");
	}
	this.exit(0);
}
