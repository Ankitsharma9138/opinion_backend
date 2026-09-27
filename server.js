const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("node:path");
const { getDatabaseConfig } = require("./database-config");
const { checkDatabaseConnection } = require("./database-startup");
require("dotenv").config({ path: path.join(__dirname, ".env") });

let databaseConfig;
try {
  databaseConfig = getDatabaseConfig();
} catch (error) {
  console.error(`Database configuration error: ${error.message}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_URL = process.env.FRONTEND_URL;
const API_URL = (
  process.env.API_URL?.trim() ||
  process.env.RENDER_EXTERNAL_URL?.trim() ||
  "https://opinion-backend-5ipv.onrender.com"
).replace(/\/+$/, "");
// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());





// ======================================================
// ADMIN LOGIN
// ======================================================

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (
        email === adminEmail &&
        password === adminPassword
    ) {
        return res.json({
            success: true,
            message: "Login successful"
        });
    }

    return res.status(401).json({
        success: false,
        error: "Invalid Email or Password"
    });
});
// ======================================================
// MYSQL CONNECTION
// ======================================================

console.log(`DB target: ${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database}`);
const db = mysql.createPool(databaseConfig);
// ======================================================   
// HOME
// ======================================================

app.get("/", (req, res) => {
    res.send(`
        <h1>Opiniontix Backend Running 🚀</h1>
        <p>Server is running on port ${PORT}</p>
    `);
});

// ======================================================
// ADD SURVEY
// ======================================================

app.post("/api/surveys", (req, res) => {

    const {
        id,
        name,
        client,
        country,
        cpi,
        loi,
        ir,
        sample,
        link,
        status
    } = req.body;

    // Validation
    if (!id || !name || !link) {
        return res.status(400).json({
            error: "Survey ID, Name and Link are required"
        });
    }

    // Employee survey link
 const employeeLink =
  `${API_URL}/survey/${encodeURIComponent(id)}?rid={rid}`;
    const sql = `
        INSERT INTO surveys
        (
            id,
            name,
            client,
            country,
            cpi,
            loi,
            ir,
            sample,
            link,
            status,
            employee_link
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        id,
        name,
        client || "",
        country || "",
        Number(cpi) || 0,
        Number(loi) || 0,
        Number(ir) || 0,
        Number(sample) || 0,
        link,
        status || "Live",
        employeeLink
    ];

    db.query(sql, values, (err, result) => {

        if (err) {

            console.log("❌ ADD SURVEY ERROR");
            console.log(err);

            return res.status(500).json({
                error: "Database Error",
                message: err.message
            });
        }

        console.log("=================================");
        console.log("✅ Survey Added:", id);
        console.log("🔗 Employee Link:", employeeLink);
        console.log("=================================");

        res.json({
            message: "Survey Added Successfully",
            survey_id: id,
            employee_link: employeeLink
        });
    });
});

// ======================================================
// GET ALL SURVEYS
// ======================================================

app.get("/api/surveys", (req, res) => {

    const sql = `
        SELECT *
        FROM surveys
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {

            console.log("❌ GET SURVEYS ERROR");
            console.log(err);

            return res.status(500).json({
                error: "Database Error",
                message: err.message
            });
        }

        res.json(result);
    });
});

// ======================================================
// GET SINGLE SURVEY
// ======================================================

app.get("/api/surveys/:id", (req, res) => {

    const surveyId = req.params.id;

    const sql = `
        SELECT *
        FROM surveys
        WHERE id = ?
        LIMIT 1
    `;

    db.query(sql, [surveyId], (err, result) => {

        if (err) {

            console.log("❌ GET SINGLE SURVEY ERROR");
            console.log(err);

            return res.status(500).json({
                error: "Database Error",
                message: err.message
            });
        }

        if (result.length === 0) {

            return res.status(404).json({
                error: "Survey not found"
            });
        }

        res.json(result[0]);
    });
});

// ======================================================
// UPDATE SURVEY STATUS
// ======================================================

app.put("/api/surveys/:id/status", (req, res) => {

    const surveyId = req.params.id;
    const { status } = req.body;

    const allowedStatuses = [
        "Live",
        "Soft Launch",
        "Pause",
        "Closed"
    ];

    // Validate status
    if (!allowedStatuses.includes(status)) {

        return res.status(400).json({
            error: "Invalid survey status"
        });
    }

    const sql = `
        UPDATE surveys
        SET status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [status, surveyId],
        (err, result) => {

            if (err) {

                console.log("❌ UPDATE STATUS ERROR");
                console.log(err);

                return res.status(500).json({
                    error: "Database Error",
                    message: err.message
                });
            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    error: "Survey not found"
                });
            }

            console.log(
                `✅ Survey ${surveyId} status changed to ${status}`
            );

            res.json({
                message: "Survey status updated successfully",
                survey_id: surveyId,
                status: status
            });
        }
    );
});

