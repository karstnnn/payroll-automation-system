require("dotenv").config();
const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

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

ipcMain.handle("run-payroll", async (event) => {

    try {

        const result = await runPayroll((progress) => {

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

        event.sender.send(
            "payroll-progress",
            {
                type: "error",
                message: error.message
            }
        );

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
                        process.env.SMTP_USER || ""

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


            fs.writeFileSync(
                settingsPath,

                JSON.stringify(
                    settings,
                    null,
                    2
                ),

                "utf8"
            );


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

app.whenReady().then(() => {

    createWindow();

});