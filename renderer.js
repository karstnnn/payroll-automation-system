const button =
    document.getElementById("generateBtn");

const status =
    document.getElementById("status");

button.addEventListener("click", async () => {

    button.disabled = true;

    status.textContent =
        "Processing payslips...";

    const result =
        await window.electronAPI.runPayroll();

    if (result.success) {

        status.textContent =
            "Payslip process completed!";

    } else {

        status.textContent =
            "Error: " + result.error;

    }

    button.disabled = false;

});