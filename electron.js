require("dotenv").config();
const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");


const IS_TEST_MODE =
    !app.isPackaged &&
    process.env.PAYROLL_TEST_MODE === "1";

const TEST_RECIPIENT =
    (process.env.PAYROLL_TEST_RECIPIENT || "").trim();

if (IS_TEST_MODE) {

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(TEST_RECIPIENT)) {
        throw new Error(
            "A valid test recipient email is required."
        );
    }

    const testUserDataPath = path.join(
        app.getPath("appData"),
        "Payslip Automation - Test"
    );

    fs.mkdirSync(
        testUserDataPath,
        { recursive: true }
    );

    app.setPath("userData", testUserDataPath);

    console.log("[TEST MODE] Enabled.");
    console.log("[TEST MODE] Recipient:", TEST_RECIPIENT);
    console.log("[TEST MODE] Data:", testUserDataPath);
}


const emailService = require("./services/emailService");

const {preparePayrollSummary} = require("./services/payrollSummaryService");
const crypto = require("crypto");
const payrollSummaryHistoryService = require("./services/payrollSummaryHistoryService");

const { runPayroll } = require("./app");

if (IS_TEST_MODE) {

    const runHistoryService = require(
        "./services/runHistoryService"
    );

    const testHistoryFolder = path.join(
        app.getPath("userData"),
        "history",
        "payslips"
    );

    runHistoryService.setHistoryFolder(
        testHistoryFolder
    );

    console.log(
        "[TEST MODE] Payslip history:",
        testHistoryFolder
    );
}

let isPreparingSummary = false;
let preparedSummary = null;
let isSendingSummary = false;

function createWindow() {

    const window = new BrowserWindow({
        width: 1000,
        height: 700,

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true
        }
    });

    window.webContents.setWindowOpenHandler(
        () => {
            return {
                action: "deny"
            };
        }
    );


    window.webContents.on(
        "will-navigate",
        (event) => {
            event.preventDefault();
        }
    );

    window.loadFile("index.html");
}

function getSummaryRecipient(settings) {

    return IS_TEST_MODE
        ? TEST_RECIPIENT
        : settings.summaryRecipientEmail;
}

function getSettingsPath() {

    return path.join(
        app.getPath("userData"),
        "settings.json"
    );

}

function getCredentialsPath() {
    return path.join(
        app.getPath("userData"),
        "credentials.dat"
    );
}

function getSummaryCredentialsPath() {

    return path.join(
        app.getPath("userData"),
        "summary-credentials.dat"
    );

}

function getRuntimeConfig() {

    const settingsPath =
        getSettingsPath();


    if (!fs.existsSync(settingsPath)) {
        throw new Error(
            "Settings have not been configured yet."
        );
    }


    const settings =
        JSON.parse(
            fs.readFileSync(
                settingsPath,
                "utf8"
            )
        );


    const smtpPassword =
        loadPassword();


    if (!smtpPassword) {
        throw new Error(
            "SMTP password has not been configured."
        );
    }


    return {

        pdfRootFolder:
            settings.pdfRootFolder,

        appsScriptUrl:
            settings.appsScriptUrl,

        smtp: {
            host:
                settings.smtpHost,

            port:
                Number(settings.smtpPort),

            secure:
                settings.smtpSecure
        },

        smtpUser:
            settings.smtpUser,

        smtpPassword,

        testMode: IS_TEST_MODE,

        testRecipient: IS_TEST_MODE
            ? TEST_RECIPIENT
            : null

    };
}

function savePassword(password) {

    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error(
            "Secure credential storage is not available."
        );
    }

    const encrypted =
        safeStorage.encryptString(password);

    fs.writeFileSync(
        getCredentialsPath(),
        encrypted.toString("base64"),
        "utf8"
    );
}

function loadPassword() {

    const credentialsPath =
        getCredentialsPath();

    if (!fs.existsSync(credentialsPath)) {
        return "";
    }

    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error(
            "Secure credential storage is not available."
        );
    }

    const encrypted =
        Buffer.from(
            fs.readFileSync(
                credentialsPath,
                "utf8"
            ),
            "base64"
        );

    return safeStorage.decryptString(
        encrypted
    );
}

