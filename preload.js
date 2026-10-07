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

    onPayrollProgress: (callback) => {

        ipcRenderer.on(
            "payroll-progress",
            (event, progress) => {

                callback(progress);

            }
        );

    }

});