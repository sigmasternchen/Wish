var CdClass = function() {
}
CdClass.prototype = new Process();
CdClass.prototype.main = function(args) {
	var stdout = this.files['stdout'];
	var env = this.Environment;
	var folder = "";
	if (args.length == 1) {
		folder = env.array['HOME'];
	} else {
		folder = args[1];
	}
	if (folder.substring(0, 1) != "/")
		folder = env.array['PWD'] + folder;
	if (folder[folder.length - 1] != "/")
		folder += "/";
	folder = Kernel.Filesystem.shortenPath(folder);
	if (!folder) {
		this.exit(0);
	}
	var files = Kernel.Filesystem.getDirectory(folder);
	if (files.error) {
		stdout.write("cd: cannot access " + folder + ": " + files.error + "\n");
		this.exit(2);
	}
	env.array['PWD'] = folder;
	this.exit(0);
}
