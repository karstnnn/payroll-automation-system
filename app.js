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

            employee.emailStatus = "skipped";

            onProgress({
                type: "error",
                message: `${employee.name} - PDF Missing`
            });

            continue;
        }

        const emailResult =
            await emailService.sendWithRetry(
                employee,
                config,
                onProgress
            );


        if (emailResult.success) {

            employee.emailStatus = "sent";
            employee.emailAttempts =
                emailResult.attempts;

            onProgress({
                type: "success",
                message:
                    `${employee.name} - Email Sent`
            });

        }
        else {

            employee.emailStatus = "failed";
            employee.emailAttempts =
                emailResult.attempts;

            employee.emailError =
                emailResult.error?.message ||
                "Unknown email error";

            onProgress({
                type: "error",
                message:
                    `${employee.name} - Email Failed`
            });

        }


        logger.logEmployee(employee);


    }


    logger.logSummary(result.summary);


    const emailSummary = {
        total: employees.length,

        sent: employees.filter(
            employee => employee.emailStatus === "sent"
        ).length,

        failed: employees.filter(
            employee => employee.emailStatus === "failed"
        ).length,

        skipped: employees.filter(
            employee => employee.emailStatus === "skipped"
        ).length
    };

    onProgress({
        type: "complete",
        message:
            `Payslip process completed. ` +
            `${emailSummary.sent} sent, ` +
            `${emailSummary.failed} failed, ` +
            `${emailSummary.skipped} skipped.`,
        summary: emailSummary
    });


    return {
        employees,
        summary: result.summary,
        emailSummary
    };
}

module.exports = {
    runPayroll
};
