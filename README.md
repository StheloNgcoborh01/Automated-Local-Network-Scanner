📡 Network Device Scanner & Ping Tool

A simple but powerful local-network device scanner built using Node.js, Express, EJS, ARP lookup, and Ping utilities.
This tool allows you to view devices connected to your network and check their online status through a clean, interactive UI.

##🔥 Features
Device Discovery using ARP
Shows each device’s:
IP Address
MAC Address
OUI Vendor (if available)
Hostname
Ping Button to check if a device is Online / Offline
Clean UI rendered using EJS
Works on any LAN (WiFi or Ethernet)
Mobile-friendly dashboard

##🛠️ Tech Stack
Node.js
Express.js
EJS Templates
@network-utils/arp-lookup
ping (npm module)
OS Network Interface APIs
MAC Vendor Lookup (OUI)

##🚀 How It Works
The app detects your local IP and subnet (e.g., 192.168.1.x → subnet 192.168.1).
It reads the system ARP table to find devices that communicated in your LAN.
Each device is displayed in the UI.
A Ping button allows you to check if the device is reachable in real time.

##⚠️ Note:
ARP can only show devices the OS has recently communicated with — this is a limitation of all operating systems.
Cloud deployment cannot run ARP or Ping due to security restrictions.

##📝 Screenshot
![UI Screenshot](screenshot/screenshot.png)


##💻 Installation & Usage
1️⃣ Clone the repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO

2️⃣ Install dependencies
npm install

3️⃣ Start the server
npm start

4️⃣ Open in browser
http://localhost:3000


##📌 Author
Your Name
ICT Student • Web Developer • Networking Enthusiast
