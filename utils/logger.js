const fs = require("fs");
const path = require("path");


const appData =
    process.env.APPDATA ||
    process.env.LOCALAPPDATA ||
    process.cwd();

const logFolder = path.join(
    appData,
    "Payslip Automation",
    "logs"
);


if (!fs.existsSync(logFolder)) {

    fs.mkdirSync(
        logFolder,
        {
            recursive: true
        }
    );

}

function getLogFile() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    return path.join(
        logFolder,
        `payslip-${today}.log`
    );

}



function write(level, message) {

    const timestamp =
        new Date().toISOString();

    const log =
        `[${timestamp}] [${level}] ${message}`;

    console.log(log);

    fs.appendFileSync(
        getLogFile(),
        log + "\n",
        "utf8"
    );

}

function info(message) {

    write(
        "INFO",
        message
    );

}

function success(message) {

    write(
        "SUCCESS",
        message
    );

}

function warning(message) {

    write(
        "WARNING",
        message
    );

}

function error(message, err = null) {

    let fullMessage = message;

    if (err) {

        fullMessage +=
            ` | ${err.message || err}`;

    }

    write(
        "ERROR",
        fullMessage
    );

}


function logEmployee(employee) {

    write(
        "INFO",
        `Employee: ${employee.name}`
    );


    if (employee.pdfExists) {

        write(
            "SUCCESS",
            `${employee.name} - PDF Found`
        );

    }
    else {

        write(
            "ERROR",
            `${employee.name} - PDF Missing`
        );

    }

    if (employee.emailStatus === "sent" || employee.emailSent) {

        write(
            "SUCCESS",
            `${employee.name} - Email Sent`
        );

    }

    else if (employee.emailStatus === "skipped") {

        write(
            "WARNING",
            `${employee.name} - Email Skipped`
        );

    }

    else {

        write(
            "ERROR",
            `${employee.name} - Email Failed`
        );

    }

}


function logSummary(summary) {

    write(
        "INFO",
        "PDF Summary"
    );

    write(
        "INFO",
        `Employees: ${summary.emp}`
    );

    write(
        "INFO",
        `PDF Found: ${summary.found}`
    );

    write(
        "INFO",
        `PDF Missing: ${summary.missing}`
    );

}

function logEmailSummary(summary) {

    write(
        "INFO",
        "Email Summary"
    );

    write(
        "INFO",
        `Sent: ${summary.sent}`
    );

    write(
        summary.failed > 0
            ? "ERROR"
            : "INFO",
        `Failed: ${summary.failed}`
    );

    write(
        summary.skipped > 0
            ? "WARNING"
            : "INFO",
        `Skipped: ${summary.skipped}`
    );

}

module.exports = {

    info,
    success,
    warning,
    error,

    logEmployee,
    logSummary,
    logEmailSummary

};