async function loadUser() {
    try {
        const token = localStorage.getItem("authToken");
        
        const res = await fetch("https://giant-noell-pixelart002-1c1d1fda.koyeb.app/users/me", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        const data = await res.json();
        
        document.getElementById("name-box").innerText = "Hello, " + data.fullname;
        
    } catch (err) {
        document.getElementById("name-box").innerText = "Error loading name!";
    }
}

loadUser();