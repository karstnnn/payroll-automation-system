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

        const passwordInput =
            document.getElementById(
                "smtpPassword"
            );

        if (settings.hasSavedPassword) {

            passwordInput.placeholder =
                "Saved password";

        }
        else {

            passwordInput.placeholder =
                "Enter email password";

        }

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

            document.getElementById(
                "smtpPassword"
            ).value = "";

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

        const smtpHost =
            document.getElementById(
                "smtpHost"
            ).value.trim();

        const smtpPort =
            document.getElementById(
                "smtpPort"
            ).value;

        const smtpSecure =
            document.getElementById(
                "smtpSecure"
            ).checked;

        const smtpUser =
            document.getElementById(
                "smtpUser"
            ).value.trim();

        const smtpPassword =
            document.getElementById(
                "smtpPassword"
            ).value;


        testConnectionBtn.disabled = true;

        settingsStatus.textContent =
            "Testing email connection...";


        try {

            const result =
                await window.electronAPI
                    .testEmailConnection({
                        smtpHost,
                        smtpPort,
                        smtpSecure,
                        smtpUser,
                        smtpPassword
                    });


            if (result.success) {

                settingsStatus.textContent =
                    "Email connection successful.";
                
                document.getElementById(
                    "smtpPassword"
                ).value = "";

            }
            else {

                settingsStatus.textContent =
                    `Connection failed: ${result.error}`;

            }

        }

        catch (error) {

            settingsStatus.textContent =
                `Connection failed: ${error.message}`;

        }

        finally {

            testConnectionBtn.disabled = false;

        }

    }
);
