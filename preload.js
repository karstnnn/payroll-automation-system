const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

    runPayroll: () => {
        return ipcRenderer.invoke("run-payroll");
    }

});