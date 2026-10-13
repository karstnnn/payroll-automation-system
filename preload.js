const {
    contextBridge,
    ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

    runPayroll: () => {
        return ipcRenderer.invoke("run-payroll");
    },

    loadSettings: () =>
        ipcRenderer.invoke("load-settings"),

    saveSettings: (settings) =>
    ipcRenderer.invoke(
        "save-settings",
        settings
    ),

    selectFolder: () =>
    ipcRenderer.invoke(
        "select-folder"
    ),

    testEmailConnection: (settings) =>
    ipcRenderer.invoke(
        "test-email-connection",
        settings
    ),

    testSummaryEmailConnection: () =>
    ipcRenderer.invoke(
        "test-summary-email-connection"
    ),

    preparePayrollSummary: () =>
        ipcRenderer.invoke(
            "prepare-payroll-summary"
    ),

    onPayrollSummaryProgress: (callback) =>
        ipcRenderer.on(
            "payroll-summary-progress",
            (_event, progress) => callback(progress)
    ),

    onPayrollProgress: (callback) => {

        ipcRenderer.on(
            "payroll-progress",
            (event, progress) => {
                callback(progress);
            }
        );

    }

});