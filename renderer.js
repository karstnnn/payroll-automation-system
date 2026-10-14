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

const homePage =
    document.getElementById("homePage");

const settingsPage =
    document.getElementById("settingsPage");

const settingsBtn =
    document.getElementById("settingsBtn");

const backBtn =
    document.getElementById("backBtn");

const saveSettingsBtn =
    document.getElementById(
        "saveSettingsBtn"
    );

const settingsStatus =
    document.getElementById(
        "settingsStatus"
    );

const browseFolderBtn =
    document.getElementById(
        "browseFolderBtn"
    );

const pdfRootFolder =
    document.getElementById(
        "pdfRootFolder"
    );

const testConnectionBtn =
    document.getElementById(
        "testConnectionBtn"
    );

const alreadySentCount =
    document.getElementById(
        "alreadySentCount"
    );

const summarySenderMode =
    document.getElementById(
        "summarySenderMode"
    );

const summarySenderFields =
    document.getElementById(
        "summarySenderFields"
    );

const summaryPasswordStatus =
    document.getElementById(
        "summaryPasswordStatus"
    );

const summaryPasswordStatusIcon =
    document.getElementById(
        "summaryPasswordStatusIcon"
    );

const summaryPasswordStatusText =
    document.getElementById(
        "summaryPasswordStatusText"
    );

const testSummaryConnectionBtn =
    document.getElementById(
        "testSummaryConnectionBtn"
    );

const summaryConnectionStatus =
    document.getElementById(
        "summaryConnectionStatus"
    );

const prepareSummaryBtn =
    document.getElementById("prepareSummaryBtn");

const summaryPreparationStatus =
    document.getElementById("summaryPreparationStatus");

const summaryPreparationDetails =
    document.getElementById("summaryPreparationDetails");

const sendSummaryBtn =
    document.getElementById("sendSummaryBtn");


const activeWorkflowLabel =
    document.getElementById("activeWorkflowLabel");

let displayedWorkflow = null;
let operationRunning = false;
let summaryReadyToSend = false;

const payslipConnectionStatus =
    document.getElementById(
        "payslipConnectionStatus"
    );


function updateWorkflowButtons() {

    button.disabled = operationRunning;

    prepareSummaryBtn.disabled = operationRunning;

    sendSummaryBtn.disabled =
        operationRunning || !summaryReadyToSend;
}


function showActivity(workflow, clearLog = true) {

    const changed = displayedWorkflow !== workflow;

    displayedWorkflow = workflow;

    activeWorkflowLabel.textContent =
        workflow === "payslips"
            ? "Employee Payslips"
            : "Payroll Summary";

    summaryPanel.classList.add("hidden");

    summaryPreparationStatus.classList.toggle(
        "hidden",
        workflow !== "summary"
    );

    if (workflow === "payslips") {

        summaryPreparationDetails.classList.add("hidden");

    }
    else if (
        document.getElementById("summaryReportName").textContent
    ) {

        summaryPreparationDetails.classList.remove("hidden");
    }

    if (clearLog || changed) {
        logContainer.replaceChildren();
    }
}


testSummaryConnectionBtn.addEventListener(
    "click",
    async () => {

        testSummaryConnectionBtn.disabled = true;

        summaryConnectionStatus.textContent =
            "Testing payroll summary email connection...";

        try {

            const result =
                await window.electronAPI
                    .testSummaryEmailConnection();

            if (result.success) {

                summaryConnectionStatus.textContent =
                    `Connection successful: ${result.sender}`;

            }
            else {

                summaryConnectionStatus.textContent =
                    `Connection failed: ${result.error}`;

            }

        }
        catch (error) {

            summaryConnectionStatus.textContent =
                `Connection failed: ${error.message}`;

        }
        finally {

            testSummaryConnectionBtn.disabled = false;

        }

    }
);



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

                alreadySentCount.textContent =
                    progress.summary.email.alreadySent;

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

        if (operationRunning) return;

        operationRunning = true;

        updateWorkflowButtons();
        showActivity("payslips");

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
            operationRunning = false;
            updateWorkflowButtons();
        }

    }
);

settingsBtn.addEventListener(
    "click",
    async () => {

        homePage.classList.add("hidden");

        settingsPage.classList.remove(
            "hidden"
        );


        const result =
            await window.electronAPI.loadSettings();


        if (!result.success) {

            console.error(
                "Could not load settings:",
                result.error
            );

            return;
        }


        const settings =
            result.settings;


        updateSummaryPasswordStatus(
                settings.hasSavedSummaryPassword === true
            );
        
        updatePayslipPasswordStatus(
            settings.hasSavedPassword === true
        );

        /*
        const summaryPasswordInput =
            document.getElementById(
                "summarySenderPassword"
            );

        summaryPasswordInput.value = "";

        summaryPasswordInput.placeholder =
            settings.hasSavedSummaryPassword
                ? "Saved password"
                : "Enter sender password";
                */

        document.getElementById(
            "pdfRootFolder"
        ).value =
            settings.pdfRootFolder;


        document.getElementById(
            "appsScriptUrl"
        ).value =
            settings.appsScriptUrl;


        document.getElementById(
            "smtpHost"
        ).value =
            settings.smtpHost;


        document.getElementById(
            "smtpPort"
        ).value =
            settings.smtpPort;


        document.getElementById(
            "smtpSecure"
        ).checked =
            settings.smtpSecure;


        document.getElementById(
            "smtpUser"
        ).value =
            settings.smtpUser;

        document.getElementById(
            "summaryRecipientEmail"
        ).value = settings.summaryRecipientEmail || "";

        summarySenderMode.value =
            settings.summarySenderMode || "same";

        document.getElementById(
            "summarySenderEmail"
        ).value = settings.summarySenderEmail || "";

        updateSummarySenderFields();
        
        const passwordInput =
            document.getElementById(
                "smtpPassword"
            );

    }
);


