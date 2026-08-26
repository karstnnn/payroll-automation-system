require('dotenv').config();

const fs = require("fs");
const nodemailer = require('nodemailer');

const appScriptService = require("./services/appScriptService");
const employeeService = require("./services/employeeService");
const pdfService = require("./services/pdfService");
const emailService = require("./services/emailService")

const dateUtils = require("./utils/dateUtils");
const logger = require("./utils/logger");

async function runPayroll() {
    const config = JSON.parse(
        fs.readFileSync("config.json", "utf8")
    );

    config.pdfFolder =
    dateUtils.getPdfFolder(config.pdfRootFolder);

    config.emailSubject =
    dateUtils.getEmailSubject();

    await appScriptService.generatePayslips();

    const employees =
    await employeeService.loadEmployees();

    await pdfService.waitForPDFs(
        employees,
        config.pdfFolder
    );
    
    const result =
    pdfService.checkPDFs(
        employees,
        config.pdfFolder
    );

    for (const employee of employees) {

       if(!employee.pdfExists){
            logger.logEmployee(employee);
            continue;
        }
        await emailService.send(employee,config);
        logger.logEmployee(employee);
    }
    
    logger.logSummary(result.summary);
    await emailService.verifyConnection(config);

    return {
        employees,
        summary: result.summary
    };
}

module.exports = {
    runPayroll
};
