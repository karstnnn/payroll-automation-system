require('dotenv').config();
const nodemailer = require('nodemailer');
const template = require("../templates/emailTemplate");
const logger = require("../utils/logger");

function createTransporter(config) {

    return nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,

        auth: {
            user: config.smtpUser,
            pass: config.smtpPassword
        }
    });

}

async function verifyConnection(
    config,
    credentials = {}
) {

    const smtpUser =
        credentials.user ||
        process.env.SMTP_USER;

    const smtpPassword =
        credentials.password ||
        process.env.SMTP_PASSWORD;


    if (!smtpUser || !smtpPassword) {

        throw new Error(
            "Missing SMTP credentials."
        );

    }


    const transporter =
        nodemailer.createTransport({

            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,

            auth: {
                user: smtpUser,
                pass: smtpPassword
            }

        });


    await transporter.verify();


    console.log(
        "SMTP connection verified successfully."
    );

}

async function send(employee, config) {

    const transporter = createTransporter(config);

    const email = template.create(employee, config);

    const info = await transporter.sendMail({
        from: config.smtpUser,

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
}


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
}

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

            logger.info(
                `Sending payslip to ${employee.name} ` +
                `(Attempt ${attempt}/${maxAttempts})`
            );


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

            logger.error(
                `Email attempt ${attempt}/${maxAttempts} failed for ${employee.name}`,
                error
            );

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

            if (attempt < maxAttempts) {

                const delay =
                    attempt === 1
                        ? 2000
                        : 5000;

                logger.warning(
                    `Retrying email for ${employee.name} in ${delay / 1000} seconds`
                );

                onProgress({
                    type: "status",
                    message:
                        `Retrying ${employee.name} in ` +
                        `${delay / 1000} seconds...`
                });

                await wait(delay);
            }

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