function saveSummaryPassword(password) {

    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error(
            "Secure credential storage is not available."
        );
    }

    const encrypted =
        safeStorage.encryptString(password);

    fs.writeFileSync(
        getSummaryCredentialsPath(),
        encrypted.toString("base64"),
        "utf8"
    );

}

function loadSummaryPassword() {

    const credentialsPath =
        getSummaryCredentialsPath();

    if (!fs.existsSync(credentialsPath)) {
        return "";
    }

    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error(
            "Secure credential storage is not available."
        );
    }

    const encrypted =
        Buffer.from(
            fs.readFileSync(
                credentialsPath,
                "utf8"
            ),
            "base64"
        );

    return safeStorage.decryptString(encrypted);

}

ipcMain.handle("run-payroll", async (event) => {

    if (!app.isPackaged && !IS_TEST_MODE) {
        return {
            success: false,
            error: "Email sending is blocked in development unless Test Mode is enabled."
        };
    }

    try {

        const config = getRuntimeConfig();

        const result = await runPayroll(config, (progress) => {

            event.sender.send(
                "payroll-progress",
                progress
            );

        });

        return {
            success: true,
            result
        };

    } catch (error) {

        console.error(error);

        return {
            success: false,
            error: error.message
        };

    }

});

function getPdfHash(pdfPath) {

    const pdf = fs.readFileSync(pdfPath);

    if (
        pdf.length < 1024 ||
        pdf.subarray(0, 5).toString() !== "%PDF-"
    ) {
        throw new Error("The payroll summary PDF is invalid.");
    }

    return crypto
        .createHash("sha256")
        .update(pdf)
        .digest("hex");
}

ipcMain.handle(
    "prepare-payroll-summary",
    async (event) => {

        if (isPreparingSummary) {
            return {
                success: false,
                error: "Payroll summary generation is already running."
            };
        }

        if (isSendingSummary) {
            return {
                success: false,
                error: "Cannot regenerate the report while sending."
            };
        }

        isPreparingSummary = true;
        preparedSummary = null;

        try {

            const settingsPath = getSettingsPath();

            if (!fs.existsSync(settingsPath)) {
                throw new Error("Settings have not been configured.");
            }

            const settings = JSON.parse(
                fs.readFileSync(settingsPath, "utf8")
            );

            if (!["same", "separate"].includes(settings.summarySenderMode)) {
                throw new Error("Invalid payroll summary sender mode.");
            }

            const recipient = getSummaryRecipient(settings);

            const sender = settings.summarySenderMode === "separate"
                ? settings.summarySenderEmail
                : settings.smtpUser;

            const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!validEmail.test(recipient || "")) {
                throw new Error("A valid accountant email is required.");
            }

            if (!validEmail.test(sender || "")) {
                throw new Error("A valid sender email is required.");
            }

            const result = await preparePayrollSummary(
                {
                    appsScriptUrl: settings.appsScriptUrl,
                    pdfRootFolder: settings.pdfRootFolder
                },
                (progress) => {
                    event.sender.send(
                        "payroll-summary-progress",
                        progress
                    );
                }
            );

            preparedSummary = {
                ...result,
                recipient,
                sender,
                senderMode: settings.summarySenderMode,
                pdfHash: getPdfHash(result.pdfPath)
            };

            return {
                success: true,
                report: {
                    month: result.month,
                    fileName: result.fileName,
                    recipient,
                    sender
                }
            };

        }
        catch (error) {

            console.error(
                "Payroll summary preparation failed:",
                error
            );

            return {
                success: false,
                error: error.message
            };

        }
        finally {
            isPreparingSummary = false;
        }
    }
);


