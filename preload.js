const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

    test: () => {
        console.log("Electron API is working.");
    }

});