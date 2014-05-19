var InnerProcess = function() {
}
InnerProcess.prototype.user;
InnerProcess.prototype.files = new Array();

var Process = function(parentId) {	
}
Process.prototype.pid;
Process.prototype.userId;
Process.prototype.parentId;
Process.prototype.files;
Process.prototype.Environment;
Process.prototype.exitCode;
Process.prototype.init = function(parentId) {
	// DO NOT OVERWRITE
	this.pid = Kernel.ProcessManager.getPid(); 
	this.Environment = function() {
	}
	this.Environment.global = {};
	this.Environment.local = {};
	this.parentId = parentId;
	this.files = new Array();
}
Process.prototype.main = function(args) {

}
Process.prototype.tick = function() {
}
Process.prototype.exit = function(code) {
	this.exitCode = code;
	Kernel.ProcessManager.quit(this);
	throw code;
}
Process.prototype.signalHandler = function(signal) {
	switch(signal) {
	case SIGCHLD:
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

Kernel.ProcessManager = function() {
}
Kernel.ProcessManager.nextPid;
Kernel.ProcessManager.processList;
Kernel.ProcessManager.innerProcessList;
Kernel.ProcessManager.loadedList;
Kernel.ProcessManager.init = function() {
	Kernel.msgOut("  init process list");
	Kernel.ProcessManager.processList = new Array();
	Kernel.ProcessManager.innerProcessList = new Array();
	Kernel.ProcessManager.nextPid = 1;
	Kernel.msgSuccess(true);
}
Kernel.ProcessManager.lib = function(filepath) {
	Kernel.ProcessManager.exec(filepath, [], false, true);
}
Kernel.ProcessManager.exec = function(filepath, params, execute, lib) {
	var file = Kernel.Filesystem.vfs.getFileByPath(filepath);
	if (!file)
		throw ("No such file or directory: " + filepath);
	
	var parent = Kernel.ProcessManager.getCurrentPID();
	var uid = Kernel.ProcessManager.getUserByPID(parent);
	if (uid != 0) {
		if (uid == file.ownerID) {		
			if (!(file.permissions & PERM_UR))
				throw "not permitted";
			if (!(file.permissions & PERM_UX))
				throw "not permitted";
		}
		if (Kernel.UserManager.isUserIdInGroupId(uid, file.groupID)) {			
			if (!(file.permissions & PERM_GR))
				throw "not permitted";
			if (!(file.permissions & PERM_GX))
				throw "not permitted";
		}

		if (!(file.permissions & PERM_OR))
			throw "not permitted";
		if (!(file.permissions & PERM_OX))
			throw "not permitted";
	} else {
		if (!(file.permissions & (PERM_UX | PERM_GX | PERM_OX)))
			throw "not permitted";
	}
	
	try {
		(1 ? eval : 0)(file.content); // genius hack to switch eval-scope to window
	} catch (e) {
		console.log("Kernel: error in process exec");
		console.log(e.stack);
	}
	if (lib)
		return;
	var program = eval("new " + Kernel.ProcessManager.getClassNameFromFileName(filepath));
	
	program.init(parent);
	Kernel.ProcessManager.processList[program.pid] = program;

	var innerProgram = new InnerProcess();
	innerProgram.user = uid;
	Kernel.ProcessManager.innerProcessList[program.pid] = innerProgram;
	if (execute !== false)
		program.main(params);
	if (program.pid != 1)
		this.processList[program.parentId].signalHandler(SIGCHLD);
	return program.pid;
}
Kernel.ProcessManager.quit = function(process) {
	var parentId = process.parentId;
	var pid = process.pid;
	console.log("Kernel: quiting pid: " + pid);
	Kernel.Scheduler.remove(process);
	if (pid != parentId)
		this.processList[parentId].signalHandler(SIGCHLD);
}
Kernel.ProcessManager.remove = function(process) {
	this.processList.splice(process.pid, 1);
	var childs = this.getAllChilds(process.pid);
	for (var i = 0; i < childs.length; i++)
		childs[i].parentId = 1;
	if (childs.length > 0)
		this.processList[1].signalHandler(SIGCHLD);
}
Kernel.ProcessManager.getAllChilds = function(pid) {
	var kids = new Array();
	for(var index in Kernel.ProcessManager.processList) {
		var proc = Kernel.ProcessManager.processList[index];
		if (proc.parentId == pid) {
			if (proc.exitCode === undefined)
				kids.push(proc);
		}
	}
	return kids;
}
Kernel.ProcessManager.getPid = function() {
	return Kernel.ProcessManager.nextPid++;
}
Kernel.ProcessManager.getClassNameFromFileName = function(name) {	
	name = name.split("/");	
	name = name[name.length - 1];	
	name = name[0].toUpperCase() + name.substring(1);
	name = name.split(".")[0];
	name += "Class";
	return name;
}
Kernel.ProcessManager.getCurrentPID = function() {
	var spid = Kernel.Scheduler.activ;
	var pid;
	if (spid === undefined || !Kernel.Scheduler.jobs[spid])
		pid = 1;
	else
		pid = Kernel.Scheduler.jobs[spid].pid;
	return pid;
}
Kernel.ProcessManager.getProcess = function(pid) {
	return Kernel.ProcessManager.processList[pid];
}
Kernel.ProcessManager.getUserByPID = function(pid) {
	if (pid == 1)
		return 0;	// solves the chicken-or-the-egg-problem (pid 1 may not exist yet), but uid has to be 0
	return Kernel.ProcessManager.innerProcessList[pid].user;
}
Kernel.ProcessManager.getFileListByPID = function(pid) {
	return clone(Kernel.ProcessManager.innerProcessList[pid].files);
}