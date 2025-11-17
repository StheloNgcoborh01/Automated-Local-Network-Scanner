// -------------------------
// IMPORT MODULES
// -------------------------

import { createRequire } from "module";
const require = createRequire(import.meta.url);

import express from "express";
import bodyParser from "body-parser";
import path from "path";
import ping from "ping";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Create express app
const app = express();
const PORT = 3000;

// -------------------------
// MIDDLEWARE
// -------------------------

app.use(bodyParser.json());
app.use(express.static(path.join(process.cwd(), "public")));
app.set("view engine", "ejs");

// -------------------------
// HELPER: Get Vendor from MAC
// -------------------------
async function getMacVendor(mac) {
    try {
        const macPrefix = mac.replace(/:/g, '').substring(0, 6).toUpperCase();
        
        const commonVendors = {
            '001C14': 'Cisco',
            '001B67': 'Cisco',
            '000C29': 'VMware',
            '005056': 'VMware',
            '000569': 'Netgear',
            '001E2A': 'Belkin',
            '0021E9': 'Samsung',
            '001D0F': 'Microsoft',
            '0016CB': 'Apple',
            '000D3A': 'Apple',
            '001124': 'Dell',
            '001A11': 'Google',
            '001F3B': 'LG',
            '0022CF': 'Raspberry Pi',
            'B827EB': 'Raspberry Pi',
            '14CC20': 'Sony',
            '38B54D': 'Apple',
            '8C8590': 'Apple',
            'F4F5D8': 'Google',
            'A4C361': 'Huawei',
            'D4F513': 'Google',
            '000E8E': 'Wistron',
            '001A4B': 'RIM',
            '001F5B': 'ASUS',
            '0024E9': 'HP',
            '0050BA': 'D-Link',
            '0090D0': 'Sony'
        };
        
        return commonVendors[macPrefix] || "Unknown Vendor";
    } catch (error) {
        return "Unknown Vendor";
    }
}

// -------------------------
// HELPER: Get Local Network Info
// -------------------------
function getLocalNetworkInfo() {
    const interfaces = os.networkInterfaces();
    
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                const ipParts = iface.address.split('.').slice(0, 3);
                const subnet = ipParts.join('.');
                const network = `${subnet}.0/24`;
                
                return {
                    ip: iface.address,
                    mac: iface.mac,
                    subnet: subnet,
                    network: network
                };
            }
        }
    }
    return null;
}

