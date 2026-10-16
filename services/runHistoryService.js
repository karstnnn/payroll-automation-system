const fs = require("fs");
const path = require("path");


const appData =
    process.env.APPDATA ||
    process.env.LOCALAPPDATA ||
    process.cwd();


let historyFolder =
    path.join(
        appData,
        "pay-slip",
        "history"
    );

function setHistoryFolder(folder) {

    if (
        typeof folder !== "string" ||
        !path.isAbsolute(folder)
    ) {
        throw new Error(
            "An absolute history folder path is required."
        );
    }

    historyFolder = folder;
}

function sanitizePeriod(period) {

    return period.replace(
        /[^a-zA-Z0-9-_ ]/g,
        ""
    );

}


function getHistoryPath(period) {

    const safePeriod =
        sanitizePeriod(period);

    return path.join(
        historyFolder,
        `${safePeriod}.json`
    );

}


function loadHistory(period) {

    const historyPath =
        getHistoryPath(period);


    if (!fs.existsSync(historyPath)) {

        return {
            period,
            employees: {}
        };

    }


    try {

        return JSON.parse(
            fs.readFileSync(
                historyPath,
                "utf8"
            )
        );

    }
    catch (error) {

        throw new Error(
            `Could not read payroll history: ${error.message}`
        );

    }

}


function saveHistory(period, history) {

    fs.mkdirSync(
        historyFolder,
        { recursive: true }
    );

    const historyPath =
        getHistoryPath(period);

    const tempPath =
        `${historyPath}.tmp`;


    fs.writeFileSync(
        tempPath,

        JSON.stringify(
            history,
            null,
            2
        ),

        "utf8"
    );


    fs.renameSync(
        tempPath,
        historyPath
    );

}


function getEmployeeKey(employee) {

    return employee.email
        .trim()
        .toLowerCase();

}


function wasAlreadySent(
    employee,
    period
) {

    const history =
        loadHistory(period);

    const key =
        getEmployeeKey(employee);


    return (
        history.employees[key]?.status ===
        "sent"
    );

}


function markSent(
    employee,
    period
) {

    const history =
        loadHistory(period);

    const key =
        getEmployeeKey(employee);


    history.employees[key] = {

        name:
            employee.name,

        email:
            employee.email,

        pdf:
            employee.pdf,

        status:
            "sent",

        sentAt:
            new Date().toISOString()

    };


    saveHistory(
        period,
        history
    );

}


function markFailed(
    employee,
    period,
    error
) {

    const history =
        loadHistory(period);

    const key =
        getEmployeeKey(employee);


    history.employees[key] = {

        name:
            employee.name,

        email:
            employee.email,

        pdf:
            employee.pdf,

        status:
            "failed",

        failedAt:
            new Date().toISOString(),

        error:
            error?.message ||
            String(error)

    };


    saveHistory(
        period,
        history
    );

}


module.exports = {
    getHistoryFolder: () => historyFolder,
    setHistoryFolder,
    loadHistory,
    wasAlreadySent,
    markSent,
    markFailed
};