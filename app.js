require('dotenv').config();

const fs = require("fs");
const nodemailer = require('nodemailer');

const appScriptService = require("./services/appScriptService");
const employeeService = require("./services/employeeService");
const pdfService = require("./services/pdfService");
const emailService = require("./services/emailService")

const dateUtils = require("./utils/dateUtils");
const logger = require("./utils/logger");

async function runPayroll(onProgress = () => {}) {

    const config = JSON.parse(
        fs.readFileSync("config.json", "utf8")
    );

    config.pdfFolder =
        dateUtils.getPdfFolder(config.pdfRootFolder);

    config.emailSubject =
        dateUtils.getEmailSubject();

    onProgress({
        type: "status",
        message: "Generating payslips..."
    });

    await appScriptService.generatePayslips();

    onProgress({
        type: "success",
        message: "Payslips generated."
    });


    onProgress({
        type: "status",
        message: "Loading employee data..."
    });

    const employees =
        await employeeService.loadEmployees();


    onProgress({
        type: "status",
        message: `Checking ${employees.length} employee PDFs...`
    });

    await pdfService.waitForPDFs(
        employees,
        config.pdfFolder
    );


    const result =
        pdfService.checkPDFs(
            employees,
            config.pdfFolder
        );

    console.log(`PDF check completed: ${result.summary}`);
    
    onProgress({
    type: "success",
    message:
        `PDF check completed: ${result.summary.emp} employees, ` +
        `${result.summary.found} PDFs found, ` +
        `${result.summary.missing} PDFs missing`
    });


    await emailService.verifyConnection(config);

    onProgress({
        type: "success",
        message: "Email server connection verified."
    });


    for (const employee of employees) {

        if (!employee.pdfExists) {

            logger.logEmployee(employee);

            onProgress({
                type: "error",
                message: `${employee.name} - PDF Missing`
            });

            continue;
        }


        onProgress({
            type: "status",
            message: `Sending payslip to ${employee.name}...`
        });


        await emailService.send(
            employee,
            config
        );


        logger.logEmployee(employee);


        onProgress({
            type: "success",
            message: `${employee.name} - Email Sent`
        });

    }


    logger.logSummary(result.summary);


    onProgress({
        type: "complete",
        message: "Payroll process completed.",
        summary: result.summary
    });


    return {
        employees,
        summary: result.summary
    };
}

module.exports = {
    runPayroll
};
