const { app, BrowserWindow, ipcMain } = require("electron");
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

app.whenReady().then(() => {

    createWindow();

});