// ======================================================
// DELETE SURVEY
// ======================================================

app.delete("/api/surveys/:id", (req, res) => {

    const surveyId = req.params.id;

    const sql = `
        DELETE FROM surveys
        WHERE id = ?
    `;

    db.query(
        sql,
        [surveyId],
        (err, result) => {

            if (err) {

                console.log("❌ DELETE SURVEY ERROR");
                console.log(err);

                return res.status(500).json({
                    error: "Database Error",
                    message: err.message
                });
            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    error: "Survey not found"
                });
            }

            console.log(
                `🗑️ Survey Deleted: ${surveyId}`
            );

            res.json({
                message: "Survey deleted successfully",
                survey_id: surveyId
            });
        }
    );
});

// ======================================================
// PUBLIC EMPLOYEE SURVEY LINK
// ======================================================
//
// Example:
//
// http://localhost:5000/s/2575?rid=ABC123
//
// ======================================================

app.get("/survey/:studyId", (req, res) => {
    const studyId = req.params.studyId;
    const rid = req.query.rid;

    // --------------------------------------------------
    // Validate Study ID
    // --------------------------------------------------

    if (!studyId) {

        return res.status(400).send(`
            <!DOCTYPE html>

            <html>

            <head>

                <title>Invalid Survey Link</title>

                <style>

                    body {
                        margin: 0;
                        font-family: Arial, sans-serif;
                        background: #f5f7fb;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }

                    .box {
                        background: white;
                        width: 90%;
                        max-width: 500px;
                        padding: 40px;
                        border-radius: 16px;
                        text-align: center;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                    }

                    h1 {
                        color: #2563eb;
                    }

                    h2 {
                        color: #333;
                    }

                    p {
                        color: #666;
                        line-height: 1.6;
                    }

                </style>

            </head>

            <body>

                <div class="box">

                    <h1>Opiniontix Research</h1>

                    <h2>Invalid Survey Link</h2>

                    <p>
                        The survey link is invalid or incomplete.
                    </p>

                </div>

            </body>

            </html>
        `);
    }

    // --------------------------------------------------
    // RID Check
    // --------------------------------------------------

    if (!rid) {

        return res.status(400).send(`
            <!DOCTYPE html>

            <html>

            <head>

                <title>RID Required</title>

                <style>

                    body {
                        margin: 0;
                        font-family: Arial, sans-serif;
                        background: #f5f7fb;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }

                    .box {
                        background: white;
                        width: 90%;
                        max-width: 500px;
                        padding: 40px;
                        border-radius: 16px;
                        text-align: center;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                    }

                    h1 {
                        color: #2563eb;
                    }

                    h2 {
                        color: #333;
                    }

                    p {
                        color: #666;
                        line-height: 1.6;
                    }

                </style>

            </head>

            <body>

                <div class="box">

                    <h1>Opiniontix Research</h1>

                    <h2>Invalid Participant Link</h2>

                    <p>
                        Participant ID (RID) is missing from this survey link.
                    </p>

                </div>

            </body>

            </html>
        `);
    }

    // --------------------------------------------------
    // FIND SURVEY
    // --------------------------------------------------

    const findSurveySql = `
        SELECT *
        FROM surveys
        WHERE id = ?
        LIMIT 1
    `;

    db.query(
        findSurveySql,
        [studyId],
        (err, result) => {

            if (err) {

                console.log("❌ SURVEY LOOKUP ERROR");
                console.log(err);

                return res.status(500).send(`
                    <h2>Database Error</h2>
                    <p>Unable to load survey.</p>
                `);
            }

            // --------------------------------------------------
            // SURVEY NOT FOUND
            // --------------------------------------------------

            if (result.length === 0) {

                return res.status(404).send(`
                    <!DOCTYPE html>

                    <html>

                    <head>

                        <title>Survey Not Found</title>

                        <style>

                            body {
                                margin: 0;
                                font-family: Arial, sans-serif;
                                background: #f5f7fb;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                min-height: 100vh;
                            }

                            .box {
                                background: white;
                                width: 90%;
                                max-width: 520px;
                                padding: 45px;
                                border-radius: 18px;
                                text-align: center;
                                box-shadow: 0 10px 35px rgba(0,0,0,0.08);
                            }

                            .icon {
                                font-size: 55px;
                                margin-bottom: 15px;
                            }

                            h1 {
                                color: #2563eb;
                                margin-bottom: 10px;
                            }

                            h2 {
                                color: #333;
                                margin-bottom: 15px;
                            }

                            p {
                                color: #666;
                                line-height: 1.6;
                            }

                        </style>

                    </head>

                    <body>

                        <div class="box">

                            <div class="icon">🔍</div>

                            <h1>Opiniontix Research</h1>

                            <h2>Survey Not Found</h2>

                            <p>
                                The survey you are trying to access
                                does not exist or has been removed.
                            </p>

                        </div>

                    </body>

                    </html>
                `);
            }

            const survey = result[0];

            // --------------------------------------------------
            // STATUS CHECK
            // --------------------------------------------------

            if (survey.status !== "Live") {

                let title = "Survey Not Available";
                let message =
                    "This survey is currently not available.";

                let icon = "⏸️";

                if (survey.status === "Soft Launch") {

                    title = "Survey Coming Soon";

                    message =
                        "This survey is currently in soft launch and will be available shortly.";

                    icon = "🚀";
                }

                if (survey.status === "Pause") {

                    title = "Survey Temporarily Paused";

                    message =
                        "This survey is temporarily paused. Please try again later.";

                    icon = "⏸️";
                }

                if (survey.status === "Closed") {

                    title = "Survey Closed";

                    message =
                        "This survey has been closed and is no longer accepting responses.";

                    icon = "🔒";
                }

                return res.status(403).send(`
                    <!DOCTYPE html>

                    <html>

                    <head>

                        <meta charset="UTF-8">

                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1.0"
                        >

                        <title>${title}</title>

                        <style>

                            * {
                                box-sizing: border-box;
                            }

                            body {
                                margin: 0;
                                font-family:
                                    Arial,
                                    Helvetica,
                                    sans-serif;

                                background:
                                    linear-gradient(
                                        135deg,
                                        #eff6ff,
                                        #f8fafc
                                    );

                                display: flex;
                                justify-content: center;
                                align-items: center;

                                min-height: 100vh;

                                padding: 20px;
                            }

                            .box {
                                background: white;

                                width: 100%;
                                max-width: 560px;

                                padding: 45px 35px;

                                border-radius: 20px;

                                text-align: center;

                                box-shadow:
                                    0 15px 40px
                                    rgba(0,0,0,0.08);
                            }

                            .icon {
                                font-size: 65px;
                                margin-bottom: 15px;
                            }

                            .brand {
                                color: #2563eb;

                                font-size: 28px;

                                font-weight: 700;

                                margin-bottom: 20px;
                            }

                            h2 {
                                color: #1f2937;

                                font-size: 25px;

                                margin:
                                    10px 0 15px;
                            }

                            p {
                                color: #6b7280;

                                font-size: 16px;

                                line-height: 1.7;

                                margin-bottom: 25px;
                            }

                            .status {
                                display: inline-block;

                                padding:
                                    8px 18px;

                                border-radius: 30px;

                                background: #f3f4f6;

                                color: #374151;

                                font-size: 14px;

                                font-weight: 600;

                                margin-bottom: 20px;
                            }

                            .footer {
                                color: #9ca3af;

                                font-size: 13px;

                                margin-top: 25px;
                            }

                        </style>

                    </head>

                    <body>

                        <div class="box">

                            <div class="icon">
                                ${icon}
                            </div>

                            <div class="brand">
                                Opiniontix Research
                            </div>

                            <h2>
                                ${title}
                            </h2>

                            <div class="status">
                                Status: ${survey.status}
                            </div>

                            <p>
                                ${message}
                            </p>

                            <div class="footer">
                                Thank you for your interest in
                                participating in our research.
                            </div>

                        </div>

                    </body>

                    </html>
                `);
            }

            // --------------------------------------------------
            // LIVE SURVEY
            // --------------------------------------------------

            res.send(`
                <!DOCTYPE html>

                <html>

                <head>

                    <meta charset="UTF-8">

                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    >

                    <title>
                        Survey - Opiniontix Research
                    </title>

                    <style>

                        * {
                            box-sizing: border-box;
                        }

                        body {
                            margin: 0;

                            font-family:
                                Arial,
                                Helvetica,
                                sans-serif;

                            background:
                                linear-gradient(
                                    135deg,
                                    #eff6ff,
                                    #f8fafc
                                );

                            display: flex;

                            justify-content: center;

                            align-items: center;

                            min-height: 100vh;

                            padding: 20px;
                        }

                        .box {
                            background: white;

                            width: 100%;

                            max-width: 560px;

                            padding: 45px 35px;

                            border-radius: 20px;

                            text-align: center;

                            box-shadow:
                                0 15px 40px
                                rgba(0,0,0,0.08);
                        }

                        .brand {
                            color: #2563eb;

                            font-size: 28px;

                            font-weight: 700;

                            margin-bottom: 20px;
                        }

                        h2 {
                            color: #1f2937;

                            margin-bottom: 15px;
                        }

                        p {
                            color: #6b7280;

                            line-height: 1.7;

                            font-size: 16px;
                        }

                        button {
                            margin-top: 20px;

                            background: #2563eb;

                            color: white;

                            border: none;

                            padding:
                                14px 35px;

                            border-radius: 10px;

                            font-size: 16px;

                            font-weight: 600;

                            cursor: pointer;
                        }

                        button:hover {
                            background: #1d4ed8;
                        }

                    </style>

                </head>

                <body>

                    <div class="box">

                        <div class="brand">
                            Opiniontix Research
                        </div>

                        <h2>
                            Welcome to the Survey
                        </h2>

                        <p>
                            Thank you for your interest in
                            participating in this survey.
                        </p>

                        <p>
                            Please click the button below
                            to start the survey.
                        </p>

                        <form
                            method="GET"
                            action="/start-survey/${encodeURIComponent(studyId)}"
                        >

                            <input
                                type="hidden"
                                name="rid"
                                value="${encodeURIComponent(rid)}"
                            />

                            <button type="submit">
                                Start Survey
                            </button>

                        </form>

                    </div>

                </body>

                </html>
            `);
        }
    );
});

