let currentFilename = "";


async function uploadFile(file) {
    const formData = new FormData();
    formData.append("pdf", file);

    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();
    
    
    currentFilename = data.filename; 
}


async function generateSummary() {
    if (!currentFilename) {
        alert("Please upload a PDF first!");
        return;
    }

    const res = await fetch("/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: currentFilename }) 
    });

    const data = await res.json();
    document.getElementById("summary-output").innerText = data.summary || data.message;
}