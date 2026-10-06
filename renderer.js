const button =
    document.getElementById("generateBtn");

const logContainer =
    document.getElementById("logContainer");

const processStatus =
    document.getElementById("processStatus");

const summaryPanel =
    document.getElementById("summaryPanel");

const sentCount =
    document.getElementById("sentCount");

const failedCount =
    document.getElementById("failedCount");

const skippedCount =
    document.getElementById("skippedCount");

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
                progress.status === "success"
                    ? "Completed"
                    : "Completed with issues";


            if (progress.summary) {

                sentCount.textContent =
                    progress.summary.email.sent;

                failedCount.textContent =
                    progress.summary.email.failed;

                skippedCount.textContent =
                    progress.summary.email.skipped;

                summaryPanel.classList.remove(
                    "hidden"
                );
            }

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

        summaryPanel.classList.add("hidden");

        sentCount.textContent = "0";
        failedCount.textContent = "0";
        skippedCount.textContent = "0";

        processStatus.textContent =
            "Processing...";


        addLog({
            type: "status",
            message: "Starting payroll process..."
        });


        try{
            const result =
            await window.electronAPI.runPayroll();


            if (!result.success) {

                processStatus.textContent =
                    "Failed";

                addLog({
                    type: "error",
                    message:
                        result.error ||
                        "Payroll process failed."
                });

            }
        }

        catch (error) {

            processStatus.textContent =
                "Failed";

            addLog({
                type: "error",
                message:
                    error.message ||
                    "Unexpected application error."
            });

        }

        finally {
            button.disabled = false;
        }

    }
);