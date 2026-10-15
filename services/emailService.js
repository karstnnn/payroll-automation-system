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
        config.smtpUser;

    const smtpPassword =
        credentials.password ||
        config.smtpPassword;


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

    const recipient = config.testMode
    ? config.testRecipient
    : employee.email;

    if (!recipient) {
        throw new Error("Email recipient is missing.");
    }

    const info = await transporter.sendMail({
        from: config.smtpUser,

        to: recipient,

        subject: config.testMode
            ? `[TEST - ${employee.name}] ${email.subject}`
            : email.subject,

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


async function sendPayrollSummary(report, config) {

    const {
        recipient,
        month,
        fileName,
        pdfPath
    } = report;

    if (!recipient || !month || !fileName || !pdfPath) {
        throw new Error(
            "Incomplete payroll summary email information."
        );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(recipient)) {
        throw new Error(
            "Invalid payroll summary recipient email."
        );
    }

    if (config.testMode) {

        const expectedRecipient =
            (config.testRecipient || "")
                .trim()
                .toLowerCase();

        if (
            !expectedRecipient ||
            recipient.trim().toLowerCase() !== expectedRecipient
        ) {
            throw new Error(
                "Test Mode blocked a payroll summary email " +
                "to an unauthorized recipient."
            );
        }
    }

    if (!config.smtpUser || !config.smtpPassword) {
        throw new Error(
            "Payroll summary SMTP credentials are missing."
        );
    }

    const transporter = createTransporter(config);

    const subject = config.testMode
    ? `[TEST] Payroll Summary - ${month}`
    : `Payroll Summary - ${month}`;

    const body =
        `Good day,\n\n` +
        `Please find attached the payroll summary for ${month}.\n\n` +
        `This document contains confidential payroll information. ` +
        `Please handle it accordingly.\n\n` +
        `Best regards,\n` +
        `Payroll Department`;

    const info = await transporter.sendMail({

        from: config.smtpUser,

        to: recipient,

        subject: subject,

        text: body,

        attachments: [
            {
                filename: fileName,
                content: report.pdfBuffer,
                contentType: "application/pdf"
            }
        ]
    });

    if (
        !info.accepted ||
        !info.accepted.some(
            email => email.toLowerCase() === recipient.toLowerCase()
        )
    ) {
        throw new Error(
            "The SMTP server did not accept the recipient."
        );
    }

    return {
        success: true,
        messageId: info.messageId
    };
}


module.exports = {
  send,
  verifyConnection,
  sendWithRetry,
  sendPayrollSummary
}

