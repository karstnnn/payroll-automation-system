require('dotenv').config();
const nodemailer = require('nodemailer');
const template = require("../templates/emailTemplate");

function createTransporter(config) {

    return nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,

        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

}

async function verifyConnection(config) {
    console.log(process.env.SMTP_USER);
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        throw new Error(
            "Missing SMTP credentials in .env"
        );
    }

    const transporter = createTransporter(config);

    await transporter.verify();
    
    console.log("SMTP connection verified successfully.");
}

async function send(employee, config) {

    const transporter = createTransporter(config);

    const email = template.create(employee, config);

    const info = await transporter.sendMail({
        from: process.env.SMTP_USER,

        to: employee.email,

        subject: email.subject,

        html: email.html,

        attachments: [
            {
            filename: employee.pdf,
            path: employee.pdfPath
            }
        ]
    });

    employee.emailSent = true;

    return info;
}

function wait(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );



function shouldRetry(error) {

    const retryableCodes = [
        "ETIMEDOUT",
        "ECONNRESET",
        "ECONNREFUSED",
        "EAI_AGAIN",
        "ENETUNREACH"
    ];


    if (retryableCodes.includes(error.code)) {
        return true;
    }


    // SMTP 4xx errors are generally temporary.
    if (
        error.responseCode >= 400 &&
        error.responseCode < 500
    ) {
        return true;
    }


    return false;
}}

async function sendWithRetry(
    employee,
    config,
    onProgress = () => {},
    maxAttempts = 3
) {

    let lastError = null;


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        try {

            onProgress({
                type: "status",
                message:
                    `Sending payslip to ${employee.name} ` +
                    `(Attempt ${attempt}/${maxAttempts})`
            });


            const info =
                await send(employee, config);


            return {
                success: true,
                attempts: attempt,
                info
            };

        }

        catch (error) {

            lastError = error;

            employee.emailSent = false;

            onProgress({
                type: "error",
                message:
                    `Email attempt ${attempt} failed for ` +
                    `${employee.name}: ${error.message}`
            });


            if (!shouldRetry(error)) {

                return {
                    success: false,
                    attempts: attempt,
                    error
                };

            }

            if (attempt === maxAttempts) {
                break;
            }

            const delay =
                attempt === 1
                    ? 2000
                    : 5000;

            onProgress({
                type: "status",
                message:
                    `Retrying ${employee.name} in ` +
                    `${delay / 1000} seconds...`
            });

            await wait(delay);

        }

    }


    return {
        success: false,
        attempts: maxAttempts,
        error: lastError
    };

}

module.exports = {
  send,
  verifyConnection,
  sendWithRetry
}