ipcMain.handle("send-payroll-summary", async () => {

    if (!app.isPackaged && !IS_TEST_MODE) {
        return {
            success: false,
            error: "Email sending is blocked in development unless Test Mode is enabled."
        };
    }

    if (isSendingSummary || isPreparingSummary) {
        return {
            success: false,
            error: "A payroll summary operation is already running."
        };
    }

    if (!preparedSummary) {
        return {
            success: false,
            error: "Generate the payroll summary before sending."
        };
    }

    isSendingSummary = true;

    const report = preparedSummary;
    const userDataPath = app.getPath("userData");

    let deliveryStarted = false;

    try {

        // 1. Load saved settings
        const settings = JSON.parse(
            fs.readFileSync(getSettingsPath(), "utf8")
        );

        const separate =
            settings.summarySenderMode === "separate";

        if (!["same", "separate"].includes(settings.summarySenderMode)) {
            throw new Error("Invalid payroll summary sender mode.");
        }

        const sender = separate
            ? settings.summarySenderEmail
            : settings.smtpUser;

        const recipient = getSummaryRecipient(settings);

        // 2. Prevent changes to the intended recipient/sender
        if (
            recipient !== report.recipient ||
            sender !== report.sender ||
            settings.summarySenderMode !== report.senderMode
        ) {
            throw new Error(
                "Email settings have changed. Generate the report again."
            );
        }

        // 3. Check delivery history
        const previousDelivery =
            payrollSummaryHistoryService.getDeliveryStatus(
                userDataPath,
                report.month,
                recipient
            );

        if (previousDelivery) {
            throw new Error(
                `This payroll summary already has a delivery record ` +
                `(${previousDelivery.status}). Review its history before resending.`
            );
        }

        // 4. Ask the user for explicit confirmation
        const confirmation = await dialog.showMessageBox({
            type: "warning",
            title: "Confirm Payroll Summary Email",
            message: "Send the confidential payroll summary?",
            detail:
                `Period: ${report.month}\n` +
                `File: ${report.fileName}\n` +
                `From: ${sender}\n` +
                `To: ${recipient}\n\n` +
                `Please verify the recipient before sending.`,
            buttons: [
                "Cancel",
                "Send Payroll Summary"
            ],
            defaultId: 0,
            cancelId: 0,
            noLink: true
        });

        if (confirmation.response !== 1) {
            return {
                success: false,
                cancelled: true
            };
        }

        // 5. Read and validate the exact attachment bytes
        const pdfBuffer = fs.readFileSync(report.pdfPath);

        const currentHash = crypto
            .createHash("sha256")
            .update(pdfBuffer)
            .digest("hex");

        if (currentHash !== report.pdfHash) {
            throw new Error(
                "The payroll summary PDF has changed. Generate it again."
            );
        }

        // 6. Recheck history before starting delivery
        if (payrollSummaryHistoryService.getDeliveryStatus(
            userDataPath,
            report.month,
            recipient
        )) {
            throw new Error(
                "A delivery record already exists for this report."
            );
        }

        // 7. Select the saved SMTP credentials
        const smtpPassword = separate
            ? loadSummaryPassword()
            : loadPassword();

        if (!smtpPassword) {
            throw new Error("The selected SMTP password is missing.");
        }

        const smtpConfig = {
            smtp: {
                host: settings.smtpHost,
                port: Number(settings.smtpPort),
                secure: settings.smtpSecure
            },

            smtpUser: sender,
            smtpPassword,

            testMode: IS_TEST_MODE,

            testRecipient: IS_TEST_MODE
                ? TEST_RECIPIENT
                : null
        };

        // 8. Persist intent before SMTP transmission
        payrollSummaryHistoryService.markDeliveryStatus(
            userDataPath,
            report.month,
            recipient,
            "sending"
        );

        deliveryStarted = true;

        // 9. Send the accountant's report
        const emailResult = await emailService.sendPayrollSummary(
            {
                ...report,
                pdfBuffer
            },
            smtpConfig
        );

        // 10. Mark the delivery as sent
        payrollSummaryHistoryService.markDeliveryStatus(
            userDataPath,
            report.month,
            recipient,
            "sent"
        );

        deliveryStarted = false;
        preparedSummary = null;

        return {
            success: true,
            messageId: emailResult.messageId,
            recipient
        };

    }
    catch (error) {

        if (deliveryStarted) {

            // Do not automatically retry uncertain SMTP outcomes.
            try {
                payrollSummaryHistoryService.markDeliveryStatus(
                    userDataPath,
                    report.month,
                    report.recipient,
                    "needs-review"
                );
            }
            catch (historyError) {
                console.error(
                    "Could not update summary delivery history:",
                    historyError
                );
            }

            preparedSummary = null;
        }

        console.error(
            "Payroll summary sending failed:",
            error
        );

        return {
            success: false,
            error: error.message
        };

    }
    finally {
        isSendingSummary = false;
    }

});