// ======================================================
// START SURVEY
// ======================================================

app.get("/start-survey/:studyId", (req, res) => {

    const studyId = req.params.studyId;
    const rid = req.query.rid;

    if (!studyId || !rid) {

        return res.status(400).send(
            "Study ID and RID are required"
        );
    }

    const findSurveySql = `
        SELECT *
        FROM surveys
        WHERE id = ?
        LIMIT 1
    `;

    db.query(
        findSurveySql,
        [studyId],
        (err, result) => {

            if (err) {

                console.log("❌ START SURVEY LOOKUP ERROR");
                console.log(err);

                return res.status(500).send(
                    "Database Error"
                );
            }

            if (result.length === 0) {

                return res.status(404).send(
                    "Survey not found"
                );
            }

            const survey = result[0];

            // Only Live surveys can start
            if (survey.status !== "Live") {

                return res.status(403).send(`
                    <h2>Survey Not Available</h2>
                    <p>
                        This survey is currently not live.
                    </p>
                `);
            }

            // ==================================================
            // SAVE START
            // ==================================================

            const insertSql = `
                INSERT INTO redirect_logs
                (
                    study_id,
                    rid,
                    started_at,
                    status
                )
                VALUES (?, ?, NOW(), 'Started')
            `;

            db.query(
                insertSql,
                [studyId, rid],
                (insertErr) => {

                    if (insertErr) {

                        console.log(
                            "❌ START TRACKING ERROR"
                        );

                        console.log(insertErr);

                        return res.status(500).send(
                            "Tracking Error"
                        );
                    }

                    console.log(
                        "✅ Survey Started:",
                        studyId,
                        rid
                    );

                    // ==================================================
                    // CLIENT SURVEY URL
                    // ==================================================

                    let surveyUrl = survey.link;

                    const separator =
                        surveyUrl.includes("?")
                            ? "&"
                            : "?";

                    surveyUrl =
                        surveyUrl +
                        separator +
                        "rid=" +
                        encodeURIComponent(rid);

                    console.log(
                        "➡️ Redirecting to:",
                        surveyUrl
                    );

                    res.redirect(surveyUrl);
                }
            );
        }
    );
});

