const button =
    document.getElementById("generateBtn");

const logContainer =
    document.getElementById("logContainer");

const processStatus =
    document.getElementById("processStatus");


function addLog(progress) {

    const entry =
        document.createElement("div");

    entry.classList.add("log-entry");


    const time =
        document.createElement("span");

    time.classList.add("log-time");

    time.textContent =
        new Date().toLocaleTimeString();


    const message =
        document.createElement("span");

    message.classList.add("log-message");

    message.textContent =
        progress.message;


    if (progress.type === "success") {

        message.classList.add("log-success");

    }

    else if (progress.type === "error") {

        message.classList.add("log-error");

    }

    else {

        message.classList.add("log-status");

    }


    entry.appendChild(time);
    entry.appendChild(message);

    logContainer.appendChild(entry);


    logContainer.scrollTop =
        logContainer.scrollHeight;
}


window.electronAPI.onPayrollProgress(
    (progress) => {

        addLog(progress);


        if (progress.type === "complete") {

            processStatus.textContent =
                "Completed";

        }

        else if (progress.type === "error") {

            processStatus.textContent =
                "Error";

        }

        else {

            processStatus.textContent =
                "Processing...";
        }

    }
);


button.addEventListener(
    "click",
    async () => {

        button.disabled = true;

        logContainer.innerHTML = "";

        processStatus.textContent =
            "Processing...";


        addLog({
            type: "status",
            message: "Starting payroll process..."
        });


        const result =
            await window.electronAPI.runPayroll();


        if (result.success) {

            processStatus.textContent =
                "Completed";

        }

        else {

            processStatus.textContent =
                "Failed";

        }


        button.disabled = false;

    }
);