ipcMain.handle(
    "load-settings",
    async () => {

        try {

            const settingsPath =
                getSettingsPath();

            if (fs.existsSync(settingsPath)) {

                const settings =
                    JSON.parse(
                        fs.readFileSync(
                            settingsPath,
                            "utf8"
                        )
                    );

                return {
                    success: true,
                    settings: {
                        ...settings,
                        hasSavedPassword: fs.existsSync(getCredentialsPath()),
                        hasSavedSummaryPassword: fs.existsSync(getSummaryCredentialsPath())
                    }
                };
            }

            if (IS_TEST_MODE) {

                return {
                    success: true,

                    settings: {
                        pdfRootFolder: "",
                        appsScriptUrl: "",

                        smtpHost: "",
                        smtpPort: 465,
                        smtpSecure: true,
                        smtpUser: "",

                        summaryRecipientEmail:
                            TEST_RECIPIENT,

                        summarySenderMode: "same",
                        summarySenderEmail: "",

                        hasSavedPassword:
                            fs.existsSync(getCredentialsPath()),

                        hasSavedSummaryPassword:
                            fs.existsSync(getSummaryCredentialsPath())
                    }
                };
            }

            const configPath =
                path.join(
                    __dirname,
                    "config.json"
                );


            const config =
                JSON.parse(
                    fs.readFileSync(
                        configPath,
                        "utf8"
                    )
                );


            return {
                success: true,

                settings: {

                    pdfRootFolder:
                        config.pdfRootFolder || "",

                    appsScriptUrl:
                        process.env.APPS_SCRIPT_URL || "",

                    smtpHost:
                        config.smtp?.host || "",

                    smtpPort:
                        config.smtp?.port || "",

                    smtpSecure:
                        config.smtp?.secure || false,

                    smtpUser:
                        process.env.SMTP_USER || "",
                    
                    hasSavedPassword:
                        fs.existsSync(
                            getCredentialsPath()
                        ),

                    hasSavedSummaryPassword:
                        fs.existsSync(
                            getSummaryCredentialsPath()
                        )

                }
            };

        }
        catch (error) {

            console.error(
                "Could not load settings:",
                error
            );

            return {
                success: false,
                error: error.message
            };

        }

    }
);

ipcMain.handle(
    "save-settings",
    async (event, settings) => {

        try {

            if (!settings.pdfRootFolder) {
                throw new Error(
                    "Payslip folder is required."
                );
            }

            if (!settings.appsScriptUrl) {
                throw new Error(
                    "Apps Script URL is required."
                );
            }

            if (!settings.smtpHost) {
                throw new Error(
                    "SMTP host is required."
                );
            }

            if (!settings.smtpPort) {
                throw new Error(
                    "SMTP port is required."
                );
            }

            if (!settings.smtpUser) {
                throw new Error(
                    "Sender email is required."
                );
            }


            const settingsPath =
                getSettingsPath();

            const normalSettings = {

                pdfRootFolder:
                    settings.pdfRootFolder,

                appsScriptUrl:
                    settings.appsScriptUrl,

                smtpHost:
                    settings.smtpHost,

                smtpPort:
                    settings.smtpPort,

                smtpSecure:
                    settings.smtpSecure,

                smtpUser:
                    settings.smtpUser,
                
                summaryRecipientEmail:
                    settings.summaryRecipientEmail,

                summarySenderMode:
                    settings.summarySenderMode,

                summarySenderEmail:
                    settings.summarySenderEmail,
                
                summaryRecipientEmail:
                    settings.summaryRecipientEmail,

                summarySenderMode:
                    settings.summarySenderMode,

                summarySenderEmail:
                    settings.summarySenderEmail

            };

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    settings.summaryRecipientEmail || ""
                )
            ) {
                throw new Error(
                    "A valid accountant email address is required."
                );
            }

            if (
                !["same", "separate"].includes(
                    settings.summarySenderMode
                )
            ) {
                throw new Error(
                    "Invalid payroll summary sender mode."
                );
            }

            if (
                settings.summarySenderMode === "separate" &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    settings.summarySenderEmail || ""
                )
            ) {
                throw new Error(
                    "A valid payroll summary sender email is required."
                );
            }


            if (settings.summarySenderMode === "separate") {

                const existingSettings =
                    fs.existsSync(settingsPath)
                        ? JSON.parse(
                            fs.readFileSync(settingsPath, "utf8")
                        )
                        : {};

                const senderChanged =
                    (existingSettings.summarySenderEmail || "")
                        .trim()
                        .toLowerCase() !==
                    (settings.summarySenderEmail || "")
                        .trim()
                        .toLowerCase();

                const hasSavedPassword =
                    fs.existsSync(getSummaryCredentialsPath());

                if (
                    !settings.summarySenderPassword &&
                    (!hasSavedPassword || senderChanged)
                ) {
                    throw new Error(
                        "Enter the password for the payroll summary sender."
                    );
                }

                if (settings.summarySenderPassword) {

                    saveSummaryPassword(
                        settings.summarySenderPassword
                    );

                }
            }

            fs.writeFileSync(
                settingsPath,

                JSON.stringify(
                    normalSettings,
                    null,
                    2
                ),

                "utf8"
            );

            if (settings.smtpPassword) {

                savePassword(
                    settings.smtpPassword
                );

            }


            console.log(
                "Settings saved:",
                settingsPath
            );


            return {
                success: true
            };

        }

        catch (error) {

            console.error(
                "Could not save settings:",
                error
            );

            return {
                success: false,
                error: error.message
            };

        }

    }
);

