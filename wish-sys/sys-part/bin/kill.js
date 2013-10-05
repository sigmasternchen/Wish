var KillClass = function() {}
KillClass.prototype = new Process();
KillClass.prototype.main = function(args){
	var stdout = this.files['stdout'];
	if (args.length == 1) {
		stdout.write("kill: not enough arguments\n");
		this.exit(1);
	}
	var sig = SIGTERM;
	var pids = new Array();
	if (args.length == 2) {
		pid.push(args[1]);
	} else {
		if (args[1][0] == '-')
			sig = parseInt(args[1].substring(1));
		else
			pids.push(args[1]);
		for (var i = 2; i < args.length; i++)
			pids.push(args[i]);
	}
	
	var ret = 0;

	for (var i = 0; i < pids.length; i++) {
		if (!isNumber(pids[i])) {
			stdout.write("kill: illegal pid: " + pids[i].replace("\033", "\\033") + "\n");
			ret = 1;
			continue;
		}
		var proc = Kernel.ProcessManager.getProcess(parseInt(pids[i]);
		if (!proc) {
			stdout.write("kill: kill " + pids[i] + ": no such process\n");
			ret = 1;
			continue;
		}
		try {
			proc.signalHandler(sig);
		} catch (exception) {

		}
	}
	this.exit(ret);
}
