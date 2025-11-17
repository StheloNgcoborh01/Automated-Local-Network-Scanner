
function loadDevices() {
    fetch("/devices")
        .then(res => res.json())
        .then(devices => {
            const table = document.getElementById("deviceBody"); // Fixed ID
            table.innerHTML = ""; // clear old rows

            if (devices.length === 0) {
                table.innerHTML = `<tr><td colspan="5" class="text-center">No devices found</td></tr>`;
                return;
            }

            devices.forEach(d => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${d.ip}</td>
                    <td>${d.mac}</td>
                    <td>${d.vendor}</td>
                    <td>${d.hostname || "N/A"}</td> <!-- Added hostname placeholder -->
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="pingDevice('${d.ip}')">Ping</button>
                    </td>
                `;

                table.appendChild(row);
            });
        })
        .catch(err => {
            console.error("Error loading devices:", err);
            const table = document.getElementById("deviceBody");
            table.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading devices</td></tr>`;
        });
}

// Call automatically when page loads
document.addEventListener("DOMContentLoaded", function() {
    loadDevices();
    
    // Set up manual ping button
    document.querySelector(".Pingbtn").addEventListener("click", manualPing);
});

// Auto-refresh every 10 seconds
setInterval(loadDevices, 10000);


function pingDevice(ip) {
    fetch("/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
    })
    .then(res => res.json())
    .then(data => {
        alert(`Device ${ip} is: ${data.status}`);
    })
    .catch(err => alert("Error pinging device"));
}


function manualPing() {
    const ip = document.querySelector(".input").value;
    const statusElement = document.querySelector(".status");
    
    if (!ip) {
        alert("Please enter an IP address");
        return;
    }

    statusElement.textContent = "Status: Pinging...";
    
    pingDevice(ip);
    
    // Update status after a delay to show result
    setTimeout(() => {
        statusElement.textContent = "Status: Check alert for result";
    }, 1000);
}
