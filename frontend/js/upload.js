const uploadButton = document.getElementById("upload-button");
const pdfFile = document.getElementById("pdf-file");
const uploadStatus = document.getElementById("upload-status");
const featureButtons = document.getElementById("feature-buttons");

uploadButton.addEventListener("click", async () => {

    if (pdfFile.files.length === 0) {
        alert("Please select a PDF.");
        return;
    }

    const formData = new FormData();
    formData.append("pdf", pdfFile.files[0]);

    try {

        const response = await fetch("/upload", {

            method: "POST",
            body: formData

        });

        const data = await response.json();

        uploadStatus.innerHTML = "&#9989;" + data.message;

        featureButtons.style.display = "block";

    } catch (error) {

        uploadStatus.innerHTML = "Upload Failed";

        console.log(error);

    }

});