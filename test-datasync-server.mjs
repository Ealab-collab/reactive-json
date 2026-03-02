/**
 * Fake backend for testing the DataSync component.
 *
 * Prerequisites:
 *   npm install --no-save express cors
 *
 * Usage:
 *   node test-datasync-server.mjs
 *
 * Then load test-data-sync.yaml in the app.
 * The server listens on http://localhost:3099 and echoes back the received
 * Object X with an updated status field.
 */
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/save", (req, res) => {
    console.log("[/api/save] Received:", JSON.stringify(req.body, null, 2));

    res.json({
        ...req.body,
        status: {
            type: "success",
            message: `Saved at ${new Date().toLocaleTimeString()}`
        }
    });
});

// Returns a structured 422 error body — triggers the syncError event in DataSync
// (DataSync detects a body with a .status field and fires syncError with that body)
app.post("/api/fail", (req, res) => {
    console.log("[/api/fail] Received:", JSON.stringify(req.body, null, 2));

    res.status(422).json({
        ...req.body,
        status: {
            type: "error",
            message: `Validation failed at ${new Date().toLocaleTimeString()}`
        }
    });
});

// Returns a 500 with no structured body — triggers syncError via the generic error branch
app.post("/api/crash", (req, res) => {
    console.log("[/api/crash] Received:", JSON.stringify(req.body, null, 2));
    res.status(500).send("Internal Server Error");
});

app.listen(3099, () => {
    console.log("Fake DataSync backend running on http://localhost:3099");
    console.log("  POST /api/save  → 200 success");
    console.log("  POST /api/fail  → 422 structured error (fires syncError with body)");
    console.log("  POST /api/crash → 500 plain error  (fires syncError, no body)");
});
