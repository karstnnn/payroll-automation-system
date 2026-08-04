require('dotenv').config();
const nodemailer = require('nodemailer');
const template = require("./emailTemplate");

async function verifyConnection(config) {
    console.log(process.env.SMTP_USER);
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        throw new Error(
            "Missing SMTP credentials in .env"
        );
    }

    const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,

        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    await transporter.verify();
    
    console.log("SMTP connection verified successfully.");
}

async function send(employee, config) {

    const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,

        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const email = template.create(employee, config);

    await transporter.sendMail({
        from: process.env.SMTP_USER,

        to: employee.email,

        subject: email.subject,

        text: email.text,

        attachments: [
            {
            filename: employee.pdf,
            path: employee.pdfPath
            }
    ]

    });

    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );

    employee.emailSent = true;

}

module.exports = {
  send,
  verifyConnection
}
