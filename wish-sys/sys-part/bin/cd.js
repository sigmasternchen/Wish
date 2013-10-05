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
		folder = env.array['PWD'] + "/" + folder;
	try {
		folder = Kernel.Filesystem.shortenPath(folder);
	} catch (e) {
		this.exit(0);
	}
	var file = new File(folder);
	console.dir(file);
	if (!file.exists()) {
		stdout.write("cd: no such file or directory: " + folder + "\n");
		this.exit(2);
	}
	if (!(file.getPermissions() & PERM_D)) {
		stdout.write("cd: not a directory: " + folder + "\n");
		this.exit(1);
	}
	var uid = Kernel.ProcessManager.getUserByPID(Kernel.ProcessManager.getCurrentPID());
	if (uid != 0) {
		if (uid == file.getOwner()) {
			if (!(file.getPermissions() & PERM_UX)) {
				stdout.write("cd: permission denied: " + folder + "\n");
				this.exit(3);
			}
		} else if (Kernel.UserManager.isUserIdInGroupId(uid, file.getGroup())) {
			if (!(file.getPermissions() & PERM_GX)) {
				stdout.write("cd: permission denied: " + folder + "\n");
				this.exit(3);
			}
		} else {
			if (!(file.getPermissions() & PERM_OX)) {
				stdout.write("cd: permission denied: " + folder + "\n");
				this.exit(3);
			}
		}
	}

	env.array['PWD'] = folder;
	this.exit(0);
}
