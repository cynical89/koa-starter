module.exports = (shipit) => {
	require("shipit-deploy")(shipit);

	const config = require("./config.json");
	const pathStr = "PATH='$PATH:/usr/local/bin'";
	const currentPath = `${config.deploy.path}/current`;

	shipit.initConfig({
		default: {
			workspace: "tmp",
			deployTo: config.deploy.path,
			repositoryUrl: "https://github.com/snollygolly/koa-starter.git",
			ignores: [".git", "node_modules"],
			rsync: ["--del"],
			keepReleases: 2,
			key: "~/.ssh/id_rsa",
			shallowClone: true
		},
		production: {
			servers: `${config.deploy.username}@${config.deploy.hostname}`
		}
	});

	// this task runs an NPM install remotely to install dependencies
	shipit.blTask("install", () => {
		return shipit.remote(`${pathStr} && cd ${currentPath} && npm install &> /dev/null`);
	});

	// this task starts the server in a screen with a name set in the config
	shipit.blTask("start_screen", () => {
		return shipit.remote(`${pathStr} && cd ${currentPath} && screen -S ${config.deploy.screen} -d -m npm start`);
	});

	// this task starts the server directly in the shipit output.	use this instead of start_screen if you"re having problems
	shipit.blTask("start_session", () => {
		return shipit.remote(`${pathStr} && cd ${currentPath} && npm start`);
	});

	// this task copies the config.json from your local folder to the current folder
	shipit.blTask("install_local_config", () => {
		return shipit.remoteCopy("config.json", currentPath);
	});

	// this task copies the config.json from the remote source"s root into the current folder
	shipit.blTask("install_remote_config", () => {
		return shipit.remote(`cd ${config.deploy.path} && cp config.json ${currentPath}`);
	});

	// this task kills any screen with the name set in the config if it"s running.	phrased as an if to prevent non-0 exit codes
	shipit.blTask("kill_screen", () => {
		return shipit.remote(`if screen -ls | grep -q '${config.deploy.screen}'; then screen -S ${config.deploy.screen} -p 0 -X stuff $'\\003'; fi;`);
	});

	shipit.on("deployed", () => {
		// this series of tasks will result in a good deploy assuming everything is \working
		shipit.start("kill_screen", "install", "install_local_config", "start_screen");
		// if you"re having problems with the deploy being successful, but not actually starting the server, try this:
		// shipit.start("kill_screen", "install", "install_local_config", "start_session");
	});
};