backBtn.addEventListener(
    "click",
    () => {

        settingsPage.classList.add("hidden");

        homePage.classList.remove(
            "hidden"
        );

    }
);

saveSettingsBtn.addEventListener(
    "click",
    async () => {

        const settings = {

            pdfRootFolder:
                document.getElementById(
                    "pdfRootFolder"
                ).value.trim(),

            appsScriptUrl:
                document.getElementById(
                    "appsScriptUrl"
                ).value.trim(),

            smtpHost:
                document.getElementById(
                    "smtpHost"
                ).value.trim(),

            smtpPort:
                Number(
                    document.getElementById(
                        "smtpPort"
                    ).value
                ),

            smtpSecure:
                document.getElementById(
                    "smtpSecure"
                ).checked,

            smtpUser:
                document.getElementById(
                    "smtpUser"
                ).value.trim(),
            
            smtpPassword:
                document.getElementById(
                    "smtpPassword"
                ).value,
            
            summaryRecipientEmail:
                document.getElementById(
                    "summaryRecipientEmail"
                ).value.trim(),

            summarySenderMode:
                document.getElementById(
                    "summarySenderMode"
                ).value,

            summarySenderEmail:
                document.getElementById(
                    "summarySenderEmail"
                ).value.trim(),

            summarySenderPassword:
                document.getElementById(
                    "summarySenderPassword"
                ).value

        };


        settingsStatus.textContent =
            "Saving settings...";


        const result =
            await window.electronAPI
                .saveSettings(settings);


        if (result.success) {

            settingsStatus.textContent =
                "Settings saved successfully.";

            payslipConnectionStatus.textContent = "";
            summaryConnectionStatus.textContent = "";

            document.getElementById(
                "smtpPassword"
            ).value = "";

            document.getElementById(
                "summarySenderPassword"
            ).value = "";

            const refreshed =
                await window.electronAPI.loadSettings();

            if (refreshed.success) {

                const hasPassword =
                    refreshed.settings.hasSavedSummaryPassword === true;

                updatePayslipPasswordStatus(
                    refreshed.settings.hasSavedPassword === true
                );

                updateSummaryPasswordStatus(hasPassword);

                document.getElementById(
                    "summarySenderPassword"
                ).placeholder = hasPassword
                    ? "Leave blank to keep saved password"
                    : "Enter sender password";

            }
        }
        else {

            settingsStatus.textContent =
                `Error: ${result.error}`;

        }

    }
);

browseFolderBtn.addEventListener(
    "click",
    async () => {

        const result =
            await window.electronAPI
                .selectFolder();

        if (
            result.success &&
            result.folderPath
        ) {

            pdfRootFolder.value =
                result.folderPath;

        }

    }
);


testConnectionBtn.addEventListener(
    "click",
    async () => {

        testConnectionBtn.disabled = true;

        payslipConnectionStatus.textContent =
            "Testing saved payslip email connection...";

        try {

            // Read saved settings rather than unsaved form inputs.
            const loaded =
                await window.electronAPI.loadSettings();

            if (!loaded.success) {
                throw new Error(
                    loaded.error || "Could not load saved settings."
                );
            }

            const settings = loaded.settings;

            const result =
                await window.electronAPI.testEmailConnection({
                    smtpHost: settings.smtpHost,
                    smtpPort: settings.smtpPort,
                    smtpSecure: settings.smtpSecure,
                    smtpUser: settings.smtpUser,

                    // Backend loads the encrypted saved password.
                    smtpPassword: ""
                });

            if (result.success) {

                payslipConnectionStatus.textContent =
                    "Connection successful: " +
                    settings.smtpUser;

            }
            else {

                payslipConnectionStatus.textContent =
                    "Connection failed: " + result.error;

            }

        }
        catch (error) {

            payslipConnectionStatus.textContent =
                "Connection failed: " + error.message;

        }
        finally {

            testConnectionBtn.disabled = false;

        }

    }
);


function updateSummarySenderFields() {

    const useSeparateSender =
        summarySenderMode.value === "separate";

    summarySenderFields.classList.toggle(
        "hidden",
        !useSeparateSender
    );
}


summarySenderMode.addEventListener(
    "change",
    updateSummarySenderFields
);

