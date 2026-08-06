require('dotenv').config();

const fs = require("fs");
const nodemailer = require('nodemailer');

const appScriptService = require("./services/appScriptService");
const employeeService = require("./services/employeeService");
const pdfService = require("./services/pdfService");
const emailService = require("./services/emailService")

const logger = require("./utils/logger");

async function main() {
    const config = JSON.parse(
        fs.readFileSync("config.json", "utf8")
    );

    await appScriptService.generatePayslips();

    const employees =
    employeeService.loadEmployees(
        config.employeeFile
    );

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
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});