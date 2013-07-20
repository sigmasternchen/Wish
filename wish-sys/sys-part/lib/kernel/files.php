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
?>