// ======================================================
// SURVEY EXIT
// ======================================================
//
// 1 = Complete
// 2 = Terminate
// 3 = Quota Full
// 4 = Security
//
// Example:
//
// /survey/exit/1?sid=2575&rid=ABC123
//
// ======================================================

app.get("/survey/exit/:status", (req, res) => {

    const statusCode = req.params.status;

    const rid = req.query.rid;
    const studyId = req.query.sid;

    if (!rid || !studyId) {

        return res.status(400).json({
            error: "RID and Study ID are required"
        });
    }

    let status;

    if (statusCode === "1") {
        status = "Complete";
    }
    else if (statusCode === "2") {
        status = "Terminate";
    }
    else if (statusCode === "3") {
        status = "Quota Full";
    }
    else if (statusCode === "4") {
        status = "Security";
    }
    else {
        status = "Invalid";
    }

    // ==================================================
    // FIND LATEST STARTED RECORD
    // ==================================================

    const findSql = `
        SELECT id
        FROM redirect_logs
        WHERE study_id = ?
        AND rid = ?
        AND status = 'Started'
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(
        findSql,
        [studyId, rid],
        (err, result) => {

            if (err) {

                console.log(
                    "❌ FIND STARTED LOG ERROR"
                );

                console.log(err);

                return res.status(500).json({
                    error: "Database Error"
                });
            }

            // ==================================================
            // UPDATE EXISTING START
            // ==================================================

            if (result.length > 0) {

                const logId = result[0].id;

                const updateSql = `
                    UPDATE redirect_logs
                    SET
                        ended_at = NOW(),
                        duration_seconds =
                            TIMESTAMPDIFF(
                                SECOND,
                                started_at,
                                NOW()
                            ),
                        status = ?
                    WHERE id = ?
                `;

                db.query(
                    updateSql,
                    [status, logId],
                    (updateErr) => {

                        if (updateErr) {

                            console.log(
                                "❌ UPDATE REDIRECT ERROR"
                            );

                            console.log(updateErr);

                            return res.status(500).json({
                                error: "Database Error"
                            });
                        }

                        console.log(
                            "✅ Redirect Updated:",
                            studyId,
                            rid,
                            status
                        );

                       res.redirect(
  302,
  `${FRONTEND_URL}/thank-you?status=${encodeURIComponent(status)}`
);
                    }
                );

                return;
            }

            // ==================================================
            // FALLBACK INSERT
            // ==================================================

            const insertSql = `
                INSERT INTO redirect_logs
                (
                    study_id,
                    rid,
                    started_at,
                    ended_at,
                    duration_seconds,
                    status
                )
                VALUES (?, ?, NOW(), NOW(), 0, ?)
            `;

            db.query(
                insertSql,
                [studyId, rid, status],
                (insertErr) => {

                    if (insertErr) {

                        console.log(
                            "❌ FALLBACK REDIRECT ERROR"
                        );

                        console.log(insertErr);

                        return res.status(500).json({
                            error: "Database Error"
                        });
                    }

                    console.log(
                        "✅ Redirect Saved:",
                        studyId,
                        rid,
                        status
                    );

                   res.redirect(
  302,
  `${FRONTEND_URL}/thank-you?status=${encodeURIComponent(status)}`
);
                }
            );
        }
    );
});

// ======================================================
// REDIRECT LOGS
// ======================================================

app.get("/redirect-logs", (req, res) => {

    console.log(
        "📥 /redirect-logs API HIT"
    );

    const sql = `
        SELECT *
        FROM redirect_logs
        ORDER BY id DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {

            console.log("❌ REDIRECT LOG ERROR");
            console.log("ERROR CODE:", err.code);
            console.log("ERROR MESSAGE:", err.message);
            console.log("SQL MESSAGE:", err.sqlMessage);

            return res.status(500).json({
                error: "Database Error",
                code: err.code,
                message: err.message,
                sqlMessage: err.sqlMessage
            });
        }

        console.log(
            "✅ REDIRECT LOGS:",
            result.length
        );

        res.json(result);
    });
});

