// MENU
const menuLinks = document.querySelectorAll(".menu a");

menuLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    menuLinks.forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

// DOWNLOAD
const form = document.querySelector(".download-form");
const urlInput = document.querySelector(".input-group input");

const statusText = document.createElement("p");
statusText.className = "status-text";
form.appendChild(statusText);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const url = urlInput.value.trim();

  if (!url) {
    statusText.textContent = "Pega una URL primero.";
    statusText.classList.add("error");
    return;
  }

  statusText.textContent = "Preparando descarga...";
  statusText.classList.remove("error");
  statusText.classList.add("loading");

  try {
    const response = await fetch("/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al descargar.");
    }

    const blob = await response.blob();

    const contentDisposition = response.headers.get("Content-Disposition");
    let fileName = "video.mp4";

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        fileName = match[1];
      }
    }

    const downloadUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    a.remove();
    URL.revokeObjectURL(downloadUrl);

    statusText.textContent = "Descarga lista.";
    statusText.classList.remove("loading");
    urlInput.value = "";
  } catch (error) {
    statusText.textContent = error.message;
    statusText.classList.remove("loading");
    statusText.classList.add("error");
  }
});