function updateSummaryPasswordStatus(hasSavedPassword) {

    summaryPasswordStatus.classList.remove(
        "saved",
        "missing"
    );

    if (hasSavedPassword) {

        summaryPasswordStatus.classList.add(
            "saved"
        );

        summaryPasswordStatusIcon.textContent = "✓";

        summaryPasswordStatusText.textContent =
            "Encrypted password saved";

    }
    else {

        summaryPasswordStatus.classList.add(
            "missing"
        );

        summaryPasswordStatusIcon.textContent = "○";

        summaryPasswordStatusText.textContent =
            "No password saved";

    }
}


window.electronAPI.onPayrollSummaryProgress(
    (progress) => {

        summaryPreparationStatus.textContent =
            progress.message;

        processStatus.textContent =
            "Processing...";

        addLog(progress);
    }
);

prepareSummaryBtn.addEventListener(
    "click",
    async () => {

        if (operationRunning) return;

        summaryReadyToSend = false;
        operationRunning = true;

        updateWorkflowButtons();
        showActivity("summary");

        summaryPreparationDetails.classList.add("hidden");

        processStatus.textContent = "Processing...";

        summaryPreparationStatus.textContent =
            "Preparing payroll summary...";

        try {

            const result =
                await window.electronAPI.preparePayrollSummary();

            if (!result.success) {
                throw new Error(result.error);
            }

            const report = result.report;

            document.getElementById(
                "summaryReportName"
            ).textContent =
                `File: ${report.fileName}`;

            document.getElementById(
                "summaryReportPeriod"
            ).textContent =
                `Period: ${report.month}`;

            document.getElementById(
                "summaryReportSender"
            ).textContent =
                `Sender: ${report.sender}`;

            document.getElementById(
                "summaryReportRecipient"
            ).textContent =
                `Recipient: ${report.recipient}`;

            summaryPreparationDetails.classList.remove(
                "hidden"
            );
            summaryReadyToSend = true;

            processStatus.textContent = "Prepared";

            addLog({
                type: "success",
                message: "Payroll summary generated and validated."
            });

            summaryPreparationStatus.textContent =
                "Payroll summary generated and validated successfully.";

        }
        catch (error) {

            summaryPreparationStatus.textContent =
                `Error: ${error.message}`;

            processStatus.textContent = "Failed";

            addLog({
                type: "error",
                message: error.message
            });

        }
        finally {

            operationRunning = false;
            updateWorkflowButtons();

        }

    }
);


sendSummaryBtn.addEventListener(
    "click",
    async () => {

        if (operationRunning || !summaryReadyToSend) {
            return;
        }

        operationRunning = true;

        updateWorkflowButtons();
        showActivity("summary", false);

        processStatus.textContent = "Awaiting confirmation...";

        summaryPreparationStatus.textContent =
            "Review the confirmation dialog to send the payroll summary...";

        try {

            const result =
                await window.electronAPI.sendPayrollSummary();

            // User cancelled the confirmation dialog
            if (result.cancelled) {

                summaryPreparationStatus.textContent =
                    "Sending cancelled. The payroll summary is still ready.";

                // Allow confirmation again
                processStatus.textContent = "Prepared";

                addLog({
                    type: "status",
                    message: "Payroll summary sending cancelled."
                });

                return;
            }

            // Email sending failed or was blocked
            if (!result.success) {

                summaryPreparationStatus.textContent =
                    `Payroll summary not sent: ${result.error}`;

                summaryReadyToSend = false;
                processStatus.textContent = "Needs review";

                addLog({
                    type: "error",
                    message: result.error || "Payroll summary was not sent."
                });

                // Keep sending disabled until the delivery
                // history and failure are reviewed.
                return;
            }

            // SMTP server accepted the email
            summaryPreparationStatus.textContent =
                `Payroll summary email accepted for ${result.recipient}.`;

            // Do not allow another send of the same prepared report
            summaryReadyToSend = false;
            processStatus.textContent = "Accepted by SMTP";

            addLog({
                type: "success",
                message: `Payroll summary accepted for ${result.recipient}.`
            });



        }
        catch (error) {

            summaryPreparationStatus.textContent =
                `Unexpected error: ${error.message}`;

            summaryReadyToSend = false;
            processStatus.textContent = "Error";

            addLog({
                type: "error",
                message: error.message
            });

        }
        finally {
            operationRunning = false;
            updateWorkflowButtons();
        }

    }
);


function updatePayslipPasswordStatus(hasSavedPassword) {

    const status = document.getElementById(
        "payslipPasswordStatus"
    );

    const icon = document.getElementById(
        "payslipPasswordStatusIcon"
    );

    const text = document.getElementById(
        "payslipPasswordStatusText"
    );

    const input = document.getElementById(
        "smtpPassword"
    );

    status.classList.toggle("saved", hasSavedPassword);
    status.classList.toggle("missing", !hasSavedPassword);

    icon.textContent = hasSavedPassword ? "✓" : "○";

    text.textContent = hasSavedPassword
        ? "Encrypted password saved"
        : "No password saved";

    input.placeholder = hasSavedPassword
        ? "Leave blank to keep saved password"
        : "Enter email password";
}