// ======================================================
// REVENUE API
// ======================================================

app.get("/api/revenue", (req, res) => {

    console.log(
        "📥 /api/revenue API HIT"
    );

    const sql = `
        SELECT
            r.study_id AS study_id,
            COUNT(*) AS completes,
            COALESCE(MAX(s.cpi), 0) AS cpi,
            COUNT(*) * COALESCE(MAX(s.cpi), 0) AS revenue
        FROM redirect_logs r
        LEFT JOIN surveys s
            ON s.id = r.study_id
        WHERE r.status = 'Complete'
        GROUP BY r.study_id
        ORDER BY r.study_id DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {

            console.log(
                "❌ REVENUE API ERROR"
            );

            console.log(err);

            return res.status(500).json({
                error: "Database Error",
                message: err.message
            });
        }

        const revenueData = result.map((item) => ({

            study_id: item.study_id,

            completes:
                Number(item.completes || 0),

            cpi:
                Number(item.cpi || 0),

            revenue:
                Number(item.revenue || 0)

        }));

        console.log(
            "✅ REVENUE DATA:",
            revenueData
        );

        res.json(revenueData);
    });
});

// ======================================================
// REVENUE SUMMARY
// ======================================================

app.get("/api/revenue/summary", (req, res) => {

    console.log(
        "📥 /api/revenue/summary API HIT"
    );

    const sql = `
        SELECT
            COUNT(*) AS total_completes,

            COALESCE(
                SUM(COALESCE(s.cpi, 0)),
                0
            ) AS total_revenue

        FROM redirect_logs r

        LEFT JOIN surveys s
            ON s.id = r.study_id

        WHERE r.status = 'Complete'
    `;

    db.query(sql, (err, result) => {

        if (err) {

            console.log(
                "❌ REVENUE SUMMARY ERROR"
            );

            console.log(err);

            return res.status(500).json({
                error: "Database Error",
                message: err.message
            });
        }

        res.json({

            total_completes:
                Number(
                    result[0].total_completes || 0
                ),

            total_revenue:
                Number(
                    result[0].total_revenue || 0
                )

        });
    });
});

// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {

    res.status(404).json({

        error: "Route not found",

        path: req.originalUrl

    });

});

// ======================================================
// START SERVER
// ======================================================

console.log("Checking database connection and SSL handshake (15-second deadline)...");
checkDatabaseConnection(db)
  .then(() => {
    console.log("Database Connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Opiniontix Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database Connection Failed", {
      code: err.code,
      message: err.message,
      host: databaseConfig.host,
      port: databaseConfig.port,
      database: databaseConfig.database,
      causes: err.errors?.map((cause) => ({
        code: cause.code,
        address: cause.address,
        port: cause.port,
      })),
    });
    process.exit(1);
  });
