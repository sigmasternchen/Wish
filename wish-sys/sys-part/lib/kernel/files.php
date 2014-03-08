<?php
	error_reporting(E_ERROR | E_PARSE); // because of warnings
	if (isset($_GET['scandir'])) {
		if (strpos($_GET['scandir'], "../") !== false)
			die("illegal file path");
		$files = scandir("../../" . $_GET['scandir']);
		if ($files === false) {
			echo '{"error":"no such file or directory"}';
			exit();
		}
		echo json_encode($files);
	}
	if (isset($_GET['getStructure'])) {
		if (strpos($_GET['dir'], "../") !== false)
			die("illegal file path");
		$dir = $_GET['dir'];

		while (substr($dir, 0, 1) == "/")
			$dir = substr($dir, 1);

		$base = "../../../../" . $dir;	

		$structure = getStructure($base);
		echo json_encode($structure);
	}

	function getStructure($base) {
		$result = array();
		$handle = opendir($base);
		while ($file = readdir($handle)) {
			if ($file == "." || $file == "..")
				continue;
			if (!is_dir($base . "/" . $file))
				$result[$file] = file_get_contents($base . "/" . $file);
			else 
				$result[$file] = getStructure($base . "/" . $file);
		}
		return $result;
	}
?>
