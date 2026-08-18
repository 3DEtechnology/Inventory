const express = require("express");
const cors = require("cors");
const authRoutes =
require("./routes/authRoutes");

const itemRoutes =
require("./routes/itemRoutes");
const stockRoutes =
require("./routes/stockRoutes");
const reportRoutes =
require("./routes/reportRoutes");
const excelRoutes =
require("./routes/excelRoutes");
const app = express();
const importRoutes =
require("./routes/importRoutes");
const dashboardRoutes =
require("./routes/dashboardRoutes");
const employeeReportRoutes =
require(
    "./routes/employeeReportRoutes"
);
const monthlyReportRoutes =
require(
    "./routes/monthlyReportRoutes"
);
const topItemsRoutes =
require(
    "./routes/topItemsRoutes"
);
const transactionRoutes =
require(
    "./routes/transactionRoutes"
);
app.use(cors());
app.use(express.json());

// Serve the frontend (inventory-backend/public/index.html) at the root URL
app.use(express.static(require("path").join(__dirname, "..", "public")));

app.use(
    "/api/auth",
    authRoutes
);
app.use(
    "/api/items",
    itemRoutes
);
app.use(
    "/api/stock",
    stockRoutes
);
app.use(
    "/api/reports",
    reportRoutes
);
app.use(
    "/api/excel",
    excelRoutes
);
app.use(
    "/api/import",
    importRoutes
);
app.use(
    "/api/dashboard",
    dashboardRoutes
);
app.use(
    "/api/employees",
    employeeReportRoutes
);
app.use(
    "/api/monthly",
    monthlyReportRoutes
);
app.use(
    "/api/top-items",
    topItemsRoutes
);
app.use(
    "/api/transactions",
    transactionRoutes
);
app.use(
    "/api/vendors",
    require("./routes/vendorRoutes")
);
app.use(
    "/api/users",
    require("./routes/userRoutes")
);
module.exports = app;