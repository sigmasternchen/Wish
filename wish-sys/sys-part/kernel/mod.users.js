Kernel.UserManager = function() {
}
Kernel.UserManager.users = new Array();
Kernel.UserManager.groups = new Array();
Kernel.UserManager.passwdFile;
Kernel.UserManager.groupsFile;
Kernel.UserManager.init = function () {
	Kernel.UserManager.passwdFile = new File("/etc/passwd.json");
	Kernel.UserManager.groupsFile = new File("/etc/groups.json");
}
Kernel.UserManager.update = function () {
	Kernel.UserManager.users  = JSON.parse(Kernel.UserManager.passwdFile.read().replace(EOF, ""));
	Kernel.UserManager.groups = JSON.parse(Kernel.UserManager.groupsFile.read().replace(EOF, ""));
}
Kernel.UserManager.getUserById = function(id) {
	for (var i = 0; i < Kernel.UserManager.users.length; i++) {
		if (Kernel.UserManager.users[i].id == id)
			return Kernel.UserManager.users[i];
	}
	return false;
}
Kernel.UserManager.getUsernameById = function(id) {
	return Kernel.UserManager.getUserById(id).username;
}
Kernel.UserManager.getGroupById = function(id) {
	for (var i = 0; i < this.groups.length; i++) {
		if (Kernel.UserManager.groups[i].id == id)
			return Kernel.UserManager.groups[i];
	}
	return false;
}
Kernel.UserManager.getGroupnameById = function(id) {
	return Kernel.UserManager.getGroupById(id).username;
}
Kernel.UserManager.getGroupsByUserId = function(id) {
	var ret = new Array();
	for (var i = 0; i < Kernel.UserManager.groups.length; i++) {
		for (var j = 0; j < Kernel.UserManager.groups[i].members.length; j++) {
			if (Kernel.UserManager.groups[i].members[j] == id)
				ret.push(Kernel.UserManager.groups[i]);
		}
	}
	return ret;
}
Kernel.UserManager.getUserByName = function(name) {
	for (var i = 0; i < Kernel.UserManager.users.length; i++) {
		if (Kernel.UserManager.users[i].username == name)
			return Kernel.UserManager.users[i];
	}
	return false;
}
Kernel.UserManager.getGroupByName = function(name) {
	for (var i = 0; i < Kernel.UserManager.groups.length; i++) {
		if (Kernel.UserManager.group[i].name == name)
			return Kernel.UserManager.groups[i];
	}
	return false;
}
Kernel.UserManager.isUserIdInGroupId = function(user, group) {
	var groups = Kernel.UserManager.getGroupsByUserId(user);
	for (var i = 0; i < groups.length; i++) {
		if (groups.id == group)
			return true;
	}
	return false;
}
Kernel.UserManager.changeProcessUser = function(pid, username, password) {
	Kernel.ProcessManager.lib("/lib/sha256.js");
	var process = Kernel.ProcessManager.getProcess(pid);
	var user = Kernel.UserManager.getUserByName(username);
	if (!process) {
		console.log("UserManager: process " + pid + " not found");
		return false;
	}
	if (!user) 
		return false;
	if (Sha256.hash(password) != user.password)
		return false;
	Kernel.ProcessManager.innerProcessList[pid].user = user.id;
}