ipcMain.handle(
    "select-folder",
    async () => {

        const result =
            await dialog.showOpenDialog({
                properties: [
                    "openDirectory"
                ]
            });

        if (result.canceled) {
            return {
                success: false,
                canceled: true
            };
        }

        return {
            success: true,
            folderPath:
                result.filePaths[0]
        };

    }
);

ipcMain.handle(
    "test-email-connection",
    async (event, settings) => {

        try {

            if (!settings.smtpHost) {
                throw new Error(
                    "SMTP host is required."
                );
            }

            if (!settings.smtpPort) {
                throw new Error(
                    "SMTP port is required."
                );
            }

            if (!settings.smtpUser) {
                throw new Error(
                    "Sender email is required."
                );
            }

            const smtpPassword =
                settings.smtpPassword ||
                loadPassword();


            if (!smtpPassword) {

                throw new Error(
                    "Email password is required."
                );

            }


            const config = {
                smtp: {
                    host: settings.smtpHost,
                    port: Number(settings.smtpPort),
                    secure: settings.smtpSecure
                }
            };


            await emailService.verifyConnection(
                config,
                {
                    user: settings.smtpUser,
                    password: smtpPassword
                }
            );


            return {
                success: true
            };

        }

        catch (error) {

            console.error(
                "SMTP connection test failed:",
                error
            );


            return {
                success: false,
                error: error.message
            };

        }

    }
);

ipcMain.handle(
    "test-summary-email-connection",
    async () => {

        try {

            const settings = JSON.parse(
                fs.readFileSync(
                    getSettingsPath(),
                    "utf8"
                )
            );

            const useSeparateSender =
                settings.summarySenderMode === "separate";

            if (
                !["same", "separate"].includes(
                    settings.summarySenderMode
                )
            ) {
                throw new Error(
                    "Invalid payroll summary sender mode."
                );
            }

            const smtpUser = useSeparateSender
                ? settings.summarySenderEmail
                : settings.smtpUser;

            const smtpPassword = useSeparateSender
                ? loadSummaryPassword()
                : loadPassword();

            if (!smtpUser || !smtpPassword) {
                throw new Error(
                    "Sender email or saved password is missing."
                );
            }

            const config = {
                smtp: {
                    host: settings.smtpHost,
                    port: Number(settings.smtpPort),
                    secure: settings.smtpSecure
                }
            };

            await emailService.verifyConnection(
                config,
                {
                    user: smtpUser,
                    password: smtpPassword
                }
            );

            return {
                success: true,
                sender: smtpUser
            };

        }

        catch (error) {

            console.error(
                "Payroll summary SMTP test failed:",
                error
            );

            return {
                success: false,
                error: error.message
            };

        }

    }
);

app.whenReady().then(() => {

    console.log(
        "Summary password exists:",
        fs.existsSync(getSummaryCredentialsPath())
    );

    console.log(
        "Summary credentials path:",
        getSummaryCredentialsPath()
    );

    

    createWindow();

});