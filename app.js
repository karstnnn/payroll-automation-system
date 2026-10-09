require('dotenv').config();

const fs = require("fs");
const nodemailer = require('nodemailer');

const appScriptService = require("./services/appScriptService");
const employeeService = require("./services/employeeService");
const pdfService = require("./services/pdfService");
const emailService = require("./services/emailService")
const runHistoryService = require("./services/runHistoryService");

const dateUtils = require("./utils/dateUtils");
const logger = require("./utils/logger");

async function runPayroll(config, onProgress = () => {}) {

    logger.info("Payslip process started.");

    const payrollPeriod = dateUtils.getCurrentMonth();
    config.pdfFolder =
        dateUtils.getPdfFolder(config.pdfRootFolder);

    config.emailSubject =
        dateUtils.getEmailSubject();

    onProgress({
        type: "status",
        message: "Generating payslips..."
    });
    logger.info("Generating payslips...");

    await appScriptService.generatePayslips(config.appsScriptUrl);

    onProgress({
        type: "success",
        message: "Payslips generated."
    });

    logger.success("Payslips generated.");

    onProgress({
        type: "status",
        message: "Loading employee data..."
    });

    logger.info("Loading employee data...");

    const employees =
        await employeeService.loadEmployees(config.appsScriptUrl);


    onProgress({
        type: "status",
        message: `Checking ${employees.length} employee PDFs...`
    });

    logger.info(`Checking ${employees.length} employee PDFs...`);

    await pdfService.waitForPDFs(
        employees,
        config.pdfFolder
    );


    const result =
        pdfService.checkPDFs(
            employees,
            config.pdfFolder
        );

    onProgress({
    type: "success",
    message:
        `PDF check completed: ${result.summary.emp} employees, ` +
        `${result.summary.found} PDFs found, ` +
        `${result.summary.missing} PDFs missing`
    });

    logger.success(
        `PDF validation completed: ` +
        `${result.summary.found} found, ` +
        `${result.summary.missing} missing`
    );


    await emailService.verifyConnection(config);

    onProgress({
        type: "success",
        message: "Email server connection verified."
    });

    logger.success("Email server connection verified.");


    for (const employee of employees) {

        if (!employee.pdfExists) {

            employee.emailStatus = "skipped";

            onProgress({
                type: "error",
                message: `${employee.name} - PDF Missing`
            });

            logger.warning(
                `${employee.name} - PDF Missing, skipping email.`
            );

            logger.logEmployee(employee);

            continue;
        }

        const alreadySent =
            runHistoryService.wasAlreadySent(
                employee,
                payrollPeriod
            );


        if (alreadySent) {

            employee.emailStatus =
                "already-sent";

            onProgress({
                type: "status",

                message:
                    `${employee.name} - Already sent previously, skipped`
            });


            logger.warning(
                `${employee.name} - Duplicate send prevented`
            );


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

            runHistoryService.markSent(
                employee,
                payrollPeriod
            );

            onProgress({
                type: "success",
                message:
                    `${employee.name} - Email Sent`
            });

            //logger.success(`${employee.name} - Email Sent`);

        }
        else {

            employee.emailStatus = "failed";
            employee.emailAttempts =
                emailResult.attempts;

            employee.emailError =
                emailResult.error?.message ||
                "Unknown email error";

            runHistoryService.markFailed(
                employee,
                payrollPeriod,
                emailResult.error
            );

            onProgress({
                type: "error",
                message:
                    `${employee.name} - Email Failed`
            });

            //logger.error(`${employee.name} - Email Failed`,emailResult.error);

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

    const processSummary = {
        employees: employees.length,

        pdf: {
            found: result.summary.found,
            missing: result.summary.missing
        },

        email: {
            sent: employees.filter(
                employee => employee.emailStatus === "sent"
            ).length,

            failed: employees.filter(
                employee => employee.emailStatus === "failed"
            ).length,

            skipped: employees.filter(
                employee => employee.emailStatus === "skipped"
            ).length,

            alreadySent: employees.filter(
                employee =>
                    employee.emailStatus === "already-sent"
            ).length
        }
    };

    const overallStatus =
    processSummary.pdf.missing === 0 &&
    processSummary.email.failed === 0
        ? "success"
        : "warning";

    logger.logEmailSummary(
        processSummary.email
    );

    onProgress({
        type: "complete",
        status:
            processSummary.email.failed === 0 &&
            processSummary.pdf.missing === 0
                ? "success"
                : "warning",

        message: "Payslip process completed.",

        summary: processSummary
    });

    logger.success(
        `Payslip process completed. ` +
        `${emailSummary.sent} sent, ` +
        `${emailSummary.failed} failed, ` +
        `${emailSummary.skipped} skipped.`
    );


    return {
        employees,
        summary: result.summary,
        summary: processSummary,
        emailSummary
    };
}

module.exports = {
    runPayroll
};
