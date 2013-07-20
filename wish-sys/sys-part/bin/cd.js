var CdClass = function() {
}
CdClass.prototype = new Process();
CdClass.prototype.main = function(args) {
	var stdout = this.files['stdout'];
	var env = Kernel.ProcessManager.processList[this.parentId].Environment; // ugly, change this
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
	console.log(folder);
	folder = Kernel.Filesystem.shortenPath(folder);
	console.log(folder);
	var files = Kernel.Filesystem.getDirectory(folder);
	if (files.error) {
		stdout.write("cd: cannot access " + folder + ": " + files.error + "\n");
		this.exit(2);
		return; // ugly, change this
	}
	console.log(folder);
	env.array['PWD'] = folder;
	this.exit(0);
}