// -------------------------
// HELPER: Scan Network using nmap (Cross-platform)
// -------------------------
async function scanNetwork() {
    const networkInfo = getLocalNetworkInfo();
    if (!networkInfo) {
        throw new Error("Could not detect local network");
    }

    console.log(`Scanning network: ${networkInfo.network}`);
    
    const devices = [];
    
    // Add local machine first
    devices.push({
        ip: networkInfo.ip,
        mac: networkInfo.mac,
        vendor: await getMacVendor(networkInfo.mac),
        hostname: "This Computer (Local)",
        isLocal: true,
        status: "Online"
    });

    try {
        // Method 1: Try nmap first (most comprehensive)
        try {
            const { stdout } = await execAsync(`nmap -sn ${networkInfo.network}`);
            const lines = stdout.split('\n');
            
            let currentIP = null;
            let currentMAC = null;
            
            for (const line of lines) {
                // Extract IP address
                const ipMatch = line.match(/Nmap scan report for (?:[a-zA-Z0-9-]+\.)*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
                if (ipMatch) {
                    currentIP = ipMatch[1];
                    // Skip if it's our own IP (already added)
                    if (currentIP === networkInfo.ip) {
                        currentIP = null;
                        continue;
                    }
                }
                
                // Extract MAC address
                const macMatch = line.match(/MAC Address: ([0-9A-Fa-f:]+)/);
                if (macMatch && currentIP) {
                    currentMAC = macMatch[1];
                    
                    // Add device to list
                    devices.push({
                        ip: currentIP,
                        mac: currentMAC,
                        vendor: await getMacVendor(currentMAC),
                        hostname: "Unknown",
                        isLocal: false,
                        status: "Online"
                    });
                    
                    currentIP = null;
                    currentMAC = null;
                }
            }
            
            console.log(`Nmap found ${devices.length} devices`);
            return devices;
            
        } catch (nmapError) {
            console.log("Nmap not available, trying ping scan...");
            
            // Method 2: Fallback to ping scan
            return await pingScanNetwork(networkInfo);
        }
        
    } catch (error) {
        console.error("Network scan failed:", error);
        throw error;
    }
}

// -------------------------
// HELPER: Ping Scan (Fallback method)
// -------------------------
async function pingScanNetwork(networkInfo) {
    const devices = [];
    
    // Add local machine
    devices.push({
        ip: networkInfo.ip,
        mac: networkInfo.mac,
        vendor: await getMacVendor(networkInfo.mac),
        hostname: "This Computer (Local)",
        isLocal: true,
        status: "Online"
    });

    console.log("Starting ping scan of 255 IPs...");
    
    const pingPromises = [];
    
    // Ping all IPs in the subnet (1-254)
    for (let i = 1; i <= 254; i++) {
        const ip = `${networkInfo.subnet}.${i}`;
        
        // Skip our own IP
        if (ip === networkInfo.ip) continue;
        
        pingPromises.push(
            ping.promise.probe(ip, {
                timeout: 1,
                extra: ["-c", "1"] // Send only 1 packet
            }).then(result => ({
                ip: ip,
                alive: result.alive
            }))
        );
    }
    
    // Wait for all pings to complete
    const results = await Promise.all(pingPromises);
    const aliveIPs = results.filter(result => result.alive).map(result => result.ip);
    
    console.log(`Ping scan found ${aliveIPs.length} active devices`);
    
    // Get MAC addresses for alive devices (platform-specific)
    for (const ip of aliveIPs) {
        try {
            let mac = await getMACAddress(ip);
            if (mac) {
                devices.push({
                    ip: ip,
                    mac: mac,
                    vendor: await getMacVendor(mac),
                    hostname: "Unknown", 
                    isLocal: false,
                    status: "Online"
                });
            } else {
                // If we can't get MAC, still add the IP
                devices.push({
                    ip: ip,
                    mac: "Unknown",
                    vendor: "Unknown",
                    hostname: "Unknown",
                    isLocal: false,
                    status: "Online"
                });
            }
        } catch (error) {
            console.log(`Could not get MAC for ${ip}`);
        }
    }
    
    return devices;
}

// -------------------------
// HELPER: Get MAC Address (Platform-specific)
// -------------------------
async function getMACAddress(ip) {
    try {
        if (process.platform === "win32") {
            // Windows
            const { stdout } = await execAsync(`arp -a ${ip}`);
            const macMatch = stdout.match(/([0-9A-Fa-f][0-9A-Fa-f]-[0-9A-Fa-f][0-9A-Fa-f]-[0-9A-Fa-f][0-9A-Fa-f]-[0-9A-Fa-f][0-9A-Fa-f]-[0-9A-Fa-f][0-9A-Fa-f]-[0-9A-Fa-f][0-9A-Fa-f])/);
            return macMatch ? macMatch[1].replace(/-/g, ':') : null;
        } else {
            // Linux/Mac
            const { stdout } = await execAsync(`arp -n ${ip}`);
            const macMatch = stdout.match(/([0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2})/);
            return macMatch ? macMatch[1] : null;
        }
    } catch (error) {
        return null;
    }
}

// -------------------------
// ROUTE 1: Serve Main Page
// -------------------------
app.get("/", (req, res) => {
    res.render("index");
});

// -------------------------
// ROUTE 2: Get All Connected Devices (Network Scan)
// -------------------------
app.get("/devices", async (req, res) => {
    try {
        console.log("Starting network scan...");
        const devices = await scanNetwork();
        console.log(`Scan completed. Found ${devices.length} devices`);
        res.json(devices);
    } catch (error) {
        console.error("Network scan error:", error);
        res.status(500).json({ 
            error: "Failed to scan network",
            details: error.message 
        });
    }
});

// -------------------------
// ROUTE 3: Ping a Device
// -------------------------
app.post("/ping", async (req, res) => {
    const { ip } = req.body;

    if (!ip) return res.json({ status: "Invalid IP" });

    try {
        const result = await ping.promise.probe(ip);
        res.json({ status: result.alive ? "Online" : "Offline" });
    } catch (error) {
        res.json({ status: "Error pinging device" });
    }
});

// -------------------------
// START SERVER
// -------------------------
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Network scanner ready - will detect ALL devices on your network");
});