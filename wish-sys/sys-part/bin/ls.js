var LsClass = function() {
}
LsClass.prototype = new Process();
LsClass.prototype.main = function(args) {
	var stdout = this.files['stdout'];
	var env = this.Environment.global;
	var folder = "";
	if (args.length == 1) {
		folder = env['PWD'];
	} else {
		folder = args[1];
	}

	folder = Kernel.Filesystem.shortenPath(folder);

	var file = new File(folder);
	if (!file.exists()) {
		stdout.write("ls: no such file or directory: " + folder + "\n");
		this.exit(2);
	}
	
	var files = Kernel.Filesystem.readDir(folder);

	for (var i = 0; i < files.length; i++) {
		if (files[i].substring(0, 1) != ".")
			stdout.write(files[i] + "\n");
	}
	this.exit(0);
}
