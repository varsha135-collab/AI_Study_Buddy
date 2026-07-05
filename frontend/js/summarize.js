const summarizeBtn = document.getElementById("summarizeBtn");
const summaryOutput = document.getElementById("summaryOutput");

summarizeBtn.addEventListener("click", async () => {
    summaryOutput.innerHTML = "Generating summary... Please wait.";

    try {
        const response = await fetch("/summarize", {
            method: "POST"
        });

        const data = await response.json();

        // FIX 2: If the backend fails, show the error message instead of letting it become 'undefined'
        if (data.summary) {
            summaryOutput.innerHTML = data.summary;
        } else {
            summaryOutput.innerHTML = `<span style="color: red;">Error: ${data.message || "Failed to get summary"}</span>`;
        }
    } catch (error) {
        console.error(error);
        summaryOutput.innerHTML = "Network error. Try again.";
    }
});