require("dotenv").config();
const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");
const emailService = require("./services/emailService");

const { runPayroll } = require("./app");

function createWindow() {

    const window = new BrowserWindow({
        width: 1000,
        height: 700,

        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });

    window.loadFile("index.html");
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

        smtpPassword

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

ipcMain.handle("run-payroll", async (event) => {

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
                    settings
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
                    settings.smtpUser

            };

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

app.whenReady().then(() => {

    createWindow();

});