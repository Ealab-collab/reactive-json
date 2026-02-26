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
    console.log("Received:", JSON.stringify(req.body, null, 2));

    res.json({
        ...req.body,
        status: {
            type: "success",
            message: `Saved at ${new Date().toLocaleTimeString()}`
        }
    });
});

app.listen(3099, () => {
    console.log("Fake DataSync backend running on http://localhost:3099");
});
